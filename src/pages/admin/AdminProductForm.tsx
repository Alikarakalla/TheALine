import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend, apiUpload } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { Drawer, ui, INK } from "./ui";
import Switch from "../../components/account/Switch";

type VariantOption = { id: number; value: string; meta: string | null };
type VariantAttr = { id: number; name: string; options: VariantOption[] };
type Ref = { id: number; name: string };
type ProductImage = { url: string; alt: string };
// Editable per-combination row (values kept as strings for controlled inputs).
type VariantRow = { sku: string; price: string; stock: string; compareAt: string; images: string[]; active: boolean };

type Form = {
  name: string; slug: string; sku: string; brandId: number | null;
  price: string; compareAtPrice: string; cost: string; categoryIds: number[]; tagIds: number[];
  badge: string; status: string; stock: string; isFeatured: boolean;
  description: string; details: string; materials: string; care: string;
  dimensions: string; weight: string; fit: string; panel: string;
  optionIds: number[]; images: ProductImage[];
  // Per-combination overrides, keyed by sorted option-id list ("3-7").
  variantRows: Record<string, VariantRow>;
  seo: { metaTitle: string; metaDescription: string; ogImage: string; canonical: string; keywords: string };
};
const empty: Form = {
  name: "", slug: "", sku: "", brandId: null,
  price: "", compareAtPrice: "", cost: "", categoryIds: [], tagIds: [], badge: "", status: "active",
  stock: "0", isFeatured: false, description: "", details: "", materials: "", care: "",
  dimensions: "", weight: "", fit: "", panel: "#ECE7DE", optionIds: [], images: [],
  variantRows: {},
  seo: { metaTitle: "", metaDescription: "", ogImage: "", canonical: "", keywords: "" },
};

// Stable key for a combination, independent of option order.
const comboKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join("-");

const cellInput = {
  width: "100%", boxSizing: "border-box" as const, border: "1px solid rgba(84,84,84,0.2)",
  borderRadius: 8, padding: "7px 9px", fontFamily: "'Inter Tight', sans-serif", fontSize: 13,
  color: TEXT_COLOR, background: "#fff",
};
const MATRIX_COLS = "1.2fr 0.85fr 0.62fr 0.62fr 0.5fr 132px auto";

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

