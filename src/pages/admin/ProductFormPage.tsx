import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { API_BASE } from "../../lib/api";
import { Drawer } from "./ui";
import { Icon } from "./icons";

/**
 * Create/Edit product — 1:1 port of the lebazone admin ProductFormPage:
 * sticky header, two-column layout (main + 320px sidebar), dependent
 * category selects, variation matrix with drag-reorder + copy tools +
 * per-variant media drawers, readiness checklist, server-side validation
 * with scroll-to-field, and the animated save loader.
 */

/* ─────────────────────────── tokens & utilities ─────────────────────────── */

const T = {
  surface: "#fff",
  bg: "#f6f6f4",
  border: "#eee",
  borderMid: "#deded9",
  text: "#111",
  textSub: "#555",
  textMuted: "#999",
  red: "#ef4444",
  green: "#16a34a",
  font: "'Inter Tight', 'Helvetica Neue', sans-serif",
};

const slugify = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const adminToken = () => localStorage.getItem("lovebag-admin-token") || "";
const authHeaders = (): Record<string, string> => {
  const t = adminToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function useObjectUrl(file: File | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

type OptionItem = { value: number | string; label: string; color?: string | null };
type AttrValue = { id: number; name: string; slug: string; code: string | null };
type VariantAttribute = { id: number; slug: string; name: string; values: AttrValue[] };
type ComboPart = { attribute_slug: string; value_id: number };
type VariantRow = {
  row_key: string;
  display_name: string;
  combination: ComboPart[];
  sku: string; barcode: string;
  price: string | number | null;
  compare_at_price: string | number | null;
  cost_price: string | number | null;
  discount_amount: string | number | null;
  discount_type: string;
  stock_quantity: number | string;
  is_visible: boolean;
  image_path: string | null; main_image_path: string | null; image_url: string | null;
  gallery_paths: string[];
  sort_order: number;
};

const emptyForm = {
  name_en: "", name_ar: "", slug: "", sku: "", barcode: "",
  short_description_en: "", short_description_ar: "",
  description_en: "", description_ar: "",
  is_visible: true, is_featured: false, track_inventory: true,
  stock_quantity: 0 as number | string,
  preorder_enabled: false, preorder_shipping_days: "" as number | string,
  price: "" as number | string, compare_at_price: "" as number | string, cost_price: "" as number | string,
  discount_amount: "" as number | string, discount_type: "",
  published_at: "", brand_id: null as number | null,
  selectedCategories: [] as number[], selectedSubCategories: [] as number[], selectedSubSubCategories: [] as number[],
  selectedTags: [] as number[],
  hasVariations: false, variantTableRows: [] as VariantRow[],
  multipleVariations: [] as { id: string; attribute_slug: string; selected_values: number[] }[],
  gallery: [] as { id: number; url: string }[],
  main_image_url: null as string | null,
  // The A Line storefront extras
  details: "", materials: "", care: "", dimensions: "", weight: "", fit: "",
  badge: "", panel: "#ECE7DE",
  seo: { metaTitle: "", metaDescription: "", ogImage: "", canonical: "", keywords: "" },
};
type FormState = typeof emptyForm;

const rowKeyFor = (combination: ComboPart[]) =>
  combination.map((c) => `${c.attribute_slug}_${c.value_id}`).sort().join("|");

const cartesian = (groups: ComboPart[][]): ComboPart[][] =>
  groups.reduce<ComboPart[][]>((acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])), [[]]);

/* error plumbing */
const errorLabels: Record<string, string> = {
  name_en: "Name (English)", name_ar: "Name (Arabic)", price: "Price",
  selectedCategories: "Category", selectedSubCategories: "Sub category", selectedSubSubCategories: "Sub-Sub category",
  slug: "Slug", sku: "SKU", barcode: "Barcode", stock_quantity: "Stock quantity",
  preorder_shipping_days: "Pre-order shipping days", published_at: "Publish at",
};
const errorOrder = ["name_en", "name_ar", "selectedCategories", "price", "selectedSubCategories", "selectedSubSubCategories", "sku", "barcode", "stock_quantity", "slug", "published_at"];
type Errors = Record<string, string | string[]>;
const errorMessage = (errors: Errors, key: string) => {
  const v = errors[key];
  return Array.isArray(v) ? v[0] : v;
};
const orderRank = (key: string) => {
  const i = errorOrder.indexOf(key);
  return i === -1 ? 999 : i;
};
const firstErrorKey = (errors: Errors) => {
  const keys = Object.keys(errors).filter((k) => k !== "form");
  if (!keys.length) return Object.keys(errors)[0];
  return [...keys].sort((a, b) => orderRank(a) - orderRank(b))[0];
};
const formatErrorKey = (key: string) => {
  const m = key.match(/^variantTableRows\.(\d+)\.(.+)$/);
  if (m) return `Variant row ${Number(m[1]) + 1} — ${m[2].replace(/_/g, " ")}`;
  return errorLabels[key] || key.replace(/_/g, " ");
};
const errorEntries = (errors: Errors) =>
  Object.keys(errors)
    .filter((k) => k !== "form")
    .map((key) => ({ key, label: formatErrorKey(key), message: errorMessage(errors, key) || "" }))
    .filter((e) => e.message)
    .sort((a, b) => orderRank(a.key) - orderRank(b.key));

/* react-select styling */
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base, minHeight: 40, borderRadius: 10, background: "#fff", fontSize: 13, fontFamily: T.font,
    borderColor: state.isFocused ? "#c8d3e1" : T.borderMid,
    boxShadow: state.isFocused ? "0 0 0 4px rgba(17,24,39,.04)" : "none",
    "&:hover": { borderColor: state.isFocused ? "#c8d3e1" : "#c9c9c2" },
  }),
  valueContainer: (base: any) => ({ ...base, padding: "3px 10px" }),
  multiValue: (base: any) => ({ ...base, background: "#f5f5f7", border: "1px solid #e6e6e2", borderRadius: 6 }),
  multiValueLabel: (base: any) => ({ ...base, fontWeight: 600, fontSize: 12, padding: "3px 7px" }),
  multiValueRemove: (base: any) => ({ ...base, ":hover": { background: "#e5e5ea", color: "#111" } }),
  placeholder: (base: any) => ({ ...base, color: "#98a2b3" }),
  menu: (base: any) => ({ ...base, borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.06)", zIndex: 40 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 10020 }),
  option: (base: any, state: any) => ({
    ...base, fontSize: 13, fontFamily: T.font,
    background: state.isSelected ? "#111" : state.isFocused ? "#f2f2f7" : "#fff",
    color: state.isSelected ? "#fff" : "#111",
    ":active": { background: state.isSelected ? "#111" : "#e9e9ef" },
  }),
};

const toSelectValue = (ids: number[], options: OptionItem[]) =>
  options.filter((o) => ids.includes(Number(o.value)));

/* ────────────────────────── helper components ────────────────────────── */

function Card({ title, description, children, side = false }: { title?: string; description?: string; children: React.ReactNode; side?: boolean }) {
  return (
    <section className={`pf-card${side ? " pf-card-side" : ""}`}>
      {(title || description) && (
        <div className="pf-card-head">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function DetailsCard({ title, description, children, defaultOpen = false }: { title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`pf-card pf-details${open ? " open" : ""}`}>
      <button type="button" className="pf-details-summary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s ease", flexShrink: 0 }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="pf-details-body" style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .32s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 12 }}>{children}</div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, required = false, error, errorKey, className, children }: { label: string; required?: boolean; error?: string; errorKey?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`pf-field${error ? " is-error" : ""}${className ? ` ${className}` : ""}`} data-error-key={errorKey}>
      <span>{label}{required && <b> *</b>}</span>
      {children}
      {error && <em>{error}</em>}
    </label>
  );
}

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`pf-input ${props.className || ""}`} />;
const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`pf-input pf-textarea ${props.className || ""}`} />;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" className={`pf-toggle${checked ? " active" : ""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="pf-toggle-pill"><span className="pf-toggle-knob" /></span>
      {label && <strong>{label}</strong>}
    </button>
  );
}

