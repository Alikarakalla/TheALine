import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, API_BASE } from "../../lib/api";
import { Icon } from "./icons";

/**
 * Admin dashboard — operational overview ported from the lebazone admin:
 * KPI tiles, date/status filters, gross-profit trend vs the prior period,
 * breakdowns, operational status, customers, catalog, recent activity,
 * alerts and quick actions. Data comes formatted from GET admin/dashboard.
 */

const T = {
  bg: "#f5f5f3",
  surface: "#fff",
  border: "#eee",
  borderMid: "#e0e0dc",
  text: "#111",
  textSub: "#666",
  textMuted: "#aaa",
  textFaint: "#aaa",
  accent: "#111",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  blueBorder: "#bfdbfe",
  font: "'Inter Tight', 'Helvetica Neue', sans-serif",
  mono: "'DM Mono', 'Consolas', monospace",
  radius: 10,
  radiusSm: 6,
};

const S = (base: any, ...overrides: any[]) => Object.assign({}, base, ...overrides);
const card: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "12px 14px", boxShadow: "0 1px 2px rgba(15,23,42,.03)" };
const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 12px", minHeight: 32, fontSize: 11, fontWeight: 500,
  border: `1px solid ${T.borderMid}`, borderRadius: 8, background: T.surface, color: T.textSub, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap",
};
const btnPrimary = S(btn, { background: T.accent, color: "#fff", border: `1px solid ${T.accent}` });