// Multi-select category tree — a product can sit in several categories /
// sub-categories at once. Renders the flat admin list as an indented tree.
function CategoryPicker({ cats, selected, onToggle }: { cats: any[]; selected: number[]; onToggle: (id: number) => void }) {
  if (!cats.length)
    return <div style={{ fontSize: 13.5, color: "rgba(84,84,84,0.6)" }}>No categories yet — create them in the <strong>Categories</strong> section.</div>;
  const ordered: { c: any; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) =>
    cats.filter((c) => (c.parentId ?? null) === parent).forEach((c) => { ordered.push({ c, depth }); walk(c.id, depth + 1); });
  walk(null, 0);
  return (
    <div style={{ border: "1px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: 12, maxHeight: 240, overflowY: "auto", background: "#fff", display: "flex", flexDirection: "column", gap: 9 }}>
      {ordered.map(({ c, depth }) => {
        const on = selected.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => onToggle(c.id)}
            style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", padding: 0, paddingLeft: depth * 20, cursor: "pointer", textAlign: "left", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? "none" : "1.5px solid rgba(84,84,84,0.35)", background: on ? INK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
            </span>
            {depth > 0 && <span style={{ color: "rgba(84,84,84,0.35)" }}>└</span>}
            <span style={{ fontWeight: depth === 0 ? 600 : 400 }}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AdminProductForm({ id, onClose, onSaved }: { id: number | "new"; onClose: () => void; onSaved: () => void }) {
  const editing = id !== "new";
  const { show } = useToast();
  const [f, setF] = useState<Form>(empty);
  const [cats, setCats] = useState<any[]>([]);
  const [variants, setVariants] = useState<VariantAttr[]>([]);
  const [brands, setBrands] = useState<Ref[]>([]);
  const [tags, setTags] = useState<Ref[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));

  useEffect(() => {
    apiGet<any[]>("admin/categories", true).then(setCats).catch(() => {});
    apiGet<VariantAttr[]>("admin/variants", true).then(setVariants).catch(() => {});
    apiGet<Ref[]>("admin/brands", true).then(setBrands).catch(() => {});
    apiGet<Ref[]>("admin/tags", true).then(setTags).catch(() => {});
  }, []);
  useEffect(() => {
    if (!editing) return;
    apiGet<any>(`admin/products/${id}`, true).then((p) => {
      // Rebuild the ticked options + per-combination rows from the variant matrix.
      const apiVariants: any[] = Array.isArray(p.variants) ? p.variants : [];
      const ticked = new Set<number>();
      const rows: Record<string, VariantRow> = {};
      for (const v of apiVariants) {
        const ids: number[] = Array.isArray(v.optionIds) ? v.optionIds : [];
        ids.forEach((x) => ticked.add(x));
        rows[comboKey(ids)] = {
          sku: v.sku || "",
          price: v.price != null ? String(v.price) : "",
          stock: String(v.stock ?? 0),
          compareAt: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
          images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []),
          active: v.status !== "hidden",
        };
      }
      const optionIds = ticked.size
        ? Array.from(ticked)
        : (Array.isArray(p.variantOptionIds) ? p.variantOptionIds : []);
      // Prefer `media` (carries alt); fall back to the flat URL list.
      const images: ProductImage[] = Array.isArray(p.media)
        ? p.media.map((m: any) => ({ url: m.url, alt: m.alt || "" }))
        : (Array.isArray(p.images) ? p.images.map((u: string) => ({ url: u, alt: "" })) : []);
      setF({
        name: p.name || "", slug: p.slug || p.id || "", sku: p.sku || "", brandId: p.brandId ?? null,
        price: String(p.price ?? ""), compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
        cost: p.costPrice != null ? String(p.costPrice) : "",
        categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : (Array.isArray(p.categories) ? p.categories.map((c: any) => c.id) : []),
        tagIds: Array.isArray(p.tagIds) ? p.tagIds : (Array.isArray(p.tags) ? p.tags.map((t: any) => t.id) : []),
        badge: p.badge || "", status: p.status || "active", stock: String(p.stock ?? 0),
        isFeatured: !!p.isFeatured, description: p.description || "", details: p.details || "", materials: p.materials || "",
        care: p.care || "", dimensions: p.dimensions || "", weight: p.weight || "", fit: p.fit || "", panel: p.panel || "#ECE7DE",
        optionIds, images, variantRows: rows,
        seo: {
          metaTitle: p.seo?.metaTitle || "", metaDescription: p.seo?.metaDescription || "", ogImage: p.seo?.ogImage || "",
          canonical: p.seo?.canonical || "", keywords: p.seo?.keywords || "",
        },
      });
    }).catch((e) => show({ title: e.message, tone: "error" }));
  }, [id]);

  const toggleOption = (optId: number) =>
    setF((p) => ({ ...p, optionIds: p.optionIds.includes(optId) ? p.optionIds.filter((x) => x !== optId) : [...p.optionIds, optId] }));
  const toggleCategory = (catId: number) =>
    setF((p) => ({ ...p, categoryIds: p.categoryIds.includes(catId) ? p.categoryIds.filter((x) => x !== catId) : [...p.categoryIds, catId] }));
  const toggleTag = (tagId: number) =>
    setF((p) => ({ ...p, tagIds: p.tagIds.includes(tagId) ? p.tagIds.filter((x) => x !== tagId) : [...p.tagIds, tagId] }));

  // Attributes that have ≥1 ticked option, then the cartesian product of those
  // options → one combination per row (Beige/S, Beige/M, …).
  const attrsInPlay = useMemo(
    () => variants.map((a) => ({ attr: a, opts: a.options.filter((o) => f.optionIds.includes(o.id)) })).filter((x) => x.opts.length > 0),
    [variants, f.optionIds]
  );
  const combos = useMemo(
    () =>
      attrsInPlay.reduce<number[][]>((acc, { opts }) => {
        if (!acc.length) return opts.map((o) => [o.id]);
        const next: number[][] = [];
        for (const combo of acc) for (const o of opts) next.push([...combo, o.id]);
        return next;
      }, []),
    [attrsInPlay]
  );
  const optValue = (oid: number) => {
    for (const a of variants) { const o = a.options.find((x) => x.id === oid); if (o) return o.value; }
    return String(oid);
  };
  const setVariantRow = (key: string, patch: Partial<VariantRow>) =>
    setF((p) => ({
      ...p,
      variantRows: { ...p.variantRows, [key]: { ...(p.variantRows[key] ?? { sku: "", price: "", stock: "0", compareAt: "", images: [], active: true }), ...patch } },
    }));

  const onUpload = async (file: File) => {
    setUploading(true);
    try { const r = await apiUpload(file); set({ images: [...f.images, { url: r.url, alt: "" }] }); show({ title: "Image uploaded", tone: "success" }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
    finally { setUploading(false); }
  };
  // Append an uploaded image to a variant row's gallery.
  const onVariantUpload = async (key: string, file: File) => {
    try {
      const r = await apiUpload(file);
      setF((p) => {
        const cur = p.variantRows[key] ?? { sku: "", price: "", stock: "0", compareAt: "", images: [], active: true };
        return { ...p, variantRows: { ...p.variantRows, [key]: { ...cur, images: [...cur.images, r.url] } } };
      });
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const removeVariantImage = (key: string, idx: number) =>
    setF((p) => {
      const cur = p.variantRows[key]; if (!cur) return p;
      return { ...p, variantRows: { ...p.variantRows, [key]: { ...cur, images: cur.images.filter((_, j) => j !== idx) } } };
    });

  const save = async () => {
    if (!f.name.trim()) return show({ title: "Name is required", tone: "error" });
    setSaving(true);
    const handle = f.slug.trim();
    const payload: any = {
      name: f.name, sku: f.sku.trim() || null, brandId: f.brandId,
      price: parseFloat(f.price) || 0,
      compareAtPrice: f.compareAtPrice ? parseFloat(f.compareAtPrice) : null,
      costPrice: f.cost ? parseFloat(f.cost) : null,
      categoryIds: f.categoryIds, tagIds: f.tagIds, badge: f.badge, status: f.status, stock: parseInt(f.stock || "0", 10),
      isFeatured: f.isFeatured, description: f.description, details: f.details, materials: f.materials,
      care: f.care, dimensions: f.dimensions, weight: f.weight, fit: f.fit, panel: f.panel,
      // The variant matrix — one entry per generated combination, with its
      // per-combo sku/price/compare-at/stock/image/status.
      variants: combos.map((combo) => {
        const r = f.variantRows[comboKey(combo)];
        return {
          optionIds: combo,
          sku: r?.sku?.trim() || null,
          price: r && r.price !== "" ? parseFloat(r.price) : null,
          compareAtPrice: r && r.compareAt !== "" ? parseFloat(r.compareAt) : null,
          stock: r ? parseInt(r.stock || "0", 10) || 0 : 0,
          images: r?.images || [],
          status: r && r.active === false ? "hidden" : "active",
        };
      }),
      images: f.images.filter((im) => im.url),
      seo: f.seo,
    };
    // Editable handle: send it when set, otherwise preserve the existing slug.
    if (handle) payload.slug = handle;
    else payload.keepSlug = true;
    try {
      if (editing) await apiSend("PUT", `admin/products/${id}`, payload);
      else await apiSend("POST", "admin/products", payload);
      show({ title: editing ? "Product updated" : "Product created", tone: "success" });
      onSaved();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
    finally { setSaving(false); }
  };

  const priceNum = parseFloat(f.price) || 0;
  const costNum = parseFloat(f.cost) || 0;
  const margin = priceNum > 0 && costNum > 0 ? Math.round(((priceNum - costNum) / priceNum) * 100) : null;
  const profit = priceNum > 0 && costNum > 0 ? priceNum - costNum : null;

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
          <div><Lbl>SKU</Lbl><input value={f.sku} onChange={(e) => set({ sku: e.target.value })} style={ui.input} placeholder="e.g. TERRA-001" /></div>
          <div><Lbl>Cost / item (€)</Lbl><input type="number" step="0.01" value={f.cost} onChange={(e) => set({ cost: e.target.value })} style={ui.input} /></div>
          <div>
            <Lbl>Brand</Lbl>
            <select value={f.brandId ?? ""} onChange={(e) => set({ brandId: e.target.value ? Number(e.target.value) : null })} style={ui.input}>
              <option value="">— None —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        {margin != null && (
          <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.6)", marginTop: 8 }}>
            Margin <strong style={{ color: TEXT_COLOR }}>{margin}%</strong> · Profit <strong style={{ color: TEXT_COLOR }}>€{profit!.toFixed(2)}</strong> per item
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
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
        <div style={{ marginTop: 14 }}>
          <Lbl>Categories</Lbl>
          <CategoryPicker cats={cats} selected={f.categoryIds} onToggle={toggleCategory} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Lbl>Tags</Lbl>
          {tags.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(84,84,84,0.55)" }}>No tags yet — create them in the <strong>Tags</strong> section.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((t) => {
                const on = f.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    style={{
                      cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontSize: 13, fontFamily: "'Inter Tight', sans-serif",
                      border: on ? "1.5px solid #111" : "1.5px solid rgba(84,84,84,0.2)",
                      background: on ? INK : "#f5f5f4", color: on ? "#fff" : TEXT_COLOR, fontWeight: on ? 600 : 400,
                    }}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
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
                        background: selected ? INK : "#f5f5f4",
                        color: selected ? "#fff" : TEXT_COLOR,
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

        {combos.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Lbl>Variants ({combos.length})</Lbl>
            <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)", marginBottom: 10 }}>
              Each combination can carry its own SKU, price, compare-at and stock. Leave price blank to use the base price; untick Active to hide a combination.
            </div>
            <div style={{ border: "1px solid rgba(84,84,84,0.15)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: MATRIX_COLS, gap: 8, padding: "10px 12px", background: "#faf9f6", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "rgba(84,84,84,0.6)", textTransform: "uppercase" }}>
                <span>Variant</span><span>SKU</span><span>Price €</span><span>Was €</span><span>Stock</span><span>Images</span><span style={{ textAlign: "center" }}>Active</span>
              </div>
              {combos.map((combo) => {
                const key = comboKey(combo);
                const r = f.variantRows[key] ?? { sku: "", price: "", stock: "0", compareAt: "", image: "", active: true };
                const label = combo.map(optValue).join(" / ");
                return (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: MATRIX_COLS, gap: 8, padding: "8px 12px", alignItems: "center", borderTop: "1px solid rgba(84,84,84,0.08)" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR }}>{label}</span>
                    <input value={r.sku} onChange={(e) => setVariantRow(key, { sku: e.target.value })} style={cellInput} placeholder="—" />
                    <input type="number" step="0.01" value={r.price} onChange={(e) => setVariantRow(key, { price: e.target.value })} style={cellInput} placeholder={f.price || "base"} />
                    <input type="number" step="0.01" value={r.compareAt} onChange={(e) => setVariantRow(key, { compareAt: e.target.value })} style={cellInput} placeholder="—" />
                    <input type="number" value={r.stock} onChange={(e) => setVariantRow(key, { stock: e.target.value })} style={cellInput} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {r.images.map((src, idx) => (
                        <span key={idx} style={{ position: "relative", width: 30, height: 30, borderRadius: 6, border: "1px solid rgba(84,84,84,0.2)", background: `center/cover no-repeat url(${src})` }}>
                          <button type="button" title="Remove" onClick={() => removeVariantImage(key, idx)} style={{ position: "absolute", top: -5, right: -5, width: 14, height: 14, borderRadius: "50%", border: "none", background: "rgba(17,17,17,0.75)", color: "#fff", fontSize: 9, lineHeight: 1, cursor: "pointer" }}>✕</button>
                        </span>
                      ))}
                      <label title="Add image" style={{ width: 30, height: 30, borderRadius: 6, border: "1px dashed rgba(84,84,84,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(84,84,84,0.5)", fontSize: 15, flexShrink: 0 }}>
                        +
                        <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onVariantUpload(key, file); e.currentTarget.value = ""; }} style={{ display: "none" }} />
                      </label>
                    </div>
                    <input type="checkbox" checked={r.active} onChange={(e) => setVariantRow(key, { active: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer", justifySelf: "center" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card title="Images">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
          {f.images.map((im, i) => (
            <div key={i} style={{ width: 110, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ position: "relative", width: 110, height: 96, borderRadius: 10, background: "#ECE7DE", overflow: "hidden" }}>
                <img src={im.url} alt={im.alt} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                {i === 0 && <span style={{ position: "absolute", top: 4, left: 4, fontSize: 9, fontWeight: 600, background: INK, color: "#fff", borderRadius: 999, padding: "1px 6px" }}>MAIN</span>}
                <button onClick={() => set({ images: f.images.filter((_, j) => j !== i) })} style={{ position: "absolute", top: 4, right: 4, background: "rgba(17,17,17,0.7)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
              </div>
              <input value={im.alt} onChange={(e) => set({ images: f.images.map((x, j) => j === i ? { ...x, alt: e.target.value } : x) })} placeholder="Alt text" style={{ ...ui.input, padding: "6px 8px", fontSize: 12 }} />
            </div>
          ))}
          <label style={{ width: 110, height: 96, borderRadius: 10, border: "1.5px dashed rgba(84,84,84,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(84,84,84,0.55)", fontSize: 12, textAlign: "center" }}>
            {uploading ? "…" : "+ Upload"}
            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); e.currentTarget.value = ""; }} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="img-url" placeholder="…or paste an image URL" style={{ ...ui.input, flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) { set({ images: [...f.images, { url: v, alt: "" }] }); (e.target as HTMLInputElement).value = ""; } } }} />
        </div>
      </Card>

      <Card title="SEO & search">
        <Lbl>URL handle</Lbl>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: "rgba(84,84,84,0.5)" }}>/product/</span>
          <input value={f.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="auto from name" style={{ ...ui.input, flex: 1 }} />
        </div>
        <Lbl>Meta title</Lbl>
        <input value={f.seo.metaTitle} onChange={(e) => set({ seo: { ...f.seo, metaTitle: e.target.value } })} style={{ ...ui.input, marginBottom: 14 }} />
        <Lbl>Meta description</Lbl>
        <textarea value={f.seo.metaDescription} onChange={(e) => set({ seo: { ...f.seo, metaDescription: e.target.value } })} rows={2} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><Lbl>OG image URL</Lbl><input value={f.seo.ogImage} onChange={(e) => set({ seo: { ...f.seo, ogImage: e.target.value } })} style={ui.input} /></div>
          <div><Lbl>Canonical URL</Lbl><input value={f.seo.canonical} onChange={(e) => set({ seo: { ...f.seo, canonical: e.target.value } })} style={ui.input} /></div>
        </div>
        <Lbl>Keywords</Lbl>
        <input value={f.seo.keywords} onChange={(e) => set({ seo: { ...f.seo, keywords: e.target.value } })} placeholder="comma, separated, keywords" style={ui.input} />
      </Card>
    </Drawer>
  );
}
