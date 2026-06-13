import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet, apiSend, apiUpload } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { Drawer, ui } from "./ui";
import Switch from "../../components/account/Switch";

type VariantOption = { id: number; value: string; meta: string | null };
type VariantAttr = { id: number; name: string; options: VariantOption[] };

type Form = {
  name: string; price: string; compareAtPrice: string; category: string;
  badge: string; status: string; stock: string; isFeatured: boolean;
  description: string; details: string; materials: string; care: string;
  dimensions: string; weight: string; fit: string; panel: string;
  optionIds: number[]; images: string[];
  seo: { metaTitle: string; metaDescription: string; ogImage: string };
};
const empty: Form = {
  name: "", price: "", compareAtPrice: "", category: "", badge: "", status: "active",
  stock: "0", isFeatured: false, description: "", details: "", materials: "", care: "",
  dimensions: "", weight: "", fit: "", panel: "#ECE7DE", optionIds: [], images: [],
  seo: { metaTitle: "", metaDescription: "", ogImage: "" },
};

const isHex = (s?: string | null) => !!s && /^#?[0-9a-fA-F]{3,8}$/.test(s.trim());
const swatch = (meta?: string | null) => (meta!.trim().startsWith("#") ? meta!.trim() : `#${meta!.trim()}`);

// Hoisted to module scope so they keep a stable identity across renders. (When
// defined inside the component they were re-created every keystroke/toggle,
// remounting the whole form — which dropped input focus and reset the drawer's
// scroll position to the top.)
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ ...ui.card, marginBottom: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}
function Lbl({ children }: { children: ReactNode }) {
  return <label style={ui.label}>{children}</label>;
}

