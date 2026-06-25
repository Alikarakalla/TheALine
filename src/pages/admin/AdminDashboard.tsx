import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TEXT_COLOR } from "../../lib/constants";
import { INK } from "./ui";
import { apiGet } from "../../lib/api";
import { useAdminAuth } from "../../context/AdminAuth";
import { useIsMobile } from "../../lib/useResponsive";

const EASE = [0.22, 1, 0.36, 1] as const;
const MUTED = "rgba(84,84,84,0.6)";
const FAINT = "rgba(84,84,84,0.45)";
const UP = "#2c7d57";
const DOWN = "#b5462f";
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(84,84,84,0.1)",
  borderRadius: 16,
};

type KpiVal = { value: number; delta: number | null };
type Dash = {
  period: string;
  kpis: { revenue: KpiVal; orders: KpiVal; newCustomers: KpiVal; avgOrder: KpiVal };
  trend: { date: string; revenue: number }[];
  recentOrders: { number: string; name: string; total: number; status: string; createdAt: string }[];
  attention: { pendingOrders: number; lowStock: number; soldOut: number };
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const money = (n: number) => "€" + Math.round(n).toLocaleString("en-US");

const STATUS: Record<string, { bg: string; fg: string }> = {
  delivered: { bg: "rgba(45,120,88,0.12)", fg: "#2c7d57" },
  paid: { bg: "rgba(45,120,88,0.12)", fg: "#2c7d57" },
  shipped: { bg: "rgba(43,108,176,0.12)", fg: "#2b6cb0" },
  processing: { bg: "rgba(43,108,176,0.12)", fg: "#2b6cb0" },
  pending: { bg: "rgba(176,120,20,0.14)", fg: "#9a6a12" },
  cancelled: { bg: "rgba(150,60,40,0.12)", fg: "#9a3b28" },
  refunded: { bg: "rgba(110,110,110,0.14)", fg: "#6a6a6a" },
};

const primaryBtn: React.CSSProperties = {
  background: INK, border: "none", borderRadius: 999, padding: "13px 24px",
  cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff",
};
const ghostBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(84,84,84,0.2)", borderRadius: 999, padding: "13px 24px",
  cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 500, color: TEXT_COLOR,
};

function Skeleton({ h }: { h: number }) {
  return <div style={{ ...CARD, height: h, background: "rgba(84,84,84,0.05)", borderColor: "rgba(84,84,84,0.07)" }} />;
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null) return <span style={{ fontSize: 12, color: FAINT }}>— no prior data</span>;
  const up = delta >= 0;
  return (
    <span style={{ fontSize: 12, color: up ? UP : DOWN, fontWeight: 500 }}>
      {up ? "↑" : "↓"} {Math.abs(delta)}%{" "}
      <span style={{ color: FAINT, fontWeight: 400 }}>vs prev</span>
    </span>
  );
}

function KpiCard({ label, value, delta, i }: { label: string; value: string; delta: number | null; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: i * 0.05 }}
      style={{ ...CARD, padding: 20 }}
    >
      <div style={{ fontSize: 12.5, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR, margin: "7px 0 7px" }}>{value}</div>
      <Delta delta={delta} />
    </motion.div>
  );
}

