import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, DataTable, Modal, StatusPill, IconButton, PencilIcon, TrashIcon, PlusIcon, useConfirm, ui, INK, MUTED, type Column } from "./ui";

type Brand = { id: number; name: string; description: string; logo: string; status: string; productCount: number };

export default function AdminBrands() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<null | { editing?: Brand }>(null);
  const [form, setForm] = useState({ name: "", description: "", logo: "", status: "active" });

  const load = () => {
    setLoading(true);
    apiGet<Brand[]>("admin/brands", true).then(setList).catch((e) => show({ title: e.message, tone: "error" })).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", description: "", logo: "", status: "active" }); setModal({}); };
  const openEdit = (b: Brand) => { setForm({ name: b.name, description: b.description || "", logo: b.logo || "", status: b.status }); setModal({ editing: b }); };
  const save = async () => {
    if (!form.name.trim()) return show({ title: "Name required", tone: "error" });
    try {
      if (modal?.editing) await apiSend("PUT", `admin/brands/${modal.editing.id}`, form);
      else await apiSend("POST", "admin/brands", form);
      show({ title: "Brand saved", tone: "success" }); setModal(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const remove = async (b: Brand) => {
    if (!(await confirm({ title: `Delete “${b.name}”?`, message: "Products keep their data but lose this brand. This can’t be undone.", confirmLabel: "Delete brand" }))) return;
    setBusy(b.id);
    try { await apiSend("DELETE", `admin/brands/${b.id}`); setList((l) => l.filter((x) => x.id !== b.id)); show({ title: `${b.name} deleted`, tone: "default" }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); setBusy(null); }
  };

  const columns: Column<Brand>[] = [
    {
      key: "brand", header: "Brand", width: "minmax(220px, 2fr)",
      render: (b) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>{b.name}</div>
          {b.description && <div style={{ fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.description}</div>}
        </div>
      ),
    },
    { key: "count", header: "Products", width: 110, render: (b) => <span style={{ fontSize: 13, color: MUTED }}>{b.productCount}</span> },
    { key: "status", header: "Status", width: 110, render: (b) => <StatusPill label={b.status} active={b.status === "active"} /> },
    {
      key: "actions", header: "", width: 96, align: "right",
      render: (b) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <IconButton icon={<PencilIcon />} title="Edit" onClick={() => openEdit(b)} />
          <IconButton icon={<TrashIcon />} title="Delete" onClick={() => remove(b)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Brands" action={<button onClick={openNew} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New brand</button>} />

      <DataTable columns={columns} rows={list} rowKey={(b) => b.id} loading={loading} busyKey={busy} empty="No brands yet." />

      <AnimatePresence>
        {modal && (
          <Modal title={modal.editing ? "Edit brand" : "New brand"} onClose={() => setModal(null)}>
            <label style={ui.label}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus style={{ ...ui.input, marginBottom: 14 }} />
            <label style={ui.label}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...ui.input, marginBottom: 14 }} />
            <label style={ui.label}>Logo URL</label>
            <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} style={{ ...ui.input, marginBottom: 14 }} />
            <label style={ui.label}>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...ui.input, marginBottom: 22 }}>
              <option value="active">Active</option><option value="hidden">Hidden</option>
            </select>
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
