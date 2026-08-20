import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAddresses, type Address } from "../../context/Addresses";
import { useAuth } from "../../context/Auth";
import { useToast } from "../../context/Toast";
import AddressDrawer, { type AddressDraft } from "./AddressDrawer";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AddressesPage() {
  const isMobile = useIsMobile();
  const { addresses, add, update, remove, setDefault } = useAddresses();
  const { user } = useAuth();
  const { show } = useToast();
  const [modal, setModal] = useState<null | { editing?: Address }>(null);

  // Name, phone and country never appear in the form — they come from the
  // account (Lebanon-only delivery).
  const onSave = (d: AddressDraft) => {
    const payload = {
      ...d,
      fullName: user?.name ?? "",
      phone: user?.phone ?? "",
      country: "Lebanon",
    };
    if (modal?.editing) {
      update(modal.editing.id, payload);
      show({ title: "Address updated", tone: "success" });
    } else {
      add(payload);
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
        {modal && <AddressDrawer initial={modal.editing} onClose={() => setModal(null)} onSave={onSave} />}
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
