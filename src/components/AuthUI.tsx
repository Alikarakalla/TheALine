import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useSpring } from "framer-motion";
import Header from "./Header";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  TEXT_COLOR_HEX,
  GLOW_COLOR_HEX,
} from "../lib/constants";
import SerifGlow from "./SerifGlow";
import { useIsMobile } from "../lib/useResponsive";
import { loadStrength, type StrengthResult } from "../lib/passwordStrength";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ icons */
/* Drawn 1.6-stroke glyphs — one consistent weight, no unicode stand-ins. */

export function Glyph({
  children,
  size = 14,
}: {
  children: ReactNode;
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
      style={{ flex: "0 0 auto", display: "block" }}
    >
      {children}
    </svg>
  );
}
const EyeGlyph = (
  <>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const EyeOffGlyph = (
  <>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.9 3.8M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 19 12 19a9.7 9.7 0 0 0 4-.9" />
    <path d="M10 10.2a3 3 0 0 0 4 4.2" />
  </>
);
const LockGlyph = (
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>
);
export const CheckGlyph = <path d="M20 6.5 9.5 17 4 11.5" />;

/* Brand marks for the SSO row (authored SVG, not glyph text). */
const GoogleMark = (
  <svg width={15} height={15} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.93-2.92l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15a7.24 7.24 0 0 1-6.74-4.96H1.27v3.09A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.26 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.27a12 12 0 0 0 0 10.72l3.99-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.98 11.98 0 0 0 1.27 6.64l3.99 3.09A7.24 7.24 0 0 1 12 4.75z"
    />
  </svg>
);
const AppleMark = (
  <svg width={15} height={15} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path
      fill="#111"
      d="M17.05 12.54c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.96-1.54-.16-3 .9-3.78.9-.78 0-1.98-.88-3.26-.85-1.68.02-3.22.97-4.08 2.47-1.74 3.02-.44 7.49 1.25 9.94.83 1.2 1.82 2.55 3.12 2.5 1.25-.05 1.72-.81 3.24-.81 1.51 0 1.94.81 3.26.79 1.35-.03 2.2-1.22 3.02-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.01-2.61-1-2.65-3.98zM14.55 4.7c.69-.83 1.15-1.99 1.02-3.14-.99.04-2.18.66-2.89 1.49-.63.73-1.19 1.9-1.04 3.03 1.1.09 2.22-.56 2.91-1.38z"
    />
  </svg>
);

/* ----------------------------------------------------------------- layout */

/**
 * Auth pages live inside the normal storefront: the shared <Header /> on a
 * white page, with one centered column of type and form below it.
 */
export function AuthLayout({
  children,
  width = 420,
}: {
  children: ReactNode;
  width?: number;
}) {
  const isMobile = useIsMobile();
  return (
    <div
      data-tone="light"
      className="auth-page"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Browser surfaces carry the brand: selection, caret, focus, autofill. */}
      <style>{`
        .auth-page ::selection{background:rgba(217,196,154,0.5)}
        .auth-page input{caret-color:${TEXT_COLOR_HEX}}
        .auth-page input::placeholder{color:rgba(58,58,58,0.62)}
        .auth-page button:focus-visible,.auth-page input:focus-visible{outline:2px solid #141414;outline-offset:2px}
        .auth-page input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #fff inset;-webkit-text-fill-color:${TEXT_COLOR_HEX}}
        .auth-link{transition:color 0.2s ease}
        .auth-link:hover{color:${TEXT_COLOR_HEX}}
      `}</style>
      <Header />
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          padding: isMobile ? "112px 24px 72px" : "150px 24px 100px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          style={{ width: "100%", maxWidth: width }}
        >
          {children}
        </motion.div>
      </main>
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
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "-1.8px",
            lineHeight: 1,
            color: TEXT_COLOR,
          }}
        >
          {lead}
        </span>
        <SerifGlow
          word={accent}
          italic
          fontSize={46}
          lineHeight={44}
          letterSpacing={-1.8}
          strokeWidth={11}
          delay={0.25}
        />
      </div>
      <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "rgba(58,58,58,0.72)" }}>
        {sub}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ field */

