import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Modal, ui, useConfirm, MUTED } from "./ui";
import { Field, AuthButton } from "../../components/AuthUI";

type Banner = { id: number; title: string; subtitle: string; image: string; link: string; linkLabel: string; placement: string; status: string };
const blank = { title: "", subtitle: "", image: "", link: "", linkLabel: "", placement: "home", status: "active" };

export default function AdminBanners() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Banner[]>([]);
  const [modal, setModal] = useState<null | { editing?: Banner }>(null);
  const [form, setForm] = useState({ ...blank });

  const load = () => apiGet<Banner[]>("admin/banners", true).then(setList).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (modal?.editing) await apiSend("PUT", `admin/banners/${modal.editing.id}`, form);
      else await apiSend("POST", "admin/banners", form);
      show({ title: "Banner saved", tone: "success" }); setModal(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  return (
    <div>
      <AdminHeader eyebrow="MARKETING" title="Banners & Promotions" action={<button onClick={() => { setForm({ ...blank }); setModal({}); }} style={ui.primaryBtn}>+ New banner</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
        {list.map((b) => (
          <div key={b.id} style={ui.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", color: "#111", background: "rgba(84,84,84,0.12)", borderRadius: 999, padding: "3px 9px" }}>{b.placement}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: b.status === "active" ? "#6a8f00" : "rgba(84,84,84,0.5)" }}>{b.status}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>{b.title || "Untitled"}</div>
            {b.subtitle && <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.6)", marginTop: 3 }}>{b.subtitle}</div>}
            {b.link && <div style={{ fontSize: 12, color: "rgba(84,84,84,0.5)", marginTop: 6 }}>{b.linkLabel || "Link"} → {b.link}</div>}
            <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
              <button onClick={() => { setForm({ title: b.title || "", subtitle: b.subtitle || "", image: b.image || "", link: b.link || "", linkLabel: b.linkLabel || "", placement: b.placement, status: b.status }); setModal({ editing: b }); }} style={ui.linkBtn}>Edit</button>
              <button onClick={async () => { if (!(await confirm({ title: `Delete “${b.title || "this banner"}”?`, message: "This permanently removes the banner. This can’t be undone.", confirmLabel: "Delete banner" }))) return; await apiSend("DELETE", `admin/banners/${b.id}`); load(); }} style={{ ...ui.linkBtn, color: MUTED }}>Delete</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div style={{ color: "rgba(84,84,84,0.5)", fontSize: 14 }}>No banners yet.</div>}
      </div>

      <AnimatePresence>
      {modal && (
        <Modal title={modal.editing ? "Edit banner" : "New banner"} onClose={() => setModal(null)}>
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
          <Field label="Image URL" value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Link URL" value={form.link} onChange={(v) => setForm({ ...form, link: v })} /></div>
            <div style={{ flex: 1 }}><Field label="Link label" value={form.linkLabel} onChange={(v) => setForm({ ...form, linkLabel: v })} /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={ui.label}>Placement</label>
              <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} style={{ ...ui.input, marginBottom: 18 }}>
                <option value="home">Home</option><option value="announcement">Announcement bar</option><option value="shop">Shop</option><option value="popup">Popup</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={ui.label}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...ui.input, marginBottom: 18 }}>
                <option value="active">Active</option><option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
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
