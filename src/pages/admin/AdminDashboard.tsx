import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR_HEX } from "../../lib/constants";
import { INK, MUTED, FAINT, LINE } from "./ui";
import { useBaseCurrency, useBaseMoney } from "../../context/Currency";
import { apiGet } from "../../lib/api";
import { useAdminAuth } from "../../context/AdminAuth";
import { useIsMobile } from "../../lib/useResponsive";

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(20,20,20,0.1)",
  borderRadius: 16,
};
const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

/* Status-mix palette — validated (light surface): green→amber→blue→rust
   passes lightness band, chroma floor, CVD + normal-vision separation. */
const MIX = [
  { key: "fulfilled" as const, label: "Fulfilled", color: "#1f8a5d" },
  { key: "pending" as const, label: "Pending", color: "#a3690a" },
  { key: "inProgress" as const, label: "In progress", color: "#2b6cb0" },
  { key: "cancelled" as const, label: "Cancelled", color: "#b0402a" },
];
const UP = "#1f8a5d";
const DOWN = "#b0402a";

type KpiVal = { value: number; delta: number | null };
type TrendPt = { date: string; revenue: number; orders: number };
type Dash = {
  period: string;
  kpis: { revenue: KpiVal; orders: KpiVal; newCustomers: KpiVal; avgOrder: KpiVal };
  trend: TrendPt[];
  statusMix: Record<(typeof MIX)[number]["key"], number>;
  topProducts: { name: string; qty: number; revenue: number }[];
  recentOrders: { number: string; name: string; total: number; status: string; createdAt: string }[];
  attention: { pendingOrders: number; lowStock: number; soldOut: number };
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

/** Whole-number money in the admin base currency ("$1,240"). */
function useRoundMoney() {
  const fmtBase = useBaseMoney();
  return (n: number) => fmtBase(n, true);
}
/** Axis-tick money — "$1.2k" for thousands, symbol placement per currency. */
function useCompactMoney() {
  const base = useBaseCurrency();
  return (n: number) => {
    const core =
      n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(Math.round(n));
    return base.symbol.length === 1 ? base.symbol + core : `${core} ${base.symbol}`;
  };
}
const dayLabel = (iso: string, short: boolean) => {
  const d = new Date(iso + "T00:00:00");
  return short
    ? d.toLocaleDateString("en-GB", { weekday: "short" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const fullDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
/** Round an axis max up to a friendly 1/2/5 step. */
const niceMax = (n: number) => {
  if (n <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 5, 10]) if (n <= m * p) return m * p;
  return 10 * p;
};

const STATUS: Record<string, { bg: string; fg: string }> = {
  delivered: { bg: "rgba(31,138,93,0.12)", fg: "#1f8a5d" },
  paid: { bg: "rgba(31,138,93,0.12)", fg: "#1f8a5d" },
  shipped: { bg: "rgba(43,108,176,0.12)", fg: "#2b6cb0" },
  processing: { bg: "rgba(43,108,176,0.12)", fg: "#2b6cb0" },
  pending: { bg: "rgba(163,105,10,0.14)", fg: "#a3690a" },
  cancelled: { bg: "rgba(176,64,42,0.12)", fg: "#b0402a" },
  refunded: { bg: "rgba(110,110,110,0.14)", fg: "#6a6a6a" },
};

/* ------------------------------------------------------------------ bits */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0]?.contentRect.width ?? 0));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const ArrowUp = <path d="M12 5l6.5 11h-13L12 5z" />;
const ArrowDown = <path d="M12 19 5.5 8h13L12 19z" />;

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null)
    return <span style={{ fontSize: 11.5, color: FAINT }}>no prior data</span>;
  const up = delta >= 0;
  const c = up ? UP : DOWN;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11.5,
        fontWeight: 600,
        color: c,
        background: up ? "rgba(31,138,93,0.1)" : "rgba(176,64,42,0.1)",
        borderRadius: 999,
        padding: "2.5px 8px",
        ...TABULAR,
      }}
    >
      <svg width={9} height={9} viewBox="0 0 24 24" fill={c}>
        {up ? ArrowUp : ArrowDown}
      </svg>
      {Math.abs(delta)}%
    </span>
  );
}