export function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  name,
  onBlur,
  valid,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  name?: string;
  onBlur?: () => void;
  /** Show a quiet success check at the right edge (live validation). */
  valid?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const isPwd = type === "password";
  const showCheck = !!valid && !error && !isPwd && value.length > 0;
  const checkCaps = (e: React.KeyboardEvent) =>
    setCaps(isPwd && !!e.getModifierState?.("CapsLock"));
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: "rgba(58,58,58,0.62)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={isPwd && show ? "text" : type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            setCaps(false);
            onBlur?.();
          }}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          spellCheck={false}
          style={{
            width: "100%",
            background: "#fff",
            border: `1.5px solid ${
              error ? "#c0563f" : focus ? "#141414" : "rgba(58,58,58,0.2)"
            }`,
            boxShadow: focus && !error ? "0 0 0 3px rgba(20,20,20,0.07)" : "none",
            borderRadius: 12,
            padding: isPwd || showCheck ? "14px 46px 14px 16px" : "14px 16px",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 15,
            color: TEXT_COLOR,
            outline: "none",
            transition: "border 0.2s ease, box-shadow 0.2s ease",
          }}
        />
        {showCheck && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5c7a00",
              display: "inline-flex",
            }}
          >
            <Glyph size={15}>{CheckGlyph}</Glyph>
          </span>
        )}
        {isPwd && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 10,
              color: "rgba(58,58,58,0.62)",
              display: "inline-flex",
            }}
          >
            <Glyph size={16}>{show ? EyeOffGlyph : EyeGlyph}</Glyph>
          </button>
        )}
      </div>
      {isPwd && caps && !error && (
        <div style={{ fontSize: 12, color: "rgba(58,58,58,0.72)", marginTop: 6 }}>
          Caps Lock is on.
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- password strength */

const STRENGTH_SCALE = [
  { label: "Very weak", color: "#c0563f" },
  { label: "Weak", color: "#c0563f" },
  { label: "Fair", color: "#d89a3f" },
  { label: "Good", color: "#8a9a2f" },
  { label: "Strong", color: "#5c7a00" },
] as const;

/**
 * zxcvbn-backed strength meter. Reports the score up via onScore so forms
 * can gate submission (null = empty or library unavailable).
 */
export function PasswordStrength({
  password,
  userInputs = [],
  onScore,
}: {
  password: string;
  userInputs?: string[];
  onScore?: (score: number | null) => void;
}) {
  const [res, setRes] = useState<StrengthResult | null>(null);
  const inputsKey = userInputs.join(" ");

  useEffect(() => {
    if (!password) {
      setRes(null);
      onScore?.(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      loadStrength()
        .then((score) => {
          if (!alive) return;
          const r = score(password, inputsKey ? inputsKey.split(" ") : []);
          setRes(r);
          onScore?.(r.score);
        })
        .catch(() => {
          if (!alive) return;
          setRes(null);
          onScore?.(null);
        });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, inputsKey]);

  if (!password || !res) return null;
  const s = STRENGTH_SCALE[res.score];
  const filled = Math.max(1, res.score);
  const hint = res.warning || (res.score < 3 ? res.suggestion : "");
  return (
    <div style={{ margin: "-8px 0 18px" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: i < filled ? s.color : "rgba(58,58,58,0.15)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
        <span style={{ fontSize: 11.5, color: s.color, fontWeight: 600 }}>{s.label}</span>
        {hint && (
          <span style={{ fontSize: 11.5, color: "rgba(58,58,58,0.62)", textAlign: "right" }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- OTP input */

/**
 * Segmented one-time-code input. The value is a contiguous digit string —
 * focus always sits on the next empty box, typing fills forward, backspace
 * erases backward, and pasting a full code distributes across the boxes.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  disabled,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const active = Math.min(value.length, length - 1);

  const focusActive = () => refs.current[active]?.focus();

  const pushDigits = (raw: string) => {
    const digits = (value + raw.replace(/\D/g, "")).slice(0, length);
    onChange(digits);
    const next = Math.min(digits.length, length - 1);
    requestAnimationFrame(() => refs.current[next]?.focus());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const digits = value.slice(0, -1);
      onChange(digits);
      requestAnimationFrame(() => refs.current[Math.min(digits.length, length - 1)]?.focus());
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    onChange(digits);
    requestAnimationFrame(() => refs.current[Math.min(digits.length, length - 1)]?.focus());
  };

  return (
    <div
      role="group"
      aria-label="Verification code"
      style={{ display: "flex", gap: 9, marginBottom: 6 }}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const isActive = i === active && !disabled;
        return (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={value[i] ?? ""}
            onChange={(e) => pushDigits(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            onFocus={(e) => {
              // keep the caret on the first empty box, wherever they click
              if (i !== active) focusActive();
              else e.target.select();
            }}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1} of ${length}`}
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: 60,
              height: 60,
              textAlign: "center",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 23,
              fontWeight: 600,
              color: TEXT_COLOR,
              background: "#fff",
              border: `1.5px solid ${
                error
                  ? "#c0563f"
                  : isActive
                  ? "#141414"
                  : filled
                  ? "rgba(58,58,58,0.4)"
                  : "rgba(58,58,58,0.2)"
              }`,
              boxShadow: isActive && !error ? "0 0 0 3px rgba(20,20,20,0.07)" : "none",
              borderRadius: 12,
              outline: "none",
              caretColor: "transparent",
              transition: "border 0.15s ease, box-shadow 0.15s ease",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- buttons */

export function AuthButton({
  children,
  loading,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  const off = disabled || loading;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={off}
      onMouseMove={(e) => {
        if (off) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.2);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: off ? 1 : 0.98 }}
      style={{
        x,
        y,
        width: "100%",
        background: disabled ? "rgba(58,58,58,0.15)" : "#141414",
        color: disabled ? "rgba(58,58,58,0.5)" : "#ffffff",
        border: "none",
        borderRadius: 999,
        padding: "16px 0",
        fontSize: 15,
        fontWeight: 600,
        cursor: loading ? "wait" : disabled ? "not-allowed" : "pointer",
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
    border: "1px solid rgba(58,58,58,0.2)",
    borderRadius: 999,
    padding: "13px 0",
    cursor: "pointer",
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: 13.5,
    fontWeight: 500,
    color: TEXT_COLOR,
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" style={btn}>
        {GoogleMark} Google
      </button>
      <button type="button" style={btn}>
        {AppleMark} Apple
      </button>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
      <span style={{ flex: 1, height: 1, background: "rgba(58,58,58,0.14)" }} />
      <span style={{ fontSize: 12, color: "rgba(58,58,58,0.62)" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "rgba(58,58,58,0.14)" }} />
    </div>
  );
}

/** Quiet reassurance line under the form. */
export function TrustLine({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 26,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: "rgba(58,58,58,0.62)",
      }}
    >
      <Glyph size={12}>{LockGlyph}</Glyph>
      {children}
    </div>
  );
}

/** Footer link line ("New here? Create an account"). */
export function SwitchLine({
  prompt,
  action,
  onClick,
}: {
  prompt: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 26,
        fontSize: 14,
        color: "rgba(58,58,58,0.72)",
      }}
    >
      {prompt}{" "}
      <button
        onClick={onClick}
        className="auth-link"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: TEXT_COLOR,
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        {action}
      </button>
    </div>
  );
}

/** Brand checkbox with a drawn check. */
export function CheckBox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 13,
        color: "rgba(58,58,58,0.75)",
        lineHeight: 1.5,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          flexShrink: 0,
          marginTop: 1,
          border: checked ? "none" : "1.5px solid rgba(58,58,58,0.35)",
          background: checked ? "#141414" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          transition: "background 0.2s ease",
        }}
      >
        {checked && <Glyph size={11}>{CheckGlyph}</Glyph>}
      </span>
      {children}
    </button>
  );
}

/** Ink success badge with a drawn check (post-submit states). */
export function SuccessBadge() {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "#141414",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        marginBottom: 22,
      }}
    >
      <Glyph size={22}>{CheckGlyph}</Glyph>
    </div>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
