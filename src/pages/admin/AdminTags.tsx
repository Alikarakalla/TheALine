import { useEffect, useState } from "react";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, ui } from "./ui";

type Tag = { id: number; name: string; slug: string; productCount: number };

export default function AdminTags() {
  const { show } = useToast();
  const [list, setList] = useState<Tag[]>([]);
  const [name, setName] = useState("");

  const load = () => apiGet<Tag[]>("admin/tags", true).then(setList).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    try { await apiSend("POST", "admin/tags", { name: name.trim() }); setName(""); show({ title: "Tag added", tone: "success" }); load(); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const remove = async (t: Tag) => { try { await apiSend("DELETE", `admin/tags/${t.id}`); load(); } catch (e: any) { show({ title: e.message, tone: "error" }); } };

  return (
    <div>
      <AdminHeader eyebrow="CATALOG" title="Tags" />
      <div style={{ display: "flex", gap: 10, marginBottom: 20, maxWidth: 420 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New tag name" style={ui.input} />
        <button onClick={add} style={ui.primaryBtn}>Add</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {list.map((t) => (
          <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid rgba(84,84,84,0.15)", borderRadius: 999, padding: "9px 14px", fontSize: 13.5, color: TEXT_COLOR }}>
            {t.name}
            <span style={{ fontSize: 11, color: "rgba(84,84,84,0.45)" }}>{t.productCount}</span>
            <button onClick={() => remove(t)} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(84,84,84,0.5)", fontSize: 13 }}>✕</button>
          </span>
        ))}
        {list.length === 0 && <span style={{ color: "rgba(84,84,84,0.5)", fontSize: 14 }}>No tags yet.</span>}
      </div>
    </div>
  );
}
