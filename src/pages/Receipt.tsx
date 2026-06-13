import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useOrders, mapApiOrder, type Order } from "../context/Orders";
import { apiCustomerGet } from "../lib/api";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function Receipt() {
  const { number } = useParams();
  const navigate = useNavigate();
  const { getOrder } = useOrders();
  const ctxOrder = number ? getOrder(number) : undefined;
  const [fetched, setFetched] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const order = ctxOrder ?? fetched ?? undefined;

  // On a direct visit / refresh the order may not be in context yet — fetch it.
  useEffect(() => {
    if (ctxOrder || !number) {
      setLoading(false);
      return;
    }
    apiCustomerGet<any>(`orders/${number}`)
      .then((o) => setFetched(mapApiOrder(o)))
      .catch(() => setFetched(null))
      .finally(() => setLoading(false));
  }, [number, ctxOrder]);

  useEffect(() => {
    setPageMeta({
      title: order ? `Receipt ${order.number} | The A Line` : "Receipt | The A Line",
      description: "Your The A Line order receipt.",
      url: window.location.href,
    });
    return () => resetPageMeta();
  }, [order]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(84,84,84,0.5)", fontFamily: "'Inter Tight', sans-serif" }}>
        Loading…
      </div>
    );
  }
  if (!order) return <Navigate to="/account" replace />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
        padding: "48px 20px 80px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 30px 70px rgba(84,84,84,0.16)",
        }}
      >
        {/* email header */}
        <div
          style={{
            background: "#161616",
            color: "#fff",
            padding: "30px 36px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{ fontSize: 15, fontWeight: 600, letterSpacing: "2.5px" }}
          >
            THE A LINE
          </span>
          <svg viewBox="0 0 24 24" width={14} height={14}>
            <path
              d="M12 21s-7.5-4.9-10-9.2C0 8 2 4.5 5.5 4.5 8 4.5 9.6 6 12 8c2.4-2 4-3.5 6.5-3.5C22 4.5 24 8 22 11.8 19.5 16.1 12 21 12 21z"
              style={{ fill: GLOW_COLOR }}
            />
          </svg>
        </div>

        <div style={{ padding: "36px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(84,84,84,0.5)",
              marginBottom: 6,
            }}
          >
            RECEIPT
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-1px",
              color: TEXT_COLOR,
            }}
          >
            Thanks for your order
          </div>

          {/* meta */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              margin: "24px 0",
              padding: "18px 0",
              borderTop: "1px solid rgba(84,84,84,0.12)",
              borderBottom: "1px solid rgba(84,84,84,0.12)",
            }}
          >
            <Meta label="Order" value={order.number} />
            <Meta label="Date" value={formatDate(order.createdAt)} />
            <Meta label="Email" value={order.email} />
          </div>

          {/* items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {order.items.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    position: "relative",
                    width: 50,
                    height: 58,
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
                    {it.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)" }}>
                    {it.colorName} · Qty {it.qty}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>
                  {money(it.price * it.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* totals */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid rgba(84,84,84,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <Line label="Subtotal" value={money(order.subtotal)} />
            <Line label="Shipping" value={order.shipping === 0 ? "Free" : money(order.shipping)} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>
                Total paid
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR }}>
                {money(order.total)}
              </span>
            </div>
          </div>

          {/* actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
            <button
              onClick={() => window.print()}
              style={{
                flex: 1,
                background: GLOW_COLOR,
                border: "none",
                borderRadius: 999,
                padding: "14px 0",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#111",
              }}
            >
              Print / Save PDF
            </button>
            <button
              onClick={() => navigate("/account")}
              style={{
                flex: 1,
                background: "none",
                border: "1px solid rgba(84,84,84,0.25)",
                borderRadius: 999,
                padding: "14px 0",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: TEXT_COLOR,
              }}
            >
              Back to account
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "20px 36px",
            background: "#faf9f6",
            fontSize: 12,
            color: "rgba(84,84,84,0.55)",
            textAlign: "center",
          }}
        >
          Questions about your order? Reply to your confirmation email or contact
          care@lovebag.com
        </div>
      </motion.div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(84,84,84,0.5)", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>
        {value}
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
