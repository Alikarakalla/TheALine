import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;
const fmt = (s: string) => { try { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; } };
const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const statusColor = (s: string) => s === "delivered" ? "#6a8f00" : s === "cancelled" || s === "refunded" ? "#c0563f" : s === "shipped" ? "#3b7" : "#b8860b";

export default function AdminOrders() {
  const { show } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<any | null>(null);

  const load = () => apiGet<any[]>(`admin/orders${filter ? `?status=${filter}` : ""}`, true).then(setList).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, [filter]);

  const openDetail = (id: number) => apiGet<any>(`admin/orders/${id}`, true).then(setDetail).catch((e) => show({ title: e.message, tone: "error" }));
  const setStatus = async (status: string) => {
    if (!detail) return;
    try {
      await apiSend("PUT", `admin/orders/${detail.id}/status`, { status });
      show({ title: `Order ${detail.number} → ${status}`, tone: "success" });
      setDetail({ ...detail, status });
      load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>SALES</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR }}>Orders</h1>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.2)", borderRadius: 999, padding: "9px 16px", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, color: TEXT_COLOR, cursor: "pointer" }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, overflow: "hidden" }}>
        {list.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "rgba(84,84,84,0.5)" }}>No orders</div>}
        {list.map((o, i) => (
          <button key={o.id} onClick={() => openDetail(o.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "none", border: "none", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", textAlign: "left", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{o.number}</div>
              <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{o.name || o.email} · {fmt(o.createdAt)}</div>
            </div>
            <span style={{ fontSize: 13, color: "rgba(84,84,84,0.6)" }}>{o.itemCount} items</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR, width: 80, textAlign: "right" }}>{money(o.total)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "#fff", background: statusColor(o.status), borderRadius: 999, padding: "4px 11px", textTransform: "uppercase" }}>{o.status}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.4, ease: EASE }} onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 440, background: "#F4F1EB", height: "100%", overflowY: "auto", padding: 28, fontFamily: "'Inter Tight', sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: TEXT_COLOR }}>{detail.number}</span>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(84,84,84,0.5)" }}>✕</button>
              </div>
              <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 18 }}>{detail.name} · {detail.email} · {fmt(detail.createdAt)}</div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "1px", color: "rgba(84,84,84,0.5)", marginBottom: 7 }}>STATUS</label>
              <select value={detail.status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "11px 14px", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR, marginBottom: 22 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                {(detail.items || []).map((it: any, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 42, height: 48, borderRadius: 8, background: "#ECE7DE", position: "relative", flexShrink: 0 }}>
                      {it.image && <img src={it.image} alt="" style={{ position: "absolute", inset: "12%", width: "76%", height: "76%", objectFit: "contain" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>{it.name} ×{it.qty}</div>
                      <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)" }}>{it.colorName}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_COLOR }}>{money(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid rgba(84,84,84,0.12)", paddingTop: 14, fontSize: 13.5, color: TEXT_COLOR }}>
                <Row l="Subtotal" v={money(detail.subtotal)} />
                {detail.discount > 0 && <Row l="Discount" v={`−${money(detail.discount)}`} />}
                <Row l="Shipping" v={detail.shipping === 0 ? "Free" : money(detail.shipping)} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: 700, fontSize: 16 }}><span>Total</span><span>{money(detail.total)}</span></div>
              </div>
              {detail.pointsEarned > 0 && <div style={{ fontSize: 12.5, color: "#6a8f00", marginTop: 10 }}>+{detail.pointsEarned} Glow Points earned</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ color: "rgba(84,84,84,0.65)" }}>{l}</span><span style={{ fontWeight: 500 }}>{v}</span></div>;
}
