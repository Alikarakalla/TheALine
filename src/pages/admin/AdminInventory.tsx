import { useEffect, useState } from "react";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, ui } from "./ui";
import { AdminTable, AdminTableShell, adminTableStyles, TBL, Thumb, RowSkeleton } from "./shared/AdminTable";

type Item = { id: number; name: string; sku: string; stock: number; status: string; image: string; variants: { id: number; name: string; stock: number }[] };

export default function AdminInventory() {
  const { show } = useToast();
  const [list, setList] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const load = () => apiGet<Item[]>("admin/inventory", true).then((r) => {
    setList(r);
    setDraft(Object.fromEntries(r.map((p) => [p.id, p.stock])));
    setLoading(false);
  }).catch((e) => { setLoading(false); show({ title: e.message, tone: "error" }); });
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
      <style>{adminTableStyles}</style>
      <AdminHeader eyebrow="OPERATIONS" title="Inventory & Stock" />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: TEXT_COLOR }}>{list.length} SKUs</span>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: "#b8860b" }}>{lowCount} low</span>
        <span style={{ ...ui.card, padding: "10px 18px", fontSize: 13, color: "#c0563f" }}>{outCount} sold out</span>
      </div>
      <AdminTableShell minWidth={720} maxHeight="calc(100vh - 300px)" minHeight={260}>
        <AdminTable>
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ width: 90 }}>Level</th>
              <th style={{ width: 110 }}>Stock</th>
              <th className="admin-pin-right" style={{ width: 90, textAlign: "right" }}>Save</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <RowSkeleton key={i} widths={["60%", 40, 70, 44]} />
              ))
            ) : list.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No inventory to display.</td></tr>
            ) : (
              list.map((it) => {
                const dirty = draft[it.id] !== it.stock;
                const tone = it.stock <= 0 ? "#c0563f" : it.stock <= 5 ? "#b8860b" : "rgba(84,84,84,0.4)";
                return (
                  <tr key={it.id} className="admin-tbl-row">
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <Thumb src={it.image} alt={it.name} />
                        <div style={{ minWidth: 120 }}>
                          <div style={{ fontWeight: 600, color: TEXT_COLOR }}>{it.name}</div>
                          <div style={{ fontSize: 11, color: TBL.textMuted, marginTop: 2 }}>{it.sku} · {it.variants.length} variants</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: tone, flexShrink: 0 }} />
                        <span>{it.stock}</span>
                      </div>
                    </td>
                    <td>
                      <input type="number" value={draft[it.id] ?? 0} onChange={(e) => setDraft((d) => ({ ...d, [it.id]: parseInt(e.target.value || "0", 10) }))}
                        style={{ ...ui.input, width: 90, padding: "8px 12px", background: dirty ? "#fffbe6" : "#faf9f6" }} />
                    </td>
                    <td className="admin-pin-right" style={{ textAlign: "right" }}>
                      <button onClick={() => saveStock(it)} disabled={!dirty} style={{ ...ui.primaryBtn, padding: "8px 16px", opacity: dirty ? 1 : 0.4, cursor: dirty ? "pointer" : "default" }}>Save</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>
      </AdminTableShell>
    </div>
  );
}
