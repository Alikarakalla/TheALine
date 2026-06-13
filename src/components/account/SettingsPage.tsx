import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Field, AuthButton, isEmail } from "../AuthUI";
import Switch from "./Switch";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useAuth } from "../../context/Auth";
import { usePreferences, type Currency } from "../../context/Preferences";
import { useLoyalty } from "../../context/Loyalty";
import { useToast } from "../../context/Toast";
import { api } from "../../lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, padding: 26 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}

function ConfirmModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, background: "#ffffff", borderRadius: 18, padding: 28, fontFamily: "'Inter Tight', sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 19, fontWeight: 600, color: TEXT_COLOR, marginBottom: 8 }}>Delete account?</div>
        <div style={{ fontSize: 13.5, color: "rgba(84,84,84,0.7)", lineHeight: 1.6, marginBottom: 22 }}>
          This permanently removes your profile, addresses, payment methods and rewards from this device.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "13px 0", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: "#c0563f", color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600 }}>Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, signOut } = useAuth();
  const { prefs, set } = usePreferences();
  const { birthday, setBirthday } = useLoyalty();
  const { show } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileErr, setProfileErr] = useState<Record<string, string>>({});
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdErr, setPwdErr] = useState<Record<string, string>>({});
  const [bday, setBday] = useState(birthday || "");
  const [confirm, setConfirm] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 2) er.name = "Enter your name.";
    if (!isEmail(email)) er.email = "Enter a valid email.";
    setProfileErr(er);
    if (Object.keys(er).length) return;
    try {
      await updateProfile({ name: name.trim(), email });
      show({ title: "Profile updated", tone: "success" });
    } catch (err: any) {
      setProfileErr({ email: err?.message || "Could not update your profile." });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!pwd.current) er.current = "Enter your current password.";
    if (pwd.next.length < 8) er.next = "Use at least 8 characters.";
    if (pwd.confirm !== pwd.next) er.confirm = "Passwords don't match.";
    setPwdErr(er);
    if (Object.keys(er).length) return;
    try {
      await api("auth/customer/password", { method: "PUT", body: { current: pwd.current, password: pwd.next }, customer: true });
      setPwd({ current: "", next: "", confirm: "" });
      show({ title: "Password updated", tone: "success" });
    } catch (err: any) {
      setPwdErr({ current: err?.message || "Could not update your password." });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: TEXT_COLOR, marginBottom: 2 }}>Settings</h1>

      <Card title="Profile">
        <form onSubmit={saveProfile} noValidate>
          <Field label="Full name" value={name} onChange={setName} error={profileErr.name} />
          <Field label="Email" type="email" value={email} onChange={setEmail} error={profileErr.email} />
          <div style={{ display: "inline-flex" }}><AuthButton type="submit">Save profile</AuthButton></div>
        </form>
      </Card>

      <Card title="Password">
        <form onSubmit={savePassword} noValidate>
          <Field label="Current password" type="password" value={pwd.current} onChange={(v) => setPwd((p) => ({ ...p, current: v }))} error={pwdErr.current} />
          <Field label="New password" type="password" value={pwd.next} onChange={(v) => setPwd((p) => ({ ...p, next: v }))} error={pwdErr.next} />
          <Field label="Confirm new password" type="password" value={pwd.confirm} onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))} error={pwdErr.confirm} />
          <div style={{ display: "inline-flex" }}><AuthButton type="submit">Update password</AuthButton></div>
        </form>
      </Card>

      <Card title="Communication preferences">
        {[
          { k: "newsletter" as const, label: "Newsletter", sub: "New arrivals & editorials" },
          { k: "offers" as const, label: "Offers & rewards", sub: "Points, sales and perks" },
          { k: "sms" as const, label: "SMS updates", sub: "Order and delivery texts" },
        ].map((row, i) => (
          <div key={row.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.08)" }}>
            <div>
              <div style={{ fontSize: 14, color: TEXT_COLOR }}>{row.label}</div>
              <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{row.sub}</div>
            </div>
            <Switch on={!!prefs[row.k]} onChange={(v) => set({ [row.k]: v })} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid rgba(84,84,84,0.08)" }}>
          <div style={{ fontSize: 14, color: TEXT_COLOR }}>Currency</div>
          <select value={prefs.currency} onChange={(e) => set({ currency: e.target.value as Currency })}
            style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.2)", borderRadius: 999, padding: "8px 14px", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, color: TEXT_COLOR, cursor: "pointer" }}>
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </Card>

      <Card title="Birthday">
        <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 12 }}>
          Tell us your birthday and we'll send a Glow Points gift each year.
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={bday} onChange={(e) => setBday(e.target.value)}
            style={{ background: "#fff", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "12px 16px", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, color: TEXT_COLOR, outline: "none" }} />
          <button onClick={() => { if (bday) { setBirthday(bday); show({ title: "Birthday saved", description: "We'll celebrate with you ✦", tone: "reward" }); } }}
            style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "12px 22px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>
            Save
          </button>
        </div>
      </Card>

      <Card title="Account">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => { signOut(); navigate("/"); }}
            style={{ background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "12px 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 500, color: TEXT_COLOR }}>
            Sign out
          </button>
          <button onClick={() => setConfirm(true)}
            style={{ background: "none", border: "1px solid rgba(192,86,63,0.4)", borderRadius: 999, padding: "12px 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 500, color: "#c0563f" }}>
            Delete account
          </button>
        </div>
      </Card>

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
