import { useEffect, useState } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import { TEXT_COLOR, GLOW_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart, type CartItem } from "../context/Cart";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const FREE_SHIP = 100;
const SHIP_FEE = 5.9;
const PROMO: Record<string, number> = { LOVE10: 0.1, WELCOME: 0.15 };

const money = (n: number) => `€${n.toFixed(2)}`;

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (q: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 32,
    height: 36,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    color: TEXT_COLOR,
    fontFamily: "'Inter Tight', sans-serif",
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid rgba(84,84,84,0.25)",
        borderRadius: 999,
        padding: "0 4px",
      }}
    >
      <button onClick={() => onChange(qty - 1)} style={btn} aria-label="Decrease">
        −
      </button>
      <span
        style={{
          width: 24,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 500,
          color: TEXT_COLOR,
        }}
      >
        {qty}
      </span>
      <button onClick={() => onChange(qty + 1)} style={btn} aria-label="Increase">
        +
      </button>
    </div>
  );
}

function LineItem({
  item,
  isMobile,
  onQty,
  onRemove,
}: {
  item: CartItem;
  isMobile: boolean;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.45, ease: EASE }}
      style={{
        display: "flex",
        gap: isMobile ? 14 : 20,
        padding: "22px 0",
        borderBottom: "1px solid rgba(84,84,84,0.12)",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: isMobile ? 84 : 104,
          height: isMobile ? 100 : 124,
          borderRadius: 10,
          background: "#ECE7DE",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={item.image}
          alt={item.name}
          style={{
            position: "absolute",
            inset: "12%",
            width: "76%",
            height: "76%",
            objectFit: "contain",
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: isMobile ? 16 : 18,
                fontWeight: 500,
                letterSpacing: "-0.3px",
                color: TEXT_COLOR,
              }}
            >
              {item.name}
            </div>
            <div
              style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)", marginTop: 2 }}
            >
              {item.category}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginTop: 8,
                fontSize: 12.5,
                color: "rgba(84,84,84,0.7)",
              }}
            >
              {item.colorHex && (
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: item.colorHex,
                    border: "1px solid rgba(84,84,84,0.2)",
                  }}
                />
              )}
              {item.colorName}
            </div>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: TEXT_COLOR,
              whiteSpace: "nowrap",
            }}
          >
            {money(item.price * item.qty)}
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <QtyStepper qty={item.qty} onChange={onQty} />
          <button
            onClick={onRemove}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12.5,
              color: "rgba(84,84,84,0.6)",
              textDecoration: "underline",
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CheckoutButton({ disabled }: { disabled: boolean }) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  const navigate = useNavigate();
  return (
    <motion.button
      onMouseMove={(e) => {
        if (disabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={() => {
        if (!disabled) navigate("/checkout");
      }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      style={{
        x,
        y,
        width: "100%",
        background: disabled ? "rgba(84,84,84,0.15)" : GLOW_COLOR,
        color: disabled ? "rgba(84,84,84,0.5)" : "#111",
        border: "none",
        borderRadius: 999,
        padding: "18px 0",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      Checkout
    </motion.button>
  );
}

export default function Cart() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { items, subtotal, setQty, remove } = useCart();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: "Your bag | The A Line",
      description: "Review the pieces in your bag and check out.",
      url: window.location.origin + "/cart",
    });
    return () => resetPageMeta();
  }, []);

  const discount = applied ? subtotal * PROMO[applied] : 0;
  const afterDiscount = subtotal - discount;
  const shipping = items.length === 0 || afterDiscount >= FREE_SHIP ? 0 : SHIP_FEE;
  const total = afterDiscount + shipping;
  const toFree = Math.max(0, FREE_SHIP - afterDiscount);
  const progress = Math.min(100, (afterDiscount / FREE_SHIP) * 100);

  const applyCode = () => {
    const c = code.trim().toUpperCase();
    if (PROMO[c]) {
      setApplied(c);
      setCodeError(false);
    } else {
      setCodeError(true);
      setApplied(null);
    }
  };

  const empty = items.length === 0;

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
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `110px ${PAGE_PAD} 80px` : `150px ${PAGE_PAD} 100px`,
        }}
      >
        {/* title */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}
        >
          <span
            style={{
              fontSize: isMobile ? "clamp(40px, 13vw, 64px)" : 64,
              fontWeight: 600,
              letterSpacing: "-2.5px",
              lineHeight: 1,
              color: TEXT_COLOR,
            }}
          >
            Your
          </span>
          <SerifGlow
            word="bag"
            italic
            fontSize={isMobile ? "clamp(44px, 14vw, 70px)" : 70}
            lineHeight={isMobile ? "clamp(40px, 13vw, 66px)" : 66}
            letterSpacing={-2.5}
            strokeWidth={isMobile ? "clamp(9px, 3vw, 15px)" : 15}
            delay={0.3}
          />
        </motion.div>
        <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 40 }}>
          {empty
            ? "Your bag is empty."
            : `${items.reduce((n, i) => n + i.qty, 0)} item${
                items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"
              }`}
        </div>

        {empty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            style={{ padding: "40px 0 80px", maxWidth: 420 }}
          >
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "rgba(84,84,84,0.75)",
                marginBottom: 26,
              }}
            >
              Nothing here yet. Explore the collection and find a companion for
              your every moment.
            </p>
            <button
              onClick={() => navigate("/shop")}
              style={{
                background: GLOW_COLOR,
                border: "none",
                borderRadius: 999,
                padding: "16px 32px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#111",
              }}
            >
              Start shopping
            </button>
          </motion.div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 24 : 64,
              alignItems: "flex-start",
            }}
          >
            {/* line items */}
            <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <LineItem
                    key={item.id}
                    item={item}
                    isMobile={isMobile}
                    onQty={(q) => setQty(item.id, q)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </AnimatePresence>

              <button
                onClick={() => navigate("/shop")}
                style={{
                  marginTop: 26,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                }}
              >
                <span style={{ fontSize: 16 }}>←</span> Continue shopping
              </button>
            </div>

            {/* summary */}
            <motion.aside
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              style={{
                flex: isMobile ? "none" : "0 0 360px",
                width: isMobile ? "100%" : 360,
                position: isMobile ? "static" : "sticky",
                top: 100,
                background: "#fff",
                borderRadius: 18,
                padding: 28,
                boxShadow: "0 20px 50px rgba(84,84,84,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: TEXT_COLOR,
                  marginBottom: 20,
                }}
              >
                Order summary
              </div>

              {/* free shipping progress */}
              <div style={{ marginBottom: 22 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "rgba(84,84,84,0.75)",
                    marginBottom: 8,
                  }}
                >
                  {toFree > 0 ? (
                    <>
                      You're <strong>{money(toFree)}</strong> away from free
                      shipping
                    </>
                  ) : (
                    <>🎉 You've unlocked free shipping</>
                  )}
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: "rgba(84,84,84,0.12)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: EASE }}
                    style={{ height: "100%", background: GLOW_COLOR }}
                  />
                </div>
              </div>

              {/* promo */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setCodeError(false);
                    }}
                    placeholder="Promo code"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: `1px solid ${
                        codeError ? "#c0563f" : "rgba(84,84,84,0.25)"
                      }`,
                      borderRadius: 999,
                      padding: "11px 16px",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13,
                      color: TEXT_COLOR,
                      outline: "none",
                      background: "#faf9f6",
                    }}
                  />
                  <button
                    onClick={applyCode}
                    style={{
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: 999,
                      padding: "0 20px",
                      cursor: "pointer",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Apply
                  </button>
                </div>
                <AnimatePresence>
                  {applied && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        fontSize: 12,
                        color: "#6a8f00",
                        marginTop: 8,
                        overflow: "hidden",
                      }}
                    >
                      Code {applied} applied — {Math.round(PROMO[applied] * 100)}%
                      off
                    </motion.div>
                  )}
                </AnimatePresence>
                {codeError && (
                  <div style={{ fontSize: 12, color: "#c0563f", marginTop: 8 }}>
                    Invalid code. Try LOVE10.
                  </div>
                )}
              </div>

              {/* totals */}
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <Row label="Subtotal" value={money(subtotal)} />
                {discount > 0 && (
                  <Row label="Discount" value={`−${money(discount)}`} accent />
                )}
                <Row
                  label="Shipping"
                  value={shipping === 0 ? "Free" : money(shipping)}
                />
                <div
                  style={{
                    height: 1,
                    background: "rgba(84,84,84,0.12)",
                    margin: "8px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR }}>
                    Total
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 600, color: TEXT_COLOR }}>
                    {money(total)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <CheckoutButton disabled={empty} />
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  fontSize: 11.5,
                  color: "rgba(84,84,84,0.55)",
                }}
              >
                <span>🔒 Secure checkout</span>
                <span>↩ Free 30-day returns</span>
              </div>
            </motion.aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, color: "rgba(84,84,84,0.7)" }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: accent ? "#6a8f00" : TEXT_COLOR,
        }}
      >
        {value}
      </span>
    </div>
  );
}
