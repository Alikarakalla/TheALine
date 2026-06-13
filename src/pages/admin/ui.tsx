import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";

const EASE = [0.22, 1, 0.36, 1] as const;

export const ui = {
  input: {
    width: "100%", background: "#faf9f6", border: "1.5px solid rgba(84,84,84,0.18)",
    borderRadius: 12, padding: "11px 14px", fontFamily: "'Inter Tight', sans-serif",
    fontSize: 14, color: TEXT_COLOR, outline: "none",
  } as CSSProperties,
  label: { display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(84,84,84,0.7)", marginBottom: 6 } as CSSProperties,
  card: { background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, padding: 24 } as CSSProperties,
  linkBtn: { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_COLOR, textDecoration: "underline" } as CSSProperties,
  primaryBtn: { background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" } as CSSProperties,
  ghostBtn: { background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR } as CSSProperties,
  panel: { background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, overflow: "hidden" } as CSSProperties,
};

export function AdminHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

/** Right-side slide-in drawer for CRUD. Wrap call sites in <AnimatePresence>. */
export function Drawer({
  title,
  subtitle,
  onClose,
  children,
  width = 460,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", justifyContent: "flex-end" }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: width, background: "#F4F1EB", height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Inter Tight', sans-serif" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 28px 16px", borderBottom: "1px solid rgba(84,84,84,0.1)" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(84,84,84,0.5)" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>{children}</div>
        {footer && <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(84,84,84,0.1)", background: "#F4F1EB" }}>{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

/**
 * Backwards-compatible CRUD container. Renders as a right-side slide-in drawer
 * (the house pattern) while keeping the original Modal prop signature, so every
 * existing call site becomes a drawer without changes. `wide` maps to a wider
 * panel. Action buttons passed inside `children` simply sit at the end of the
 * scrollable body.
 */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  // No internal AnimatePresence — call sites wrap `{open && <Modal/>}` in
  // <AnimatePresence> so the exit (slide-out) animation plays on close.
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", justifyContent: "flex-end" }}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: wide ? 600 : 460, background: "#F4F1EB", height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Inter Tight', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 16px", borderBottom: "1px solid rgba(84,84,84,0.1)" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(84,84,84,0.5)" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}