const tint = (hex: string, alpha = "1a") => (/^#[0-9a-fA-F]{6}$/.test(hex) ? hex + alpha : "#f0f0ee");

function smoothLine(points: { x: number; y: number }[]) {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x},${points[0].y}` : "";
  const slopes = points.slice(0, -1).map((p, i) => (points[i + 1].y - p.y) / Math.max(points[i + 1].x - p.x, 1));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[slopes.length - 1];
    const a = slopes[i - 1], b = slopes[i];
    if (a === 0 || b === 0 || Math.sign(a) !== Math.sign(b)) return 0;
    return (2 * a * b) / (a + b);
  });
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i], p2 = points[i + 1], dx = p2.x - p1.x;
    d += ` C ${p1.x + dx / 3},${p1.y + (tangents[i] * dx) / 3} ${p2.x - dx / 3},${p2.y - (tangents[i + 1] * dx) / 3} ${p2.x},${p2.y}`;
  }
  return d;
}

function trendMeta(sub?: string) {
  if (typeof sub !== "string") return { dir: 0, badge: "", rest: "" };
  const up = sub.includes("↑"), down = sub.includes("↓");
  if (!up && !down) return { dir: 0, badge: "", rest: sub };
  const cleaned = sub.replace(/[↑↓]/g, "").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/\bvs\b/i);
  return { dir: up ? 1 : -1, badge: parts[0].trim(), rest: parts.length > 1 ? `vs${parts.slice(1).join("vs")}`.trim() : "" };
}

/* ── primitives ── */
function Pill({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 600, background: bg, color, border: `1px solid ${border}`, lineHeight: 1.5, whiteSpace: "nowrap" }}>{label}</span>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "Pending", color: "#92400e", bg: T.amberBg, border: T.amberBorder },
    paid: { label: "Paid", color: "#166534", bg: T.greenBg, border: T.greenBorder },
    processing: { label: "Processing", color: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
    shipped: { label: "Shipped", color: "#115e59", bg: "#f0fdfa", border: "#99f6e4" },
    delivered: { label: "Delivered", color: "#166534", bg: T.greenBg, border: T.greenBorder },
    cancelled: { label: "Cancelled", color: "#b42318", bg: T.redBg, border: T.redBorder },
    refunded: { label: "Refunded", color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
  };
  return <Pill {...(map[status] || map.pending)} />;
}

function IconChip({ name, color = "#999999", size = 28 }: { name: string; color?: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, background: tint(color), color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#555", border: `1px solid ${tint(color, "40")}`, display: "grid", placeItems: "center" }}>
      <Icon name={name} size={Math.round(size * 0.55)} />
    </span>
  );
}

type Alert = { icon: string; text: string; meta?: string; level: "warn" | "error" | "info"; url?: string | null };
function AlertItem({ icon, text, meta, level, url, go }: Alert & { go: (p: string) => void }) {
  const colors: Record<string, string> = { warn: T.amber, error: T.red, info: T.blue };
  const bgs: Record<string, string> = { warn: T.amberBg, error: T.redBg, info: T.blueBg };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 11px", borderRadius: T.radiusSm, background: bgs[level] || "#fafaf8", marginBottom: 6 }}>
      <span style={{ color: colors[level] || T.textSub, marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={15} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: T.text, lineHeight: 1.4 }}>{text}</div>
        {meta && <div style={{ fontSize: 10.5, color: T.textSub, marginTop: 1 }}>{meta}</div>}
      </div>
      {url ? (
        <button onClick={() => go(url)} style={{ fontSize: 10.5, fontWeight: 600, color: colors[level] || T.textSub, border: `1px solid ${colors[level] || T.borderMid}`, borderRadius: 6, padding: "3px 8px", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3, fontFamily: T.font }}>
          Open <Icon name="chevron" size={11} style={{ transform: "rotate(-90deg)" }} />
        </button>
      ) : null}
    </div>
  );
}

type BarRow = { l: string; v: string; pct: number };
const BAR_PALETTE = ["#2563eb", "#16a34a", "#d97706", "#8b5cf6", "#ec4899", "#06b6d4", "#dc2626", "#0d9488"];

function MetricBar({ l, v, pct = 0, color, i = 0 }: BarRow & { color?: string; i?: number }) {
  const c = color || BAR_PALETTE[i % BAR_PALETTE.length];
  const width = Number(pct) > 0 ? Math.max(4, Math.min(Number(pct), 100)) : 0;
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
        <span style={{ minWidth: 0, color: "#404040", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l}>{l || "—"}</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexShrink: 0 }}>
          <strong style={{ fontSize: 11, color: T.text }}>{v}</strong>
          <span style={{ fontSize: 9, color: T.textFaint, minWidth: 28, textAlign: "right" }}>{pct}%</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: c, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}

function Breakdown({ title, subtitle, items, emptyText, icon, color }: { title: string; subtitle?: string; items?: BarRow[]; emptyText: string; icon?: string; color?: string }) {
  const rows = items || [];
  return (
    <div>
      <div className="dash-analytics-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {icon ? <IconChip name={icon} color={color} size={28} /> : null}
      </div>
      {rows.length > 0
        ? rows.map((r, i) => <MetricBar key={`${r.l}-${i}`} {...r} color={color && i === 0 ? undefined : undefined} i={i} />)
        : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "20px 0", color: T.textFaint }}>
            <Icon name="empty" size={20} />
            <span style={{ fontSize: 11 }}>{emptyText}</span>
          </div>
        )}
    </div>
  );
}

function Section({ label, children, action, onAction }: { label: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", color: T.textMuted, margin: 0 }}>{label}</h2>
        {action && (
          <button style={S(btn, { fontSize: 11, padding: "5px 9px", gap: 4 })} onClick={onAction}>
            {action} <Icon name="chevron" size={12} style={{ transform: "rotate(-90deg)" }} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function CardHead({ icon, title, color = "#999999", right, mb = 14 }: { icon: string; title: string; color?: string; right?: React.ReactNode; mb?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: mb }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <IconChip name={icon} color={color} size={28} />
        <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

function RevenueChart({ labels = [], current = [], previous = [], sym = "$" }: { labels?: string[]; current?: number[]; previous?: number[]; sym?: string }) {
  const fmtMoney = (v: number) => {
    const n = Math.abs(v);
    const core = n >= 1000000 ? `${(v / 1000000).toFixed(n % 1000000 ? 1 : 0)}M` : n >= 1000 ? `${(v / 1000).toFixed(n % 1000 ? 1 : 0)}k` : String(Math.round(v));
    return sym.length === 1 ? sym + core : `${core} ${sym}`;
  };
  const safeLabels = labels.length > 0 ? labels : ["No data"];
  const safeCurrent = current.length > 0 ? current : [0];
  const safePrevious = previous.length === safeCurrent.length ? previous : new Array(safeCurrent.length).fill(0);
  const n = safeCurrent.length;
  const W = 1000, H = 220;
  const pad = { l: 56, r: 16, t: 16, b: 28 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const baseline = pad.t + iH;
  const maxV = Math.max(...safeCurrent, ...safePrevious, 1);
  const xAt = (i: number) => pad.l + (i / Math.max(n - 1, 1)) * iW;
  const yAt = (v: number) => pad.t + iH - (v / maxV) * iH;
  const curPts = safeCurrent.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const prevPts = safePrevious.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const curLine = smoothLine(curPts);
  const prevLine = smoothLine(prevPts);
  const curArea = curPts.length > 1 ? `${curLine} L ${curPts[curPts.length - 1].x},${baseline} L ${curPts[0].x},${baseline} Z` : "";
  const gridLevels = [1, 0.75, 0.5, 0.25, 0];
  const tickStep = Math.max(1, Math.ceil(n / 6));
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const handleMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const xView = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((xView - pad.l) / iW) * (n - 1)))));
  };
  const hp = hover !== null ? { x: xAt(hover), y: yAt(safeCurrent[hover]) } : null;
  const tipW = 110;
  const tipX = hp ? Math.max(pad.l, Math.min(hp.x - tipW / 2, pad.l + iW - tipW)) : 0;
  const tipY = hp ? (hp.y > pad.t + 46 ? hp.y - 52 : hp.y + 14) : 0;
  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gross profit trend, this period versus prior period" style={{ display: "block", overflow: "visible", cursor: "crosshair" }} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#111827" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLevels.map((lvl, i) => {
        const y = pad.t + iH - lvl * iH;
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + iW} y1={y} y2={y} stroke="#f2f2f0" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill={T.textFaint}>{lvl > 0 ? fmtMoney(maxV * lvl) : fmtMoney(0)}</text>
          </g>
        );
      })}
      {curArea && <path d={curArea} fill="url(#revFill)" />}
      {prevLine && <path d={prevLine} fill="none" stroke={T.blue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
      {curLine && <path d={curLine} fill="none" stroke="#111827" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {safeLabels.map((d, i) => {
        if (i % tickStep !== 0 && i !== n - 1) return null;
        return <text key={`${d}-${i}`} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={T.textFaint}>{d}</text>;
      })}
      {hp && hover !== null && (
        <g>
          <line x1={hp.x} x2={hp.x} y1={pad.t} y2={baseline} stroke="#111827" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <circle cx={hp.x} cy={hp.y} r="5" fill="#111827" stroke="#fff" strokeWidth="2" />
          <rect x={tipX} y={tipY} width={tipW} height={38} rx="8" fill="#111" opacity="0.92" />
          <text x={tipX + tipW / 2} y={tipY + 15} textAnchor="middle" fontSize="9.5" fill="#bbb">{safeLabels[hover]}</text>
          <text x={tipX + tipW / 2} y={tipY + 29} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">{fmtMoney(safeCurrent[hover])}</text>
        </g>
      )}
    </svg>
  );
}

type Kpi = { label: string; val: string; sub: string; icon: string; color?: string; alert?: boolean };
function KpiCard({ k }: { k: Kpi }) {
  const t = trendMeta(k.sub);
  const trendColor = t.dir > 0 ? T.green : t.dir < 0 ? T.red : T.textSub;
  const iconColor = k.alert ? T.red : (typeof k.color === "string" && k.color.startsWith("#") ? k.color : T.textMuted);
  return (
    <section style={S(card, { minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }, k.alert ? { borderColor: T.redBorder, background: T.redBg } : {})}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: T.textMuted, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
        <div style={{ marginTop: 5, fontSize: 18, fontWeight: 800, lineHeight: 1, color: k.alert ? T.red : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{k.val}</div>
        <div style={{ marginTop: 5, color: trendColor, fontSize: 10, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.dir !== 0 && t.badge ? `${t.dir > 0 ? "↑" : "↓"} ${t.badge}${t.rest ? ` ${t.rest}` : ""}` : (t.rest || k.sub)}
        </div>
      </div>
      <IconChip name={k.icon} color={iconColor} size={28} />
    </section>
  );
}

const STYLE = `
.dash-root, .dash-root * { box-sizing: border-box; }
.dash-title-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 9px; background: #f8fafc; color: #111827; }
.dash-filters { display: grid; grid-template-columns: auto repeat(3, minmax(130px, .55fr)) minmax(300px, 1.4fr); gap: 10px; align-items: end; }
.dash-filters label > span { display: block; margin-bottom: 5px; color: #9ca3af; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
.dash-quick-ranges { min-height: 34px; display: inline-flex; align-items: center; gap: 3px; padding: 3px; border-radius: 8px; background: #f1f5f9; }
.dash-filter-meta { min-height: 34px; display: flex; align-items: center; justify-content: flex-end; gap: 14px; color: #666; font-size: 10px; flex-wrap: wrap; }
.dash-analytics-head { min-height: 35px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.dash-analytics-head h3 { margin: 0; color: #111827; font-size: 13px; font-weight: 800; line-height: 1.2; }
.dash-analytics-head p { margin: 3px 0 0; color: #737373; font-size: 10px; line-height: 1.35; }
.dash-chart-legend { display: inline-flex; align-items: center; gap: 10px; color: #737373; font-size: 10px; white-space: nowrap; }
.dash-chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.dash-chart-legend i { width: 8px; height: 8px; display: inline-block; border-radius: 999px; }
@keyframes dash-indeterminate { 0% { left: -35%; } 100% { left: 100%; } }
.dash-root button:focus-visible, .dash-root a:focus-visible, .dash-root select:focus-visible, .dash-root input:focus-visible { outline: 2px solid #111; outline-offset: 2px; border-radius: 8px; }
.dash-root tr:last-child td { border-bottom: none !important; }
.dash-row:hover td { background: #fafafa; }
.dash-progress { position: relative; height: 2px; overflow: hidden; border-radius: 999px; background: transparent; }
.dash-progress::after { content: ""; position: absolute; left: -35%; top: 0; height: 100%; width: 35%; background: #111; border-radius: 999px; animation: dash-indeterminate 1.1s ease-in-out infinite; }
@media (max-width: 1320px) {
  .dash-kpi { grid-template-columns: repeat(3, 1fr) !important; }
  .dash-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .dash-filter-meta { justify-content: flex-start; grid-column: span 2; }
}
@media (max-width: 1080px) {
  .dash-3, .dash-sales { grid-template-columns: 1fr !important; }
  .dash-qa { grid-template-columns: repeat(4, 1fr) !important; }
}
@media (max-width: 720px) {
  .dash-kpi { grid-template-columns: repeat(2, 1fr) !important; }
  .dash-qa { grid-template-columns: repeat(3, 1fr) !important; }
  .dash-filters { grid-template-columns: 1fr; }
  .dash-filter-meta { grid-column: auto; justify-content: flex-start; }
}
@media (max-width: 460px) {
  .dash-kpi { grid-template-columns: 1fr !important; }
  .dash-qa { grid-template-columns: repeat(2, 1fr) !important; }
}
`;

const DATE_PRESETS = [{ label: "7D", days: 7 }, { label: "30D", days: 30 }, { label: "90D", days: 90 }];
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const toYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { from: toYmd(start), to: toYmd(end) };
};

const dateInputStyle: React.CSSProperties = { width: "100%", minHeight: 34, fontFamily: T.font, fontSize: 11, color: T.text, border: `1px solid ${T.borderMid}`, borderRadius: 8, padding: "7px 10px", background: "#fafaf8", outline: "none" };
const selectStyle: React.CSSProperties = { ...dateInputStyle, cursor: "pointer" };

const QUICK_ACTIONS = [
  { label: "Add product", icon: "plus", url: "/admin/products" },
  { label: "Orders", icon: "cart", url: "/admin/orders" },
  { label: "Inventory", icon: "package", url: "/admin/inventory", alertKey: "lowStock" },
  { label: "Customers", icon: "users", url: "/admin/customers" },
  { label: "Currencies", icon: "coins", url: "/admin/currencies" },
  { label: "Banners", icon: "image", url: "/admin/banners" },
  { label: "Settings", icon: "gear", url: "/admin/settings" },
];

type Dash = any;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const go = useCallback((p: string) => navigate(p), [navigate]);
  const [dashboard, setDashboard] = useState<Dash | null>(null);
  const [filters, setFilters] = useState(() => ({ ...defaultRange(), status: "" }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status) params.set("status", filters.status);
    apiGet<Dash>(`admin/dashboard?${params.toString()}`, true)
      .then((p) => { if (!alive) return; setDashboard(p); setError(null); setLoading(false); setUpdatedAt(new Date()); })
      .catch(() => { if (!alive) return; setError("Could not refresh the dashboard. Check your connection and retry."); setLoading(false); });
    return () => { alive = false; };
  }, [filters, reloadKey]);

  const setFilter = (key: string, val: string) => setFilters((c) => ({ ...c, [key]: val }));

  const activePreset = useMemo(() => {
    if (!filters.from || !filters.to || filters.to !== toYmd(new Date())) return null;
    const match = DATE_PRESETS.find((p) => {
      const start = new Date();
      start.setDate(start.getDate() - (p.days - 1));
      return toYmd(start) === filters.from;
    });
    return match ? match.days : null;
  }, [filters.from, filters.to]);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setFilters((c) => ({ ...c, from: toYmd(start), to: toYmd(end) }));
  };

  // The API needs the Bearer token, so Export fetches the CSV as a blob and
  // hands it to the browser as a download.
  const exportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.status) params.set("status", filters.status);
      const t = localStorage.getItem("lovebag-admin-token");
      const res = await fetch(`${API_BASE}/admin/dashboard/export?${params.toString()}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${filters.from}-to-${filters.to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const meta = dashboard?.meta;
  const sym = meta?.currencySymbol || "€";
  const criticalAlerts: Alert[] = (dashboard?.alerts?.immediate || []).filter((a: Alert) => a.level === "error");

  return (
    <div className="dash-root" style={{ fontFamily: T.font, fontSize: 13, color: T.text, paddingBottom: "3rem", display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{STYLE}</style>

      {/* HEADER */}
      <section style={S(card, { borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" })}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span className="dash-title-icon"><Icon name="chart" size={15} /></span>
            <h1 style={{ margin: 0, fontSize: 18, lineHeight: 1.2, fontWeight: 800, letterSpacing: 0 }}>Dashboard</h1>
          </div>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.35, color: T.textSub }}>Operational overview — orders, gross profit, customers, and store health.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
          <button style={btn} onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            <Icon name="refresh" size={14} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button style={btn} onClick={() => go("/admin/orders")}><Icon name="package" size={14} /> Orders</button>
          <button style={btnPrimary} onClick={exportCsv} disabled={exporting}><Icon name="download" size={14} /> {exporting ? "Exporting…" : "Export"}</button>
        </div>
      </section>

      {error ? (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: T.redBg, border: `1px solid ${T.redBorder}`, color: "#b42318", fontSize: 12.5 }}>
          <Icon name="alert" size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button style={btn} onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
        </div>
      ) : null}

      {/* CRITICAL ALERT BANNER */}
      {criticalAlerts.length > 0 ? (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: T.redBg, border: `1px solid ${T.redBorder}` }}>
          <span style={{ color: T.red, flexShrink: 0 }}><Icon name="alert" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#b42318" }}>{criticalAlerts.length} {criticalAlerts.length === 1 ? "issue needs" : "issues need"} immediate action</div>
            <div style={{ fontSize: 11.5, color: "#9b2c2c", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{criticalAlerts.map((a) => a.text).join(" · ")}</div>
          </div>
          <button onClick={() => go("/admin/orders")} style={{ ...btn, borderColor: T.redBorder, color: T.red, flexShrink: 0 }}>Review</button>
        </div>
      ) : null}

      {/* KEY METRICS */}
      <Section label="Key metrics">
        <div className="dash-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {(dashboard?.kpis || []).map((k: Kpi) => <KpiCard key={k.label} k={k} />)}
          {!dashboard && Array.from({ length: 8 }).map((_, i) => <div key={i} style={S(card, { minHeight: 74, background: "#fafaf8" })} />)}
        </div>
      </Section>

      {/* FILTER TOOLBAR */}
      <section style={S(card, { display: "grid", gap: 10 })}>
        <div className="dash-filters">
          <div className="dash-quick-ranges">
            {DATE_PRESETS.map((p) => (
              <button key={p.days} type="button" aria-pressed={activePreset === p.days} onClick={() => applyPreset(p.days)}
                style={{ height: 29, minWidth: 36, padding: "0 8px", fontSize: 10, fontWeight: 800, border: "none", borderRadius: 7, cursor: "pointer", fontFamily: T.font, color: activePreset === p.days ? T.text : T.textSub, background: activePreset === p.days ? "#fff" : "transparent", boxShadow: activePreset === p.days ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>
                {p.label}
              </button>
            ))}
          </div>
          <label><span>From</span><input type="date" aria-label="From date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} style={dateInputStyle} /></label>
          <label><span>To</span><input type="date" aria-label="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} style={dateInputStyle} /></label>
          <label><span>Status</span><select aria-label="Order status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} style={selectStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
          <span className="dash-filter-meta">
            <span>Store: <strong style={{ color: T.text }}>{meta?.store || "Lebanon"}</strong></span>
            <span>Currency: <strong style={{ color: T.text }}>{meta?.currency || ""}</strong></span>
            <span aria-live="polite" aria-atomic="true">{loading ? "Updating…" : updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </span>
        </div>
        <div aria-hidden={!loading}>{loading ? <div className="dash-progress" /> : null}</div>
      </section>

      {/* SALES PERFORMANCE */}
      <Section label="Sales performance" action="Go to orders" onAction={() => go("/admin/orders")}>
        <div className="dash-sales" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, .75fr)", gap: 10 }}>
          <div style={card}>
            <div className="dash-analytics-head">
              <div><h3>Gross profit trend</h3><p>Daily gross profit compared with the prior period.</p></div>
              <div className="dash-chart-legend"><span><i style={{ background: "#111827" }} />This period</span><span><i style={{ background: T.blue }} />Prior period</span></div>
            </div>
            <RevenueChart labels={dashboard?.salesPerformance?.revenueTrend?.labels} current={dashboard?.salesPerformance?.revenueTrend?.current} previous={dashboard?.salesPerformance?.revenueTrend?.previous} sym={sym} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              {(dashboard?.salesPerformance?.summary || []).map((s: { l: string; v: string; s: string }) => (
                <div key={s.l}>
                  <div style={{ fontSize: 10, color: T.textSub, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: T.textFaint }}>{s.s}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <Breakdown icon="star" color={T.blue} title="Top products" subtitle="Revenue share in the selected period." items={dashboard?.salesPerformance?.topProducts} emptyText="No sales in this period" />
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14 }}>
              <Breakdown icon="tag" color={T.green} title="Gross profit by category" subtitle="Category contribution to gross profit." items={dashboard?.salesPerformance?.categoryRevenue} emptyText="No category profit yet" />
            </div>
          </div>
        </div>
      </Section>

      {/* OPERATIONAL STATUS */}
      <Section label="Operational status" action="Go to orders" onAction={() => go("/admin/orders")}>
        <div className="dash-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={card}>
            <CardHead icon="package" title="Orders by status" color={T.blue} />
            {(dashboard?.operationalStatus?.orderStatuses || []).map((r: any) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 11.5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: T.textSub }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{r.count}</span>
                <span style={{ color: T.textFaint, minWidth: 30, textAlign: "right" }}>{r.pct}%</span>
              </div>
            ))}
            {(dashboard?.operationalStatus?.orderStatuses || []).length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "10px 0" }}>No orders in this period.</div>}
          </div>
          <div style={card}>
            <CardHead icon="card" title="Payment status" color={T.green} />
            {(dashboard?.operationalStatus?.paymentStatuses || []).map((r: any) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: 11.5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: T.textSub }}>{r.label}</span>
                <span style={{ fontWeight: 600, minWidth: 28, textAlign: "right" }}>{r.count}</span>
                <span style={{ color: T.textFaint, minWidth: 56, textAlign: "right" }}>{r.amount}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <CardHead icon="truck" title="Fulfillment snapshot" color={T.blue} />
            {(dashboard?.operationalStatus?.fulfillment || []).map((r: any) => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, fontSize: 11.5 }}>
                <span style={{ color: r.alert ? T.red : r.warn ? T.amber : T.textSub }}>{r.l}</span>
                <span style={{ fontWeight: 600, color: r.alert ? T.red : r.warn ? T.amber : T.text }}>{r.v}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 10, paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Icon name="bounce" size={14} style={{ color: T.textSub }} /> Returns &amp; refunds</div>
              {(dashboard?.operationalStatus?.returns || []).map((r: any) => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11.5 }}>
                  <span style={{ color: T.textSub }}>{r.l}</span>
                  <span style={{ fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* CUSTOMERS */}
      <Section label="Customers" action="View all customers" onAction={() => go("/admin/customers")}>
        <div className="dash-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={card}>
            <CardHead icon="users" title="Customer overview" color={T.blue} />
            {(dashboard?.customers?.overview || []).map((r: any) => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9, fontSize: 11.5 }}>
                <span style={{ color: T.textSub }}>{r.l}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600 }}>{r.v}</div>
                  {r.sub && <div style={{ fontSize: 10, color: T.textFaint }}>{r.sub}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            <CardHead icon="trending" title="Top customers" color={T.green} />
            {(dashboard?.customers?.top || []).map((c: any, i: number) => (
              <div key={`${c.email}-${i}`} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, fontSize: 11.5 }}>
                <span style={{ fontSize: 10, color: T.textFaint, minWidth: 12, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c.spent}</div>
                  <div style={{ fontSize: 10, color: T.textFaint }}>{c.orders} orders</div>
                </div>
              </div>
            ))}
            {(dashboard?.customers?.top || []).length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "14px 0" }}>No orders in this period.</div>}
          </div>
          <div style={card}>
            <CardHead icon="user" title="Recent signups" color={T.blue} />
            {(dashboard?.customers?.signups || []).map((c: any, i: number) => (
              <div key={`${c.email}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11.5 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                </div>
                <span style={{ color: T.textFaint, fontSize: 10, flexShrink: 0 }}>{c.time}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* PRODUCTS & CATALOG */}
      <Section label="Products & catalog" action="View all products" onAction={() => go("/admin/products")}>
        <div className="dash-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={card}>
            <CardHead icon="star" title="Best sellers" color={T.amber} />
            {(dashboard?.products?.bestSellers || []).map((p: any, i: number) => (
              <div key={`${p.sku}-${i}`} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8, fontSize: 11.5 }}>
                <span style={{ fontSize: 10, color: T.textFaint, minWidth: 12, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>{p.sku}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.rev}</div>
                  <div style={{ fontSize: 10, color: T.textFaint }}>{p.sold} sold</div>
                </div>
              </div>
            ))}
            {(dashboard?.products?.bestSellers || []).length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "14px 0" }}>No sales in this period.</div>}
          </div>
          <div style={S(card, { borderColor: T.amberBorder })}>
            <CardHead icon="alert" title="Low & out of stock" color={T.amber} />
            {(dashboard?.products?.lowStock || []).map((p: any) => (
              <div key={p.sku + p.name} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, fontSize: 11.5 }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>{p.sku}</div>
                </div>
                <Pill label={p.out ? "Out of stock" : `${p.stock} left`} color={p.out ? "#b42318" : "#92400e"} bg={p.out ? T.redBg : T.amberBg} border={p.out ? T.redBorder : T.amberBorder} />
              </div>
            ))}
            {(dashboard?.products?.lowStock || []).length === 0 && <div style={{ fontSize: 11, color: T.green, padding: "14px 0" }}>All tracked products are well stocked.</div>}
            <button style={S(btn, { marginTop: 8, fontSize: 11, width: "100%", justifyContent: "center", borderColor: T.amberBorder })} onClick={() => go("/admin/inventory")}>Manage inventory</button>
          </div>
          <div style={card}>
            <CardHead icon="plus" title="Recently added" color={T.green} />
            {(dashboard?.products?.recentProducts || []).map((p: any) => (
              <div key={p.sku + p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, fontSize: 11.5 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}>{p.sku}</div>
                </div>
                <span style={{ color: T.textFaint, fontSize: 10, flexShrink: 0 }}>{p.added}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* RECENT ACTIVITY */}
      <Section label="Recent activity" action="View all orders" onAction={() => go("/admin/orders")}>
        <div style={{ ...card, padding: 0 }}>
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}><CardHead icon="package" title="Recent orders" color={T.blue} mb={0} /></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Order", "Customer", "Items", "Total", "Status", "Placed"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textSub, borderBottom: `1px solid ${T.border}`, background: "#fff", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dashboard?.recentActivity?.orders || []).map((o: any) => (
                  <tr key={o.id} className="dash-row" style={{ cursor: "pointer" }} onClick={() => go("/admin/orders")}>
                    <td style={{ padding: "9px 12px", fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, color: T.blue, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{o.id}</td>
                    <td style={{ padding: "9px 12px", borderBottom: `1px solid ${T.border}` }}>{o.cust}</td>
                    <td style={{ padding: "9px 12px", color: T.textSub, borderBottom: `1px solid ${T.border}` }}>{o.items}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{o.total}</td>
                    <td style={{ padding: "9px 12px", borderBottom: `1px solid ${T.border}` }}><StatusPill status={o.status} /></td>
                    <td style={{ padding: "9px 12px", color: T.textFaint, whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>{o.time}</td>
                  </tr>
                ))}
                {(dashboard?.recentActivity?.orders || []).length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: T.textFaint, fontSize: 12 }}>No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ALERTS */}
      <Section label="Alerts & action required">
        <div className="dash-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={card}>
            <CardHead icon="alert" title="Needs immediate action" color={T.red} mb={10} />
            {(dashboard?.alerts?.immediate || []).map((item: Alert, i: number) => <AlertItem key={i} {...item} go={go} />)}
          </div>
          <div style={card}>
            <CardHead icon="clock" title="Review soon" color={T.amber} mb={10} />
            {(dashboard?.alerts?.reviewSoon || []).map((item: Alert, i: number) => <AlertItem key={i} {...item} go={go} />)}
            {(dashboard?.alerts?.reviewSoon || []).length === 0 && <div style={{ fontSize: 11, color: T.textFaint, padding: "8px 0" }}>Nothing to review.</div>}
          </div>
          <div style={card}>
            <CardHead icon="info" title="Informational" color={T.blue} mb={10} />
            {(dashboard?.alerts?.informational || []).map((item: Alert, i: number) => <AlertItem key={i} {...item} go={go} />)}
          </div>
        </div>
      </Section>

      {/* QUICK ACTIONS */}
      <Section label="Quick actions">
        <div className="dash-qa" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {QUICK_ACTIONS.map((a) => {
            const alert = a.alertKey === "lowStock" && (meta?.lowStockCount || 0) > 0;
            return (
              <button key={a.label} onClick={() => go(a.url)}
                style={S(card, { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px", cursor: "pointer", textAlign: "center", border: alert ? `1px solid ${T.amberBorder}` : `1px solid ${T.border}`, background: alert ? T.amberBg : T.surface, fontFamily: T.font })}>
                <span style={{ color: alert ? T.amber : T.textSub }}><Icon name={a.icon} size={20} /></span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: alert ? "#92400e" : T.textSub }}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: T.textFaint, paddingTop: 12, borderTop: `1px solid ${T.border}`, flexWrap: "wrap", gap: 8 }}>
        <span>Admin Dashboard — {meta?.storeName || "The A Line"} · {meta?.store || "Lebanon"}</span>
        <span>{meta ? `${meta.from} → ${meta.to}` : ""}</span>
      </div>
    </div>
  );
}