function PeriodToggle({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid rgba(84,84,84,0.18)", borderRadius: 10, overflow: "hidden" }}>
      {PERIODS.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            style={{
              padding: "8px 16px", border: "none", cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 13,
              background: active ? INK : "transparent",
              color: active ? "#fff" : MUTED, fontWeight: active ? 600 : 500,
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function Trend({ data }: { data: Dash["trend"] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div style={{ ...CARD, padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>Revenue · last {data.length} days</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_COLOR }}>{money(total)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96 }}>
        {data.map((d, i) => {
          const recent = i >= data.length - 3;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${money(d.revenue)}`}
              style={{
                flex: 1,
                height: Math.max(3, (d.revenue / max) * 100) + "%",
                background: TEXT_COLOR,
                opacity: d.revenue === 0 ? 0.08 : recent ? 0.85 : 0.28,
                borderRadius: 3,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function Attention({ a, go }: { a: Dash["attention"]; go: (p: string) => void }) {
  const rows = [
    { label: "Orders pending", value: a.pendingOrders, path: "/admin/orders", tone: "#9a6a12" },
    { label: "Low on stock", value: a.lowStock, path: "/admin/inventory", tone: "#9a6a12" },
    { label: "Sold out", value: a.soldOut, path: "/admin/inventory", tone: "#9a3b28" },
  ];
  return (
    <div style={{ ...CARD, padding: "18px 22px" }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>Needs attention</div>
      {rows.map((r, i) => (
        <button
          key={r.label}
          onClick={() => go(r.path)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
            border: "none", borderTop: i ? "1px solid rgba(84,84,84,0.08)" : "none",
            background: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter Tight', sans-serif",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: r.value > 0 ? r.tone : "rgba(84,84,84,0.25)" }} />
          <span style={{ flex: 1, fontSize: 13.5, color: TEXT_COLOR }}>{r.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: r.value > 0 ? TEXT_COLOR : FAINT }}>{r.value}</span>
          <span style={{ fontSize: 15, color: FAINT }}>›</span>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { bg: "rgba(84,84,84,0.1)", fg: MUTED };
  return (
    <span style={{ minWidth: 88, textAlign: "center", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: s.bg, color: s.fg, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function RecentOrders({ orders, go }: { orders: Dash["recentOrders"]; go: (p: string) => void }) {
  return (
    <div style={{ ...CARD, padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>Recent orders</div>
        <button onClick={() => go("/admin/orders")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "#2b6cb0", fontFamily: "'Inter Tight', sans-serif" }}>
          View all ›
        </button>
      </div>
      {orders.length === 0 ? (
        <div style={{ padding: "20px 0", fontSize: 13.5, color: FAINT }}>No orders yet — they'll show up here.</div>
      ) : (
        orders.map((o, i) => (
          <button
            key={o.number}
            onClick={() => go("/admin/orders")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
              border: "none", borderTop: i ? "1px solid rgba(84,84,84,0.08)" : "none",
              background: "none", cursor: "pointer", textAlign: "left", fontFamily: "'Inter Tight', sans-serif",
            }}
          >
            <span style={{ width: 70, fontSize: 12.5, color: MUTED, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{o.number}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: TEXT_COLOR, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</span>
            <span style={{ width: 80, textAlign: "right", fontSize: 13.5, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>€{o.total.toFixed(2)}</span>
            <StatusBadge status={o.status} />
          </button>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { admin } = useAdminAuth();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<Dash>("admin/dashboard?period=" + period, true)
      .then((d) => alive && (setData(d), setLoading(false)))
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period]);

  const k = data?.kpis;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: FAINT, marginBottom: 10 }}>DASHBOARD</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1.5px", color: TEXT_COLOR, margin: 0 }}>
            Welcome back, {admin?.name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ fontSize: 14, color: MUTED, margin: "6px 0 0" }}>Here's your store at a glance.</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 14, marginBottom: 16 }}>
        {loading || !k ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} h={106} />)
        ) : (
          <>
            <KpiCard i={0} label="Revenue" value={money(k.revenue.value)} delta={k.revenue.delta} />
            <KpiCard i={1} label="Orders" value={String(k.orders.value)} delta={k.orders.delta} />
            <KpiCard i={2} label="New customers" value={String(k.newCustomers.value)} delta={k.newCustomers.delta} />
            <KpiCard i={3} label="Avg order value" value={money(k.avgOrder.value)} delta={k.avgOrder.delta} />
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr", gap: 14, marginBottom: 16 }}>
        {loading || !data ? (
          <>
            <Skeleton h={150} />
            <Skeleton h={150} />
          </>
        ) : (
          <>
            <Trend data={data.trend} />
            <Attention a={data.attention} go={navigate} />
          </>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        {loading || !data ? <Skeleton h={220} /> : <RecentOrders orders={data.recentOrders} go={navigate} />}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/admin/products")} style={primaryBtn}>Manage products</button>
        <button onClick={() => navigate("/admin/orders")} style={ghostBtn}>View orders</button>
        <button onClick={() => navigate("/admin/settings")} style={ghostBtn}>Theme &amp; settings</button>
      </div>
    </div>
  );
}
