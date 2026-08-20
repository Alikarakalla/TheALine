import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PasswordStrength, isEmail } from "../AuthUI";
import { PhoneField, EMPTY_PHONE, type PhoneValue } from "../PhoneField";
import Switch from "./Switch";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAuth } from "../../context/Auth";
import { usePreferences } from "../../context/Preferences";
import { useCurrency } from "../../context/Currency";
import { useLoyalty } from "../../context/Loyalty";
import { useToast } from "../../context/Toast";
import { api } from "../../lib/api";
import { Glyph } from "./icons";

const HAIRLINE = "1px solid rgba(58,58,58,0.1)";

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

/* --------------------------------------------------- compact form pieces */

function SField({
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
      <div style={{ position: "relative" }}>
        <input
          type={isPwd && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          spellCheck={false}
          style={{
            width: "100%",
            background: "#fff",
            border: `1.5px solid ${error ? "#c0563f" : focus ? "#141414" : "rgba(58,58,58,0.2)"}`,
            boxShadow: focus && !error ? "0 0 0 3px rgba(20,20,20,0.07)" : "none",
            borderRadius: 10,
            padding: isPwd ? "11px 40px 11px 14px" : "11px 14px",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            color: TEXT_COLOR,
            outline: "none",
            transition: "border 0.2s ease, box-shadow 0.2s ease",
          }}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 9,
              color: "rgba(58,58,58,0.62)",
              display: "inline-flex",
            }}
          >
            <Glyph size={14}>{show ? EyeOffGlyph : EyeGlyph}</Glyph>
          </button>
        )}
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: "#c0563f", marginTop: 5 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function SButton({
  children,
  disabled,
  loading,
  danger,
  ghost,
  type = "submit",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  ghost?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const off = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        background: ghost || danger ? "none" : disabled ? "rgba(58,58,58,0.12)" : "#141414",
        color: danger ? "#c0563f" : ghost ? TEXT_COLOR : disabled ? "rgba(58,58,58,0.45)" : "#ffffff",
        border: danger
          ? "1px solid rgba(192,86,63,0.4)"
          : ghost
          ? "1px solid rgba(58,58,58,0.25)"
          : "none",
        borderRadius: 999,
        padding: "9px 18px",
        fontSize: 13,
        fontWeight: 600,
        cursor: off ? (loading ? "wait" : "default") : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

/** Two-column settings row: section name + hint left, controls right. */
function Section({
  title,
  hint,
  children,
  last,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        display: isMobile ? "block" : "grid",
        gridTemplateColumns: "200px 1fr",
        gap: isMobile ? 0 : 48,
        padding: isMobile ? "22px 0" : "26px 0",
        borderBottom: last ? "none" : HAIRLINE,
      }}
    >
      <div style={{ marginBottom: isMobile ? 14 : 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.2px", color: TEXT_COLOR }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "rgba(58,58,58,0.62)",
            marginTop: 4,
            maxWidth: isMobile ? "100%" : 180,
          }}
        >
          {hint}
        </div>
      </div>
      <div style={{ maxWidth: 460, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ConfirmModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(17,17,17,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#ffffff",
          borderRadius: 18,
          padding: 28,
          fontFamily: "'Inter Tight', sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 600, color: TEXT_COLOR, marginBottom: 8 }}>
          Delete account?
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(58,58,58,0.72)", lineHeight: 1.6, marginBottom: 22 }}>
          This permanently removes your profile, addresses, payment methods and rewards.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "none",
              border: "1px solid rgba(58,58,58,0.25)",
              borderRadius: 999,
              padding: "12px 0",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              color: TEXT_COLOR,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: "#c0563f",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "12px 0",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------- page */

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, signOut } = useAuth();
  const { prefs, set } = usePreferences();
  const { currencies, current } = useCurrency();
  const { birthday, setBirthday } = useLoyalty();
  const { show } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneV, setPhoneV] = useState<PhoneValue>(EMPTY_PHONE);
  const [phoneReady, setPhoneReady] = useState(false);
  const [profileErr, setProfileErr] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdErr, setPwdErr] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);
  const [bday, setBday] = useState(birthday || "");
  const [confirm, setConfirm] = useState(false);

  const phoneOut = phoneV.empty ? "" : phoneV.e164 ?? phoneV.raw;
  const phoneDirty = phoneReady && phoneOut !== (user?.phone ?? "");
  const profileDirty =
    name.trim() !== (user?.name ?? "") || email.trim() !== (user?.email ?? "") || phoneDirty;
  const bdayDirty = !!bday && bday !== (birthday || "");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = "Enter your name.";
    if (!isEmail(email)) er.email = "Enter a valid email.";
    if (!phoneV.empty && !phoneV.valid) er.phone = "Enter a valid phone number.";
    setProfileErr(er);
    if (Object.keys(er).length) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        ...(phoneReady ? { phone: phoneV.empty ? "" : phoneV.e164 ?? phoneV.raw } : {}),
      });
      show({ title: "Profile updated", tone: "success" });
    } catch (err: any) {
      setProfileErr({ email: err?.message || "Could not update your profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!pwd.current) er.current = "Enter your current password.";
    if (pwd.next.length < 8) er.next = "Use at least 8 characters.";
    else if (score != null && score < 2)
      er.next = "That password is too easy to guess — make it longer or less common.";
    if (pwd.confirm !== pwd.next) er.confirm = "Passwords don't match.";
    setPwdErr(er);
    if (Object.keys(er).length) return;
    setSavingPwd(true);
    try {
      await api("auth/customer/password", {
        method: "PUT",
        body: { current: pwd.current, password: pwd.next },
        customer: true,
      });
      setPwd({ current: "", next: "", confirm: "" });
      show({ title: "Password updated", tone: "success" });
    } catch (err: any) {
      setPwdErr({ current: err?.message || "Could not update your password." });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.5px",
          color: TEXT_COLOR,
          marginBottom: 8,
        }}
      >
        Settings
      </h1>

      <Section title="Profile" hint="Your name and the email you sign in with.">
        <form onSubmit={saveProfile} noValidate>
          <SField label="Full name" value={name} onChange={setName} error={profileErr.name} autoComplete="name" />
          <SField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={profileErr.email}
            autoComplete="email"
          />
          <PhoneField
            label="Phone"
            defaultCountry="LB"
            initialValue={user?.phone || ""}
            error={profileErr.phone}
            onPhone={(p) => {
              setPhoneV(p);
              setPhoneReady(true);
              if (profileErr.phone)
                setProfileErr((e) => {
                  const { phone, ...rest } = e;
                  return rest;
                });
            }}
          />
          <SButton disabled={!profileDirty} loading={savingProfile}>
            {savingProfile ? "Saving…" : "Save changes"}
          </SButton>
        </form>
      </Section>

      <Section title="Password" hint="At least 8 characters — the meter helps you pick a strong one.">
        <form onSubmit={savePassword} noValidate>
          <SField
            label="Current password"
            type="password"
            value={pwd.current}
            onChange={(v) => setPwd((p) => ({ ...p, current: v }))}
            error={pwdErr.current}
            autoComplete="current-password"
          />
          <SField
            label="New password"
            type="password"
            value={pwd.next}
            onChange={(v) => setPwd((p) => ({ ...p, next: v }))}
            error={pwdErr.next}
            autoComplete="new-password"
          />
          <PasswordStrength password={pwd.next} userInputs={[name, email]} onScore={setScore} />
          <SField
            label="Confirm new password"
            type="password"
            value={pwd.confirm}
            onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
            error={
              pwdErr.confirm ||
              (pwd.confirm.length > 0 && pwd.confirm.length >= pwd.next.length && pwd.confirm !== pwd.next
                ? "Passwords don't match."
                : undefined)
            }
            autoComplete="new-password"
          />
          <SButton disabled={!pwd.current || !pwd.next || !pwd.confirm} loading={savingPwd}>
            {savingPwd ? "Updating…" : "Update password"}
          </SButton>
        </form>
      </Section>

      <Section title="Communication" hint="What we send you, and in which currency you shop.">
        {[
          { k: "newsletter" as const, label: "Newsletter", sub: "New arrivals & editorials" },
          { k: "offers" as const, label: "Offers & rewards", sub: "Points, sales and perks" },
          { k: "sms" as const, label: "SMS updates", sub: "Order and delivery texts" },
        ].map((row, i) => (
          <div
            key={row.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "11px 0",
              borderTop: i === 0 ? "none" : "1px solid rgba(58,58,58,0.07)",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>{row.label}</div>
              <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>{row.sub}</div>
            </div>
            <Switch on={!!prefs[row.k]} onChange={(v) => set({ [row.k]: v })} />
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "11px 0 0",
            borderTop: "1px solid rgba(58,58,58,0.07)",
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>Currency</div>
          <select
            value={prefs.currency || current.code}
            onChange={(e) => set({ currency: e.target.value })}
            style={{
              background: "#fff",
              border: "1px solid rgba(58,58,58,0.22)",
              borderRadius: 999,
              padding: "7px 13px",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12.5,
              color: TEXT_COLOR,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Birthday" hint="A Glow Points gift on your day, every year.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="date"
            value={bday}
            onChange={(e) => setBday(e.target.value)}
            aria-label="Birthday"
            style={{
              background: "#fff",
              border: "1.5px solid rgba(58,58,58,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              color: TEXT_COLOR,
              outline: "none",
            }}
          />
          <SButton
            type="button"
            disabled={!bdayDirty}
            onClick={() => {
              setBirthday(bday);
              show({ title: "Birthday saved", description: "We'll celebrate with you", tone: "reward" });
            }}
          >
            Save
          </SButton>
        </div>
      </Section>

      <Section title="Account" hint="Sign out here, or leave for good." last>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SButton
            type="button"
            ghost
            onClick={() => {
              signOut();
              navigate("/");
            }}
          >
            Sign out
          </SButton>
          <SButton type="button" danger onClick={() => setConfirm(true)}>
            Delete account
          </SButton>
        </div>
      </Section>

      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            onClose={() => setConfirm(false)}
            onConfirm={() => {
              api("auth/customer", { method: "DELETE", customer: true }).catch(() => {});
              signOut();
              navigate("/");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
