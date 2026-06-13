import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field, AuthButton } from "../AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { usePayment, type Card } from "../../context/Payment";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;

function CardModal({ onClose, onSave }: { onClose: () => void; onSave: (c: { number: string; expMonth: string; expYear: string; holder: string }) => void }) {
  const isMobile = useIsMobile();
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [holder, setHolder] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (number.replace(/\s/g, "").length < 15) er.number = "Enter a valid card number.";
    if (!/^\d{2}\/\d{2}$/.test(exp)) er.exp = "MM/YY";
    if (!holder.trim()) er.holder = "Required";
    setErr(er);
    if (Object.keys(er).length) return;
    onSave({ number, expMonth: exp.slice(0, 2), expYear: exp.slice(3), holder });
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 24 }}>
      <motion.div initial={{ y: isMobile ? "100%" : 20, opacity: isMobile ? 1 : 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: isMobile ? "100%" : 20, opacity: isMobile ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "#ffffff", borderRadius: isMobile ? "18px 18px 0 0" : 18, padding: isMobile ? "26px 24px 36px" : 30, fontFamily: "'Inter Tight', sans-serif" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR, marginBottom: 6 }}>Add a card</div>
        <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)", marginBottom: 18 }}>🔒 We only store the last 4 digits.</div>
        <form onSubmit={submit} noValidate>
          <Field label="Card number" value={number} onChange={(v) => setNumber(fmtCard(v))} error={err.number} placeholder="1234 5678 9012 3456" />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Expiry (MM/YY)" value={exp} onChange={(v) => setExp(fmtExp(v))} error={err.exp} placeholder="MM/YY" /></div>
            <div style={{ flex: 1 }}><Field label="Name on card" value={holder} onChange={setHolder} error={err.holder} /></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: "0 0 auto", background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "0 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR }}>Cancel</button>
            <AuthButton type="submit">Add card</AuthButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function CardVisual({ card, onRemove, onDefault }: { card: Card; onRemove: () => void; onDefault: () => void }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#1f1f1f,#3a3a3a)", color: "#fff", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ width: 34, height: 24, borderRadius: 5, background: "linear-gradient(135deg,#d9c27a,#b8983f)" }} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.5px" }}>{card.brand}</span>
      </div>
      <div style={{ fontSize: 17, letterSpacing: "2px", fontFamily: "monospace" }}>•••• •••• •••• {card.last4}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}>
        <span>{card.holder}</span>
        <span>{card.expMonth}/{card.expYear}</span>
      </div>
      {card.isDefault && (
        <span style={{ position: "absolute", top: 22, right: 70, fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "2px 7px" }}>DEFAULT</span>
      )}
      <div style={{ position: "absolute", bottom: 10, right: 14, display: "flex", gap: 12 }}>
        {!card.isDefault && <button onClick={onDefault} style={cardLink}>Set default</button>}
        <button onClick={onRemove} style={cardLink}>Remove</button>
      </div>
    </div>
  );
}
const cardLink: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.85)", textDecoration: "underline" };

export default function PaymentPage() {
  const isMobile = useIsMobile();
  const { cards, add, remove, setDefault } = usePayment();
  const { show } = useToast();
  const [modal, setModal] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px", color: TEXT_COLOR }}>Payment</h1>
        <button onClick={() => setModal(true)} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>+ Add card</button>
      </div>

      {cards.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed rgba(84,84,84,0.25)", borderRadius: 16, padding: 40, textAlign: "center", color: "rgba(84,84,84,0.6)", fontSize: 14 }}>
          No saved cards. Add one for faster checkout.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <AnimatePresence>
            {cards.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.35, ease: EASE }}>
                <CardVisual card={c} onRemove={() => { remove(c.id); show({ title: "Card removed", tone: "default" }); }} onDefault={() => setDefault(c.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modal && <CardModal onClose={() => setModal(false)} onSave={(c) => { add(c); show({ title: "Card saved", tone: "success" }); setModal(false); }} />}
      </AnimatePresence>
    </div>
  );
}
