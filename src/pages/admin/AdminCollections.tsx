import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { apiGet, apiSend, apiUpload } from "../../lib/api";
import { useToast } from "../../context/Toast";
import {
  AdminHeader, DataTable, Drawer, StatusPill, IconButton,
  PencilIcon, TrashIcon, PlusIcon, useConfirm, ui, INK, MUTED, FAINT, type Column,
} from "./ui";

type Rule = { field: string; op: string; value: string };
type Collection = {
  id: number; title: string; slug: string; description: string | null; image: string | null;
  type: "manual" | "smart"; matchType: "all" | "any"; rules: Rule[];
  status: string; productCount: number; productIds: number[];
};
type Ref = { id: number; name: string };

// Smart-rule field metadata.
const FIELDS = [
  { key: "title", label: "Title", kind: "text" },
  { key: "category", label: "Category", kind: "set" },
  { key: "tag", label: "Tag", kind: "set" },
  { key: "brand", label: "Brand", kind: "set" },
  { key: "price", label: "Price (€)", kind: "num" },
  { key: "stock", label: "Stock", kind: "num" },
] as const;
const OPS: Record<string, [string, string][]> = {
  text: [["eq", "is"], ["neq", "is not"], ["contains", "contains"], ["starts", "starts with"], ["ends", "ends with"]],
  num: [["eq", "="], ["neq", "≠"], ["gt", "greater than"], ["lt", "less than"]],
  set: [["eq", "is"], ["neq", "is not"]],
};
const kindOf = (field: string) => FIELDS.find((f) => f.key === field)?.kind ?? "text";

// Client-side mirror of the server's rule matching (for the live preview).
function textMatch(s: string, op: string, v: string) {
  s = (s || "").toLowerCase(); v = v.toLowerCase();
  switch (op) {
    case "neq": return s !== v;
    case "contains": return s.includes(v);
    case "starts": return s.startsWith(v);
    case "ends": return s.endsWith(v);
    default: return s === v;
  }
}
function numMatch(n: number, op: string, v: string) {
  const x = parseFloat(v) || 0;
  switch (op) { case "neq": return n !== x; case "gt": return n > x; case "lt": return n < x; default: return n === x; }
}
function productMatches(p: any, rules: Rule[], matchType: string) {
  const usable = rules.filter((r) => r.value !== "" || r.field === "price" || r.field === "stock");
  if (!usable.length) return false;
  const test = (r: Rule) => {
    const v = (r.value || "").toLowerCase();
    switch (r.field) {
      case "title": return textMatch(p.name, r.op, r.value);
      case "price": return numMatch(Number(p.price) || 0, r.op, r.value);
      case "stock": return numMatch(Number(p.stock) || 0, r.op, r.value);
      case "brand": { const b = (p.brand || "").toLowerCase(); return r.op === "neq" ? b !== v : b === v; }
      case "tag": { const t = (p.tags || []).map((x: any) => (x.name || "").toLowerCase()); return r.op === "neq" ? !t.includes(v) : t.includes(v); }
      case "category": { const c = (p.categories || []).flatMap((x: any) => [(x.name || "").toLowerCase(), (x.slug || "").toLowerCase()]); return r.op === "neq" ? !c.includes(v) : c.includes(v); }
      default: return false;
    }
  };
  return matchType === "any" ? usable.some(test) : usable.every(test);
}

const emptyForm = {
  title: "", slug: "", description: "", image: "", status: "active",
  type: "manual" as "manual" | "smart", matchType: "all" as "all" | "any",
  rules: [] as Rule[], productIds: [] as number[],
};

