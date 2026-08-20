import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Modal, PencilIcon, TrashIcon, PlusIcon, useConfirm, ui, INK } from "./ui";
import { AdminTable, AdminTableShell, adminTableStyles, TBL, RowSkeleton } from "./shared/AdminTable";

type Tag = { id: number; name: string; slug: string; color: string | null; productCount: number };

// Preset palette for quick assignment.
const SWATCHES = ["#111111", "#C0563F", "#B8860B", "#3F7D4F", "#3A6EA5", "#7A5AA8", "#C2557A", "#5A5A5A"];

/** Black or white text for legibility on a hex background. */
function textOn(hex?: string | null): string {
  if (!hex || hex.length < 7) return "#fff";
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#111" : "#fff";
}

function TagBadge({ name, color }: { name: string; color: string | null }) {
  return (
    <span style={{
      display: "inline-block", background: color || "#111111", color: textOn(color),
      fontSize: 11, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase",
      padding: "4px 11px", borderRadius: 999, lineHeight: 1.3,
    }}>
      {name || "Tag"}
    </span>
  );
}

export default function AdminTags() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<null | { editing?: Tag }>(null);
  const [form, setForm] = useState<{ name: string; color: string | null }>({ name: "", color: null });

  const load = () => {
    setLoading(true);
    apiGet<Tag[]>("admin/tags", true).then(setList).catch((e) => show({ title: e.message, tone: "error" })).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", color: null }); setModal({}); };
  const openEdit = (t: Tag) => { setForm({ name: t.name, color: t.color }); setModal({ editing: t }); };

  const save = async () => {
    if (!form.name.trim()) return show({ title: "Name required", tone: "error" });
    try {
      const body = { name: form.name.trim(), color: form.color };
      if (modal?.editing) await apiSend("PUT", `admin/tags/${modal.editing.id}`, body);
      else await apiSend("POST", "admin/tags", body);
      show({ title: modal?.editing ? "Tag updated" : "Tag added", tone: "success" });
      setModal(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  const remove = async (t: Tag) => {
    if (!(await confirm({ title: `Delete “${t.name}”?`, message: "The tag is removed from all products. This can’t be undone.", confirmLabel: "Delete tag" }))) return;
    setBusy(t.id);
    try { await apiSend("DELETE", `admin/tags/${t.id}`); setList((l) => l.filter((x) => x.id !== t.id)); show({ title: `${t.name} deleted`, tone: "default" }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); setBusy(null); }
  };

  return (
    <div>
      <style>{adminTableStyles}</style>
      <AdminHeader eyebrow="CATALOG" title="Tags" action={<button onClick={openNew} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New tag</button>} />

      <AdminTableShell minWidth={600} maxHeight="calc(100vh - 280px)" minHeight={260}>
        <AdminTable>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Slug</th>
              <th>Products</th>
              <th className="admin-pin-right" style={{ width: 96, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <RowSkeleton key={i} widths={[90, 130, 40, 55]} />
              ))
            ) : list.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No tags yet — add your first.</td></tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="admin-tbl-row" style={{ opacity: busy === t.id ? 0.45 : 1 }}>
                  <td><TagBadge name={t.name} color={t.color} /></td>
                  <td style={{ fontFamily: TBL.mono, color: TBL.textSub }}>{t.slug}</td>
                  <td style={{ color: TBL.textSub }}>{t.productCount}</td>
                  <td className="admin-pin-right" style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button className="admin-act-btn" title="Edit" onClick={() => openEdit(t)}><PencilIcon /></button>
                      <button className="admin-act-btn del" title="Delete" onClick={() => remove(t)}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminTableShell>

      <AnimatePresence>
        {modal && (
          <Modal title={modal.editing ? "Edit tag" : "New tag"} onClose={() => setModal(null)}>
            <label style={ui.label}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus style={{ ...ui.input, marginBottom: 18 }} />

            <label style={ui.label}>Badge colour</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <input type="color" value={form.color || "#111111"} onChange={(e) => setForm({ ...form, color: e.target.value })}
                style={{ width: 46, height: 38, border: `1px solid ${INK}22`, borderRadius: 8, padding: 2, cursor: "pointer", background: "#fff" }} />
              <TagBadge name={form.name || "Preview"} color={form.color} />
              {form.color && (
                <button onClick={() => setForm({ ...form, color: null })} style={{ ...ui.linkBtn, marginLeft: "auto" }}>Clear</button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
              {SWATCHES.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} aria-label={c}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2px solid #111" : "2px solid rgba(20,20,20,0.15)", outline: form.color === c ? "2px solid rgba(20,20,20,0.25)" : "none", outlineOffset: 2 }} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setModal(null)} style={ui.ghostBtn}>Cancel</button>
              <button onClick={save} style={ui.primaryBtn}>{modal.editing ? "Save" : "Create"}</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
