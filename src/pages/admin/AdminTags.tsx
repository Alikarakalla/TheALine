import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, DataTable, Modal, IconButton, PencilIcon, TrashIcon, PlusIcon, useConfirm, ui, INK, MUTED, type Column } from "./ui";

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

  const columns: Column<Tag>[] = [
    { key: "tag", header: "Tag", width: "minmax(180px, 1.6fr)", render: (t) => <TagBadge name={t.name} color={t.color} /> },
    { key: "slug", header: "Slug", width: "1fr", render: (t) => <span style={{ fontSize: 13, color: MUTED }}>{t.slug}</span> },
    { key: "count", header: "Products", width: 110, render: (t) => <span style={{ fontSize: 13, color: MUTED }}>{t.productCount}</span> },
    {
      key: "actions", header: "", width: 96, align: "right",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <IconButton icon={<PencilIcon />} title="Edit" onClick={() => openEdit(t)} />
          <IconButton icon={<TrashIcon />} title="Delete" onClick={() => remove(t)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Tags" action={<button onClick={openNew} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New tag</button>} />

      <DataTable columns={columns} rows={list} rowKey={(t) => t.id} loading={loading} busyKey={busy} empty="No tags yet — add your first." />

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
