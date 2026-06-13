import { useState, type ReactNode } from "react";
import { motion, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import SerifGlow from "./SerifGlow";
import { useIsMobile } from "../lib/useResponsive";

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthLayout({
  quoteLead,
  quoteAccent,
  caption,
  children,
}: {
  quoteLead: string;
  quoteAccent: string;
  caption: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* editorial panel */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            flex: "0 0 44%",
            background: "#161616",
            color: "#fff",
            padding: 44,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "2.5px",
                color: "#fff",
              }}
            >
              THE A LINE
            </span>
            <svg viewBox="0 0 24 24" width={13} height={13}>
              <path
                d="M12 21s-7.5-4.9-10-9.2C0 8 2 4.5 5.5 4.5 8 4.5 9.6 6 12 8c2.4-2 4-3.5 6.5-3.5C22 4.5 24 8 22 11.8 19.5 16.1 12 21 12 21z"
                style={{ fill: GLOW_COLOR }}
              />
            </svg>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: 12,
                fontSize: 52,
                fontWeight: 500,
                letterSpacing: "-2px",
                lineHeight: 1.05,
              }}
            >
              <span>{quoteLead}</span>
              <SerifGlow
                word={quoteAccent}
                italic
                fontSize={58}
                lineHeight={54}
                letterSpacing={-2}
                strokeWidth={13}
                fillColor="#fff"
                delay={0.5}
              />
            </div>
            <p
              style={{
                marginTop: 22,
                maxWidth: 360,
                fontSize: 14,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {caption}
            </p>
          </motion.div>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            © 2026 The A Line — Crafted to move with your story.
          </div>
        </motion.div>
      )}

      {/* form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "0" : "0 0 40px",
        }}
      >
        {/* top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: isMobile ? "20px 24px" : "28px 48px",
          }}
        >
          {isMobile ? (
            <button
              onClick={() => navigate("/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "2.5px",
                  color: TEXT_COLOR,
                }}
              >
                THE A LINE
              </span>
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "1px solid rgba(84,84,84,0.2)",
              borderRadius: 999,
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              color: TEXT_COLOR,
            }}
          >
            ← Back to shop
          </button>
        </div>

        {/* form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "8px 24px 48px" : "0 48px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            style={{ width: "100%", maxWidth: 400 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthHeading({
  lead,
  accent,
  sub,
}: {
  lead: string;
  accent: string;
  sub: string;
}) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 600,
            letterSpacing: "-1.5px",
            color: TEXT_COLOR,
          }}
        >
          {lead}
        </span>
        <SerifGlow
          word={accent}
          italic
          fontSize={42}
          lineHeight={40}
          letterSpacing={-1.5}
          strokeWidth={10}
          delay={0.3}
        />
      </div>
      <p style={{ marginTop: 10, fontSize: 14, color: "rgba(84,84,84,0.65)" }}>
        {sub}
      </p>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
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
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={isPwd && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            background: "#fff",
            border: `1.5px solid ${
              error
                ? "#c0563f"
                : focus
                ? GLOW_COLOR
                : "rgba(84,84,84,0.18)"
            }`,
            borderRadius: 12,
            padding: isPwd ? "13px 44px 13px 16px" : "13px 16px",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 15,
            color: TEXT_COLOR,
            outline: "none",
            transition: "border 0.2s ease",
          }}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              color: "rgba(84,84,84,0.6)",
            }}
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "#c0563f", marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export function AuthButton({
  children,
  loading,
  type = "submit",
}: {
  children: ReactNode;
  loading?: boolean;
  type?: "submit" | "button";
}) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  return (
    <motion.button
      type={type}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.2);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.98 }}
      style={{
        x,
        y,
        width: "100%",
        background: GLOW_COLOR,
        color: "#111",
        border: "none",
        borderRadius: 999,
        padding: "16px 0",
        fontSize: 15,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        opacity: loading ? 0.85 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

export function SocialButtons() {
  const btn: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    background: "#fff",
    border: "1px solid rgba(84,84,84,0.2)",
    borderRadius: 999,
    padding: "12px 0",
    cursor: "pointer",
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: 13.5,
    fontWeight: 500,
    color: TEXT_COLOR,
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" style={btn}>
        <span style={{ fontWeight: 700 }}>G</span> Google
      </button>
      <button type="button" style={btn}>
        <span style={{ fontSize: 15 }}></span> Apple
      </button>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        margin: "22px 0",
      }}
    >
      <span style={{ flex: 1, height: 1, background: "rgba(84,84,84,0.15)" }} />
      <span style={{ fontSize: 12, color: "rgba(84,84,84,0.5)" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "rgba(84,84,84,0.15)" }} />
    </div>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
