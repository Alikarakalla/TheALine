import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, ui } from "./ui";
import Switch from "../../components/account/Switch";

type Section = { id: number; key: string; title: string; enabled: boolean; position: number; data: Record<string, any> };
const labelize = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export default function AdminHomepage() {
  const { show } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const load = () => apiGet<Section[]>("admin/homepage", true).then(setSections).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load(); }, []);

  const setData = (id: number, key: string, value: any) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, data: { ...x.data, [key]: value } } : x)));
  const setEnabled = (id: number, v: boolean) => setSections((s) => s.map((x) => (x.id === id ? { ...x, enabled: v } : x)));

  const save = async (sec: Section) => {
    try {
      await apiSend("PUT", `admin/homepage/${sec.id}`, { title: sec.title, enabled: sec.enabled, data: sec.data });
      show({ title: `${sec.title} saved`, description: "Live on the storefront", tone: "success" });
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  return (
    <div>
      <AdminHeader eyebrow="CONTENT" title="Homepage" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map((sec) => (
          <div key={sec.id} style={ui.panel}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
              <button onClick={() => setOpen(open === sec.id ? null : sec.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", textAlign: "left" }}>
                <motion.span animate={{ rotate: open === sec.id ? 90 : 0 }} style={{ color: "rgba(84,84,84,0.4)" }}>▸</motion.span>
                <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>{sec.title}</span>
                <span style={{ fontSize: 11.5, color: "rgba(84,84,84,0.4)" }}>/{sec.key}</span>
              </button>
              <span style={{ fontSize: 12, color: "rgba(84,84,84,0.5)" }}>{sec.enabled ? "Visible" : "Hidden"}</span>
              <Switch on={sec.enabled} onChange={(v) => setEnabled(sec.id, v)} />
            </div>
            <AnimatePresence initial={false}>
              {open === sec.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(84,84,84,0.08)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 14, paddingTop: 16 }}>
                      {Object.entries(sec.data).map(([k, v]) => (
                        <div key={k} style={Array.isArray(v) ? { gridColumn: "1 / -1" } : undefined}>
                          <label style={ui.label}>{labelize(k)}</label>
                          {Array.isArray(v) ? (
                            <textarea value={v.join("\n")} onChange={(e) => setData(sec.id, k, e.target.value.split("\n"))} rows={3} style={{ ...ui.input, resize: "vertical" }} />
                          ) : (
                            <input value={String(v)} onChange={(e) => setData(sec.id, k, e.target.value)} style={ui.input} />
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => save(sec)} style={{ ...ui.primaryBtn, marginTop: 16 }}>Save section</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
