import { useEffect, useRef } from "react";

/**
 * Shared admin table — 1:1 port of lebazone's AdminTable/AdminTableShell:
 * a fixed-height scrolling card with a sticky header row, optional pinned
 * columns (.admin-pin-left / .admin-pin-right on both th AND td), plus the
 * small companions every admin listing uses (Pill, Checkbox, Thumb,
 * ConfirmModal). Inject `adminTableStyles` once per page in a <style> tag.
 */

export const adminTableStyles = `
    .admin-shared-table-card {
        display: flex;
        flex-direction: column;
        max-height: var(--admin-table-max-height, calc(100vh - 430px));
        min-height: var(--admin-table-min-height, 360px);
        background: #fff;
        border: 1px solid #eee;
        border-radius: 10px;
        overflow: hidden;
        font-family: 'Inter Tight', 'Helvetica Neue', sans-serif;
    }
    .admin-shared-table-head {
        flex: 0 0 auto;
        display: flex;
        align-items: stretch;
        justify-content: flex-start;
        min-height: 52px;
        padding: 0 16px;
        border-bottom: 1px solid #eee;
        background: #fff;
    }
    .admin-shared-table-scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        overscroll-behavior: contain;
        background: #fff;
    }
    .admin-shared-table {
        width: 100%;
        min-width: var(--admin-table-min-width, 960px);
        border-collapse: collapse;
        font-family: 'Inter Tight', 'Helvetica Neue', sans-serif;
    }
    .admin-shared-table thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #fff;
        padding: 9px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #aaa;
        text-align: left;
        border-bottom: 1px solid #eee;
        white-space: nowrap;
    }
    .admin-shared-table td {
        padding: 10px 12px;
        font-size: 12px;
        border-bottom: 1px solid #eee;
        vertical-align: middle;
        color: #111;
    }
    .admin-shared-table tbody tr:last-child td {
        border-bottom: 0 !important;
    }
    /* Pinned columns — keep key columns (row actions, selection) visible while
       the wide middle of the table scrolls horizontally. Apply the class to
       the matching th AND every td. */
    .admin-shared-table th.admin-pin-right,
    .admin-shared-table td.admin-pin-right {
        position: sticky;
        right: 0;
        background: #fff;
        box-shadow: -10px 0 8px -9px rgba(0, 0, 0, 0.10);
    }
    .admin-shared-table th.admin-pin-left,
    .admin-shared-table td.admin-pin-left {
        position: sticky;
        left: 0;
        background: #fff;
        box-shadow: 10px 0 8px -9px rgba(0, 0, 0, 0.10);
    }
    .admin-shared-table td.admin-pin-right,
    .admin-shared-table td.admin-pin-left {
        z-index: 1;
    }
    .admin-shared-table thead th.admin-pin-right,
    .admin-shared-table thead th.admin-pin-left {
        z-index: 3;
    }
    @keyframes adminTblFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes adminTblPulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
    .admin-tbl-row:hover td { background: #fafaf8; }
    .admin-tbl-row.selected td { background: #fffbeb; }
    .admin-tbl-row:hover td.admin-pin-left, .admin-tbl-row:hover td.admin-pin-right { background: #fafaf8; }
    .admin-tbl-row.selected td.admin-pin-left, .admin-tbl-row.selected td.admin-pin-right { background: #fffbeb; }
    .admin-act-btn { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border: 0; background: none; color: #111; cursor: pointer; padding: 0; }
    .admin-act-btn:hover { color: #000; }
    .admin-act-btn.del:hover { color: #ef4444; }
    .admin-pagination { display: flex; gap: 4px; list-style: none; margin: 0; padding: 0; }
    .admin-pagination li a { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 12px; border: 1px solid #e0e0dc; background: #fff; color: #111; cursor: pointer; user-select: none; }
    .admin-pagination li a:hover { background: #f5f5f3; }
    .admin-pagination li.selected a { background: #111; color: #fff; border-color: #111; }
    .admin-pagination li.selected a:hover { background: #111; }
    .admin-pagination li.disabled a { opacity: .35; pointer-events: none; }
    @media (max-width: 760px) {
        .admin-shared-table-card {
            max-height: var(--admin-table-mobile-max-height, calc(100vh - 360px));
            min-height: var(--admin-table-mobile-min-height, 320px);
        }
    }
`;

export function AdminTableShell({
  header = null,
  children,
  maxHeight = "calc(100vh - 430px)",
  mobileMaxHeight = "calc(100vh - 360px)",
  minHeight = 360,
  mobileMinHeight = 320,
  minWidth = 960,
  className = "",
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
  mobileMaxHeight?: string;
  minHeight?: number;
  mobileMinHeight?: number;
  minWidth?: number;
  className?: string;
}) {
  return (
    <section
      className={`admin-shared-table-card ${className}`.trim()}
      style={{
        "--admin-table-max-height": maxHeight,
        "--admin-table-mobile-max-height": mobileMaxHeight,
        "--admin-table-min-height": `${minHeight}px`,
        "--admin-table-mobile-min-height": `${mobileMinHeight}px`,
        "--admin-table-min-width": `${minWidth}px`,
      } as React.CSSProperties}
    >
      {header ? <div className="admin-shared-table-head">{header}</div> : null}
      <div className="admin-shared-table-scroll">{children}</div>
    </section>
  );
}

export function AdminTable({ children, className = "", ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`admin-shared-table ${className}`.trim()} {...props}>
      {children}
    </table>
  );
}