export default function AdminProductForm({ id, onClose, onSaved }: { id: number | "new"; onClose: () => void; onSaved: () => void }) {
  const editing = id !== "new";
  const { show } = useToast();
  const [f, setF] = useState<Form>(empty);
  const [cats, setCats] = useState<any[]>([]);
  const [variants, setVariants] = useState<VariantAttr[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));

  useEffect(() => {
    apiGet<any[]>("admin/categories", true).then(setCats).catch(() => {});
    apiGet<VariantAttr[]>("admin/variants", true).then(setVariants).catch(() => {});
  }, []);
  useEffect(() => {
    if (!editing) return;
    apiGet<any>(`admin/products/${id}`, true).then((p) => setF({
      name: p.name || "", price: String(p.price ?? ""), compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
      category: p.category || "", badge: p.badge || "", status: p.status || "active", stock: String(p.stock ?? 0),
      isFeatured: !!p.isFeatured, description: p.description || "", details: p.details || "", materials: p.materials || "",
      care: p.care || "", dimensions: p.dimensions || "", weight: p.weight || "", fit: p.fit || "", panel: p.panel || "#ECE7DE",
      optionIds: Array.isArray(p.variantOptionIds) ? p.variantOptionIds : [], images: p.images || [],
      seo: { metaTitle: p.seo?.metaTitle || "", metaDescription: p.seo?.metaDescription || "", ogImage: p.seo?.ogImage || "" },
    })).catch((e) => show({ title: e.message, tone: "error" }));
  }, [id]);

  const toggleOption = (optId: number) =>
    setF((p) => ({ ...p, optionIds: p.optionIds.includes(optId) ? p.optionIds.filter((x) => x !== optId) : [...p.optionIds, optId] }));

  const onUpload = async (file: File) => {
    setUploading(true);
    try { const r = await apiUpload(file); set({ images: [...f.images, r.url] }); show({ title: "Image uploaded", tone: "success" }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.name.trim()) return show({ title: "Name is required", tone: "error" });
    setSaving(true);
    const payload = {
      name: f.name, price: parseFloat(f.price) || 0,
      compareAtPrice: f.compareAtPrice ? parseFloat(f.compareAtPrice) : null,
      category: f.category, badge: f.badge, status: f.status, stock: parseInt(f.stock || "0", 10),
      isFeatured: f.isFeatured, description: f.description, details: f.details, materials: f.materials,
      care: f.care, dimensions: f.dimensions, weight: f.weight, fit: f.fit, panel: f.panel,
      // Only send option ids that still exist (an attribute/option could have
      // been deleted in another tab while this form was open).
      variantOptionIds: f.optionIds.filter((id) => variants.some((a) => a.options.some((o) => o.id === id))),
      images: f.images.filter(Boolean), seo: f.seo,
    };
    try {
      if (editing) await apiSend("PUT", `admin/products/${id}`, payload);
      else await apiSend("POST", "admin/products", payload);
      show({ title: editing ? "Product updated" : "Product created", tone: "success" });
      onSaved();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
    finally { setSaving(false); }
  };

  const leaves = cats.filter((c) => c.parentId !== null);

  return (
    <Drawer
      title={editing ? "Edit product" : "New product"}
      subtitle={editing ? f.name : "Add a new product to the catalog"}
      onClose={onClose}
      width={760}
      footer={
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ui.ghostBtn}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...ui.primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save product"}</button>
        </div>
      }
    >
      <Card title="Basics">
        <Lbl>Name</Lbl>
        <input value={f.name} onChange={(e) => set({ name: e.target.value })} style={{ ...ui.input, marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div><Lbl>Price (€)</Lbl><input type="number" step="0.01" value={f.price} onChange={(e) => set({ price: e.target.value })} style={ui.input} /></div>
          <div><Lbl>Compare-at (€)</Lbl><input type="number" step="0.01" value={f.compareAtPrice} onChange={(e) => set({ compareAtPrice: e.target.value })} style={ui.input} /></div>
          <div><Lbl>Stock</Lbl><input type="number" value={f.stock} onChange={(e) => set({ stock: e.target.value })} style={ui.input} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
          <div>
            <Lbl>Category</Lbl>
            <select value={f.category} onChange={(e) => set({ category: e.target.value })} style={ui.input}>
              <option value="">— Select —</option>
              {leaves.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Badge</Lbl>
            <select value={f.badge} onChange={(e) => set({ badge: e.target.value })} style={ui.input}>
              <option value="">None</option><option value="New">New</option><option value="Bestseller">Bestseller</option><option value="Limited">Limited</option>
            </select>
          </div>
          <div>
            <Lbl>Status</Lbl>
            <select value={f.status} onChange={(e) => set({ status: e.target.value })} style={ui.input}>
              <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <Switch on={f.isFeatured} onChange={(v) => set({ isFeatured: v })} />
          <span style={{ fontSize: 14, color: TEXT_COLOR }}>Featured product</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <Lbl>Panel</Lbl>
            <input type="color" value={f.panel} onChange={(e) => set({ panel: e.target.value })} style={{ width: 40, height: 36, border: "1px solid rgba(84,84,84,0.2)", borderRadius: 8, padding: 2, cursor: "pointer" }} />
          </div>
        </div>
      </Card>

      <Card title="Description">
        <Lbl>Short / main description</Lbl>
        <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><Lbl>Details</Lbl><textarea value={f.details} onChange={(e) => set({ details: e.target.value })} rows={2} style={{ ...ui.input, resize: "vertical" }} /></div>
          <div><Lbl>Materials</Lbl><textarea value={f.materials} onChange={(e) => set({ materials: e.target.value })} rows={2} style={{ ...ui.input, resize: "vertical" }} /></div>
          <div><Lbl>Care</Lbl><textarea value={f.care} onChange={(e) => set({ care: e.target.value })} rows={2} style={{ ...ui.input, resize: "vertical" }} /></div>
          <div><Lbl>Fit</Lbl><textarea value={f.fit} onChange={(e) => set({ fit: e.target.value })} rows={2} style={{ ...ui.input, resize: "vertical" }} /></div>
          <div><Lbl>Dimensions</Lbl><input value={f.dimensions} onChange={(e) => set({ dimensions: e.target.value })} style={ui.input} /></div>
          <div><Lbl>Weight</Lbl><input value={f.weight} onChange={(e) => set({ weight: e.target.value })} style={ui.input} /></div>
        </div>
      </Card>

      <Card title="Variants">
        {variants.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "rgba(84,84,84,0.6)" }}>
            No variants defined yet. Create them in the <strong>Variants</strong> section, then select them here.
          </div>
        ) : (
          variants.map((attr) => (
            <div key={attr.id} style={{ marginBottom: 16 }}>
              <Lbl>{attr.name}</Lbl>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {attr.options.length === 0 && <span style={{ fontSize: 12.5, color: "rgba(84,84,84,0.45)" }}>No options for this attribute.</span>}
                {attr.options.map((o) => {
                  const selected = f.optionIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOption(o.id)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                        borderRadius: 999, padding: "7px 13px", fontSize: 13, fontFamily: "'Inter Tight', sans-serif",
                        border: selected ? "1.5px solid #111" : "1.5px solid rgba(84,84,84,0.2)",
                        background: selected ? GLOW_COLOR : "#faf9f6",
                        color: selected ? "#111" : TEXT_COLOR,
                        fontWeight: selected ? 600 : 400,
                        transition: "background 0.15s ease, border 0.15s ease",
                      }}
                    >
                      {isHex(o.meta) && <span style={{ width: 13, height: 13, borderRadius: "50%", background: swatch(o.meta), border: "1px solid rgba(84,84,84,0.25)" }} />}
                      {o.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </Card>

      <Card title="Images">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          {f.images.map((url, i) => (
            <div key={i} style={{ position: "relative", width: 84, height: 96, borderRadius: 10, background: "#ECE7DE", overflow: "hidden" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
              {i === 0 && <span style={{ position: "absolute", top: 4, left: 4, fontSize: 9, fontWeight: 600, background: GLOW_COLOR, color: "#111", borderRadius: 999, padding: "1px 6px" }}>MAIN</span>}
              <button onClick={() => set({ images: f.images.filter((_, j) => j !== i) })} style={{ position: "absolute", top: 4, right: 4, background: "rgba(17,17,17,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
            </div>
          ))}
          <label style={{ width: 84, height: 96, borderRadius: 10, border: "1.5px dashed rgba(84,84,84,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(84,84,84,0.55)", fontSize: 12, textAlign: "center" }}>
            {uploading ? "…" : "+ Upload"}
            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.currentTarget.value = ""; }} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="img-url" placeholder="…or paste an image URL" style={{ ...ui.input, flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) { set({ images: [...f.images, v] }); (e.target as HTMLInputElement).value = ""; } } }} />
        </div>
      </Card>

      <Card title="SEO">
        <Lbl>Meta title</Lbl>
        <input value={f.seo.metaTitle} onChange={(e) => set({ seo: { ...f.seo, metaTitle: e.target.value } })} style={{ ...ui.input, marginBottom: 14 }} />
        <Lbl>Meta description</Lbl>
        <textarea value={f.seo.metaDescription} onChange={(e) => set({ seo: { ...f.seo, metaDescription: e.target.value } })} rows={2} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />
        <Lbl>OG image URL</Lbl>
        <input value={f.seo.ogImage} onChange={(e) => set({ seo: { ...f.seo, ogImage: e.target.value } })} style={ui.input} />
      </Card>
    </Drawer>
  );
}