export default function AdminCollections() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<null | { editing?: Collection }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  // supporting data
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<Ref[]>([]);
  const [brands, setBrands] = useState<Ref[]>([]);
  const [tags, setTags] = useState<Ref[]>([]);
  const [pq, setPq] = useState("");

  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const load = () => {
    setLoading(true);
    apiGet<Collection[]>("admin/collections", true).then(setList).catch((e) => show({ title: e.message, tone: "error" })).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    apiGet<any[]>("admin/products", true).then(setProducts).catch(() => {});
    apiGet<Ref[]>("admin/categories", true).then(setCats).catch(() => {});
    apiGet<Ref[]>("admin/brands", true).then(setBrands).catch(() => {});
    apiGet<Ref[]>("admin/tags", true).then(setTags).catch(() => {});
  }, []);

  const openNew = () => { setForm(emptyForm); setModal({}); };
  const openEdit = (c: Collection) => {
    setForm({
      title: c.title, slug: c.slug, description: c.description || "", image: c.image || "", status: c.status,
      type: c.type, matchType: c.matchType, rules: c.rules || [], productIds: c.productIds || [],
    });
    setModal({ editing: c });
  };

  const save = async () => {
    if (!form.title.trim()) return show({ title: "Title is required", tone: "error" });
    setSaving(true);
    const payload = {
      title: form.title.trim(), slug: form.slug.trim() || undefined, description: form.description, image: form.image,
      status: form.status, type: form.type, matchType: form.matchType,
      rules: form.type === "smart" ? form.rules : [],
      productIds: form.type === "manual" ? form.productIds : [],
    };
    try {
      if (modal?.editing) await apiSend("PUT", `admin/collections/${modal.editing.id}`, payload);
      else await apiSend("POST", "admin/collections", payload);
      show({ title: modal?.editing ? "Collection updated" : "Collection created", tone: "success" });
      setModal(null); load();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (c: Collection) => {
    setBusy(c.id);
    const next = c.status === "active" ? "hidden" : "active";
    try { await apiSend("PUT", `admin/collections/${c.id}`, { status: next }); setList((l) => l.map((x) => x.id === c.id ? { ...x, status: next } : x)); }
    catch (e: any) { show({ title: e.message, tone: "error" }); } finally { setBusy(null); }
  };
  const remove = async (c: Collection) => {
    if (!(await confirm({ title: `Delete “${c.title}”?`, message: "This removes the collection (products are not deleted). This can’t be undone.", confirmLabel: "Delete collection" }))) return;
    setBusy(c.id);
    try { await apiSend("DELETE", `admin/collections/${c.id}`); setList((l) => l.filter((x) => x.id !== c.id)); show({ title: `${c.title} deleted`, tone: "default" }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); setBusy(null); }
  };

  const onUpload = async (file: File) => {
    try { const r = await apiUpload(file); set({ image: r.url }); } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  // Live membership preview inside the drawer.
  const previewIds = useMemo(() => {
    if (form.type === "manual") return form.productIds;
    return products.filter((p) => productMatches(p, form.rules, form.matchType)).map((p) => p.dbId);
  }, [form, products]);

  const filteredProducts = useMemo(
    () => products.filter((p) => !pq.trim() || p.name.toLowerCase().includes(pq.toLowerCase())),
    [products, pq]
  );

  const toggleProduct = (dbId: number) =>
    setForm((f) => ({ ...f, productIds: f.productIds.includes(dbId) ? f.productIds.filter((x) => x !== dbId) : [...f.productIds, dbId] }));
  const setRule = (i: number, patch: Partial<Rule>) =>
    setForm((f) => ({ ...f, rules: f.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const addRule = () => setForm((f) => ({ ...f, rules: [...f.rules, { field: "category", op: "eq", value: "" }] }));
  const removeRule = (i: number) => setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }));

  const columns: Column<Collection>[] = [
    {
      key: "collection", header: "Collection", width: "minmax(240px, 2fr)",
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#efefee", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {c.image ? <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: FAINT, fontSize: 16 }}>◇</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: MUTED }}>{c.type === "smart" ? "Smart" : "Manual"} · /{c.slug}</div>
          </div>
        </div>
      ),
    },
    { key: "count", header: "Products", width: 110, render: (c) => <span style={{ fontSize: 13, color: MUTED }}>{c.productCount}</span> },
    { key: "status", header: "Status", width: 120, render: (c) => <StatusPill label={c.status} active={c.status === "active"} onClick={() => toggleStatus(c)} title="Toggle active / hidden" /> },
    {
      key: "actions", header: "", width: 96, align: "right",
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <IconButton icon={<PencilIcon />} title="Edit" onClick={() => openEdit(c)} />
          <IconButton icon={<TrashIcon />} title="Delete" onClick={() => remove(c)} />
        </div>
      ),
    },
  ];

  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif",
    fontSize: 13.5, fontWeight: 600, background: active ? INK : "transparent", color: active ? "#fff" : MUTED, transition: "background .15s, color .15s",
  });

  return (
    <div>
      <AdminHeader
        eyebrow="MERCHANDISING"
        title="Collections"
        action={<button onClick={openNew} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New collection</button>}
      />

      <DataTable columns={columns} rows={list} rowKey={(c) => c.id} loading={loading} busyKey={busy} empty="No collections yet — create your first." />

      <AnimatePresence>
        {modal && (
          <Drawer
            title={modal.editing ? "Edit collection" : "New collection"}
            subtitle={modal.editing ? modal.editing.title : "Group products manually or with smart rules"}
            onClose={() => setModal(null)}
            width={640}
            footer={
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: MUTED }}>{previewIds.length} product{previewIds.length === 1 ? "" : "s"} in this collection</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModal(null)} style={ui.ghostBtn}>Cancel</button>
                  <button onClick={save} disabled={saving} style={{ ...ui.primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save"}</button>
                </div>
              </div>
            }
          >
            <label style={ui.label}>Title</label>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} autoFocus style={{ ...ui.input, marginBottom: 14 }} />

            <label style={ui.label}>URL handle</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: FAINT }}>/collection/</span>
              <input value={form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="auto from title" style={{ ...ui.input, flex: 1 }} />
            </div>

            <label style={ui.label}>Description</label>
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />

            <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <label style={ui.label}>Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ width: 56, height: 56, borderRadius: 10, border: `1.5px dashed ${INK}33`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                    {form.image ? <img src={form.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: FAINT, fontSize: 18 }}>+</span>}
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ""; }} style={{ display: "none" }} />
                  </label>
                  <input value={form.image} onChange={(e) => set({ image: e.target.value })} placeholder="…or paste image URL" style={{ ...ui.input, flex: 1 }} />
                </div>
              </div>
              <div style={{ width: 150 }}>
                <label style={ui.label}>Status</label>
                <select value={form.status} onChange={(e) => set({ status: e.target.value })} style={ui.input}>
                  <option value="active">Active</option><option value="hidden">Hidden</option>
                </select>
              </div>
            </div>

            {/* type segmented control */}
            <label style={ui.label}>Type</label>
            <div style={{ display: "flex", gap: 4, padding: 4, background: "#f0f0ef", borderRadius: 12, marginBottom: 18 }}>
              <button onClick={() => set({ type: "manual" })} style={seg(form.type === "manual")}>Manual</button>
              <button onClick={() => set({ type: "smart" })} style={seg(form.type === "smart")}>Smart (auto)</button>
            </div>

            {form.type === "manual" ? (
              <div>
                <label style={ui.label}>Products ({form.productIds.length} selected)</label>
                <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Search products…" style={{ ...ui.input, marginBottom: 10 }} />
                <div style={{ border: `1px solid ${INK}1f`, borderRadius: 12, maxHeight: 280, overflowY: "auto", background: "#fff" }}>
                  {filteredProducts.length === 0 && <div style={{ padding: 18, fontSize: 13, color: MUTED }}>No products.</div>}
                  {filteredProducts.map((p) => {
                    const on = form.productIds.includes(p.dbId);
                    return (
                      <button key={p.dbId} type="button" onClick={() => toggleProduct(p.dbId)}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 12px", background: "none", border: "none", borderTop: `1px solid ${INK}0d`, cursor: "pointer", textAlign: "left", fontFamily: "'Inter Tight', sans-serif" }}>
                        <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? "none" : `1.5px solid ${INK}59`, background: on ? INK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {on && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                        </span>
                        <div style={{ width: 30, height: 34, borderRadius: 6, background: "#efefee", overflow: "hidden", flexShrink: 0 }}>
                          {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 14, color: INK }}>{p.name}</span>
                        <span style={{ fontSize: 12.5, color: MUTED }}>€{Number(p.price).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13.5, color: INK }}>
                  Products matching
                  <select value={form.matchType} onChange={(e) => set({ matchType: e.target.value as "all" | "any" })} style={{ ...ui.input, width: "auto", padding: "6px 10px", fontSize: 13 }}>
                    <option value="all">all</option><option value="any">any</option>
                  </select>
                  of these conditions:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {form.rules.map((r, i) => {
                    const kind = kindOf(r.field);
                    const ops = OPS[kind];
                    const valOptions = r.field === "category" ? cats : r.field === "brand" ? brands : r.field === "tag" ? tags : null;
                    return (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 1.4fr auto", gap: 8, alignItems: "center" }}>
                        <select value={r.field} onChange={(e) => { const nf = e.target.value; const nk = kindOf(nf); setRule(i, { field: nf, op: OPS[nk][0][0], value: "" }); }} style={{ ...ui.input, padding: "9px 10px" }}>
                          {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        <select value={r.op} onChange={(e) => setRule(i, { op: e.target.value })} style={{ ...ui.input, padding: "9px 10px" }}>
                          {ops.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        {valOptions ? (
                          <select value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} style={{ ...ui.input, padding: "9px 10px" }}>
                            <option value="">— choose —</option>
                            {valOptions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                          </select>
                        ) : (
                          <input type={kind === "num" ? "number" : "text"} value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} placeholder="value" style={{ ...ui.input, padding: "9px 10px" }} />
                        )}
                        <IconButton icon={<TrashIcon size={16} />} title="Remove condition" onClick={() => removeRule(i)} />
                      </div>
                    );
                  })}
                </div>
                <button onClick={addRule} style={{ ...ui.ghostBtn, marginTop: 12, padding: "9px 16px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}><PlusIcon size={14} /> Add condition</button>
                {form.rules.length === 0 && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 10 }}>Add at least one condition — products that match will be included automatically.</div>}
              </div>
            )}
          </Drawer>
        )}
      </AnimatePresence>
    </div>
  );
}
