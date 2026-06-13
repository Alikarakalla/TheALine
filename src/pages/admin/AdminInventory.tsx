import { useEffect, useState } from "react";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, ui } from "./ui";

type Item = { id: number; name: string; sku: string; stock: number; status: string; image: string; variants: { id: number; name: string; stock: number }[] };

export default function AdminInventory() {
  const { show } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Record<number, number>>({});

  const load = () => apiGet<Item[]>("admin/inventory", true).then((r) => {
    setList(r);
    setDraft(Object.fromEntries(r.map((p) => [p.id, p.stock])));
  }).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  const saveStock = async (it: Item) => {
    const stock = draft[it.id];
    if (stock === it.stock) return;
    try {
      await apiSend("PUT", `admin/inventory/${it.id}`, { stock, reason: "Manual adjustment" });
      setList((l) => l.map((x) => (x.id === it.id ? { ...x, stock } : x)));
      show({ title: `${it.name} → ${stock} in stock`, tone: "success" });
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  const lowCount = list.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outCount = list.filter((p) => p.stock <= 0).length;

  return (
    <div>
      <AdminHeader eyebrow="OPERATIONS" title="Inventory & Stock" />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: TEXT_COLOR }}>{list.length} SKUs</span>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: "#b8860b" }}>{lowCount} low</span>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: "#c0563f" }}>{outCount} sold out</span>
      </div>
      <div style={ui.panel}>
        {list.map((it, i) => {
          const dirty = draft[it.id] !== it.stock;
          const tone = it.stock <= 0 ? "#c0563f" : it.stock <= 5 ? "#b8860b" : "rgba(84,84,84,0.4)";
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)" }}>
              <div style={{ width: 44, height: 50, borderRadius: 8, background: "#ECE7DE", position: "relative", flexShrink: 0 }}>
                {it.image && <img src={it.image} alt="" style={{ position: "absolute", inset: "14%", width: "72%", height: "72%", objectFit: "contain" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_COLOR }}>{it.name}</div>
                <div style={{ fontSize: 12, color: "rgba(84,84,84,0.5)" }}>{it.sku} · {it.variants.length} variants</div>
              </div>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: tone }} />
              <input type="number" value={draft[it.id] ?? 0} onChange={(e) => setDraft((d) => ({ ...d, [it.id]: parseInt(e.target.value || "0", 10) }))}
                style={{ ...ui.input, width: 90, padding: "8px 12px", background: dirty ? "#fffbe6" : "#faf9f6" }} />
              <button onClick={() => saveStock(it)} disabled={!dirty} style={{ ...ui.primaryBtn, padding: "8px 16px", opacity: dirty ? 1 : 0.4, cursor: dirty ? "pointer" : "default" }}>Save</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
