import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import AdminProductForm from "./AdminProductForm";

const EASE = [0.22, 1, 0.36, 1] as const;

type P = {
  dbId: number; id: string; name: string; price: number; category: string;
  stock: number; status: string; badge: string | null; images: string[];
};

export default function AdminProducts() {
  const { show } = useToast();
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
    setBusy(p.dbId);
    try {
      await apiSend("DELETE", `admin/products/${p.dbId}`);
      setList((l) => l.filter((x) => x.dbId !== p.dbId));
      show({ title: `${p.name} deleted`, tone: "default" });
    } catch (e: any) {
      show({ title: "Delete failed", description: e.message, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>CATALOG</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR }}>Products</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(84,84,84,0.6)" }}>{list.length} products</span>
          <button onClick={() => setEditing("new")} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "11px 20px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>+ New product</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "rgba(84,84,84,0.5)", padding: 40, textAlign: "center" }}>Loading…</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, overflow: "hidden" }}>
          <AnimatePresence initial={false}>
            {list.map((p) => (
              <motion.div
                key={p.dbId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: busy === p.dbId ? 0.5 : 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderTop: "1px solid rgba(84,84,84,0.07)" }}
              >
                <div style={{ width: 46, height: 54, borderRadius: 8, background: "#ECE7DE", position: "relative", flexShrink: 0 }}>
                  {p.images?.[0] && <img src={p.images[0]} alt="" style={{ position: "absolute", inset: "14%", width: "72%", height: "72%", objectFit: "contain" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{p.category} · €{p.price.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: 13, color: p.stock <= 0 ? "#c0563f" : p.stock <= 5 ? "#b8860b" : "rgba(84,84,84,0.7)", width: 80, textAlign: "right" }}>
                  {p.stock <= 0 ? "Sold out" : `${p.stock} in stock`}
                </div>
                <button
                  onClick={() => toggleStatus(p)}
                  style={{
                    width: 84, textAlign: "center", border: "none", borderRadius: 999, padding: "6px 0", cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 600,
                    background: p.status === "active" ? GLOW_COLOR : "rgba(84,84,84,0.12)",
                    color: p.status === "active" ? "#111" : "rgba(84,84,84,0.7)",
                  }}
                >
                  {p.status}
                </button>
                <button onClick={() => setEditing(p.dbId)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_COLOR, textDecoration: "underline" }}>Edit</button>
                <button onClick={() => remove(p)} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(84,84,84,0.45)", fontSize: 16 }}>✕</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