/* ───────────────────────── shared table companions ───────────────────────── */

export const TBL = {
  border: "#eee",
  borderMid: "#e0e0dc",
  text: "#111",
  textSub: "#666",
  textMuted: "#aaa",
  green: "#22c55e", greenBg: "#f0fdf4", greenBorder: "#bbf7d0",
  amber: "#f59e0b", amberBg: "#fffbeb", amberBorder: "#fde68a",
  blue: "#3b82f6", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
  red: "#ef4444", redBg: "#fef2f2", redBorder: "#fecaca",
  font: "'Inter Tight', 'Helvetica Neue', sans-serif",
  mono: "'DM Mono', 'Consolas', monospace",
};

export const tblCard: React.CSSProperties = { background: "#fff", border: `1px solid ${TBL.border}`, borderRadius: 10, padding: "16px 20px" };
export const tblBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", fontSize: 12, fontWeight: 500,
  border: `1px solid ${TBL.borderMid}`, borderRadius: 10, background: "#fff", color: TBL.textSub,
  cursor: "pointer", fontFamily: TBL.font, whiteSpace: "nowrap", textDecoration: "none",
};
export const tblInput: React.CSSProperties = {
  width: "100%", border: `1px solid ${TBL.borderMid}`, borderRadius: 10, background: "#fafaf8",
  padding: "10px 14px", fontSize: 12, color: TBL.text, outline: "none", fontFamily: TBL.font, boxSizing: "border-box",
};

/** react-select theme matching the lebazone list filters. */
export const tblSelectStyles = {
  control: (base: any, state: any) => ({
    ...base, minHeight: 40, fontSize: 12, fontFamily: TBL.font, borderRadius: 10, background: "#fafaf8",
    borderColor: state.isFocused ? "#999" : TBL.borderMid, boxShadow: "none",
    "&:hover": { borderColor: "#999" },
  }),
  menu: (base: any) => ({ ...base, fontSize: 12, zIndex: 50 }),
  option: (base: any, state: any) => ({
    ...base, fontFamily: TBL.font,
    background: state.isSelected ? "#111" : state.isFocused ? "#f5f5f3" : "#fff",
    color: state.isSelected ? "#fff" : "#111",
  }),
  placeholder: (base: any) => ({ ...base, color: "#aaa" }),
  singleValue: (base: any) => ({ ...base, color: "#111" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({ ...base, padding: "0 8px", color: "#aaa" }),
};

export function Pill({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

/** Status pill presets shared across listings. */
export function statusPill(status: string) {
  const map: Record<string, { color: string; bg: string; border: string; label: string }> = {
    active: { label: "Active", color: "#166534", bg: TBL.greenBg, border: TBL.greenBorder },
    visible: { label: "Visible", color: "#166534", bg: TBL.greenBg, border: TBL.greenBorder },
    draft: { label: "Draft", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
    hidden: { label: "Hidden", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
    archived: { label: "Archived", color: "#92400e", bg: TBL.amberBg, border: TBL.amberBorder },
    pending: { label: "Pending", color: "#92400e", bg: TBL.amberBg, border: TBL.amberBorder },
    paid: { label: "Paid", color: "#166534", bg: TBL.greenBg, border: TBL.greenBorder },
    processing: { label: "Processing", color: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
    shipped: { label: "Shipped", color: "#115e59", bg: "#f0fdfa", border: "#99f6e4" },
    delivered: { label: "Delivered", color: "#166534", bg: TBL.greenBg, border: TBL.greenBorder },
    cancelled: { label: "Cancelled", color: "#b42318", bg: TBL.redBg, border: TBL.redBorder },
    refunded: { label: "Refunded", color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
    featured: { label: "Featured", color: "#1d4ed8", bg: TBL.blueBg, border: TBL.blueBorder },
  };
  const p = map[status] || { label: status, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  return <Pill {...p} />;
}

export function Checkbox({ checked, indeterminate = false, onChange, ariaLabel }: { checked: boolean; indeterminate?: boolean; onChange: () => void; ariaLabel?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel}
      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#111" }} />
  );
}

export function Thumb({ src, alt = "" }: { src?: string | null; alt?: string }) {
  return (
    <div style={{ width: 42, height: 42, borderRadius: 6, background: "#f5f5f3", border: `1px solid ${TBL.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {src ? (
        <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
        </svg>
      )}
    </div>
  );
}

export function RowSkeleton({ widths }: { widths: (number | string)[] }) {
  return (
    <tr>
      {widths.map((w, i) => (
        <td key={i}>
          <div style={{ width: typeof w === "number" ? w : w, height: 12, borderRadius: 4, background: "#f0f0ee", animation: "adminTblPulse 1.4s ease-in-out infinite" }} />
        </td>
      ))}
    </tr>
  );
}

export function ConfirmModal({ title, body, confirmLabel, onCancel, onConfirm, busy = false }: {
  title: string; body: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void; busy?: boolean;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TBL.font }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, width: 380, maxWidth: "calc(100vw - 32px)", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: TBL.textSub, lineHeight: 1.55, marginBottom: 24 }}>{body}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" style={{ ...tblBtn, padding: "9px 16px" }} onClick={onCancel}>Cancel</button>
          <button type="button" disabled={busy}
            style={{ ...tblBtn, padding: "9px 16px", background: TBL.red, color: "#fff", border: `1px solid ${TBL.red}`, fontWeight: 600, opacity: busy ? 0.6 : 1 }}
            onClick={onConfirm}>
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
