import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import OrderStatus from "../OrderStatus";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useOrders } from "../../context/Orders";
import { useCart } from "../../context/Cart";
import { useToast } from "../../context/Toast";
import { getProductById } from "../../lib/products";
import { statusLabel, estimatedDelivery } from "../../lib/tracking";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;
const fmtDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { add } = useCart();
  const { show } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const reorder = (orderNumber: string) => {
    const o = orders.find((x) => x.number === orderNumber);
    if (!o) return;
    let count = 0;
    o.items.forEach((it) => {
      const p = getProductById(it.productId);
      if (p) {
        add(p, { name: it.colorName, hex: it.colorHex }, it.qty);
        count += it.qty;
      }
    });
    show({ title: "Added to bag", description: `${count} item${count === 1 ? "" : "s"} from ${orderNumber}`, tone: "success", action: { label: "View bag", to: "/cart" } });
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: TEXT_COLOR, marginBottom: 20 }}>Orders</h1>

      {orders.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed rgba(84,84,84,0.25)", borderRadius: 16, padding: 40, textAlign: "center", color: "rgba(84,84,84,0.6)", fontSize: 14 }}>
          You haven't placed any orders yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {orders.map((o) => {
            const open = openId === o.number;
            return (
              <div key={o.number} style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpenId(open ? null : o.number)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 18, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", textAlign: "left", flexWrap: "wrap" }}>
                  <div style={{ display: "flex" }}>
                    {o.items.slice(0, 3).map((it, idx) => (
                      <div key={it.id} style={{ width: 40, height: 46, borderRadius: 7, background: "#ECE7DE", position: "relative", marginLeft: idx === 0 ? 0 : -10, border: "2px solid #fff" }}>
                        <img src={it.image} alt="" style={{ position: "absolute", inset: "14%", width: "72%", height: "72%", objectFit: "contain" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{o.number}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{fmtDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} items · {money(o.total)}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.5px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "5px 11px" }}>
                    {statusLabel(o.createdAt, Date.now())}
                  </span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ fontSize: 12, color: "rgba(84,84,84,0.5)" }}>▾</motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "0 18px 20px" }}>
                        <div style={{ padding: "16px 0", borderTop: "1px solid rgba(84,84,84,0.1)" }}>
                          <OrderStatus createdAt={o.createdAt} />
                          <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.6)", textAlign: "center", marginTop: 12 }}>
                            Estimated delivery: <strong style={{ color: TEXT_COLOR }}>{estimatedDelivery(o.createdAt)}</strong>
                            {o.trackingNumber && <> · Tracking {o.trackingNumber}</>}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(84,84,84,0.1)", paddingTop: 16 }}>
                          {o.items.map((it) => (
                            <div key={it.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <div style={{ width: 44, height: 50, borderRadius: 8, background: "#ECE7DE", position: "relative", flexShrink: 0 }}>
                                <img src={it.image} alt="" style={{ position: "absolute", inset: "14%", width: "72%", height: "72%", objectFit: "contain" }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>{it.name} <span style={{ color: "rgba(84,84,84,0.5)" }}>×{it.qty}</span></div>
                                <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)" }}>{it.colorName}</div>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_COLOR }}>{money(it.price * it.qty)}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                          <button onClick={() => reorder(o.number)} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 22px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#111" }}>Reorder</button>
                          <button onClick={() => navigate(`/orders/${o.number}`)} style={{ background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "11px 22px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>View receipt</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
