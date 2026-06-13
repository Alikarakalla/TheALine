import { useEffect } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useOrders } from "../context/Orders";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;

export default function OrderConfirmed() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, getOrder } = useOrders();
  const num = (location.state as { orderNumber?: string } | null)?.orderNumber;
  const order = (num && getOrder(num)) || orders[0] || null;

  useEffect(() => {
    setPageMeta({
      title: "Order confirmed | The A Line",
      description: "Thank you for your order.",
      url: window.location.origin + "/order-confirmed",
    });
    return () => resetPageMeta();
  }, []);

  if (!order) return <Navigate to="/" replace />;

  const first = order.name.split(" ")[0] || "there";

  return (
    <div
      data-tone="light"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: isMobile ? "110px 24px 80px" : "150px 24px 100px",
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: GLOW_COLOR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            marginBottom: 26,
          }}
        >
          ✓
        </motion.div>

        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: isMobile ? "clamp(34px, 11vw, 52px)" : 52,
                fontWeight: 600,
                letterSpacing: "-2px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              Order
            </span>
            <SerifGlow
              word="confirmed"
              italic
              fontSize={isMobile ? "clamp(36px, 11.5vw, 56px)" : 56}
              lineHeight={isMobile ? "clamp(32px, 11vw, 52px)" : 52}
              letterSpacing={-2}
              strokeWidth={isMobile ? "clamp(8px, 2.4vw, 12px)" : 12}
              delay={0.4}
            />
          </div>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: "rgba(84,84,84,0.75)" }}>
            Thank you, {first}. We've emailed a confirmation to{" "}
            <strong style={{ color: TEXT_COLOR }}>{order.email}</strong>. Your order is
            on its way to being crafted.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
          style={{
            marginTop: 34,
            background: "#fff",
            border: "1px solid rgba(84,84,84,0.1)",
            borderRadius: 18,
            padding: isMobile ? 24 : 30,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 18,
              borderBottom: "1px solid rgba(84,84,84,0.12)",
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(84,84,84,0.6)" }}>Order number</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR, letterSpacing: "0.5px" }}>
              {order.number}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            {order.items.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    position: "relative",
                    width: 52,
                    height: 60,
                    borderRadius: 8,
                    background: "#ECE7DE",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={it.image}
                    alt={it.name}
                    style={{
                      position: "absolute",
                      inset: "12%",
                      width: "76%",
                      height: "76%",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_COLOR }}>
                    {it.name}{" "}
                    <span style={{ color: "rgba(84,84,84,0.5)" }}>×{it.qty}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)" }}>
                    {it.colorName}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>
                  {money(it.price * it.qty)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <Line label="Subtotal" value={money(order.subtotal)} />
            <Line label="Shipping" value={order.shipping === 0 ? "Free" : money(order.shipping)} />
            <div style={{ height: 1, background: "rgba(84,84,84,0.12)", margin: "6px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>Total paid</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR }}>
                {money(order.total)}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}
        >
          <button
            onClick={() => navigate("/shop")}
            style={{
              flex: 1,
              minWidth: 160,
              background: GLOW_COLOR,
              border: "none",
              borderRadius: 999,
              padding: "16px 0",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#111",
            }}
          >
            Continue shopping
          </button>
          <button
            onClick={() => navigate(`/orders/${order.number}`)}
            style={{
              flex: 1,
              minWidth: 160,
              background: "none",
              border: "1px solid rgba(84,84,84,0.25)",
              borderRadius: 999,
              padding: "16px 0",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 15,
              fontWeight: 500,
              color: TEXT_COLOR,
            }}
          >
            View receipt
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13.5, color: "rgba(84,84,84,0.7)" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>{value}</span>
    </div>
  );
}
