import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { TEXT_COLOR } from "../lib/constants";
import { useOrders, mapApiOrder, type Order } from "../context/Orders";
import { apiCustomerGet } from "../lib/api";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.12)";
const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
import { useBaseMoney } from "../context/Currency";

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

/** The real wordmark — serif "The"/"Line" around the A-glyph, tinted white
 *  for the dark receipt header (same mask technique as the site header). */
const LOGO_RATIO = 246 / 218;
function Wordmark() {
  const h = 26;
  const txt: React.CSSProperties = {
    fontFamily: "'Instrument Serif', serif",
    fontSize: 24,
    color: "#ffffff",
    lineHeight: 1,
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={txt}>The</span>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: Math.round(h * LOGO_RATIO),
          height: h,
          background: "#ffffff",
          WebkitMaskImage: "url(/brand-a.png)",
          maskImage: "url(/brand-a.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
      <span style={txt}>Line</span>
    </span>
  );
}

export default function Receipt() {
  const money = useBaseMoney();
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
    const __metaToken = setPageMeta({
      title: order ? `Receipt ${order.number} | The A Line` : "Receipt | The A Line",
      description: "Your The A Line order receipt.",
      url: window.location.href,
    });
    return () => resetPageMeta(__metaToken);
  }, [order]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f4f4f3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(58,58,58,0.55)",
          fontFamily: "'Inter Tight', sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }
  if (!order) return <Navigate to="/account" replace />;

  return (
    <div
      className="receipt-page"
      style={{
        minHeight: "100vh",
        background: "#f4f4f3",
        fontFamily: "'Inter Tight', sans-serif",
        padding: "44px 20px 72px",
      }}
    >
      <style>{`
        .receipt-page ::selection{background:rgba(217,196,154,0.5)}
        @media print {
          .receipt-page{background:#fff !important;padding:0 !important}
          .receipt-actions{display:none !important}
          .receipt-card{box-shadow:none !important;border:none !important}
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="receipt-card"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(58,58,58,0.08)",
          boxShadow: "0 24px 60px rgba(20,20,20,0.12)",
        }}
      >
        {/* brand header — real wordmark on ink, gold hairline beneath */}
        <div
          style={{
            background: "#141414",
            padding: "26px 36px",
            display: "flex",
            justifyContent: "center",
            borderBottom: "2px solid #D9C49A",
          }}
        >
          <Wordmark />
        </div>

        <div style={{ padding: "32px 36px 34px" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-1px",
              color: TEXT_COLOR,
            }}
          >
            Thanks for your order
          </div>
          <div style={{ fontSize: 13, color: "rgba(58,58,58,0.62)", marginTop: 6 }}>
            Keep this receipt for your records — it also lives in your account.
          </div>

          {/* meta */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px 28px",
              margin: "22px 0",
              padding: "16px 0",
              borderTop: HAIRLINE,
              borderBottom: HAIRLINE,
            }}
          >
            <Meta label="Order" value={order.number} mono />
            <Meta label="Date" value={formatDate(order.createdAt)} />
            <Meta label="Email" value={order.email} />
            <Meta label="Payment" value="Cash on delivery" />
          </div>

          {/* items */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {order.items.map((it, i) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: "13px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(58,58,58,0.07)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 48,
                    height: 56,
                    borderRadius: 8,
                    background: "rgb(231,231,231)",
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: TEXT_COLOR,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {it.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>
                    {it.colorName ? `${it.colorName} · ` : ""}Qty {it.qty}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
                  {money(it.price * it.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* totals */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 16,
              borderTop: HAIRLINE,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Line label="Subtotal" value={money(order.subtotal)} />
            <Line label="Delivery" value={order.shipping === 0 ? "Free" : money(order.shipping)} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>Total</span>
              <span style={{ fontSize: 21, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
                {money(order.total)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)" }}>
              Payable in cash when your order is delivered.
            </div>
          </div>

          {/* actions */}
          <div className="receipt-actions" style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button
              onClick={() => window.print()}
              style={{
                flex: 1,
                background: "#141414",
                border: "none",
                borderRadius: 999,
                padding: "14px 0",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Print / Save PDF
            </button>
            <button
              onClick={() => navigate("/account")}
              style={{
                flex: 1,
                background: "none",
                border: "1px solid rgba(58,58,58,0.25)",
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
            padding: "18px 36px",
            background: "#faf9f6",
            borderTop: HAIRLINE,
            fontSize: 12,
            color: "rgba(58,58,58,0.62)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Questions about your order? Reply to your confirmation email or write to
          info@thealine.shop
        </div>
      </motion.div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "1.6px",
          textTransform: "uppercase",
          color: "rgba(58,58,58,0.55)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR, ...(mono ? TABULAR : {}) }}>
        {value}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "rgba(58,58,58,0.72)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_COLOR, ...TABULAR }}>{value}</span>
    </div>
  );
}
