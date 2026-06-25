import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ tokens */
// Admin is intentionally monochrome — black / white / greys only. These tokens
// are the single source of truth; pages should pull from here, not from the
// storefront's champagne palette.
export const INK = "#141414";
export const INK_FG = "#ffffff";
export const MUTED = "rgba(20,20,20,0.55)";
export const FAINT = "rgba(20,20,20,0.40)";
export const LINE = "rgba(20,20,20,0.10)";
export const SURFACE = "#ffffff";
export const FIELD = "#f5f5f4";
export const APP_BG = "#f4f4f3";

export const ui = {
  input: {
    width: "100%", background: FIELD, border: `1.5px solid ${LINE}`,
    borderRadius: 12, padding: "11px 14px", fontFamily: "'Inter Tight', sans-serif",
    fontSize: 14, color: INK, outline: "none",
  } as CSSProperties,
  label: { display: "block", fontSize: 12.5, fontWeight: 500, color: MUTED, marginBottom: 6 } as CSSProperties,
  card: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 16, padding: 24 } as CSSProperties,
  linkBtn: { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: INK, textDecoration: "underline" } as CSSProperties,
  primaryBtn: { background: INK, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: INK_FG } as CSSProperties,
  ghostBtn: { background: "none", border: `1px solid ${LINE}`, borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: INK } as CSSProperties,
  panel: { background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" } as CSSProperties,
};

export function AdminHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: FAINT, marginBottom: 8 }}>{eyebrow}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: INK }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- StatusPill */
/** Monochrome status chip. `active` solid-fills with ink; otherwise muted. */
export function StatusPill({ label, active, onClick, title }: { label: string; active: boolean; onClick?: () => void; title?: string }) {
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, border: "none",
    borderRadius: 999, padding: "5px 13px", fontFamily: "'Inter Tight', sans-serif",
    fontSize: 12, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap",
    cursor: onClick ? "pointer" : "default",
    background: active ? INK : "rgba(20,20,20,0.06)",
    color: active ? INK_FG : MUTED,
    transition: "background 0.18s ease, color 0.18s ease",
  };
  return onClick ? (
    <button type="button" onClick={onClick} title={title} style={style}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? INK_FG : FAINT }} />
      {label}
    </button>
  ) : (
    <span title={title} style={style}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? INK_FG : FAINT }} />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------- icons */
