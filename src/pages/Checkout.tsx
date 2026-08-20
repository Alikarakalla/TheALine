import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import { AuthButton, isEmail, Glyph, CheckGlyph } from "../components/AuthUI";
import { PhoneField, EMPTY_PHONE, type PhoneValue } from "../components/PhoneField";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  TEXT_COLOR_HEX,
  GLOW_COLOR_HEX,
  PAGE_MAX,
  PAGE_PAD,
} from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart } from "../context/Cart";
import { useAuth } from "../context/Auth";
import { useAddresses, type Address } from "../context/Addresses";
import { useOrders } from "../context/Orders";
import { api } from "../lib/api";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.12)";
const IMG_BG = "rgb(231,231,231)";
const money = (n: number) => `€${n.toFixed(2)}`;
const STEPS = ["Information", "Shipping", "Payment"];
const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const LockGlyph = (
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>
);
const ChevronDown = <path d="m6 9 6 6 6-6" />;
const CardGlyph = (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
  </>
);

/* ---------------------------------------------------------- form pieces */

function CField({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email" | "tel";
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "1.6px",
          textTransform: "uppercase",
          color: "rgba(58,58,58,0.62)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        spellCheck={false}
        style={{
          width: "100%",
          background: "#fff",
          border: `1.5px solid ${error ? "#c0563f" : focus ? GLOW_COLOR : "rgba(58,58,58,0.2)"}`,
          boxShadow: focus && !error ? "0 0 0 3px rgba(217,196,154,0.22)" : "none",
          borderRadius: 10,
          padding: "12px 14px",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14.5,
          color: TEXT_COLOR,
          outline: "none",
          transition: "border 0.2s ease, box-shadow 0.2s ease",
        }}
      />
      {error && (
        <div role="alert" style={{ fontSize: 12, color: "#c0563f", marginTop: 5 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}
function Half({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, minWidth: 0 }}>{children}</div>;
}

function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "2px",
        color: "rgba(58,58,58,0.62)",
        marginBottom: 12,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- stepper */

function Stepper({ step, onJump }: { step: number; onJump: (s: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => done && onJump(n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                padding: 0,
                cursor: done ? "pointer" : "default",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <span
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  background: done || active ? GLOW_COLOR : "transparent",
                  border: done || active ? "none" : "1.5px solid rgba(58,58,58,0.3)",
                  color: done || active ? "#111" : "rgba(58,58,58,0.5)",
                  ...TABULAR,
                }}
              >
                {done ? <Glyph size={11}>{CheckGlyph}</Glyph> : n}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 450,
                  color: active ? TEXT_COLOR : "rgba(58,58,58,0.55)",
                }}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span style={{ width: 30, height: 1, background: "rgba(58,58,58,0.18)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- summary */

function OrderSummary({
  subtotal,
  shipping,
  total,
}: {
  subtotal: number;
  shipping: number;
  total: number;
}) {
  const { items } = useCart();
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", gap: 13, alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                width: 52,
                height: 60,
                borderRadius: 9,
                background: IMG_BG,
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
              <span
                style={{
                  position: "absolute",
                  top: -7,
                  right: -7,
                  minWidth: 19,
                  height: 19,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "#141414",
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...TABULAR,
                }}
              >
                {it.qty}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.name}
              </div>
              <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>
                {it.colorName}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
              {money(it.price * it.qty)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: HAIRLINE, paddingTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        <SummaryLine label="Subtotal" value={money(subtotal)} />
        <SummaryLine label="Shipping" value={shipping === 0 ? "Free" : money(shipping)} />
        <div style={{ height: 1, background: "rgba(58,58,58,0.12)", margin: "5px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_COLOR }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
            {money(total)}
          </span>
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "rgba(58,58,58,0.62)",
        }}
      >
        <Glyph size={12}>{LockGlyph}</Glyph> Encrypted checkout · Free 30-day returns
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "rgba(58,58,58,0.72)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_COLOR, ...TABULAR }}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------- ship option */

function ShipOption({
  selected,
  onSelect,
  title,
  sub,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
        background: selected ? "rgba(217,196,154,0.14)" : "#fff",
        border: `1.5px solid ${selected ? "#111" : "rgba(58,58,58,0.18)"}`,
        borderRadius: 12,
        padding: "15px 16px",
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        marginBottom: 10,
        transition: "border 0.2s ease, background 0.2s ease",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: selected ? "none" : "1.5px solid rgba(58,58,58,0.35)",
          background: selected ? GLOW_COLOR : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#111",
          flexShrink: 0,
          transition: "background 0.2s ease",
        }}
      >
        {selected && <Glyph size={10}>{CheckGlyph}</Glyph>}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>
          {sub}
        </span>
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>{price}</span>
    </button>
  );
}

/* -------------------------------------------------------------------- page */

export default function Checkout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const { addresses } = useAddresses();
  const { addOrder } = useOrders();

  const [step, setStep] = useState(1);
  const [info, setInfo] = useState({
    email: user?.email || "",
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ").slice(1).join(" ") || "",
    address: "",
    apt: "",
    city: "",
    postal: "",
    country: "Lebanon",
    phone: user?.phone || "",
  });
  /** Which saved address the form currently mirrors (null = typed manually). */
  const [addrId, setAddrId] = useState<string | null>(null);
  const [phoneVal, setPhoneVal] = useState<PhoneValue>(EMPTY_PHONE);
  /** Bumped whenever the phone is filled programmatically (profile arriving,
   *  saved address applied) so the phone field re-seeds without losing focus
   *  while someone is typing. */
  const [phoneSeed, setPhoneSeed] = useState(0);
  const prefilled = useRef(false);
  const [ship, setShip] = useState<"standard" | "express">("standard");
  const [pay, setPay] = useState({ card: "", exp: "", cvc: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const applyAddress = (a: Address) => {
    const parts = (a.fullName || "").trim().split(/\s+/);
    setInfo((p) => ({
      ...p,
      firstName: parts[0] || p.firstName,
      lastName: parts.slice(1).join(" ") || p.lastName,
      address: a.line1,
      apt: a.line2 || "",
      city: a.city,
      postal: a.postcode || "",
      country: a.country || "Lebanon",
      phone: a.phone || p.phone,
    }));
    setAddrId(a.id);
    setPhoneSeed((v) => v + 1);
    setErrors((e) => {
      const { address, city, firstName, lastName, phone, ...rest } = e;
      return rest;
    });
  };

  // The signed-in profile can arrive after mount — backfill anything the
  // shopper hasn't typed yet.
  useEffect(() => {
    if (!user) return;
    setInfo((p) => {
      if (!p.phone && user.phone) setPhoneSeed((v) => v + 1);
      return {
        ...p,
        email: p.email || user.email || "",
        firstName: p.firstName || user.name?.split(" ")[0] || "",
        lastName: p.lastName || user.name?.split(" ").slice(1).join(" ") || "",
        phone: p.phone || user.phone || "",
      };
    });
  }, [user]);

  // Preselect the default saved address once the address book arrives —
  // unless the shopper already started typing one.
  useEffect(() => {
    if (prefilled.current || addresses.length === 0) return;
    prefilled.current = true;
    if (info.address.trim() !== "") return;
    applyAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  useEffect(() => {
    setPageMeta({
      title: "Checkout | The A Line",
      description: "Complete your The A Line order.",
      url: window.location.origin + "/checkout",
    });
    return () => resetPageMeta();
  }, []);

  const shippingCost = useMemo(
    () => (ship === "express" ? 9.9 : subtotal >= 100 ? 0 : 5.9),
    [ship, subtotal]
  );
  const total = subtotal + shippingCost;

  if (items.length === 0) return <Navigate to="/cart" replace />;

  const set = (k: string, v: string) => setInfo((p) => ({ ...p, [k]: v }));
  /** Editing an address field means the form no longer mirrors a saved one. */
  const setAddrField = (k: string, v: string) => {
    setAddrId(null);
    set(k, v);
  };

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!isEmail(info.email)) e.email = "Enter a valid email.";
    if (!info.firstName.trim()) e.firstName = "Required";
    if (!info.lastName.trim()) e.lastName = "Required";
    if (!info.address.trim()) e.address = "Required";
    if (!info.city.trim()) e.city = "Required";
    // Postcode stays optional — most Lebanese addresses don't use one.
    if (!phoneVal.empty && !phoneVal.valid) e.phone = "Enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validatePay = () => {
    const e: Record<string, string> = {};
    const digits = pay.card.replace(/\s/g, "");
    if (digits.length < 15 || !/^\d+$/.test(digits)) e.card = "Enter a valid card number.";
    if (!/^\d{2}\/\d{2}$/.test(pay.exp)) e.exp = "MM/YY";
    if (!/^\d{3,4}$/.test(pay.cvc)) e.cvc = "3–4 digits";
    if (!pay.name.trim()) e.name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateInfo()) return;
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const placeOrder = async () => {
    if (!validatePay()) return;
    setProcessing(true);
    const fullName = `${info.firstName} ${info.lastName}`.trim();
    const body = {
      items: items.map((it) => ({
        productId: it.productId, name: it.name, colorName: it.colorName,
        colorHex: it.colorHex, price: it.price, qty: it.qty, image: it.image,
      })),
      email: info.email,
      name: fullName,
      subtotal,
      shipping: shippingCost,
      total,
      shippingMethod: ship,
      shippingAddress: (() => {
        // When a saved address is used untouched, its delivery pin rides along.
        const saved = addrId ? addresses.find((a) => a.id === addrId) : undefined;
        return {
          fullName, line1: info.address, line2: info.apt, city: info.city,
          postcode: info.postal, country: info.country, phone: info.phone,
          ...(saved?.lat != null && saved?.lng != null
            ? { lat: saved.lat, lng: saved.lng }
            : {}),
        };
      })(),
    };
    try {
      // customer:true attaches the session token when signed in; guests check out by email.
      const res = await api<{ number: string; pointsEarned?: number }>("orders", {
        method: "POST",
        body,
        customer: true,
      });
      addOrder({
        number: res.number,
        createdAt: Date.now(),
        items,
        subtotal,
        shipping: shippingCost,
        total,
        email: info.email,
        name: fullName,
        pointsEarned: res.pointsEarned,
      });
      clear();
      navigate("/order-confirmed", { state: { orderNumber: res.number, pointsEarned: res.pointsEarned } });
    } catch (e: any) {
      setErrors({ card: e?.message || "We couldn't process your order. Please try again." });
      setProcessing(false);
    }
  };

  const fmtCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div
      data-tone="light"
      className="checkout-page"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Browser surfaces carry the brand: selection, caret, focus rings. */}
      <style>{`
        .checkout-page ::selection{background:rgba(217,196,154,0.5)}
        .checkout-page input{caret-color:${TEXT_COLOR_HEX}}
        .checkout-page input::placeholder{color:rgba(58,58,58,0.62)}
        .checkout-page button:focus-visible,.checkout-page input:focus-visible,.checkout-page select:focus-visible{outline:2px solid ${GLOW_COLOR_HEX};outline-offset:2px}
      `}</style>
      <Header />
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `100px ${PAGE_PAD} 80px` : `136px ${PAGE_PAD} 100px`,
        }}
      >
        {/* Full header-width composition: the form column starts at the same
            left edge as the logo, the summary ends at the nav's right edge. */}
        <div>
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}
          >
            <span
              style={{
                fontSize: isMobile ? "clamp(34px, 11vw, 52px)" : 52,
                fontWeight: 600,
                letterSpacing: "-2px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              Secure
            </span>
            <SerifGlow
              word="checkout"
              italic
              fontSize={isMobile ? "clamp(36px, 11.5vw, 56px)" : 56}
              lineHeight={isMobile ? "clamp(32px, 11vw, 52px)" : 52}
              letterSpacing={-2}
              strokeWidth={isMobile ? "clamp(8px, 2.4vw, 12px)" : 12}
              delay={0.3}
            />
          </motion.div>

          {/* mobile collapsible summary */}
          {isMobile && (
            <div
              style={{
                background: "#FBFAF7",
                borderRadius: 14,
                border: HAIRLINE,
                marginBottom: 22,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setSummaryOpen((o) => !o)}
                aria-expanded={summaryOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  background: "none",
                  border: "none",
                  padding: "15px 18px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: TEXT_COLOR }}>
                  Order summary
                  <motion.span
                    animate={{ rotate: summaryOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    style={{ display: "inline-flex", opacity: 0.55 }}
                  >
                    <Glyph size={13}>{ChevronDown}</Glyph>
                  </motion.span>
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, ...TABULAR }}>
                  {money(total)}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {summaryOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 18px 18px" }}>
                      <OrderSummary subtotal={subtotal} shipping={shippingCost} total={total} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 0 : 64,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* form column */}
            <div style={{ flex: "0 1 680px", minWidth: 0, width: isMobile ? "100%" : "auto" }}>
              <Stepper step={step} onJump={setStep} />

              {/* entrance-only step change — never gated on exit animations */}
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {step === 1 && (
                  <div>
                    <SectionTitle>Contact</SectionTitle>
                    <CField
                      label="Email"
                      type="email"
                      value={info.email}
                      onChange={(v) => set("email", v)}
                      error={errors.email}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                    <SectionTitle style={{ marginTop: 22 }}>Shipping address</SectionTitle>

                    {/* Saved addresses from the account — one tap to use. */}
                    {addresses.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                          gap: 10,
                          marginBottom: 16,
                        }}
                      >
                        {addresses.map((a) => {
                          const on = addrId === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => applyAddress(a)}
                              aria-pressed={on}
                              style={{
                                textAlign: "left",
                                background: on ? "rgba(217,196,154,0.14)" : "#fff",
                                border: `1.5px solid ${on ? "#111" : "rgba(58,58,58,0.18)"}`,
                                borderRadius: 12,
                                padding: "12px 14px",
                                cursor: "pointer",
                                fontFamily: "'Inter Tight', sans-serif",
                                transition: "border 0.2s ease, background 0.2s ease",
                              }}
                            >
                              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    letterSpacing: "1.5px",
                                    textTransform: "uppercase",
                                    color: "rgba(58,58,58,0.62)",
                                  }}
                                >
                                  {a.label}
                                  {a.isDefault ? " · default" : ""}
                                </span>
                                {on && (
                                  <span
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: "50%",
                                      background: GLOW_COLOR,
                                      color: "#111",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Glyph size={10}>{CheckGlyph}</Glyph>
                                  </span>
                                )}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 13.5,
                                  fontWeight: 500,
                                  color: TEXT_COLOR,
                                  marginTop: 5,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {a.line1}
                              </span>
                              <span style={{ display: "block", fontSize: 12.5, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>
                                {a.city}
                                {a.postcode ? `, ${a.postcode}` : ""}
                              </span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setAddrId(null);
                            setInfo((p) => ({ ...p, address: "", apt: "", city: "", postal: "" }));
                          }}
                          style={{
                            textAlign: "center",
                            background: "none",
                            border: `1.5px dashed ${addrId === null ? "rgba(58,58,58,0.5)" : "rgba(58,58,58,0.25)"}`,
                            borderRadius: 12,
                            padding: "12px 14px",
                            cursor: "pointer",
                            fontFamily: "'Inter Tight', sans-serif",
                            fontSize: 13,
                            fontWeight: addrId === null ? 600 : 500,
                            color: addrId === null ? TEXT_COLOR : "rgba(58,58,58,0.62)",
                            transition: "border 0.2s ease, color 0.2s ease",
                          }}
                        >
                          + Use a different address
                        </button>
                      </div>
                    )}

                    <Row>
                      <Half>
                        <CField label="First name" value={info.firstName} onChange={(v) => set("firstName", v)} error={errors.firstName} autoComplete="given-name" />
                      </Half>
                      <Half>
                        <CField label="Last name" value={info.lastName} onChange={(v) => set("lastName", v)} error={errors.lastName} autoComplete="family-name" />
                      </Half>
                    </Row>
                    <CField label="Address" value={info.address} onChange={(v) => setAddrField("address", v)} error={errors.address} placeholder="Street and building" autoComplete="address-line1" />
                    <CField label="Apartment, floor (optional)" value={info.apt} onChange={(v) => setAddrField("apt", v)} autoComplete="address-line2" />
                    <Row>
                      <Half>
                        <CField label="City / town" value={info.city} onChange={(v) => setAddrField("city", v)} error={errors.city} autoComplete="address-level2" />
                      </Half>
                      <Half>
                        <CField label="Postcode (optional)" value={info.postal} onChange={(v) => setAddrField("postal", v)} inputMode="numeric" autoComplete="postal-code" />
                      </Half>
                    </Row>
                    <PhoneField
                      key={`${addrId ?? "manual"}:${phoneSeed}`}
                      label="Phone (optional)"
                      defaultCountry="LB"
                      initialValue={info.phone}
                      error={errors.phone}
                      onPhone={(p) => {
                        setPhoneVal(p);
                        set("phone", p.e164 ?? (p.empty ? "" : p.raw));
                        if (errors.phone) setErrors((e) => { const { phone, ...rest } = e; return rest; });
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 12,
                        color: "rgba(58,58,58,0.62)",
                        margin: "2px 0 18px",
                      }}
                    >
                      <Glyph size={12}>{LockGlyph}</Glyph> Delivering across Lebanon.
                    </div>
                    <AuthButton type="button" onClick={next}>
                      Continue to shipping
                    </AuthButton>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <SectionTitle>Shipping method</SectionTitle>
                    <ShipOption
                      selected={ship === "standard"}
                      onSelect={() => setShip("standard")}
                      title="Standard"
                      sub="3–5 business days"
                      price={subtotal >= 100 ? "Free" : money(5.9)}
                    />
                    <ShipOption
                      selected={ship === "express"}
                      onSelect={() => setShip("express")}
                      title="Express"
                      sub="1–2 business days"
                      price={money(9.9)}
                    />
                    {subtotal >= 100 && ship === "standard" && (
                      <div style={{ fontSize: 12.5, color: "rgba(58,58,58,0.62)", margin: "4px 0 0" }}>
                        Standard shipping is free on orders over €100.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                      <BackBtn onClick={back} />
                      <AuthButton type="button" onClick={next}>
                        Continue to payment
                      </AuthButton>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <SectionTitle>Payment</SectionTitle>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "rgba(58,58,58,0.72)",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Glyph size={13}>{LockGlyph}</Glyph> All transactions are secure and encrypted.
                    </div>
                    <div style={{ position: "relative" }}>
                      <CField
                        label="Card number"
                        value={pay.card}
                        onChange={(v) => setPay((p) => ({ ...p, card: fmtCard(v) }))}
                        error={errors.card}
                        placeholder="1234 5678 9012 3456"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 14,
                          top: 36,
                          color: "rgba(58,58,58,0.4)",
                          display: "inline-flex",
                        }}
                      >
                        <Glyph size={16}>{CardGlyph}</Glyph>
                      </span>
                    </div>
                    <Row>
                      <Half>
                        <CField label="Expiry (MM/YY)" value={pay.exp} onChange={(v) => setPay((p) => ({ ...p, exp: fmtExp(v) }))} error={errors.exp} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" />
                      </Half>
                      <Half>
                        <CField label="CVC" value={pay.cvc} onChange={(v) => setPay((p) => ({ ...p, cvc: v.replace(/\D/g, "").slice(0, 4) }))} error={errors.cvc} placeholder="123" inputMode="numeric" autoComplete="cc-csc" />
                      </Half>
                    </Row>
                    <CField label="Name on card" value={pay.name} onChange={(v) => setPay((p) => ({ ...p, name: v }))} error={errors.name} autoComplete="cc-name" />
                    <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                      <BackBtn onClick={back} />
                      <AuthButton type="button" onClick={placeOrder} loading={processing}>
                        {processing ? "Processing…" : `Place order — ${money(total)}`}
                      </AuthButton>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* desktop summary */}
            {!isMobile && (
              <aside
                style={{
                  flex: "0 0 380px",
                  width: 380,
                  position: "sticky",
                  top: 104,
                  background: "#FBFAF7",
                  border: HAIRLINE,
                  borderRadius: 16,
                  padding: "24px 24px 20px",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.2px", color: TEXT_COLOR, marginBottom: 18 }}>
                  Order summary
                </div>
                <OrderSummary subtotal={subtotal} shipping={shippingCost} total={total} />
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        background: "none",
        border: "1px solid rgba(58,58,58,0.25)",
        borderRadius: 999,
        padding: "0 24px",
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14,
        color: TEXT_COLOR,
      }}
    >
      Back
    </button>
  );
}
