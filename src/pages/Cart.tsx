import { useEffect, useState } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  TEXT_COLOR_HEX,
  GLOW_COLOR_HEX,
  PAGE_MAX,
  PAGE_PAD,
} from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart, type CartItem } from "../context/Cart";
import { useDeliveryConfig } from "../context/SiteSettings";
import { useMoney } from "../context/Currency";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const PROMO: Record<string, number> = { LOVE10: 0.1, WELCOME: 0.15 };

// One image-box gray across the funnel (same as the product page gallery).
const IMG_BG = "rgb(231,231,231)";
const HAIRLINE = "1px solid rgba(58,58,58,0.12)";

/* Minimal 1.6-stroke icons — one consistent weight, drawn, not emoji. */
function Icon({
  children,
  size = 13,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto" }}
    >
      {children}
    </svg>
  );
}
const LockGlyph = (
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>
);
const ReturnGlyph = (
  <>
    <path d="M9.5 14.5 4.5 9.5l5-5" />
    <path d="M4.5 9.5h9.5a5.5 5.5 0 0 1 0 11h-3" />
  </>
);
const CheckGlyph = <path d="M20 6.5 9.5 17 4 11.5" />;
const ArrowGlyph = <path d="M4 12h15m-6-6 6 6-6 6" />;

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number;
  onChange: (q: number) => void;
}) {
  const btn: React.CSSProperties = {
    width: 30,
    height: 34,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    color: TEXT_COLOR,
    fontFamily: "'Inter Tight', sans-serif",
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid rgba(58,58,58,0.22)",
        borderRadius: 999,
        padding: "0 4px",
      }}
    >
      <button onClick={() => onChange(qty - 1)} style={btn} aria-label="Decrease quantity">
        −
      </button>
      <span
        style={{
          width: 24,
          textAlign: "center",
          fontSize: 13.5,
          fontWeight: 500,
          color: TEXT_COLOR,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {qty}
      </span>
      <button onClick={() => onChange(qty + 1)} style={btn} aria-label="Increase quantity">
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
  const fmt = useMoney();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.45, ease: EASE }}
      style={{
        display: "flex",
        gap: isMobile ? 16 : 22,
        padding: "24px 0",
        borderBottom: "1px solid rgba(58,58,58,0.1)",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: isMobile ? 84 : 100,
          height: isMobile ? 100 : 118,
          borderRadius: 12,
          background: IMG_BG,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <img
          src={item.image}
          alt={item.name}
          style={{
            position: "absolute",
            inset: "10%",
            width: "80%",
            height: "80%",
            objectFit: "contain",
          }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 15.5 : 16.5,
              fontWeight: 600,
              letterSpacing: "-0.3px",
              color: TEXT_COLOR,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: TEXT_COLOR,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(item.price * item.qty)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 5,
            fontSize: 12.5,
            color: "rgba(58,58,58,0.72)",
          }}
        >
          <span>{item.category}</span>
          {item.colorName && (
            <>
              <span aria-hidden style={{ opacity: 0.45 }}>
                ·
              </span>
              {item.colorHex && (
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: item.colorHex,
                    border: "1px solid rgba(58,58,58,0.2)",
                    display: "inline-block",
                  }}
                />
              )}
              <span>{item.colorName}</span>
            </>
          )}
          {item.qty > 1 && (
            <span style={{ color: "rgba(58,58,58,0.55)" }}>
              — {fmt(item.price)} each
            </span>
          )}
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
            className="cart-remove"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12.5,
              color: "rgba(58,58,58,0.62)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: disabled ? "rgba(58,58,58,0.15)" : "#141414",
        color: disabled ? "rgba(58,58,58,0.5)" : "#ffffff",
        border: "none",
        borderRadius: 999,
        padding: "17px 0",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      Checkout
      <Icon size={15}>{ArrowGlyph}</Icon>
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

  // Delivery pricing is controlled from Admin → Settings.
  const { fee: SHIP_FEE, freeOver: FREE_SHIP } = useDeliveryConfig();
  const fmt = useMoney();
  const discount = applied ? subtotal * PROMO[applied] : 0;
  const afterDiscount = subtotal - discount;
  const shipping = items.length === 0 || afterDiscount >= FREE_SHIP ? 0 : SHIP_FEE;
  const total = afterDiscount + shipping;
  const toFree = Math.max(0, FREE_SHIP - afterDiscount);
  const progress = Math.min(100, FREE_SHIP > 0 ? (afterDiscount / FREE_SHIP) * 100 : 100);

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
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <div
      data-tone="light"
      className="cart-page"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Browser surfaces carry the brand too: selection, caret, focus ring. */}
      <style>{`
        .cart-page ::selection{background:rgba(217,196,154,0.5)}
        .cart-page input{caret-color:${TEXT_COLOR_HEX}}
        .cart-page input::placeholder{color:rgba(58,58,58,0.62)}
        .cart-page button:focus-visible,.cart-page input:focus-visible{outline:2px solid #141414;outline-offset:2px}
        .cart-remove{transition:color 0.2s ease}
        .cart-remove:hover{color:${TEXT_COLOR_HEX}}
      `}</style>
      <Header />

      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `104px ${PAGE_PAD} 80px` : `136px ${PAGE_PAD} 100px`,
        }}
      >
        {/* Title + columns share one bounded composition so no dead space
            opens between the list and the summary on wide screens. */}
        <div style={{ maxWidth: 1156, margin: "0 auto" }}>
          {/* title */}
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10 }}
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
          {empty ? (
            <div style={{ fontSize: 13, color: "rgba(58,58,58,0.72)", marginBottom: 36 }}>
              Your bag is empty.
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "rgba(58,58,58,0.62)",
                marginBottom: isMobile ? 26 : 34,
              }}
            >
              {count} item{count === 1 ? "" : "s"}
            </div>
          )}

          {empty ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
              style={{ padding: "32px 0 80px", maxWidth: 420 }}
            >
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: "rgba(58,58,58,0.75)",
                  marginBottom: 26,
                }}
              >
                Nothing here yet. Explore the collection and find a companion for
                your every moment.
              </p>
              <button
                onClick={() => navigate("/shop")}
                style={{
                  background: "#141414",
                  border: "none",
                  borderRadius: 999,
                  padding: "16px 32px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#ffffff",
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
                gap: isMobile ? 28 : 96,
                alignItems: "flex-start",
              }}
            >
              {/* line items */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: isMobile ? "100%" : 680,
                  width: isMobile ? "100%" : "auto",
                  borderTop: "1px solid rgba(58,58,58,0.1)",
                }}
              >
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
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: TEXT_COLOR,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>←</span>{" "}
                  Continue shopping
                </button>
              </div>

              {/* summary */}
              <motion.aside
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                style={{
                  flex: isMobile ? "none" : "0 0 380px",
                  width: isMobile ? "100%" : 380,
                  position: isMobile ? "static" : "sticky",
                  top: 104,
                  background: "#FBFAF7",
                  border: HAIRLINE,
                  borderRadius: 16,
                  padding: "26px 26px 24px",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "-0.2px",
                    color: TEXT_COLOR,
                    marginBottom: 18,
                  }}
                >
                  Order summary
                </div>

                {/* free shipping progress */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12.5,
                      color: "rgba(58,58,58,0.78)",
                      marginBottom: 8,
                    }}
                  >
                    {toFree > 0 ? (
                      <span>
                        You're{" "}
                        <strong style={{ color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(toFree)}
                        </strong>{" "}
                        away from free shipping
                      </span>
                    ) : (
                      <>
                        <span style={{ color: "#8a7340", display: "inline-flex" }}>
                          <Icon size={13}>{CheckGlyph}</Icon>
                        </span>
                        <span>Free shipping unlocked</span>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background: "rgba(58,58,58,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: EASE }}
                      style={{ height: "100%", background: "#141414" }}
                    />
                  </div>
                </div>

                {/* promo */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setCodeError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyCode();
                      }}
                      placeholder="Promo code"
                      aria-label="Promo code"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: `1px solid ${codeError ? "#c0563f" : "rgba(58,58,58,0.22)"}`,
                        borderRadius: 999,
                        padding: "11px 16px",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 13,
                        color: TEXT_COLOR,
                        outline: "none",
                        background: "#ffffff",
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
                          color: "#5c7a00",
                          marginTop: 8,
                          overflow: "hidden",
                        }}
                      >
                        Code {applied} applied — {Math.round(PROMO[applied] * 100)}% off
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {codeError && (
                    <div style={{ fontSize: 12, color: "#c0563f", marginTop: 8 }}>
                      That code isn't valid. Try LOVE10.
                    </div>
                  )}
                </div>

                {/* totals */}
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <Row label="Subtotal" value={fmt(subtotal)} />
                  {discount > 0 && (
                    <Row label="Discount" value={`−${fmt(discount)}`} accent />
                  )}
                  <Row label="Shipping" value={shipping === 0 ? "Free" : fmt(shipping)} />
                  <div style={{ height: 1, background: "rgba(58,58,58,0.12)", margin: "8px 0" }} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>
                      Total
                    </span>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        color: TEXT_COLOR,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(total)}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <CheckoutButton disabled={empty} />
                </div>

                <div
                  style={{
                    marginTop: 15,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 18,
                    fontSize: 11.5,
                    color: "rgba(58,58,58,0.62)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon size={12}>{LockGlyph}</Icon> Secure checkout
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon size={12}>{ReturnGlyph}</Icon> Free 30-day returns
                  </span>
                </div>
              </motion.aside>
            </div>
          )}
        </div>
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
      <span style={{ fontSize: 13.5, color: "rgba(58,58,58,0.72)" }}>{label}</span>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: accent ? "#5c7a00" : TEXT_COLOR,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
