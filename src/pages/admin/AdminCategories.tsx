import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field, AuthButton } from "../../components/AuthUI";
import { TEXT_COLOR } from "../../lib/constants";
import { AdminHeader, DataTable, StatusPill, IconButton, PencilIcon, TrashIcon, SubIcon, PlusIcon, useConfirm, ui, INK, FAINT, type Column } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;

type Cat = { id: number; parentId: number | null; name: string; status: string; productCount: number; totalCount?: number };

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

  // Indented, depth-first option list. When editing, a category can't be moved
  // under itself or any of its descendants (that would orphan the subtree), so
  // those are filtered out — matching the server-side guard.
  const blocked = useMemo(() => {
    const set = new Set<number>();
    if (!initial) return set;
    set.add(initial.id);
    const walk = (pid: number) => cats.filter((c) => c.parentId === pid).forEach((c) => { set.add(c.id); walk(c.id); });
    walk(initial.id);
    return set;
  }, [cats, initial]);

  const options = useMemo(() => {
    const out: { c: Cat; depth: number }[] = [];
    const walk = (parent: number | null, depth: number) =>
      cats.filter((c) => c.parentId === parent).forEach((c) => { out.push({ c, depth }); walk(c.id, depth + 1); });
    walk(null, 0);
    return out.filter((o) => !blocked.has(o.c.id));
  }, [cats, blocked]);

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
          {options.map(({ c, depth }) => (
            <option key={c.id} value={c.id}>
              {`${"   ".repeat(depth)}${depth ? "└ " : ""}${c.name}`}
            </option>
          ))}
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
  const confirm = useConfirm();
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
    const hasKids = cats.some((x) => x.parentId === c.id);
    if (!(await confirm({
      title: `Delete “${c.name}”?`,
      message: hasKids
        ? "This also deletes every sub-category beneath it and unlinks affected products. This can’t be undone."
        : "Products are unlinked from this category. This can’t be undone.",
      confirmLabel: "Delete category",
    }))) return;
    try { await apiSend("DELETE", `admin/categories/${c.id}`); show({ title: `${c.name} deleted`, tone: "default" }); load(); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  type Row = { c: Cat; depth: number };
  const columns: Column<Row>[] = [
    {
      key: "category", header: "Category", width: "minmax(260px, 2.2fr)",
      render: ({ c, depth }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingLeft: depth * 22 }}>
          {depth > 0 && <span style={{ color: FAINT }}>└</span>}
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: depth === 0 ? 600 : 500, color: INK }}>{c.name}</span>
            <span style={{ fontSize: 12, color: FAINT, marginLeft: 10 }}>
              {c.productCount} {c.productCount === 1 ? "product" : "products"}
              {c.totalCount != null && c.totalCount > c.productCount && ` · ${c.totalCount} incl. sub`}
            </span>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", width: 110, render: ({ c }) => <StatusPill label={c.status} active={c.status === "active"} /> },
    {
      key: "actions", header: "", width: 130, align: "right",
      render: ({ c }) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <IconButton icon={<SubIcon />} title="Add sub-category" onClick={() => setModal({ parentId: c.id })} />
          <IconButton icon={<PencilIcon />} title="Edit" onClick={() => setModal({ editing: c })} />
          <IconButton icon={<TrashIcon />} title="Delete" onClick={() => remove(c)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Categories" action={<button onClick={() => setModal({ parentId: null })} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New category</button>} />

      <DataTable columns={columns} rows={ordered} rowKey={(o) => o.c.id} empty="No categories yet — create your first." />

      <AnimatePresence>
        {modal && <CategoryModal cats={cats} initial={modal.editing} onClose={() => setModal(null)} onSave={save} />}
      </AnimatePresence>
    </div>
  );
}