/** Tiny area sparkline for a KPI tile. */
function Spark({ data, kind }: { data: number[]; kind: "area" | "bars" }) {
  const W = 76, H = 30;
  const max = Math.max(1, ...data);
  if (kind === "bars") {
    const bw = Math.max(2, Math.floor(W / data.length) - 2);
    return (
      <svg width={W} height={H} aria-hidden>
        {data.map((v, i) => {
          const h = Math.max(2, (v / max) * (H - 4));
          return (
            <rect
              key={i}
              x={i * (W / data.length) + 1}
              y={H - h}
              width={bw}
              height={h}
              rx={1.5}
              fill={v === 0 ? "rgba(20,20,20,0.1)" : "rgba(20,20,20,0.6)"}
            />
          );
        })}
      </svg>
    );
  }
  const pts = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * (W - 2) + 1,
    H - 3 - (v / max) * (H - 8),
  ]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg width={W} height={H} aria-hidden>
      <path
        d={`${line} L ${W - 1} ${H - 1} L 1 ${H - 1} Z`}
        fill={GLOW_COLOR_HEX}
        opacity={0.3}
      />
      <path d={line} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function KpiTile({
  label,
  value,
  delta,
  spark,
  i,
}: {
  label: string;
  value: string;
  delta: number | null;
  spark?: React.ReactNode;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: i * 0.05 }}
      style={{ ...CARD, padding: "16px 18px 15px" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.8px",
              color: TEXT_COLOR,
              margin: "6px 0 8px",
              ...TABULAR,
            }}
          >
            {value}
          </div>
          <DeltaChip delta={delta} />
        </div>
        {spark && <div style={{ paddingTop: 4, flexShrink: 0 }}>{spark}</div>}
      </div>
    </motion.div>
  );
}

