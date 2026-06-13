import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Modal, ui } from "./ui";
import { Field, AuthButton } from "../../components/AuthUI";

type Brand = { id: number; name: string; description: string; logo: string; status: string; productCount: number };

export default function AdminBrands() {
  const { show } = useToast();
  const [list, setList] = useState<Brand[]>([]);
  const [modal, setModal] = useState<null | { editing?: Brand }>(null);
  const [form, setForm] = useState({ name: "", description: "", logo: "", status: "active" });

  const load = () => apiGet<Brand[]>("admin/brands", true).then(setList).catch((e) => show({ title: e.message, tone: "error" }));
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
  const remove = async (b: Brand) => { try { await apiSend("DELETE", `admin/brands/${b.id}`); show({ title: `${b.name} deleted`, tone: "default" }); load(); } catch (e: any) { show({ title: e.message, tone: "error" }); } };

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Brands" action={<button onClick={openNew} style={ui.primaryBtn}>+ New brand</button>} />
      <div style={ui.panel}>
        {list.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "rgba(84,84,84,0.5)" }}>No brands</div>}
        {list.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_COLOR }}>{b.name}</div>
              {b.description && <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{b.description}</div>}
            </div>
            <span style={{ fontSize: 12.5, color: "rgba(84,84,84,0.5)" }}>{b.productCount} products</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: b.status === "active" ? "#6a8f00" : "rgba(84,84,84,0.5)" }}>{b.status}</span>
            <button onClick={() => openEdit(b)} style={ui.linkBtn}>Edit</button>
            <button onClick={() => remove(b)} style={{ ...ui.linkBtn, color: "#c0563f" }}>Delete</button>
          </div>
        ))}
      </div>
      <AnimatePresence>
      {modal && (
        <Modal title={modal.editing ? "Edit brand" : "New brand"} onClose={() => setModal(null)}>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label="Logo URL" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} />
          <label style={ui.label}>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...ui.input, marginBottom: 18 }}>
            <option value="active">Active</option><option value="hidden">Hidden</option>
          </select>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setModal(null)} style={ui.ghostBtn}>Cancel</button>
            <AuthButton type="button"><span onClick={save}>{modal.editing ? "Save" : "Create"}</span></AuthButton>
          </div>
        </Modal>
      )}
      </AnimatePresence>
    </div>
  );
}
