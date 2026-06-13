import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field, AuthButton } from "../../components/AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;

type Cat = { id: number; parentId: number | null; name: string; status: string; productCount: number };

function CategoryModal({
  cats, initial, onClose, onSave,
}: {
  cats: Cat[];
  initial?: Cat;
  onClose: () => void;
  onSave: (data: { name: string; parentId: number | null; status: string }) => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [parentId, setParentId] = useState<number | null>(initial?.parentId ?? null);
  const [status, setStatus] = useState(initial?.status || "active");
  const [err, setErr] = useState<string>();
  const options = cats.filter((c) => c.id !== initial?.id);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "#F4F1EB", borderRadius: 18, padding: 28, fontFamily: "'Inter Tight', sans-serif" }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>{initial ? "Edit category" : "New category"}</div>
        <Field label="Name" value={name} onChange={setName} error={err} />
        <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(84,84,84,0.7)", marginBottom: 7 }}>Parent category</label>
        <select value={parentId ?? ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
          style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "13px 16px", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, color: TEXT_COLOR, marginBottom: 18 }}>
          <option value="">— Top level —</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(84,84,84,0.7)", marginBottom: 7 }}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "13px 16px", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, color: TEXT_COLOR, marginBottom: 18 }}>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClose} style={{ flex: "0 0 auto", background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "0 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR }}>Cancel</button>
          <AuthButton type="button">
            <span onClick={() => { if (!name.trim()) { setErr("Required"); return; } onSave({ name: name.trim(), parentId, status }); }}>
              {initial ? "Save" : "Create"}
            </span>
          </AuthButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminCategories() {
  const { show } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [modal, setModal] = useState<null | { editing?: Cat; parentId?: number | null }>(null);

  const load = () => apiGet<Cat[]>("admin/categories", true).then(setCats).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  // build display order with depth
  const ordered = useMemo(() => {
    const out: { c: Cat; depth: number }[] = [];
    const walk = (parent: number | null, depth: number) => {
      cats.filter((c) => c.parentId === parent).forEach((c) => { out.push({ c, depth }); walk(c.id, depth + 1); });
    };
    walk(null, 0);
    return out;
  }, [cats]);

  const save = async (data: { name: string; parentId: number | null; status: string }) => {
    try {
      if (modal?.editing) await apiSend("PUT", `admin/categories/${modal.editing.id}`, data);
      else await apiSend("POST", "admin/categories", { ...data, parentId: modal?.parentId ?? data.parentId });
      show({ title: modal?.editing ? "Category updated" : "Category created", tone: "success" });
      setModal(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const remove = async (c: Cat) => {
    try { await apiSend("DELETE", `admin/categories/${c.id}`); show({ title: `${c.name} deleted`, tone: "default" }); load(); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>CATALOG</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR }}>Categories</h1>
        </div>
        <button onClick={() => setModal({ parentId: null })} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>+ New category</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, overflow: "hidden" }}>
        {ordered.map(({ c, depth }, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", paddingLeft: 18 + depth * 26, borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)" }}>
            {depth > 0 && <span style={{ color: "rgba(84,84,84,0.35)" }}>└</span>}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14.5, fontWeight: depth === 0 ? 600 : 500, color: TEXT_COLOR }}>{c.name}</span>
              <span style={{ fontSize: 12, color: "rgba(84,84,84,0.45)", marginLeft: 10 }}>{c.productCount} products</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: c.status === "active" ? "#6a8f00" : "rgba(84,84,84,0.5)" }}>{c.status}</span>
            <button onClick={() => setModal({ parentId: c.id })} style={linkBtn} title="Add sub-category">+ sub</button>
            <button onClick={() => setModal({ editing: c })} style={linkBtn}>Edit</button>
            <button onClick={() => remove(c)} style={{ ...linkBtn, color: "#c0563f" }}>Delete</button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {modal && <CategoryModal cats={cats} initial={modal.editing} onClose={() => setModal(null)} onSave={save} />}
      </AnimatePresence>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_COLOR, textDecoration: "underline" };
