import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import AdminProductForm from "./AdminProductForm";
import { AdminHeader, DataTable, StatusPill, IconButton, PencilIcon, TrashIcon, PlusIcon, useConfirm, ui, INK, MUTED, type Column } from "./ui";

type P = {
  dbId: number; id: string; name: string; price: number; category: string;
  stock: number; status: string; badge: string | null; images: string[];
};

export default function AdminProducts() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<P[]>("admin/products", true)
      .then(setList)
      .catch((e) => show({ title: "Couldn't load products", description: e.message, tone: "error" }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStatus = async (p: P) => {
    setBusy(p.dbId);
    const next = p.status === "active" ? "draft" : "active";
    try {
      await apiSend("PUT", `admin/products/${p.dbId}`, { status: next, keepSlug: true });
      setList((l) => l.map((x) => (x.dbId === p.dbId ? { ...x, status: next } : x)));
      show({ title: `${p.name} → ${next}`, tone: "success" });
    } catch (e: any) {
      show({ title: "Update failed", description: e.message, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p: P) => {
    if (!(await confirm({ title: `Delete “${p.name}”?`, message: "This permanently removes the product, its variants and images. This can’t be undone.", confirmLabel: "Delete product" }))) return;
    setBusy(p.dbId);
    try {
      await apiSend("DELETE", `admin/products/${p.dbId}`);
      setList((l) => l.filter((x) => x.dbId !== p.dbId));
      show({ title: `${p.name} deleted`, tone: "default" });
    } catch (e: any) {
      show({ title: "Delete failed", description: e.message, tone: "error" });
      setBusy(null);
    }
  };

  const columns: Column<P>[] = [
    {
      key: "product",
      header: "Product",
      width: "minmax(220px, 1.8fr)",
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 44, height: 52, borderRadius: 8, background: "#efefee", position: "relative", flexShrink: 0, overflow: "hidden" }}>
            {p.images?.[0] && <img src={p.images[0]} alt="" style={{ position: "absolute", inset: "12%", width: "76%", height: "76%", objectFit: "contain" }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: MUTED }}>{p.category || "—"} · €{p.price.toFixed(2)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Inventory",
      width: 140,
      render: (p) =>
        p.stock <= 0 ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Sold out</span>
        ) : (
          <span style={{ fontSize: 13, color: MUTED }}>
            {p.stock} in stock{p.stock <= 5 && <span style={{ color: INK, fontWeight: 600 }}> · low</span>}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: 120,
      render: (p) => <StatusPill label={p.status} active={p.status === "active"} onClick={() => toggleStatus(p)} title="Toggle active / draft" />,
    },
    {
      key: "actions",
      header: "",
      width: 96,
      align: "right",
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <IconButton icon={<PencilIcon />} title="Edit" onClick={() => setEditing(p.dbId)} />
          <IconButton icon={<TrashIcon />} title="Delete" onClick={() => remove(p)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        eyebrow="CATALOG"
        title="Products"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: MUTED }}>{list.length} products</span>
            <button onClick={() => setEditing("new")} style={{ ...ui.primaryBtn, display: "inline-flex", alignItems: "center", gap: 7 }}><PlusIcon size={15} /> New product</button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={list}
        rowKey={(p) => p.dbId}
        loading={loading}
        busyKey={busy}
        empty="No products yet — create your first one."
      />

      <AnimatePresence>
        {editing !== null && (
          <AdminProductForm
            key={editing}
            id={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
