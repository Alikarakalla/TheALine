import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Drawer, ui, useConfirm, MUTED } from "./ui";
import { Field } from "../../components/AuthUI";

type Option = { id: number; value: string; meta: string | null };
type Attr = { id: number; name: string; slug: string; options: Option[] };
const isHex = (s?: string | null) => !!s && /^#?[0-9a-fA-F]{3,8}$/.test(s.trim());

export default function AdminVariants() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [attrs, setAttrs] = useState<Attr[]>([]);
  // create/edit attribute drawer
  const [drawer, setDrawer] = useState<null | { editing?: Attr }>(null);
  const [name, setName] = useState("");
  const [newOptions, setNewOptions] = useState<{ value: string; meta: string }[]>([{ value: "", meta: "" }]);
  // inline add-option state per attribute
  const [optInput, setOptInput] = useState<Record<number, { value: string; meta: string }>>({});

  const load = () => apiGet<Attr[]>("admin/variants", true).then(setAttrs).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  const openNew = () => { setName(""); setNewOptions([{ value: "", meta: "" }]); setDrawer({}); };
  const openEdit = (a: Attr) => { setName(a.name); setDrawer({ editing: a }); };

  const saveAttr = async () => {
    if (!name.trim()) return show({ title: "Name required", tone: "error" });
    try {
      if (drawer?.editing) {
        await apiSend("PUT", `admin/variants/${drawer.editing.id}`, { name });
      } else {
        const options = newOptions.filter((o) => o.value.trim()).map((o) => ({ value: o.value.trim(), meta: o.meta.trim() || null }));
        await apiSend("POST", "admin/variants", { name, options });
      }
      show({ title: "Variant saved", tone: "success" });
      setDrawer(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const delAttr = async (a: Attr) => {
    if (!(await confirm({ title: `Delete “${a.name}”?`, message: `This removes the attribute and its ${a.options.length} option${a.options.length === 1 ? "" : "s"} from every product using them. This can’t be undone.`, confirmLabel: "Delete variant" }))) return;
    try { await apiSend("DELETE", `admin/variants/${a.id}`); show({ title: `${a.name} deleted`, tone: "default" }); load(); } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  const addOption = async (a: Attr) => {
    const inp = optInput[a.id] || { value: "", meta: "" };
    if (!inp.value.trim()) return;
    try { await apiSend("POST", `admin/variants/${a.id}/options`, { value: inp.value.trim(), meta: inp.meta.trim() || null }); setOptInput((s) => ({ ...s, [a.id]: { value: "", meta: "" } })); load(); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const delOption = async (o: Option) => {
    if (!(await confirm({ title: `Remove “${o.value}”?`, message: "This option is removed from any product variants using it. This can’t be undone.", confirmLabel: "Remove option" }))) return;
    try { await apiSend("DELETE", `admin/variants/options/${o.id}`); load(); } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Variants" action={<button onClick={openNew} style={ui.primaryBtn}>+ New variant</button>} />
      <p style={{ fontSize: 13.5, color: "rgba(84,84,84,0.6)", marginTop: -12, marginBottom: 22, maxWidth: 540 }}>
        Define variant attributes (e.g. Color, Size, or anything like "Gift wrap" with Yes / No) and their options. Products can use these on the product form.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {attrs.map((a) => (
          <div key={a.id} style={ui.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR }}>{a.name}</span>
              <span style={{ fontSize: 12, color: "rgba(84,84,84,0.4)" }}>{a.options.length} options</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                <button onClick={() => openEdit(a)} style={ui.linkBtn}>Rename</button>
                <button onClick={() => delAttr(a)} style={{ ...ui.linkBtn, color: MUTED }}>Delete</button>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {a.options.map((o) => (
                <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#faf9f6", border: "1px solid rgba(84,84,84,0.15)", borderRadius: 999, padding: "7px 12px", fontSize: 13, color: TEXT_COLOR }}>
                  {isHex(o.meta) && <span style={{ width: 13, height: 13, borderRadius: "50%", background: o.meta!.startsWith("#") ? o.meta! : `#${o.meta}`, border: "1px solid rgba(84,84,84,0.2)" }} />}
                  {o.value}
                  {o.meta && !isHex(o.meta) && <span style={{ color: "rgba(84,84,84,0.45)" }}>· {o.meta}</span>}
                  <button onClick={() => delOption(o)} aria-label="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(84,84,84,0.45)", fontSize: 12 }}>✕</button>
                </span>
              ))}
              {a.options.length === 0 && <span style={{ fontSize: 13, color: "rgba(84,84,84,0.45)" }}>No options yet.</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={optInput[a.id]?.value || ""} onChange={(e) => setOptInput((s) => ({ ...s, [a.id]: { ...(s[a.id] || { value: "", meta: "" }), value: e.target.value } }))} onKeyDown={(e) => e.key === "Enter" && addOption(a)} placeholder="Option value (e.g. Yes)" style={{ ...ui.input, flex: 1 }} />
              <input value={optInput[a.id]?.meta || ""} onChange={(e) => setOptInput((s) => ({ ...s, [a.id]: { ...(s[a.id] || { value: "", meta: "" }), meta: e.target.value } }))} placeholder="meta (optional, e.g. #hex)" style={{ ...ui.input, width: 160 }} />
              <button onClick={() => addOption(a)} style={ui.primaryBtn}>Add</button>
            </div>
          </div>
        ))}
        {attrs.length === 0 && <div style={{ color: "rgba(84,84,84,0.5)", fontSize: 14 }}>No variants yet.</div>}
      </div>

      <AnimatePresence>
        {drawer && (
          <Drawer
            title={drawer.editing ? "Rename variant" : "New variant"}
            subtitle={drawer.editing ? undefined : "Add a variant attribute and its options"}
            onClose={() => setDrawer(null)}
            footer={
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setDrawer(null)} style={ui.ghostBtn}>Cancel</button>
                <button onClick={saveAttr} style={ui.primaryBtn}>{drawer.editing ? "Save" : "Create"}</button>
              </div>
            }
          >
            <Field label="Variant name" value={name} onChange={setName} placeholder="Color, Size, Gift wrap…" />
            {!drawer.editing && (
              <div style={{ marginTop: 8 }}>
                <label style={ui.label}>Options</label>
                {newOptions.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input value={o.value} onChange={(e) => setNewOptions((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Value (e.g. Yes)" style={{ ...ui.input, flex: 1 }} />
                    <input value={o.meta} onChange={(e) => setNewOptions((arr) => arr.map((x, j) => (j === i ? { ...x, meta: e.target.value } : x)))} placeholder="#hex (optional)" style={{ ...ui.input, width: 130 }} />
                    <button onClick={() => setNewOptions((arr) => arr.filter((_, j) => j !== i))} style={{ ...ui.linkBtn, color: MUTED }}>✕</button>
                  </div>
                ))}
                <button onClick={() => setNewOptions((arr) => [...arr, { value: "", meta: "" }])} style={{ ...ui.ghostBtn, padding: "9px 16px", fontSize: 13 }}>+ Add option</button>
              </div>
            )}
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}