function PeriodToggle({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden" }}>
      {PERIODS.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            style={{
              padding: "8px 15px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12.5,
              background: active ? INK : "transparent",
              color: active ? "#fff" : MUTED,
              fontWeight: active ? 600 : 500,
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

/* --------------------------------------------------- revenue area chart */

function RevenueChart({ data }: { data: TrendPt[] }) {
  const money = useRoundMoney();
  const compact = useCompactMoney();
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 208;
  const PAD = { l: 46, r: 12, t: 12, b: 26 };
  const iw = Math.max(0, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const max = niceMax(Math.max(...data.map((d) => d.revenue)));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const empty = total === 0;

  const X = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const Y = (v: number) => PAD.t + ih - (v / max) * ih;

  const line = data.map((d, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(d.revenue).toFixed(1)).join(" ");
  const area = `${line} L ${X(data.length - 1).toFixed(1)} ${(PAD.t + ih).toFixed(1)} L ${X(0).toFixed(1)} ${(PAD.t + ih).toFixed(1)} Z`;

  const step = Math.max(1, Math.ceil(data.length / 6));
  const short = data.length <= 7;

  const locate = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const x = clientX - rect.left;
    let best = 0, bd = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(X(i) - x);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };

  const h = hover != null ? data[hover] : null;
  const tipX = hover != null ? Math.min(Math.max(X(hover), 70), Math.max(70, w - 84)) : 0;

  return (
    <div style={{ ...CARD, padding: "18px 20px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>Revenue · last {data.length} days</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_COLOR, ...TABULAR }}>{money(total)}</div>
      </div>
      <div
        ref={ref}
        style={{ position: "relative", height: H, cursor: "crosshair", touchAction: "pan-y" }}
        onMouseMove={(e) => locate(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => locate(e.touches[0].clientX)}
        onTouchMove={(e) => locate(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {w > 0 && (
          <svg width={w} height={H} style={{ display: "block" }}>
            {/* recessive grid: 0 / half / max */}
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={PAD.l}
                  x2={w - PAD.r}
                  y1={Y(max * f)}
                  y2={Y(max * f)}
                  stroke={LINE}
                  strokeWidth={1}
                  strokeDasharray={f === 0 ? undefined : "3 4"}
                />
                <text
                  x={PAD.l - 8}
                  y={Y(max * f) + 3.5}
                  textAnchor="end"
                  fontSize={10.5}
                  fill={FAINT}
                  fontFamily="'Inter Tight', sans-serif"
                  style={TABULAR as any}
                >
                  {compact(max * f)}
                </text>
              </g>
            ))}
            {/* x labels, sparse */}
            {data.map((d, i) =>
              i % step === 0 || i === data.length - 1 ? (
                <text
                  key={d.date}
                  x={X(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={FAINT}
                  fontFamily="'Inter Tight', sans-serif"
                >
                  {dayLabel(d.date, short)}
                </text>
              ) : null
            )}
            {!empty && (
              <>
                <path d={area} fill={GLOW_COLOR_HEX} opacity={0.26} />
                <path d={line} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}
            {empty && (
              <line x1={PAD.l} x2={w - PAD.r} y1={Y(0)} y2={Y(0)} stroke="rgba(20,20,20,0.25)" strokeWidth={2} />
            )}
            {/* hover layer: crosshair + ringed dot */}
            {h && !empty && (
              <>
                <line x1={X(hover!)} x2={X(hover!)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(20,20,20,0.18)" strokeWidth={1} />
                <circle cx={X(hover!)} cy={Y(h.revenue)} r={5} fill={INK} stroke="#fff" strokeWidth={2} />
              </>
            )}
          </svg>
        )}
        {/* tooltip */}
        {h && !empty && (
          <div
            style={{
              position: "absolute",
              left: tipX,
              top: 2,
              transform: "translateX(-50%)",
              background: INK,
              color: "#fff",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              lineHeight: 1.5,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 8px 24px rgba(20,20,20,0.25)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>{fullDay(h.date)}</div>
            <div style={{ fontWeight: 700, ...TABULAR }}>{money(h.revenue)}</div>
            <div style={{ color: "rgba(255,255,255,0.65)", ...TABULAR }}>
              {h.orders} order{h.orders === 1 ? "" : "s"}
            </div>
          </div>
        )}
        {empty && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: FAINT,
              pointerEvents: "none",
            }}
          >
            No revenue in this period yet.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ status mix card */

function StatusMixCard({ mix }: { mix: Dash["statusMix"] }) {
  const total = MIX.reduce((s, m) => s + (mix[m.key] || 0), 0);
  return (
    <div style={{ ...CARD, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>Order pipeline</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_COLOR, ...TABULAR }}>{total}</div>
      </div>
      {total === 0 ? (
        <div style={{ fontSize: 12.5, color: FAINT, padding: "6px 0 2px" }}>No orders in this window.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
            {MIX.filter((m) => (mix[m.key] || 0) > 0).map((m) => (
              <div
                key={m.key}
                title={`${m.label}: ${mix[m.key]}`}
                style={{ flex: mix[m.key], background: m.color, minWidth: 4 }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {MIX.map((m) => {
              const v = mix[m.key] || 0;
              return (
                <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: TEXT_COLOR }}>{m.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: v ? TEXT_COLOR : FAINT, ...TABULAR }}>{v}</span>
                  <span style={{ width: 38, textAlign: "right", fontSize: 11.5, color: FAINT, ...TABULAR }}>
                    {total ? Math.round((v / total) * 100) : 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------- top products */

function TopProducts({ items }: { items: Dash["topProducts"] }) {
  const money = useRoundMoney();
  const max = Math.max(1, ...items.map((t) => t.revenue));
  return (
    <div style={{ ...CARD, padding: "16px 20px" }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>Best sellers</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: FAINT, padding: "6px 0" }}>No sales in this window yet.</div>
      ) : (
        items.map((t, i) => (
          <div key={t.name} style={{ padding: "8px 0", borderTop: i ? "1px solid rgba(20,20,20,0.06)" : "none" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ width: 16, fontSize: 11.5, color: FAINT, ...TABULAR }}>{i + 1}</span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.name}
              </span>
              <span style={{ fontSize: 11.5, color: MUTED, ...TABULAR }}>×{t.qty}</span>
              <span style={{ width: 62, textAlign: "right", fontSize: 12.5, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
                {money(t.revenue)}
              </span>
            </div>
            <div style={{ marginLeft: 26, marginTop: 5, height: 4, borderRadius: 999, background: "rgba(20,20,20,0.06)" }}>
              <div
                style={{
                  width: `${Math.max(3, (t.revenue / max) * 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: GLOW_COLOR_HEX,
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------- attention + orders */

function Attention({ a, go }: { a: Dash["attention"]; go: (p: string) => void }) {
  const rows = [
    { label: "Orders pending", value: a.pendingOrders, path: "/admin/orders", tone: "#a3690a" },
    { label: "Low on stock", value: a.lowStock, path: "/admin/inventory", tone: "#a3690a" },
    { label: "Sold out", value: a.soldOut, path: "/admin/inventory", tone: "#b0402a" },
  ];
  return (
    <div style={{ ...CARD, padding: "16px 20px" }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>Needs attention</div>
      {rows.map((r, i) => (
        <button
          key={r.label}
          onClick={() => go(r.path)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 0",
            border: "none",
            borderTop: i ? "1px solid rgba(20,20,20,0.06)" : "none",
            background: "none",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "'Inter Tight', sans-serif",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              flexShrink: 0,
              background: r.value > 0 ? r.tone : "rgba(20,20,20,0.18)",
            }}
          />
          <span style={{ flex: 1, fontSize: 13, color: TEXT_COLOR }}>{r.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: r.value > 0 ? TEXT_COLOR : FAINT, ...TABULAR }}>
            {r.value}
          </span>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={FAINT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { bg: "rgba(20,20,20,0.08)", fg: MUTED };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minWidth: 86,
        fontSize: 11.5,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        textTransform: "capitalize",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: s.fg }} />
      {status}
    </span>
  );
}

function RecentOrders({ orders, go }: { orders: Dash["recentOrders"]; go: (p: string) => void }) {
  const fmtBase = useBaseMoney();
  return (
    <div style={{ ...CARD, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 12.5, color: MUTED }}>Recent orders</div>
        <button
          onClick={() => go("/admin/orders")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 500,
            color: TEXT_COLOR,
            fontFamily: "'Inter Tight', sans-serif",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          View all
        </button>
      </div>
      {orders.length === 0 ? (
        <div style={{ padding: "16px 0", fontSize: 13, color: FAINT }}>No orders yet — they'll show up here.</div>
      ) : (
        orders.map((o, i) => (
          <button
            key={o.number}
            onClick={() => go("/admin/orders")}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              border: "none",
              borderTop: i ? "1px solid rgba(20,20,20,0.06)" : "none",
              background: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Inter Tight', sans-serif",
            }}
          >
            <span style={{ width: 66, fontSize: 12, color: MUTED, flexShrink: 0, ...TABULAR }}>{o.number}</span>
            <span style={{ flex: 1, fontSize: 13, color: TEXT_COLOR, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {o.name}
            </span>
            <span style={{ width: 74, textAlign: "right", fontSize: 13, fontWeight: 600, color: TEXT_COLOR, flexShrink: 0, ...TABULAR }}>
              {fmtBase(o.total)}
            </span>
            <StatusBadge status={o.status} />
          </button>
        ))
      )}
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div style={{ ...CARD, height: h, background: "rgba(20,20,20,0.04)", borderColor: "rgba(20,20,20,0.06)" }} />;
}

/* -------------------------------------------------------------------- page */

export default function AdminDashboard() {
  const money = useRoundMoney();
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
  const revSeries = data?.trend.map((t) => t.revenue) ?? [];
  const ordSeries = data?.trend.map((t) => t.orders) ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1.2px", color: TEXT_COLOR, margin: 0 }}>
            Welcome back, {admin?.name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "5px 0 0" }}>Here's your store at a glance.</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {loading || !k ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} h={104} />)
        ) : (
          <>
            <KpiTile i={0} label="Revenue" value={money(k.revenue.value)} delta={k.revenue.delta} spark={<Spark data={revSeries} kind="area" />} />
            <KpiTile i={1} label="Orders" value={String(k.orders.value)} delta={k.orders.delta} spark={<Spark data={ordSeries} kind="bars" />} />
            <KpiTile i={2} label="New customers" value={String(k.newCustomers.value)} delta={k.newCustomers.delta} />
            <KpiTile i={3} label="Avg order value" value={money(k.avgOrder.value)} delta={k.avgOrder.delta} />
          </>
        )}
      </div>

      {/* chart + right rail */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.9fr 1fr", gap: 12, marginBottom: 12 }}>
        {loading || !data ? (
          <>
            <Skeleton h={272} />
            <Skeleton h={272} />
          </>
        ) : (
          <>
            <RevenueChart data={data.trend} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Attention a={data.attention} go={navigate} />
              <StatusMixCard mix={data.statusMix} />
            </div>
          </>
        )}
      </div>

      {/* best sellers + recent orders */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr", gap: 12, marginBottom: 16 }}>
        {loading || !data ? (
          <>
            <Skeleton h={220} />
            <Skeleton h={220} />
          </>
        ) : (
          <>
            <TopProducts items={data.topProducts} />
            <RecentOrders orders={data.recentOrders} go={navigate} />
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/admin/products")}
          style={{
            background: INK,
            border: "none",
            borderRadius: 999,
            padding: "11px 20px",
            cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          Manage products
        </button>
        {[
          { label: "View orders", path: "/admin/orders" },
          { label: "Theme & settings", path: "/admin/settings" },
        ].map((b) => (
          <button
            key={b.path}
            onClick={() => navigate(b.path)}
            style={{
              background: "#fff",
              border: "1px solid rgba(20,20,20,0.2)",
              borderRadius: 999,
              padding: "11px 20px",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: TEXT_COLOR,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