function RichTextEditor({ value, onChange, dir = "ltr" }: { value: string; onChange: (html: string) => void; dir?: "ltr" | "rtl" }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);
  if (!editor) return <div className="pf-rich"><div className="pf-rich-content" /></div>;
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "");
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const B = ({ on, label, act, title }: { on?: boolean; label: string; act: () => void; title?: string }) => (
    <button type="button" className={`pf-rich-btn${on ? " active" : ""}`} title={title || label} onMouseDown={(e) => e.preventDefault()} onClick={act}>{label}</button>
  );
  return (
    <div className="pf-rich">
      <div className="pf-rich-toolbar">
        <B on={editor.isActive("bold")} label="B" act={() => editor.chain().focus().toggleBold().run()} title="Bold" />
        <B on={editor.isActive("italic")} label="I" act={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
        <B on={editor.isActive("underline")} label="U" act={() => editor.chain().focus().toggleUnderline().run()} title="Underline" />
        <B on={editor.isActive("strike")} label="S" act={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough" />
        <B on={editor.isActive("link")} label="Link" act={setLink} />
        <i className="pf-rich-divider" />
        <B on={editor.isActive("heading", { level: 3 })} label="H" act={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading" />
        <B on={editor.isActive("blockquote")} label="Quote" act={() => editor.chain().focus().toggleBlockquote().run()} />
        <B on={editor.isActive("code")} label="Code" act={() => editor.chain().focus().toggleCode().run()} />
        <B on={editor.isActive("bulletList")} label="List" act={() => editor.chain().focus().toggleBulletList().run()} />
        <B on={editor.isActive("orderedList")} label="1." act={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list" />
        <i className="pf-rich-divider" />
        <B label="Undo" act={() => editor.chain().focus().undo().run()} />
        <B label="Redo" act={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} className="pf-rich-content" dir={dir} />
    </div>
  );
}

function ImagePicker({ label, file, currentUrl, onPick, onRemove }: { label: string; file: File | null; currentUrl: string | null; onPick: (f: File) => void; onRemove: () => void }) {
  const objectUrl = useObjectUrl(file);
  const preview = objectUrl || currentUrl;
  const id = `pf-pick-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="pf-imagepicker">
      <input id={id} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      <label htmlFor={id} className="pf-dropzone" style={{ height: 150 }}>
        {preview ? (
          <>
            <img src={preview} alt="" />
            <span className="pf-dropzone-caption">Replace image</span>
          </>
        ) : (
          <span className="pf-dropzone-empty"><Icon name="download" size={24} style={{ transform: "rotate(180deg)" }} /> {label}</span>
        )}
      </label>
      {preview && (
        <button type="button" className="pf-btn pf-btn-sm danger" onClick={onRemove}><Icon name="x" size={13} /> Remove</button>
      )}
    </div>
  );
}

function GalleryUploadPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file);
  return (
    <div className="pf-gallery-item">
      {url && <img src={url} alt="" />}
      <button type="button" className="pf-gallery-x" onClick={onRemove} aria-label="Remove image"><Icon name="x" size={11} /></button>
    </div>
  );
}

function GalleryPicker({ files, existing, removedIds, onFiles, onRemoveFile, onRemoveExisting }: {
  files: File[]; existing: { id: number; url: string }[]; removedIds: number[];
  onFiles: (list: File[]) => void; onRemoveFile: (index: number) => void; onRemoveExisting: (id: number) => void;
}) {
  return (
    <div className="pf-gallerypicker">
      <input id="pf-gallery-input" type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { const list = Array.from(e.target.files || []); if (list.length) onFiles(list); e.target.value = ""; }} />
      <label htmlFor="pf-gallery-input" className="pf-btn pf-btn-sm" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
        <Icon name="download" size={16} style={{ transform: "rotate(180deg)" }} /> Add gallery images
      </label>
      <div className="pf-gallery-grid">
        {existing.filter((im) => !removedIds.includes(im.id)).map((im) => (
          <div key={`old-${im.id}`} className="pf-gallery-item">
            <img src={im.url} alt="" />
            <button type="button" className="pf-gallery-x" onClick={() => onRemoveExisting(im.id)} aria-label="Remove image"><Icon name="x" size={11} /></button>
          </div>
        ))}
        {files.map((f, i) => <GalleryUploadPreview key={`${f.name}-${i}`} file={f} onRemove={() => onRemoveFile(i)} />)}
      </div>
    </div>
  );
}

const variantMainPreview = (row: VariantRow) => row.image_url || row.image_path || row.main_image_path || null;

function VariantMediaButton({ row, pendingMain, pendingGallery, onOpen }: { row: VariantRow; pendingMain: File | null; pendingGallery: File[]; onOpen: () => void }) {
  const objectUrl = useObjectUrl(pendingMain);
  const preview = objectUrl || variantMainPreview(row);
  const count = (row.gallery_paths?.length || 0) + pendingGallery.length;
  return (
    <button type="button" className="pf-variant-media" onClick={onOpen}>
      {preview ? <img src={preview} alt="" /> : <span>Image</span>}
      {preview && <span className="pf-vm-label">Images</span>}
      {count > 0 && <em>{count}</em>}
    </button>
  );
}

function VariantMediaDialog({ row, pendingMain, pendingGallery, onClose, onPickMain, onRemoveMain, onAddGallery, onRemoveGalleryPath, onRemoveGalleryUpload }: {
  row: VariantRow; pendingMain: File | null; pendingGallery: File[];
  onClose: () => void; onPickMain: (f: File) => void; onRemoveMain: () => void;
  onAddGallery: (files: File[]) => void; onRemoveGalleryPath: (path: string) => void; onRemoveGalleryUpload: (i: number) => void;
}) {
  const objectUrl = useObjectUrl(pendingMain);
  const preview = objectUrl || variantMainPreview(row);
  return (
    <Drawer title={row.display_name || "Variant"} subtitle="Variant images" width={520} onClose={onClose}
      footer={<div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="pf-btn primary" onClick={onClose}>Done</button></div>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: T.font }}>
        <div>
          <div className="pf-section-label">Main image</div>
          <input id={`variant-main-${row.row_key}`} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickMain(f); e.target.value = ""; }} />
          <label htmlFor={`variant-main-${row.row_key}`} className="pf-dropzone" style={{ height: 260 }}>
            {preview ? <img src={preview} alt="" /> : (
              <span className="pf-dropzone-empty"><Icon name="download" size={24} style={{ transform: "rotate(180deg)" }} /> Upload main image</span>
            )}
          </label>
          {preview && <button type="button" className="pf-btn pf-btn-sm danger" style={{ marginTop: 8 }} onClick={onRemoveMain}><Icon name="x" size={13} /> Remove main image</button>}
        </div>
        <div>
          <div className="pf-section-label">Gallery images</div>
          <input id={`variant-gallery-${row.row_key}`} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { const list = Array.from(e.target.files || []); if (list.length) onAddGallery(list); e.target.value = ""; }} />
          <label htmlFor={`variant-gallery-${row.row_key}`} className="pf-btn pf-btn-sm" style={{ cursor: "pointer", marginBottom: 10, display: "inline-flex" }}>
            <Icon name="download" size={14} style={{ transform: "rotate(180deg)" }} /> Add gallery images
          </label>
          <div className="pf-gallery-grid variant">
            {(row.gallery_paths || []).map((path) => (
              <div key={path} className="pf-gallery-item">
                <img src={path} alt="" />
                <button type="button" className="pf-gallery-x" onClick={() => onRemoveGalleryPath(path)} aria-label="Remove image"><Icon name="x" size={11} /></button>
              </div>
            ))}
            {pendingGallery.map((f, i) => <GalleryUploadPreview key={`${f.name}-${i}`} file={f} onRemove={() => onRemoveGalleryUpload(i)} />)}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function ProductReadiness({ form, hasMainImage, layout = "inline" }: { form: FormState; hasMainImage: boolean; layout?: "inline" | "vertical" }) {
  const items: { label: string; done: boolean; optional?: boolean }[] = [
    { label: "English name", done: form.name_en.trim() !== "" },
    { label: "Arabic name", done: form.name_ar.trim() !== "" },
    { label: "Category", done: form.selectedCategories.length > 0 },
    form.hasVariations
      ? { label: "Variant rows", done: form.variantTableRows.length > 0 }
      : { label: "Price", done: String(form.price).trim() !== "" },
    { label: "Image", done: hasMainImage, optional: true },
  ];
  return (
    <div className={`pf-checklist ${layout}`} aria-label="Product setup status">
      {items.map((it) => (
        <span key={it.label} className={`pf-check-pill${it.done ? " done" : ""}`}>
          {it.done
            ? <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 12.5 5 5 10-11" /></svg>
            : <i />}
          {it.label}
          {it.optional && !it.done && <em>Recommended</em>}
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────── the animated save loader ───────────────────────── */

const DEFAULT_SAVE_MESSAGES = [
  "Uploading images…", "Optimizing media…", "Saving product details…", "Building variants…", "Publishing to your storefront…",
];
const LOADER = {
  c1: "#6366f1", c2: "#a855f7", success: "#22c55e", backdrop: "#0e0f1a", text: "#111111",
  savingSubtext: "Hang tight — please keep this tab open.",
  successCreate: "Product created!", successEdit: "Product updated!",
  successSubtext: "Taking you back to your products…",
};

function hexToRgba(hex: string, alpha: number) {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(14,15,26,${alpha})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function ProductSaveLoader({ phase, mode }: { phase: null | "saving" | "success"; mode: "create" | "edit" }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const done = phase === "success";
  const messages = DEFAULT_SAVE_MESSAGES;
  useEffect(() => {
    setMsgIndex(0);
    if (phase !== "saving") return;
    const t = setInterval(() => setMsgIndex((i) => Math.min(i + 1, messages.length - 1)), 1200);
    return () => clearInterval(t);
  }, [phase, messages.length]);
  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ left: (i * 53) % 100, delay: (i % 6) * 0.5, dur: 4 + (i % 5), size: 4 + (i % 4) * 2 })), []);
  const palette = useMemo(() => [LOADER.c1, LOADER.c2, LOADER.success], []);
  const confetti = useMemo(() => !done ? [] : Array.from({ length: 20 }, (_, i) => ({
    left: 50 + (Math.random() * 64 - 32), color: palette[i % 3], delay: Math.random() * 0.18,
    rot: Math.round(Math.random() * 540 - 270), dist: 70 + Math.round(Math.random() * 150),
    dur: 0.8 + Math.random() * 0.7, w: 6 + Math.round(Math.random() * 5), h: 9 + Math.round(Math.random() * 8),
  })), [done, palette]);
  if (!phase) return null;
  return (
    <div className="pfl-overlay" role="status" aria-live="polite" aria-label={done ? "Product saved" : "Saving product"}
      style={{ background: hexToRgba(LOADER.backdrop, 0.55), "--pfl-c1": LOADER.c1, "--pfl-c2": LOADER.c2, "--pfl-success": LOADER.success, "--pfl-text": LOADER.text } as React.CSSProperties}>
      <style>{PFL_CSS}</style>
      {!reduce && <div className="pfl-aurora" aria-hidden="true" />}
      {!reduce && (
        <div className="pfl-particles" aria-hidden="true">
          {particles.map((p, i) => <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, width: p.size, height: p.size }} />)}
        </div>
      )}
      <div className={`pfl-card${done ? " is-done" : ""}`}>
        <div className="pfl-stage">
          <div className="pfl-glow" />
          {!done && <div className="pfl-ring" />}
          {!done && <div className="pfl-ring pfl-ring2" />}
          {!done && !reduce && (
            <div className="pfl-orbit"><span /><span /><span /></div>
          )}
          <div className={`pfl-core${done ? " is-done" : ""}`}>
            {done ? (
              <svg viewBox="0 0 52 52" width={46} height={46}><path className="pfl-check" d="M14 27l8 8 16-18" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4" /><path d="M12 11v10" />
              </svg>
            )}
          </div>
          {done && !reduce && (
            <div className="pfl-confetti">
              {confetti.map((c, i) => (
                <span key={i} style={{ left: `${c.left}%`, background: c.color, width: c.w, height: c.h, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, "--rot": `${c.rot}deg`, "--dist": `${c.dist}px` } as React.CSSProperties} />
              ))}
            </div>
          )}
        </div>
        <div className="pfl-text" key={done ? "done" : msgIndex}>
          {done ? (mode === "edit" ? LOADER.successEdit : LOADER.successCreate) : messages[msgIndex]}
        </div>
        <div className="pfl-sub">{done ? LOADER.successSubtext : LOADER.savingSubtext}</div>
        {!done && <div className="pfl-bar"><span /></div>}
      </div>
    </div>
  );
}

const PFL_CSS = `
.pfl-overlay { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; overflow: hidden; backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px); animation: pfl-fade .25s ease; }
@keyframes pfl-fade { from { opacity: 0; } to { opacity: 1; } }
.pfl-aurora { position: absolute; inset: -35%; background: conic-gradient(from 0deg, var(--pfl-c1), var(--pfl-c2), var(--pfl-success), var(--pfl-c1)); filter: blur(95px); opacity: .30; animation: pfl-aurora 14s linear infinite; }
@keyframes pfl-aurora { to { transform: rotate(360deg); } }
.pfl-particles span { position: absolute; bottom: -12px; border-radius: 50%; background: rgba(255,255,255,.55); animation-name: pfl-float; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes pfl-float { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: .8; } 100% { transform: translateY(-104vh); opacity: 0; } }
.pfl-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 36px 44px; border-radius: 26px; background: rgba(255,255,255,.94); box-shadow: 0 30px 90px rgba(10,12,30,.5); animation: pfl-pop .42s cubic-bezier(.2,.9,.3,1.3); min-width: 300px; max-width: calc(100vw - 32px); font-family: 'Inter Tight', sans-serif; }
@keyframes pfl-pop { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.pfl-stage { position: relative; width: 152px; height: 152px; display: grid; place-items: center; margin-bottom: 10px; }
.pfl-glow { position: absolute; width: 112px; height: 112px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--pfl-c1) 48%, transparent), transparent 70%); animation: pfl-pulse 1.9s ease-in-out infinite; }
.pfl-card.is-done .pfl-glow { background: radial-gradient(circle, color-mix(in srgb, var(--pfl-success) 48%, transparent), transparent 70%); }
@keyframes pfl-pulse { 0%,100% { transform: scale(.9); opacity: .55; } 50% { transform: scale(1.12); opacity: 1; } }
.pfl-ring { position: absolute; width: 152px; height: 152px; border-radius: 50%; background: conic-gradient(from 0deg, transparent 0%, var(--pfl-c1) 55%, var(--pfl-c2) 82%, transparent 100%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 7px)); mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 7px)); animation: pfl-spin 1.2s linear infinite; }
.pfl-ring2 { width: 118px; height: 118px; background: conic-gradient(from 140deg, transparent 0%, var(--pfl-success) 52%, transparent 78%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px)); animation: pfl-spin-rev 1.7s linear infinite; }
@keyframes pfl-spin { to { transform: rotate(360deg); } }
@keyframes pfl-spin-rev { to { transform: rotate(-360deg); } }
.pfl-orbit { position: absolute; width: 152px; height: 152px; animation: pfl-spin 2.6s linear infinite; }
.pfl-orbit span { position: absolute; top: 50%; left: 50%; width: 10px; height: 10px; margin: -5px; border-radius: 50%; }
.pfl-orbit span:nth-child(1) { background: var(--pfl-c1); box-shadow: 0 0 12px var(--pfl-c1); transform: rotate(0deg) translateY(-73px); }
.pfl-orbit span:nth-child(2) { background: var(--pfl-c2); box-shadow: 0 0 12px var(--pfl-c2); transform: rotate(120deg) translateY(-73px); }
.pfl-orbit span:nth-child(3) { background: var(--pfl-success); box-shadow: 0 0 12px var(--pfl-success); transform: rotate(240deg) translateY(-73px); }
.pfl-core { position: relative; z-index: 2; width: 86px; height: 86px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, var(--pfl-c1), var(--pfl-c2)); box-shadow: 0 12px 32px color-mix(in srgb, var(--pfl-c1) 55%, transparent); animation: pfl-breathe 2s ease-in-out infinite; }
@keyframes pfl-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.pfl-core.is-done { background: linear-gradient(135deg, var(--pfl-success), color-mix(in srgb, var(--pfl-success) 65%, #000)); box-shadow: 0 12px 32px color-mix(in srgb, var(--pfl-success) 55%, transparent); animation: pfl-pop .5s cubic-bezier(.2,.9,.3,1.5); }
.pfl-check { stroke-dasharray: 52; stroke-dashoffset: 52; animation: pfl-draw .5s .12s ease forwards; }
@keyframes pfl-draw { to { stroke-dashoffset: 0; } }
.pfl-text { font-size: 15.5px; font-weight: 700; color: var(--pfl-text); letter-spacing: -.2px; animation: pfl-msg .35s ease; }
@keyframes pfl-msg { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.pfl-sub { font-size: 12px; color: #6b7280; margin-top: 1px; }
.pfl-bar { margin-top: 14px; width: 210px; height: 5px; border-radius: 999px; background: #ececf2; overflow: hidden; position: relative; }
.pfl-bar span { position: absolute; left: -40%; width: 40%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--pfl-c1), var(--pfl-c2)); animation: pfl-barslide 1.1s ease-in-out infinite; }
@keyframes pfl-barslide { to { left: 100%; } }
.pfl-confetti { position: absolute; inset: 0; pointer-events: none; }
.pfl-confetti span { position: absolute; top: 44%; border-radius: 2px; transform: translate(-50%, 0); animation-name: pfl-confetti; animation-timing-function: ease-out; animation-fill-mode: forwards; }
@keyframes pfl-confetti { 0% { transform: translate(-50%, 0) rotate(0); opacity: 1; } 100% { transform: translate(-50%, var(--dist)) rotate(var(--rot)); opacity: 0; } }
`;

/* ───────────────────────────── main page CSS ───────────────────────────── */

const PF_CSS = `
.pf-root, .pf-root * { box-sizing: border-box; }
.pf-root { display: flex; flex-direction: column; gap: 16px; max-width: 1540px; margin: 0 auto; font-family: ${T.font}; color: #111; }
.pf-header { position: sticky; top: 0; z-index: 25; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: ${T.bg}; padding: 8px 0 12px; border-bottom: 1px solid rgba(17,24,39,.06); }
.pf-breadcrumb { font-size: 12px; color: #667085; margin-bottom: 2px; }
.pf-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -.4px; }
.pf-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.pf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 16px; border-radius: 9px; border: 1px solid rgba(0,0,0,.1); background: #fff; color: #111; font-size: 13px; font-weight: 600; font-family: ${T.font}; cursor: pointer; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,.04); white-space: nowrap; }
.pf-btn:active { transform: scale(.975); }
.pf-btn:focus-visible { outline: none; box-shadow: 0 0 0 3.5px rgba(0,0,0,.18); }
.pf-btn.primary { background: #050505; color: #fff; border-color: #050505; }
.pf-btn.primary:hover { background: #1a1a1a; }
.pf-btn.danger { color: #ff3b30; border-color: rgba(255,59,48,.3); }
.pf-btn.danger:hover { background: rgba(255,59,48,.06); }
.pf-btn:disabled { opacity: .5; cursor: default; }
.pf-btn-sm { height: 32px; padding: 0 12px; font-size: 12px; gap: 5px; }
.pf-layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 18px; align-items: start; }
.pf-side { position: sticky; top: 78px; display: flex; flex-direction: column; gap: 14px; }
.pf-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pf-card { background: #fff; border: 1px solid ${T.border}; border-radius: 8px; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.pf-card-head h2 { font-size: 14px; font-weight: 700; margin: 0; }
.pf-card-head p { font-size: 12px; color: ${T.textSub}; margin: 4px 0 0; }
.pf-details { border-radius: 12px; gap: 0; }
.pf-details-summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; font-family: ${T.font}; color: #111; }
.pf-details-summary strong { font-size: 13.5px; font-weight: 700; display: block; }
.pf-details-summary small { font-size: 11.5px; color: ${T.textSub}; display: block; margin-top: 2px; }
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-grid.three, .pf-grid.pricing { grid-template-columns: 1fr 1fr 1fr; }
.pf-grid.essentials { grid-template-columns: 1fr 1fr; align-items: start; }
.pf-span-full { grid-column: 1 / -1; }
.pf-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pf-field > span { font-size: 12px; font-weight: 600; color: #374151; }
.pf-field > span b { color: ${T.red}; }
.pf-field > em { font-style: normal; font-size: 11px; color: ${T.red}; }
.pf-field.is-error .pf-input { border-color: ${T.red}; }
.pf-input { height: 40px; border: 1px solid ${T.borderMid}; border-radius: 10px; padding: 0 13px; font-size: 13px; font-family: ${T.font}; color: #111; background: #fff; outline: none; width: 100%; }
.pf-input::placeholder { color: #98a2b3; }
.pf-input:hover { border-color: #c9c9c2; }
.pf-input:focus { border-color: #c8d3e1; box-shadow: 0 0 0 4px rgba(17,24,39,.04); }
.pf-textarea { min-height: 72px; padding: 10px 13px; resize: vertical; height: auto; }
.pf-alert { border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 10px; padding: 13px 16px; font-size: 12.5px; }
.pf-alert strong { display: block; font-size: 13px; margin-bottom: 4px; }
.pf-alert ul { margin: 6px 0 0; padding-left: 18px; }
.pf-alert li { margin: 2px 0; }
.pf-toggle { display: inline-flex; align-items: center; gap: 10px; background: none; border: 0; padding: 0; cursor: pointer; font-family: ${T.font}; }
.pf-toggle strong { font-size: 12.5px; font-weight: 600; color: #111; }
.pf-toggle-pill { width: 48px; height: 26px; border-radius: 999px; background: #d9d9d6; position: relative; transition: background .2s ease; flex-shrink: 0; display: block; }
.pf-toggle.active .pf-toggle-pill { background: #111; }
.pf-toggle-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s ease; display: block; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.pf-toggle.active .pf-toggle-knob { transform: translateX(22px); }
.pf-product-type-row { position: relative; display: grid; grid-template-columns: 1fr 1fr; width: min(100%, 320px); background: rgba(120,120,128,.16); border-radius: 9px; padding: 2px; }
.pf-product-type-row::before { content: ""; position: absolute; top: 2px; bottom: 2px; left: 2px; width: calc(50% - 2px); background: #fff; border-radius: 7px; box-shadow: 0 1px 3px rgba(0,0,0,.12); transition: transform .22s cubic-bezier(.4,0,.2,1); }
.pf-product-type-row[data-active="1"]::before { transform: translateX(100%); }
.pf-product-type-option { position: relative; z-index: 1; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #111; opacity: .6; cursor: pointer; border: 0; background: none; font-family: ${T.font}; }
.pf-product-type-option.active { opacity: 1; }
.pf-variant-summary { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
.pf-variant-metrics { display: flex; gap: 8px; flex-wrap: wrap; }
.pf-variant-metrics span { background: #fafaf8; border: 1px solid ${T.border}; border-radius: 999px; padding: 4px 11px; font-size: 12px; font-weight: 600; color: #374151; }
.pf-variation-row { display: grid; grid-template-columns: 260px 1fr 34px; gap: 10px; align-items: start; }
.pf-row-delete { width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(255,59,48,.3); background: #fff; color: #ff3b30; display: grid; place-items: center; cursor: pointer; margin-top: 3px; }
.pf-row-delete:hover { background: rgba(255,59,48,.06); }
.pf-table-wrap { border: 1px solid ${T.border}; border-radius: 12px; overflow: auto; max-height: calc(100vh - 390px); min-height: 320px; }
.pf-vtable { width: 100%; min-width: 1180px; border-collapse: collapse; font-size: 12.5px; }
.pf-vtable th { position: sticky; top: 0; z-index: 2; background: #faf9f6; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: rgba(84,84,84,.7); padding: 10px 10px; border-bottom: 1px solid ${T.border}; white-space: nowrap; }
.pf-vtable td { padding: 8px 10px; border-bottom: 1px solid ${T.border}; vertical-align: middle; background: #fff; }
.pf-vtable tr.pf-dragging td { opacity: .55; }
.pf-table-input { height: 34px; border: 1px solid ${T.borderMid}; border-radius: 8px; padding: 0 10px; font-size: 12px; font-family: ${T.font}; width: 100%; min-width: 64px; outline: none; }
.pf-table-input:focus { border-color: #c8d3e1; box-shadow: 0 0 0 3px rgba(17,24,39,.04); }
.pf-drag-handle { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; color: #98a2b3; cursor: grab; font-weight: 700; letter-spacing: 1px; }
.pf-variant-media { position: relative; width: 50px; height: 72px; border: 1.5px dashed #d2d2d7; border-radius: 8px; background: #fafafa; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; font-size: 10px; color: #667085; overflow: hidden; padding: 0; }
.pf-variant-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pf-variant-media .pf-vm-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(17,17,17,.65); color: #fff; font-size: 9px; padding: 2px 0; text-align: center; }
.pf-variant-media em { position: absolute; top: -6px; right: -6px; background: #111; color: #fff; font-style: normal; font-size: 9.5px; font-weight: 700; border-radius: 999px; min-width: 17px; height: 17px; display: grid; place-items: center; padding: 0 4px; }
.pf-copy-wrap { position: relative; }
.pf-copy-menu { position: absolute; right: 0; top: calc(100% + 8px); width: 210px; background: #fff; border: 1px solid ${T.border}; border-radius: 10px; box-shadow: 0 10px 32px rgba(0,0,0,.12); padding: 6px; z-index: 30; }
.pf-copy-menu strong { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #98a2b3; padding: 6px 8px 4px; }
.pf-copy-menu button { display: block; width: 100%; text-align: left; background: none; border: 0; border-radius: 7px; padding: 7px 8px; font-size: 12.5px; font-family: ${T.font}; cursor: pointer; color: #111; }
.pf-copy-menu button:hover { background: #f2f2f7; }
.pf-dropzone { position: relative; display: flex; align-items: center; justify-content: center; border: 1.5px dashed #d2d2d7; border-radius: 12px; background: #fafafa; cursor: pointer; overflow: hidden; width: 100%; }
.pf-dropzone img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pf-dropzone-caption { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; background: rgba(17,17,17,.6); color: #fff; font-size: 11.5px; padding: 5px 0; }
.pf-dropzone-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #999; font-size: 12.5px; }
.pf-imagepicker { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.pf-gallerypicker { display: flex; flex-direction: column; gap: 10px; }
.pf-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); gap: 8px; }
.pf-gallery-grid.variant { grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); }
.pf-gallery-item { position: relative; height: 74px; border-radius: 8px; overflow: hidden; border: 1px solid ${T.border}; background: #fafafa; }
.pf-gallery-grid.variant .pf-gallery-item { height: 86px; }
.pf-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.pf-gallery-x { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: rgba(17,17,17,.7); color: #fff; border: 0; display: grid; place-items: center; cursor: pointer; }
.pf-section-label { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 8px; }
.pf-checklist { display: flex; flex-wrap: wrap; gap: 7px; }
.pf-checklist.vertical { flex-direction: column; }
.pf-check-pill { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #cbd5e1; border-radius: 999px; padding: 6px 11px; font-size: 12px; font-weight: 600; color: #475569; background: #fff; }
.pf-check-pill i { width: 13px; height: 13px; border: 1.5px solid #cbd5e1; border-radius: 50%; display: inline-block; }
.pf-check-pill.done { border-color: #bbf7d0; background: #f0fdf4; color: #166534; }
.pf-check-pill em { font-style: normal; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #98a2b3; }
.pf-rich { border: 1px solid ${T.borderMid}; border-radius: 10px; overflow: hidden; background: #fff; }
.pf-rich:focus-within { border-color: #c8d3e1; box-shadow: 0 0 0 4px rgba(17,24,39,.04); }
.pf-rich-toolbar { display: flex; flex-wrap: wrap; gap: 2px; align-items: center; border-bottom: 1px solid ${T.border}; padding: 6px 8px; background: #fafaf8; }
.pf-rich-btn { border: 0; background: none; border-radius: 6px; padding: 5px 9px; font-size: 12px; font-weight: 600; font-family: ${T.font}; color: #374151; cursor: pointer; }
.pf-rich-btn:hover { background: #ececf0; }
.pf-rich-btn.active { background: #111; color: #fff; }
.pf-rich-divider { width: 1px; height: 18px; background: ${T.border}; margin: 0 5px; }
.pf-rich-content { min-height: 110px; }
.pf-rich-content .ProseMirror { min-height: 110px; padding: 10px 13px; font-size: 13px; line-height: 1.6; outline: none; font-family: ${T.font}; }
.pf-rich-content .ProseMirror p { margin: 0 0 8px; }
.pf-rich-content .ProseMirror h2, .pf-rich-content .ProseMirror h3, .pf-rich-content .ProseMirror h4 { margin: 10px 0 6px; }
.pf-rich-content .ProseMirror blockquote { border-left: 3px solid ${T.borderMid}; margin: 8px 0; padding-left: 12px; color: ${T.textSub}; }
.pf-rich-content .ProseMirror code { background: #f2f2f7; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
.pf-rich-content .ProseMirror a { color: #2563eb; }
.pf-loading-card { padding: 40px; text-align: center; color: ${T.textSub}; font-size: 13px; }
@media (max-width: 1100px) {
  .pf-layout { grid-template-columns: 1fr; }
  .pf-side { position: static; }
  .pf-grid, .pf-grid.three, .pf-grid.pricing { grid-template-columns: 1fr; }
  .pf-grid.essentials { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 760px) {
  .pf-header { position: static; flex-direction: column; align-items: stretch; }
  .pf-actions .pf-btn { flex: 1; }
  .pf-card { padding: 16px; }
  .pf-grid.essentials { grid-template-columns: 1fr; }
  .pf-product-type-row { width: 100%; }
  .pf-variation-row { grid-template-columns: 1fr 34px; }
  .pf-variation-row > :first-child { grid-column: 1 / -1; }
  .pf-variant-summary { grid-template-columns: 1fr; }
  .pf-variant-summary .pf-btn { width: 100%; }
}
`;

/* ─────────────────────────────── main page ─────────────────────────────── */

const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl", "5xl"];

export default function ProductFormPage() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const mode: "create" | "edit" = params.id ? "edit" : "create";
  const backUrl = "/admin/products";
  const dataUrl = `${API_BASE}/admin/products/form${params.id ? `/${params.id}` : ""}`;
  const saveUrl = dataUrl;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [options, setOptions] = useState<{ brands: OptionItem[]; categories: OptionItem[]; subCategories: OptionItem[]; subSubCategories: OptionItem[]; tags: OptionItem[]; variantAttributes: VariantAttribute[] }>({ brands: [], categories: [], subCategories: [], subSubCategories: [], tags: [], variantAttributes: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savePhase, setSavePhase] = useState<null | "saving" | "success">(null);
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [errors, setErrors] = useState<Errors>({});
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [removeMainImage, setRemoveMainImage] = useState(false);
  const [galleryUploads, setGalleryUploads] = useState<File[]>([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState<number[]>([]);
  const [variantImages, setVariantImages] = useState<Record<string, File | null>>({});
  const [variantGallery, setVariantGallery] = useState<Record<string, File[]>>({});
  const [openVariantMediaKey, setOpenVariantMediaKey] = useState<string | null>(null);
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [dragRowKey, setDragRowKey] = useState<string | null>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  /* load */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(dataUrl, { headers: { Accept: "application/json", ...authHeaders() } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load product form.");
        return r.json();
      })
      .then((payload) => {
        if (!alive) return;
        setForm({ ...emptyForm, ...(payload.data || {}) });
        setOptions((o) => ({ ...o, ...(payload.options || {}) }));
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setErrors({ form: [e.message || "Failed to load product form."] });
        setLoading(false);
      });
    return () => { alive = false; };
  }, [dataUrl]);

  /* copy menu outside click */
  useEffect(() => {
    if (!copyMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) setCopyMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [copyMenuOpen]);

  const clearError = useCallback((keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    setErrors((prev) => {
      if (!list.some((k) => k in prev)) return prev;
      const next = { ...prev };
      list.forEach((k) => delete next[k]);
      return next;
    });
  }, []);
  const setValue = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    clearError(key as string);
    setForm((f) => ({ ...f, [key]: value }));
  }, [clearError]);
  const patchRow = (index: number, patch: Partial<VariantRow>) =>
    setForm((f) => ({ ...f, variantTableRows: f.variantTableRows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));

  /* dependent categories */
  const fetchDependent = useCallback(async (endpoint: string, param: string, values: number[]): Promise<OptionItem[]> => {
    try {
      const url = new URL(endpoint, window.location.origin);
      values.forEach((v) => url.searchParams.append(`${param}[]`, String(v)));
      const r = await fetch(url.toString(), { headers: { Accept: "application/json", ...authHeaders() } });
      if (!r.ok) throw new Error();
      const payload = await r.json();
      return payload.data || [];
    } catch {
      setErrors((prev) => ({ ...prev, form: ["Could not load dependent categories. Check your connection and try again."] }));
      return [];
    }
  }, []);

  const onCategoriesChange = async (ids: number[]) => {
    clearError(["selectedCategories", "selectedSubCategories", "selectedSubSubCategories"]);
    setForm((f) => ({ ...f, selectedCategories: ids }));
    const subs = await fetchDependent(`${API_BASE}/admin/products/subcategories`, "category_ids", ids);
    setOptions((o) => ({ ...o, subCategories: subs }));
    const keptSubs = form.selectedSubCategories.filter((id) => subs.some((s) => Number(s.value) === id));
    setForm((f) => ({ ...f, selectedSubCategories: keptSubs }));
    const subSubs = await fetchDependent(`${API_BASE}/admin/products/sub-subcategories`, "sub_category_ids", keptSubs);
    setOptions((o) => ({ ...o, subSubCategories: subSubs }));
    setForm((f) => ({ ...f, selectedSubSubCategories: f.selectedSubSubCategories.filter((id) => subSubs.some((s) => Number(s.value) === id)) }));
  };
  const onSubCategoriesChange = async (ids: number[]) => {
    clearError(["selectedSubCategories", "selectedSubSubCategories"]);
    setForm((f) => ({ ...f, selectedSubCategories: ids }));
    const subSubs = await fetchDependent(`${API_BASE}/admin/products/sub-subcategories`, "sub_category_ids", ids);
    setOptions((o) => ({ ...o, subSubCategories: subSubs }));
    setForm((f) => ({ ...f, selectedSubSubCategories: f.selectedSubSubCategories.filter((id) => subSubs.some((s) => Number(s.value) === id)) }));
  };

  /* variations */
  const valueName = (slug: string, valueId: number) => {
    const attr = options.variantAttributes.find((a) => a.slug === slug);
    return attr?.values.find((v) => v.id === valueId)?.name || "";
  };

  const regenerateRows = (variations: FormState["multipleVariations"], base?: FormState) => {
    const f = base || form;
    const active = variations.filter((v) => v.attribute_slug && v.selected_values.length > 0);
    if (!active.length) {
      setForm((prev) => ({ ...prev, multipleVariations: variations, variantTableRows: [] }));
      return;
    }
    const groups = active.map((v) => v.selected_values.map((id) => ({ attribute_slug: v.attribute_slug, value_id: Number(id) })));
    const combos = cartesian(groups);
    const prevByKey: Record<string, VariantRow> = {};
    f.variantTableRows.forEach((r) => { prevByKey[r.row_key] = r; });
    const rows: VariantRow[] = combos.map((combo, index) => {
      const key = rowKeyFor(combo);
      const prev = prevByKey[key];
      return {
        row_key: key,
        display_name: combo.map((c) => valueName(c.attribute_slug, c.value_id)).join(" / "),
        combination: combo,
        sku: prev?.sku ?? "",
        barcode: prev?.barcode ?? "",
        price: prev?.price ?? f.price ?? "",
        compare_at_price: prev?.compare_at_price ?? "",
        cost_price: prev?.cost_price ?? f.cost_price ?? "",
        discount_amount: prev?.discount_amount ?? "",
        discount_type: prev?.discount_type ?? "",
        stock_quantity: prev?.stock_quantity ?? 0,
        is_visible: prev?.is_visible ?? true,
        image_path: prev?.image_path || prev?.main_image_path || null,
        main_image_path: prev?.image_path || prev?.main_image_path || null,
        image_url: prev?.image_url || null,
        gallery_paths: prev?.gallery_paths || [],
        sort_order: index,
      };
    });
    setForm((prev) => ({ ...prev, multipleVariations: variations, variantTableRows: rows }));
  };

  const enableVariations = () => {
    setForm((f) => {
      const next = { ...f, hasVariations: true, compare_at_price: "" as const };
      if (!next.multipleVariations.length) {
        next.multipleVariations = [{ id: "var_" + Date.now(), attribute_slug: "", selected_values: [] }];
      }
      return next;
    });
    setVariantDrawerOpen(true);
  };
  const disableVariations = () => {
    setForm((f) => ({ ...f, hasVariations: false, variantTableRows: [], multipleVariations: [] }));
    setVariantImages({});
    setVariantGallery({});
    setVariantDrawerOpen(false);
  };

  const deleteRow = (index: number) => {
    const row = form.variantTableRows[index];
    setForm((f) => ({
      ...f,
      variantTableRows: f.variantTableRows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sort_order: i })),
    }));
    if (row) {
      setVariantImages((m) => { const n = { ...m }; delete n[row.row_key]; return n; });
      setVariantGallery((m) => { const n = { ...m }; delete n[row.row_key]; return n; });
      if (openVariantMediaKey === row.row_key) setOpenVariantMediaKey(null);
    }
  };

  const sizeInPlay = form.multipleVariations.some((v) => {
    if (!v.attribute_slug) return false;
    const attr = options.variantAttributes.find((a) => a.slug === v.attribute_slug);
    return /size/i.test(v.attribute_slug) || /size/i.test(attr?.name || "");
  });
  const sortSizes = () => {
    const keyOf = (row: VariantRow): [number, number, string] => {
      const tokens = row.display_name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      for (const t of tokens) {
        const idx = SIZE_ORDER.indexOf(t);
        if (idx !== -1) return [0, idx, row.display_name];
      }
      for (const t of tokens) {
        if (/^\d+(\.\d+)?$/.test(t)) return [1, parseFloat(t), row.display_name];
      }
      return [2, 0, row.display_name];
    };
    setForm((f) => ({
      ...f,
      variantTableRows: [...f.variantTableRows]
        .sort((a, b) => {
          const ka = keyOf(a), kb = keyOf(b);
          if (ka[0] !== kb[0]) return ka[0] - kb[0];
          if (ka[1] !== kb[1]) return ka[1] - kb[1];
          return ka[2].localeCompare(kb[2]);
        })
        .map((r, i) => ({ ...r, sort_order: i })),
    }));
  };

  const onDropRow = (targetKey: string) => {
    if (!dragRowKey || dragRowKey === targetKey) { setDragRowKey(null); return; }
    setForm((f) => {
      const rows = [...f.variantTableRows];
      const from = rows.findIndex((r) => r.row_key === dragRowKey);
      const to = rows.findIndex((r) => r.row_key === targetKey);
      if (from === -1 || to === -1) return f;
      const [moved] = rows.splice(from, 1);
      rows.splice(to, 0, moved);
      return { ...f, variantTableRows: rows.map((r, i) => ({ ...r, sort_order: i })) };
    });
    setDragRowKey(null);
  };

  /* readiness */
  const hasMainImage =
    !!mainImage ||
    (!removeMainImage && !!form.main_image_url) ||
    (form.hasVariations && (form.variantTableRows.some((r) => r.image_path || r.main_image_path || r.image_url) || Object.values(variantImages).some(Boolean)));

  /* save */
  const submit = async () => {
    setSaving(true);
    setSavePhase("saving");
    setErrors({});
    const fail = (nextErrors: Errors) => {
      setErrors(nextErrors);
      setSaving(false);
      setSavePhase(null);
      if (Object.keys(nextErrors).some((k) => k.startsWith("variantTableRows"))) setVariantDrawerOpen(true);
      setTimeout(() => {
        const key = firstErrorKey(nextErrors);
        const el = (key && document.querySelector(`[data-error-key="${key}"]`)) || document.querySelector(".pf-alert");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el.querySelector("input, textarea, select, [role='combobox'], button") as HTMLElement | null)?.focus?.({ preventScroll: true });
        }
      }, 80);
    };
    try {
      const fd = new FormData();
      fd.append("payload", JSON.stringify({ ...form, removedGalleryIds }));
      if (mainImage) fd.append("mainImage", mainImage);
      if (removeMainImage) fd.append("removeMainImage", "1");
      galleryUploads.forEach((f) => fd.append("galleryUploads[]", f));
      Object.entries(variantImages).forEach(([key, f]) => { if (f) fd.append(`variantImages[${key}]`, f); });
      Object.entries(variantGallery).forEach(([key, files]) => files.forEach((f) => fd.append(`variantGallery[${key}][]`, f)));

      let res: Response;
      try {
        res = await fetch(saveUrl, { method: "POST", headers: { Accept: "application/json", ...authHeaders() }, body: fd });
      } catch {
        fail({ form: ["Network error — could not reach the server. Check your connection and try again."] });
        return;
      }
      let payload: any = {};
      try { payload = await res.json(); } catch { /* tolerate */ }
      if (!res.ok) {
        if (payload.errors) { fail(payload.errors); return; }
        const hadFiles = !!mainImage || galleryUploads.length > 0 || Object.values(variantImages).some(Boolean) || Object.values(variantGallery).some((l) => l.length);
        if (res.status === 413 || (hadFiles && !payload.message)) {
          fail({ form: ["Upload failed — your images may exceed the server upload limit (10 MB each). Try smaller files."] });
          return;
        }
        fail({ form: [payload.message || "Unable to save product. Please try again."] });
        return;
      }
      setSavePhase("success");
      window.setTimeout(() => { navigate(payload.redirect_url || backUrl); }, 1300);
    } catch {
      fail({ form: ["Unable to save product. Please try again."] });
    }
  };

  /* derived */
  const selectedCategoryOptions = toSelectValue(form.selectedCategories, options.categories);
  const selectedSubOptions = toSelectValue(form.selectedSubCategories, options.subCategories);
  const selectedSubSubOptions = toSelectValue(form.selectedSubSubCategories, options.subSubCategories);
  const selectedTagOptions = toSelectValue(form.selectedTags, options.tags);
  const selectedBrandOption = options.brands.find((b) => Number(b.value) === Number(form.brand_id)) || null;
  const typeCount = form.multipleVariations.filter((v) => v.attribute_slug).length;
  const fieldErr = (key: string) => errorMessage(errors, key);
  const hasFieldErrors = errorEntries(errors).length > 0;
  const formError = errors.form ? (Array.isArray(errors.form) ? errors.form.join(" ") : errors.form) : null;

  const openMediaRow = form.variantTableRows.find((r) => r.row_key === openVariantMediaKey) || null;

  /* media card content (shared) */
  const productMediaControls = (
    <>
      <ImagePicker
        label="Upload product main image"
        file={mainImage}
        currentUrl={removeMainImage ? null : form.main_image_url}
        onPick={(f) => { setMainImage(f); setRemoveMainImage(false); }}
        onRemove={() => { setMainImage(null); setRemoveMainImage(true); }}
      />
      <GalleryPicker
        files={galleryUploads}
        existing={form.gallery}
        removedIds={removedGalleryIds}
        onFiles={(list) => setGalleryUploads((g) => [...g, ...list])}
        onRemoveFile={(i) => setGalleryUploads((g) => g.filter((_, x) => x !== i))}
        onRemoveExisting={(id) => setRemovedGalleryIds((ids) => [...ids, id])}
      />
    </>
  );

  const descriptionsCard = (
    <Card title="Descriptions">
      <div className="pf-grid">
        <Field label="Short description (English)" error={fieldErr("short_description_en")} errorKey="short_description_en">
          <TextArea rows={3} placeholder="Short description" value={form.short_description_en} onChange={(e) => setValue("short_description_en", e.target.value)} />
        </Field>
        <Field label="Short description (Arabic)" error={fieldErr("short_description_ar")} errorKey="short_description_ar">
          <TextArea rows={3} dir="rtl" placeholder="وصف قصير بالعربية" value={form.short_description_ar} onChange={(e) => setValue("short_description_ar", e.target.value)} />
        </Field>
      </div>
      <div className="pf-grid">
        <Field label="Description (English)" error={fieldErr("description_en")} errorKey="description_en">
          <RichTextEditor value={form.description_en} onChange={(html) => setValue("description_en", html)} />
        </Field>
        <Field label="Description (Arabic)" error={fieldErr("description_ar")} errorKey="description_ar">
          <RichTextEditor value={form.description_ar} onChange={(html) => setValue("description_ar", html)} dir="rtl" />
        </Field>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="pf-root">
        <style>{PF_CSS}</style>
        <Card title="Loading product"><div className="pf-loading-card">Loading…</div></Card>
      </div>
    );
  }

  if (!options.categories.length) {
    return (
      <div className="pf-root">
        <style>{PF_CSS}</style>
        <Card title="Categories required" description="Products need at least one active category before they can be created.">
          <button type="button" className="pf-btn primary" style={{ alignSelf: "flex-start" }} onClick={() => navigate("/admin/categories")}>Manage categories</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="pf-root">
      <style>{PF_CSS}</style>
      <ProductSaveLoader phase={savePhase} mode={mode} />

      {/* HEADER */}
      <div className="pf-header">
        <div>
          <div className="pf-breadcrumb">Admin / Products / {mode === "edit" ? "Edit" : "Create"}</div>
          <h1 className="pf-title">{mode === "edit" ? "Edit Product" : "Create Product"}</h1>
        </div>
        <div className="pf-actions">
          <button type="button" className="pf-btn" onClick={() => navigate(backUrl)}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(90deg)" }} /> Back to Products
          </button>
          <button type="button" className="pf-btn primary" disabled={saving} onClick={submit}>
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 12.5 5 5 10-11" /></svg>
            {saving ? "Saving..." : mode === "edit" ? "Update Product" : "Create Product"}
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {(formError || hasFieldErrors) && (
        <div className="pf-alert" role="alert">
          <strong>{hasFieldErrors ? "Review required fields" : "Unable to save product"}</strong>
          {formError && <div>{formError}</div>}
          {hasFieldErrors && (
            <ul>
              {errorEntries(errors).map((e) => <li key={e.key}>{e.label}: {e.message}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="pf-layout">
        <main className="pf-main">
          {/* PRODUCT DETAILS */}
          <Card title="Product details">
            <div className="pf-grid essentials">
              <Field label="Name (English)" required error={fieldErr("name_en")} errorKey="name_en">
                <Input placeholder="Celestial Pearl Necklace" value={form.name_en} onChange={(e) => {
                  clearError("name_en");
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name_en: name, slug: slugEdited ? f.slug : slugify(name) }));
                }} />
              </Field>
              <Field label="Name (Arabic)" required error={fieldErr("name_ar")} errorKey="name_ar">
                <Input dir="rtl" placeholder="اسم المنتج بالعربية" value={form.name_ar} onChange={(e) => setValue("name_ar", e.target.value)} />
              </Field>
            </div>
            <div className="pf-grid">
              <Field label="Brand" errorKey="brand_id">
                <Select styles={selectStyles} isClearable placeholder="Select brand" options={options.brands}
                  value={selectedBrandOption}
                  onChange={(item: any) => setValue("brand_id", item ? Number(item.value) : null)}
                  menuPortalTarget={document.body} menuPosition="fixed" />
              </Field>
              <Field label="Category" required error={fieldErr("selectedCategories")} errorKey="selectedCategories">
                <Select styles={selectStyles} isMulti closeMenuOnSelect={false} placeholder="Select categories..."
                  options={options.categories} value={selectedCategoryOptions}
                  noOptionsMessage={({ inputValue }) => inputValue ? `No active category found for "${inputValue}"` : "No active categories"}
                  onChange={(items: any) => onCategoriesChange((items || []).map((i: any) => Number(i.value)))}
                  menuPortalTarget={document.body} menuPosition="fixed" />
              </Field>
            </div>
            <div className="pf-grid">
              <Field label="Sub category" error={fieldErr("selectedSubCategories")} errorKey="selectedSubCategories">
                <Select styles={selectStyles} isMulti closeMenuOnSelect={false}
                  isDisabled={!form.selectedCategories.length}
                  placeholder={form.selectedCategories.length ? "Select sub categories..." : "Select category first"}
                  noOptionsMessage={() => form.selectedCategories.length ? "No active sub categories for the selected category" : "Select a category first"}
                  options={options.subCategories} value={selectedSubOptions}
                  onChange={(items: any) => onSubCategoriesChange((items || []).map((i: any) => Number(i.value)))}
                  menuPortalTarget={document.body} menuPosition="fixed" />
              </Field>
              <Field label="Sub category level 2" error={fieldErr("selectedSubSubCategories")} errorKey="selectedSubSubCategories">
                <Select styles={selectStyles} isMulti closeMenuOnSelect={false}
                  isDisabled={!form.selectedSubCategories.length}
                  placeholder={form.selectedSubCategories.length ? "Select sub-sub categories..." : "Select sub category first"}
                  noOptionsMessage={() => form.selectedSubCategories.length ? "No active sub-sub categories for the selected sub category" : "Select a sub category first"}
                  options={options.subSubCategories} value={selectedSubSubOptions}
                  onChange={(items: any) => setValue("selectedSubSubCategories", (items || []).map((i: any) => Number(i.value)))}
                  menuPortalTarget={document.body} menuPosition="fixed" />
              </Field>
            </div>
            <div className="pf-grid pricing">
              <Field label={form.hasVariations ? "Base price" : "Price"} required={!form.hasVariations} error={fieldErr("price")} errorKey="price">
                <Input type="number" step="0.01" placeholder="0.00" value={String(form.price)} onChange={(e) => setValue("price", e.target.value)} />
              </Field>
              {!form.hasVariations && (
                <Field label="Compare at price" error={fieldErr("compare_at_price")} errorKey="compare_at_price">
                  <Input type="number" step="0.01" placeholder="0.00" value={String(form.compare_at_price)} onChange={(e) => setValue("compare_at_price", e.target.value)} />
                </Field>
              )}
              <Field label="Cost per item" error={fieldErr("cost_price")} errorKey="cost_price">
                <Input type="number" step="0.01" placeholder="0.00" value={String(form.cost_price)} onChange={(e) => setValue("cost_price", e.target.value)} />
              </Field>
            </div>
            <div className="pf-span-full">
              <div className="pf-field"><span>Product type</span></div>
              <div className="pf-product-type-row" role="radiogroup" aria-label="Product type" data-active={form.hasVariations ? "0" : "1"}>
                <button type="button" role="radio" aria-checked={form.hasVariations} className={`pf-product-type-option${form.hasVariations ? " active" : ""}`} onClick={enableVariations}>
                  Has variations
                </button>
                <button type="button" role="radio" aria-checked={!form.hasVariations} className={`pf-product-type-option${!form.hasVariations ? " active" : ""}`} onClick={disableVariations}>
                  Single product
                </button>
              </div>
            </div>
          </Card>

          {/* VARIANTS (variation products) */}
          {form.hasVariations && (
            <Card title="Variants" description="Define variation types and manage every combination's pricing, stock and media.">
              <div className="pf-variant-summary">
                <div className="pf-variant-metrics">
                  <span>{typeCount} {typeCount === 1 ? "type" : "types"}</span>
                  <span>{form.variantTableRows.length} {form.variantTableRows.length === 1 ? "row" : "rows"}</span>
                </div>
                <button type="button" className="pf-btn primary" onClick={() => setVariantDrawerOpen(true)}>Configure variants</button>
              </div>
            </Card>
          )}

          {/* DESCRIPTIONS + MEDIA */}
          {form.hasVariations ? (
            <>
              {descriptionsCard}
              <Card title="Product media" description="Optional image shown before variant images on storefront product cards and product pages.">
                {productMediaControls}
              </Card>
            </>
          ) : (
            <>
              {descriptionsCard}
              <Card title="Product media and inventory">
                {productMediaControls}
                <div className="pf-grid three">
                  <Field label="SKU" error={fieldErr("sku")} errorKey="sku">
                    <Input value={form.sku} onChange={(e) => setValue("sku", e.target.value)} />
                  </Field>
                  <Field label="Barcode" error={fieldErr("barcode")} errorKey="barcode">
                    <Input value={form.barcode} onChange={(e) => setValue("barcode", e.target.value)} />
                  </Field>
                  <Field label="Stock quantity" error={fieldErr("stock_quantity")} errorKey="stock_quantity">
                    <Input type="number" value={String(form.stock_quantity)} onChange={(e) => setValue("stock_quantity", e.target.value)} />
                  </Field>
                </div>
                <div className="pf-grid">
                  <Field label="Discount amount" error={fieldErr("discount_amount")} errorKey="discount_amount">
                    <Input type="number" step="0.01" value={String(form.discount_amount)} onChange={(e) => setValue("discount_amount", e.target.value)} />
                  </Field>
                  <Field label="Discount type" error={fieldErr("discount_type")} errorKey="discount_type">
                    <select className="pf-input" value={form.discount_type} onChange={(e) => setValue("discount_type", e.target.value)}>
                      <option value="">None</option>
                      <option value="fixed">Fixed amount</option>
                      <option value="percent">Percentage</option>
                    </select>
                  </Field>
                </div>
              </Card>
            </>
          )}

          {/* STOREFRONT CONTENT (The A Line extras) */}
          <DetailsCard title="Storefront content" description="Accordion copy, badge and image panel used by The A Line product page.">
            <div className="pf-grid">
              <Field label="Details"><TextArea rows={2} value={form.details} onChange={(e) => setValue("details", e.target.value)} /></Field>
              <Field label="Materials"><TextArea rows={2} value={form.materials} onChange={(e) => setValue("materials", e.target.value)} /></Field>
              <Field label="Care"><TextArea rows={2} value={form.care} onChange={(e) => setValue("care", e.target.value)} /></Field>
              <Field label="Fit"><TextArea rows={2} value={form.fit} onChange={(e) => setValue("fit", e.target.value)} /></Field>
              <Field label="Dimensions"><Input value={form.dimensions} onChange={(e) => setValue("dimensions", e.target.value)} /></Field>
              <Field label="Weight"><Input value={form.weight} onChange={(e) => setValue("weight", e.target.value)} /></Field>
              <Field label="Badge">
                <select className="pf-input" value={form.badge} onChange={(e) => setValue("badge", e.target.value)}>
                  <option value="">None</option>
                  <option value="New">New</option>
                  <option value="Bestseller">Bestseller</option>
                  <option value="Limited">Limited</option>
                </select>
              </Field>
              <Field label="Panel color">
                <input type="color" value={form.panel} onChange={(e) => setValue("panel", e.target.value)} style={{ width: 48, height: 40, border: `1px solid ${T.borderMid}`, borderRadius: 10, padding: 3, background: "#fff", cursor: "pointer" }} />
              </Field>
            </div>
          </DetailsCard>
        </main>

        {/* SIDEBAR */}
        <aside className="pf-side">
          <Card title="Publish">
            <ProductReadiness form={form} hasMainImage={hasMainImage} layout="vertical" />
            <div style={{ height: 1, background: T.border }} />
            <Toggle checked={form.is_visible} onChange={(v) => setValue("is_visible", v)} label="Visible on storefront" />
            <Field label="Publish at" error={fieldErr("published_at")} errorKey="published_at">
              <Input type="datetime-local" value={form.published_at} onChange={(e) => setValue("published_at", e.target.value)} />
            </Field>
          </Card>

          <DetailsCard title="Availability" description="Pre-orders while out of stock" defaultOpen>
            <Toggle checked={form.preorder_enabled} onChange={(v) => setValue("preorder_enabled", v)} label="Out of stock — accept pre-orders" />
            <p style={{ fontSize: 11.5, color: T.textSub, margin: 0, lineHeight: 1.5 }}>
              Keeps the product buyable while out of stock (works for single and variation products). Customers check out as a pre-order and see your shipping estimate instead of the default delivery time.
            </p>
            {form.preorder_enabled && (
              <Field label="Shipping days needed" required error={fieldErr("preorder_shipping_days")} errorKey="preorder_shipping_days">
                <Input type="number" min={1} max={365} placeholder="e.g. 10" value={String(form.preorder_shipping_days)} onChange={(e) => setValue("preorder_shipping_days", e.target.value)} />
              </Field>
            )}
          </DetailsCard>

          <DetailsCard title="Tags" description="Storefront filtering and search" defaultOpen>
            <Select styles={selectStyles} isMulti placeholder="Select tags" options={options.tags}
              value={selectedTagOptions}
              onChange={(items: any) => setValue("selectedTags", (items || []).map((i: any) => Number(i.value)))}
              menuPortalTarget={document.body} menuPosition="fixed" />
          </DetailsCard>

          <DetailsCard title="SEO" description="Slug, meta and search settings">
            <Field label="Slug" error={fieldErr("slug")} errorKey="slug">
              <Input value={form.slug} placeholder="auto from name"
                onChange={(e) => { setSlugEdited(true); clearError("slug"); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })); }}
                onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug) }))} />
            </Field>
            <Field label="Meta title"><Input value={form.seo.metaTitle} onChange={(e) => setValue("seo", { ...form.seo, metaTitle: e.target.value })} /></Field>
            <Field label="Meta description"><TextArea rows={2} value={form.seo.metaDescription} onChange={(e) => setValue("seo", { ...form.seo, metaDescription: e.target.value })} /></Field>
            <Field label="OG image URL"><Input value={form.seo.ogImage} onChange={(e) => setValue("seo", { ...form.seo, ogImage: e.target.value })} /></Field>
            <Field label="Canonical URL"><Input value={form.seo.canonical} onChange={(e) => setValue("seo", { ...form.seo, canonical: e.target.value })} /></Field>
            <Field label="Keywords"><Input placeholder="comma, separated, keywords" value={form.seo.keywords} onChange={(e) => setValue("seo", { ...form.seo, keywords: e.target.value })} /></Field>
            <Toggle checked={form.is_featured} onChange={(v) => setValue("is_featured", v)} label="Featured product" />
            <Toggle checked={form.track_inventory} onChange={(v) => setValue("track_inventory", v)} label="Track inventory" />
          </DetailsCard>
        </aside>
      </div>

      {/* VARIANT DRAWER */}
      {variantDrawerOpen && (
        <Drawer title="Configure variants" subtitle={`${typeCount} variation ${typeCount === 1 ? "type" : "types"} · ${form.variantTableRows.length} ${form.variantTableRows.length === 1 ? "row" : "rows"}`}
          width={Math.min(Math.round(window.innerWidth * 0.8), 1400)}
          onClose={() => setVariantDrawerOpen(false)}
          footer={<div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="pf-btn primary" onClick={() => setVariantDrawerOpen(false)}>Done</button></div>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: T.font }}>
            <Card title="Variation types" description="Pick the attributes and values this product comes in.">
              {form.multipleVariations.map((variation, vi) => {
                const attr = options.variantAttributes.find((a) => a.slug === variation.attribute_slug) || null;
                const valueOptions = (attr?.values || []).map((v) => ({ value: v.id, label: v.name }));
                return (
                  <div key={variation.id} className="pf-variation-row">
                    <Select styles={selectStyles} placeholder="Variation type"
                      options={options.variantAttributes.map((a) => ({ value: a.slug, label: a.name }))}
                      value={attr ? { value: attr.slug, label: attr.name } : null}
                      onChange={(item: any) => {
                        const next = form.multipleVariations.map((v, i) => i === vi ? { ...v, attribute_slug: item?.value || "", selected_values: [] } : v);
                        regenerateRows(next);
                      }}
                      menuPortalTarget={document.body} menuPosition="fixed" />
                    <Select styles={selectStyles} isMulti closeMenuOnSelect={false}
                      placeholder={attr ? `Select ${attr.name.toLowerCase()} values...` : "Select values"}
                      options={valueOptions}
                      value={valueOptions.filter((o) => variation.selected_values.includes(Number(o.value)))}
                      onChange={(items: any) => {
                        const next = form.multipleVariations.map((v, i) => i === vi ? { ...v, selected_values: (items || []).map((it: any) => Number(it.value)) } : v);
                        regenerateRows(next);
                      }}
                      menuPortalTarget={document.body} menuPosition="fixed" />
                    <button type="button" className="pf-row-delete" aria-label="Remove variation type"
                      onClick={() => regenerateRows(form.multipleVariations.filter((_, i) => i !== vi))}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                );
              })}
              <button type="button" className="pf-btn pf-btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setForm((f) => ({ ...f, multipleVariations: [...f.multipleVariations, { id: "var_" + Date.now(), attribute_slug: "", selected_values: [] }] }))}>
                <Icon name="plus" size={13} /> Add Variation
              </button>
            </Card>

            <Card title="Generated variants">
              {!form.variantTableRows.length ? (
                <div style={{ fontSize: 12.5, color: T.textMuted }}>No rows</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13 }}>Rows</strong>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="pf-btn pf-btn-sm" onClick={() => setForm((f) => ({
                        ...f,
                        variantTableRows: f.variantTableRows.map((r) => ({ ...r, price: f.price, cost_price: f.cost_price })),
                      }))}>Apply Base Pricing to All</button>
                      <div className="pf-copy-wrap" ref={copyMenuRef}>
                        <button type="button" className="pf-btn pf-btn-sm" onClick={() => setCopyMenuOpen((o) => !o)}>Copy first row v</button>
                        {copyMenuOpen && (
                          <div className="pf-copy-menu">
                            <strong>Copy from 1st row</strong>
                            {([
                              ["Apply Discount to All", ["discount_amount", "discount_type"]],
                              ["Apply Stock Qty to All", ["stock_quantity"]],
                              ["Apply SKU to All", ["sku"]],
                              ["Apply Barcode to All", ["barcode"]],
                            ] as [string, (keyof VariantRow)[]][]).map(([label, fields]) => (
                              <button key={label} type="button" onClick={() => {
                                setForm((f) => {
                                  const first = f.variantTableRows[0];
                                  if (!first) return f;
                                  return { ...f, variantTableRows: f.variantTableRows.map((r, i) => i === 0 ? r : { ...r, ...Object.fromEntries(fields.map((k) => [k, first[k]])) }) };
                                });
                                setCopyMenuOpen(false);
                              }}>{label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {sizeInPlay && <button type="button" className="pf-btn pf-btn-sm" onClick={sortSizes}>Sort S -&gt; 3XL</button>}
                    </div>
                  </div>
                  <div className="pf-table-wrap">
                    <table className="pf-vtable">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Drag</th>
                          <th style={{ width: 62 }}>Image</th>
                          <th>Variant</th>
                          <th>SKU</th>
                          <th>Barcode</th>
                          <th>Price</th>
                          <th>Compare</th>
                          <th>Cost</th>
                          <th>Discount</th>
                          <th>Type</th>
                          <th>Qty</th>
                          <th>Visible</th>
                          <th style={{ width: 50 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {form.variantTableRows.map((row, index) => (
                          <tr key={row.row_key} draggable className={dragRowKey === row.row_key ? "pf-dragging" : ""}
                            onDragStart={(e) => { setDragRowKey(row.row_key); e.dataTransfer.setData("text/plain", row.row_key); e.dataTransfer.effectAllowed = "move"; }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropRow(row.row_key)}
                            onDragEnd={() => setDragRowKey(null)}>
                            <td><span className="pf-drag-handle">::</span> <span style={{ fontSize: 11, color: T.textMuted }}>#{index + 1}</span></td>
                            <td>
                              <VariantMediaButton row={row}
                                pendingMain={variantImages[row.row_key] || null}
                                pendingGallery={variantGallery[row.row_key] || []}
                                onOpen={() => setOpenVariantMediaKey(row.row_key)} />
                            </td>
                            <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                              {row.display_name || row.combination.map((c) => valueName(c.attribute_slug, c.value_id)).join(" / ")}
                            </td>
                            <td><input className="pf-table-input" value={row.sku} onChange={(e) => patchRow(index, { sku: e.target.value })} /></td>
                            <td><input className="pf-table-input" value={row.barcode} onChange={(e) => patchRow(index, { barcode: e.target.value })} /></td>
                            <td><input className="pf-table-input" type="number" step="0.01" min={0} value={row.price == null ? "" : String(row.price)} onChange={(e) => patchRow(index, { price: e.target.value })} /></td>
                            <td><input className="pf-table-input" type="number" step="0.01" min={0} value={row.compare_at_price == null ? "" : String(row.compare_at_price)} onChange={(e) => patchRow(index, { compare_at_price: e.target.value })} /></td>
                            <td><input className="pf-table-input" type="number" step="0.01" min={0} value={row.cost_price == null ? "" : String(row.cost_price)} onChange={(e) => patchRow(index, { cost_price: e.target.value })} /></td>
                            <td><input className="pf-table-input" type="number" step="0.01" min={0} value={row.discount_amount == null ? "" : String(row.discount_amount)} onChange={(e) => patchRow(index, { discount_amount: e.target.value })} /></td>
                            <td>
                              <select className="pf-table-input" value={row.discount_type} onChange={(e) => patchRow(index, { discount_type: e.target.value })}>
                                <option value="">None</option>
                                <option value="fixed">Fixed</option>
                                <option value="percent">Percent</option>
                              </select>
                            </td>
                            <td><input className="pf-table-input" type="number" min={0} value={String(row.stock_quantity)} onChange={(e) => patchRow(index, { stock_quantity: e.target.value })} /></td>
                            <td>
                              <select className="pf-table-input" value={row.is_visible ? "1" : "0"} onChange={(e) => patchRow(index, { is_visible: e.target.value === "1" })}>
                                <option value="1">Yes</option>
                                <option value="0">No</option>
                              </select>
                            </td>
                            <td>
                              <button type="button" className="pf-row-delete" aria-label={`Delete variant row ${index + 1}`}
                                onDragStart={(e) => e.stopPropagation()} onClick={() => deleteRow(index)}>
                                <Icon name="x" size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>
        </Drawer>
      )}

      {/* VARIANT MEDIA DIALOG */}
      {openMediaRow && (
        <VariantMediaDialog
          row={openMediaRow}
          pendingMain={variantImages[openMediaRow.row_key] || null}
          pendingGallery={variantGallery[openMediaRow.row_key] || []}
          onClose={() => setOpenVariantMediaKey(null)}
          onPickMain={(f) => setVariantImages((m) => ({ ...m, [openMediaRow.row_key]: f }))}
          onRemoveMain={() => {
            setVariantImages((m) => ({ ...m, [openMediaRow.row_key]: null }));
            const removed = variantMainPreview(openMediaRow);
            const idx = form.variantTableRows.findIndex((r) => r.row_key === openMediaRow.row_key);
            if (idx !== -1) patchRow(idx, { image_path: null, image_url: null, main_image_path: null, gallery_paths: (openMediaRow.gallery_paths || []).filter((p) => p !== removed) });
          }}
          onAddGallery={(files) => setVariantGallery((m) => ({ ...m, [openMediaRow.row_key]: [...(m[openMediaRow.row_key] || []), ...files] }))}
          onRemoveGalleryPath={(path) => {
            const idx = form.variantTableRows.findIndex((r) => r.row_key === openMediaRow.row_key);
            if (idx !== -1) patchRow(idx, { gallery_paths: (openMediaRow.gallery_paths || []).filter((p) => p !== path) });
          }}
          onRemoveGalleryUpload={(i) => setVariantGallery((m) => ({ ...m, [openMediaRow.row_key]: (m[openMediaRow.row_key] || []).filter((_, x) => x !== i) }))}
        />
      )}
    </div>
  );
}