// SF Symbols-flavoured line icons: 24-grid, ~1.8 stroke, rounded caps/joins,
// inherit `currentColor`. Sized via the `size` prop.
type IconProps = { size?: number };
const svg = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export function PencilIcon({ size = 17 }: IconProps) {
  return (<svg {...svg(size)}><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>);
}
export function TrashIcon({ size = 17 }: IconProps) {
  return (
    <svg {...svg(size)}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
export function PlusIcon({ size = 17 }: IconProps) {
  return (<svg {...svg(size)}><path d="M12 5v14M5 12h14" /></svg>);
}
export function SubIcon({ size = 17 }: IconProps) {
  // corner-down-right + implies "add nested"
  return (<svg {...svg(size)}><path d="M5 4v8a3 3 0 0 0 3 3h7" /><path d="M12 11l4 4-4 4" /></svg>);
}
export function ChevronRightIcon({ size = 17 }: IconProps) {
  return (<svg {...svg(size)}><path d="M9 6l6 6-6 6" /></svg>);
}

/** Square, ghost icon button with a soft hover wash — the table action style. */
export function IconButton({ icon, onClick, title }: { icon: ReactNode; onClick?: () => void; title: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: 9, border: "none", padding: 0, cursor: "pointer",
        background: hover ? "rgba(20,20,20,0.07)" : "transparent",
        color: hover ? INK : MUTED,
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------------------------------------- DataTable */
export type Column<T> = {
  key: string;
  header: ReactNode;
  /** Grid track: a number (px) or any CSS grid size ("1fr", "minmax(0,1.5fr)"). */
  width?: string | number;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
};

function track(w?: string | number) {
  if (w == null) return "1fr";
  return typeof w === "number" ? `${w}px` : w;
}

function Row<T>({
  row, columns, cols, index, onRowClick, dim,
}: {
  row: T; columns: Column<T>[]; cols: string; index: number;
  onRowClick?: (row: T) => void; dim: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dim ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: Math.min(index * 0.035, 0.4) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      style={{
        display: "grid", gridTemplateColumns: cols, gap: 16, alignItems: "center",
        padding: "13px 20px", borderTop: `1px solid ${LINE}`,
        background: hover ? "rgba(20,20,20,0.025)" : "transparent",
        cursor: onRowClick ? "pointer" : "default",
        transition: "background 0.16s ease",
      }}
    >
      {columns.map((c) => (
        <div key={c.key} style={{ minWidth: 0, textAlign: c.align ?? "left", display: "flex", justifyContent: c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start", alignItems: "center" }}>
          {c.render(row)}
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Shared, animated, monochrome data table for the admin. Rows fade/slide in with
 * a light stagger, lift on hover, and animate out on removal. Define columns
 * with custom `render` functions; wrap mutating rows with `busyKey` to dim them.
 */
export function DataTable<T>({
  columns, rows, rowKey, onRowClick, empty, loading, busyKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  loading?: boolean;
  busyKey?: string | number | null;
}) {
  const cols = columns.map((c) => track(c.width)).join(" ");
  return (
    <div style={ui.panel}>
      {/* header */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, padding: "12px 20px", background: "#fafafa", borderBottom: `1px solid ${LINE}` }}>
        {columns.map((c) => (
          <div key={c.key} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", color: FAINT, textAlign: c.align ?? "left" }}>
            {c.header}
          </div>
        ))}
      </div>
      {/* body */}
      {loading ? (
        <div style={{ padding: 44, textAlign: "center", color: MUTED, fontSize: 14 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 44, textAlign: "center", color: MUTED, fontSize: 14 }}>{empty ?? "Nothing here yet."}</div>
      ) : (
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <Row
              key={rowKey(row)}
              row={row}
              columns={columns}
              cols={cols}
              index={i}
              onRowClick={onRowClick}
              dim={busyKey != null && rowKey(row) === busyKey}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Drawer */
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
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,20,20,0.45)", display: "flex", justifyContent: "flex-end" }}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: width, background: "#fafafa", height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Inter Tight', sans-serif" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 28px 16px", borderBottom: `1px solid ${LINE}` }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: FAINT }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>{children}</div>
        {footer && <div style={{ padding: "16px 28px", borderTop: `1px solid ${LINE}`, background: "#fafafa" }}>{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

/**
 * Backwards-compatible CRUD container. Renders as a right-side slide-in drawer
 * (the house pattern) while keeping the original Modal prop signature.
 */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,20,20,0.45)", display: "flex", justifyContent: "flex-end" }}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: wide ? 600 : 460, background: "#fafafa", height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Inter Tight', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 16px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: FAINT }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------- confirm dialog */
export type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string };
const ConfirmCtx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(() => Promise.resolve(false));

/** `const confirm = useConfirm(); if (await confirm({...})) { ...destructive... }` */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

function ConfirmDialog({ opts, onCancel, onConfirm }: { opts: ConfirmOpts; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(20,20,20,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter Tight', sans-serif" }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 384, background: SURFACE, borderRadius: 18, padding: 26, boxShadow: "0 30px 70px rgba(0,0,0,0.28)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: "50%", background: "rgba(20,20,20,0.06)", color: INK, marginBottom: 16 }}>
          <TrashIcon size={20} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: INK, marginBottom: 6 }}>{opts.title}</div>
        {opts.message && <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, marginBottom: 22 }}>{opts.message}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: opts.message ? 0 : 18 }}>
          <button onClick={onCancel} style={{ ...ui.ghostBtn, flex: 1 }}>{opts.cancelLabel ?? "Cancel"}</button>
          <button onClick={onConfirm} autoFocus style={{ ...ui.primaryBtn, flex: 1 }}>{opts.confirmLabel ?? "Delete"}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Hosts a single confirm dialog for everything beneath it (wrap the admin shell). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ opts, resolve })), []);
  const settle = (v: boolean) => { if (state) state.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && <ConfirmDialog opts={state.opts} onCancel={() => settle(false)} onConfirm={() => settle(true)} />}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  );
}
