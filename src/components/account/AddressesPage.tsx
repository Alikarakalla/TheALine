import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field, AuthButton } from "../AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAddresses, type Address } from "../../context/Addresses";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;
const COUNTRIES = ["France", "Belgium", "Germany", "Spain", "Italy", "Netherlands", "United Kingdom"];

type Draft = Omit<Address, "id" | "isDefault">;
const blank: Draft = { label: "Home", fullName: "", line1: "", line2: "", city: "", postcode: "", country: "France", phone: "" };

function AddressModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Address;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const isMobile = useIsMobile();
  const [d, setD] = useState<Draft>(initial ? { ...initial } : { ...blank });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof Draft, v: string) => setD((p) => ({ ...p, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!d.fullName.trim()) er.fullName = "Required";
    if (!d.line1.trim()) er.line1 = "Required";
    if (!d.city.trim()) er.city = "Required";
    if (!d.postcode.trim()) er.postcode = "Required";
    setErr(er);
    if (Object.keys(er).length) return;
    onSave(d);
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 24 }}
    >
      <motion.div
        initial={{ y: isMobile ? "100%" : 20, opacity: isMobile ? 1 : 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: isMobile ? "100%" : 20, opacity: isMobile ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "#ffffff", borderRadius: isMobile ? "18px 18px 0 0" : 18, padding: isMobile ? "26px 24px 36px" : 30, maxHeight: "90vh", overflowY: "auto", fontFamily: "'Inter Tight', sans-serif" }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR, marginBottom: 20 }}>
          {initial ? "Edit address" : "Add address"}
        </div>
        <form onSubmit={submit} noValidate>
          <Field label="Label" value={d.label} onChange={(v) => set("label", v)} placeholder="Home, Work…" />
          <Field label="Full name" value={d.fullName} onChange={(v) => set("fullName", v)} error={err.fullName} />
          <Field label="Address" value={d.line1} onChange={(v) => set("line1", v)} error={err.line1} placeholder="Street and number" />
          <Field label="Apartment, suite (optional)" value={d.line2 || ""} onChange={(v) => set("line2", v)} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="City" value={d.city} onChange={(v) => set("city", v)} error={err.city} /></div>
            <div style={{ flex: 1 }}><Field label="Postcode" value={d.postcode} onChange={(v) => set("postcode", v)} error={err.postcode} /></div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(84,84,84,0.7)", marginBottom: 7 }}>Country</label>
            <select value={d.country} onChange={(e) => set("country", e.target.value)} style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "13px 16px", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, color: TEXT_COLOR, outline: "none" }}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Phone (optional)" value={d.phone || ""} onChange={(v) => set("phone", v)} />
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: "0 0 auto", background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "0 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR }}>
              Cancel
            </button>
            <AuthButton type="submit">{initial ? "Save changes" : "Add address"}</AuthButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function AddressesPage() {
  const isMobile = useIsMobile();
  const { addresses, add, update, remove, setDefault } = useAddresses();
  const { show } = useToast();
  const [modal, setModal] = useState<null | { editing?: Address }>(null);

  const onSave = (d: Draft) => {
    if (modal?.editing) {
      update(modal.editing.id, d);
      show({ title: "Address updated", tone: "success" });
    } else {
      add(d);
      show({ title: "Address added", tone: "success" });
    }
    setModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: TEXT_COLOR }}>Addresses</h1>
        <button onClick={() => setModal({})} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>
          + Add new
        </button>
      </div>

      {addresses.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed rgba(84,84,84,0.25)", borderRadius: 16, padding: 40, textAlign: "center", color: "rgba(84,84,84,0.6)", fontSize: 14 }}>
          No saved addresses yet. Add one for faster checkout.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <AnimatePresence>
            {addresses.map((a) => (
              <motion.div
                key={a.id} layout
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ background: "#fff", border: `1px solid ${a.isDefault ? GLOW_COLOR : "rgba(84,84,84,0.12)"}`, borderRadius: 14, padding: 20, position: "relative" }}
              >
                {a.isDefault && (
                  <span style={{ position: "absolute", top: 16, right: 16, fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "3px 9px" }}>DEFAULT</span>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.5px", color: "rgba(84,84,84,0.6)", textTransform: "uppercase", marginBottom: 8 }}>{a.label}</div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: TEXT_COLOR }}>{a.fullName}</div>
                <div style={{ fontSize: 13.5, color: "rgba(84,84,84,0.75)", lineHeight: 1.6, marginTop: 4 }}>
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                  {a.city}, {a.postcode}<br />
                  {a.country}{a.phone ? ` · ${a.phone}` : ""}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
                  <button onClick={() => setModal({ editing: a })} style={linkBtn}>Edit</button>
                  {!a.isDefault && <button onClick={() => setDefault(a.id)} style={linkBtn}>Set default</button>}
                  <button onClick={() => { remove(a.id); show({ title: "Address removed", tone: "default" }); }} style={{ ...linkBtn, color: "#c0563f" }}>Delete</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modal && <AddressModal initial={modal.editing} onClose={() => setModal(null)} onSave={onSave} />}
      </AnimatePresence>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "'Inter Tight', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  color: TEXT_COLOR,
  textDecoration: "underline",
};
