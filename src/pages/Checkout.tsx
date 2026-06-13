import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import { Field, AuthButton, isEmail } from "../components/AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart } from "../context/Cart";
import { useAuth } from "../context/Auth";
import { useOrders } from "../context/Orders";
import { api } from "../lib/api";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;
const STEPS = ["Information", "Shipping", "Payment"];
const COUNTRIES = ["France", "Belgium", "Germany", "Spain", "Italy", "Netherlands", "United Kingdom"];

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}
function Half({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, minWidth: 0 }}>{children}</div>;
}

function Stepper({
  step,
  onJump,
}: {
  step: number;
  onJump: (s: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 34 }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => done && onJump(n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: done ? "pointer" : "default",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  background: active || done ? GLOW_COLOR : "transparent",
                  border: active || done ? "none" : "1.5px solid rgba(84,84,84,0.3)",
                  color: active || done ? "#111" : "rgba(84,84,84,0.5)",
                }}
              >
                {done ? "✓" : n}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? TEXT_COLOR : "rgba(84,84,84,0.55)",
                }}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                style={{
                  width: 24,
                  height: 1,
                  background: "rgba(84,84,84,0.25)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRows({
  subtotal,
  shipping,
  total,
}: {
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Line label="Subtotal" value={money(subtotal)} />
      <Line label="Shipping" value={shipping === 0 ? "Free" : money(shipping)} />
      <div style={{ height: 1, background: "rgba(84,84,84,0.12)", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>Total</span>
        <span style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR }}>{money(total)}</span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 22 }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                width: 56,
                height: 64,
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
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#111",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.qty}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_COLOR }}>
                {it.name}
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
      <SummaryRows subtotal={subtotal} shipping={shipping} total={total} />
    </div>
  );
}

export default function Checkout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
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
    country: "France",
    phone: "",
  });
  const [ship, setShip] = useState<"standard" | "express">("standard");
  const [pay, setPay] = useState({ card: "", exp: "", cvc: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (!isEmail(info.email)) e.email = "Enter a valid email.";
    if (!info.firstName.trim()) e.firstName = "Required";
    if (!info.lastName.trim()) e.lastName = "Required";
    if (!info.address.trim()) e.address = "Required";
    if (!info.city.trim()) e.city = "Required";
    if (!info.postal.trim()) e.postal = "Required";
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
      shippingAddress: {
        fullName, line1: info.address, line2: info.apt, city: info.city,
        postcode: info.postal, country: info.country, phone: info.phone,
      },
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
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />
      <div
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: isMobile ? "100px 24px 80px" : "140px 64px 100px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 30 }}
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
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(84,84,84,0.1)",
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setSummaryOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: "16px 18px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <span style={{ fontSize: 14, color: TEXT_COLOR }}>
                Order summary {summaryOpen ? "▴" : "▾"}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR }}>
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
            alignItems: "flex-start",
          }}
        >
          {/* form */}
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
            <Stepper step={step} onJump={setStep} />

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {step === 1 && (
                  <div>
                    <SectionTitle>Contact</SectionTitle>
                    <Field
                      label="Email"
                      type="email"
                      value={info.email}
                      onChange={(v) => set("email", v)}
                      error={errors.email}
                      placeholder="you@email.com"
                    />
                    <SectionTitle style={{ marginTop: 18 }}>Shipping address</SectionTitle>
                    <Row>
                      <Half>
                        <Field label="First name" value={info.firstName} onChange={(v) => set("firstName", v)} error={errors.firstName} />
                      </Half>
                      <Half>
                        <Field label="Last name" value={info.lastName} onChange={(v) => set("lastName", v)} error={errors.lastName} />
                      </Half>
                    </Row>
                    <Field label="Address" value={info.address} onChange={(v) => set("address", v)} error={errors.address} placeholder="Street and number" />
                    <Field label="Apartment, suite (optional)" value={info.apt} onChange={(v) => set("apt", v)} />
                    <Row>
                      <Half>
                        <Field label="City" value={info.city} onChange={(v) => set("city", v)} error={errors.city} />
                      </Half>
                      <Half>
                        <Field label="Postal code" value={info.postal} onChange={(v) => set("postal", v)} error={errors.postal} />
                      </Half>
                    </Row>
                    <Row>
                      <Half>
                        <CountrySelect value={info.country} onChange={(v) => set("country", v)} />
                      </Half>
                      <Half>
                        <Field label="Phone (optional)" value={info.phone} onChange={(v) => set("phone", v)} />
                      </Half>
                    </Row>
                    <div style={{ marginTop: 14 }}>
                      <AuthButton type="button">
                        <span onClick={next}>Continue to shipping</span>
                      </AuthButton>
                    </div>
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
                    <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                      <BackBtn onClick={back} />
                      <AuthButton type="button">
                        <span onClick={next}>Continue to payment</span>
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
                        color: "rgba(84,84,84,0.6)",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      🔒 All transactions are secure and encrypted.
                    </div>
                    <Field
                      label="Card number"
                      value={pay.card}
                      onChange={(v) => setPay((p) => ({ ...p, card: fmtCard(v) }))}
                      error={errors.card}
                      placeholder="1234 5678 9012 3456"
                    />
                    <Row>
                      <Half>
                        <Field label="Expiry (MM/YY)" value={pay.exp} onChange={(v) => setPay((p) => ({ ...p, exp: fmtExp(v) }))} error={errors.exp} placeholder="MM/YY" />
                      </Half>
                      <Half>
                        <Field label="CVC" value={pay.cvc} onChange={(v) => setPay((p) => ({ ...p, cvc: v.replace(/\D/g, "").slice(0, 4) }))} error={errors.cvc} placeholder="123" />
                      </Half>
                    </Row>
                    <Field label="Name on card" value={pay.name} onChange={(v) => setPay((p) => ({ ...p, name: v }))} error={errors.name} />
                    <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                      <BackBtn onClick={back} />
                      <AuthButton type="button" loading={processing}>
                        <span onClick={placeOrder}>
                          {processing ? "Processing…" : `Place order — ${money(total)}`}
                        </span>
                      </AuthButton>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* desktop summary */}
          {!isMobile && (
            <aside
              style={{
                flex: "0 0 360px",
                width: 360,
                position: "sticky",
                top: 100,
                background: "#fff",
                borderRadius: 18,
                padding: 28,
                boxShadow: "0 20px 50px rgba(84,84,84,0.08)",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600, color: TEXT_COLOR, marginBottom: 20 }}>
                Order summary
              </div>
              <OrderSummary subtotal={subtotal} shipping={shippingCost} total={total} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
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
        color: "rgba(84,84,84,0.5)",
        marginBottom: 14,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
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
        border: "1px solid rgba(84,84,84,0.25)",
        borderRadius: 999,
        padding: "0 24px",
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: TEXT_COLOR,
      }}
    >
      Back
    </button>
  );
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 500,
          color: "rgba(84,84,84,0.7)",
          marginBottom: 7,
        }}
      >
        Country
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "#fff",
          border: "1.5px solid rgba(84,84,84,0.18)",
          borderRadius: 12,
          padding: "13px 16px",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 15,
          color: TEXT_COLOR,
          outline: "none",
          cursor: "pointer",
          appearance: "none",
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

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
      onClick={onSelect}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "#fff",
        border: `1.5px solid ${selected ? GLOW_COLOR : "rgba(84,84,84,0.18)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 12,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: selected ? `6px solid ${GLOW_COLOR}` : "2px solid rgba(84,84,84,0.3)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: TEXT_COLOR }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{sub}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{price}</span>
    </button>
  );
}
