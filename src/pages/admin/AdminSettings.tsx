import { useEffect, useState } from "react";
import { TEXT_COLOR } from "../../lib/constants";
import { INK } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { applyTheme, useSiteSettings } from "../../context/SiteSettings";

const COLOR_FIELDS: { key: string; label: string }[] = [
  { key: "primary_color", label: "Primary (accent / glow)" },
  { key: "secondary_color", label: "Secondary (dark)" },
  { key: "text_color", label: "Text" },
  { key: "bg_cream", label: "Cream background" },
  { key: "bg_paper", label: "Paper background" },
  { key: "bg_dark", label: "Dark background" },
];

export default function AdminSettings() {
  const { show } = useToast();
  const { reload } = useSiteSettings();
  const [theme, setTheme] = useState<Record<string, string>>({});
  const [site, setSite] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<any>("admin/settings", true)
      .then((s) => {
        setTheme(s.theme || {});
        setSite(
          Object.fromEntries(Object.entries(s.site || {}).map(([k, v]) => [k, String(v)]))
        );
      })
      .catch((e) => show({ title: "Couldn't load settings", description: e.message, tone: "error" }))
      .finally(() => setLoading(false));
  }, []);

  // live preview as colors change
  useEffect(() => {
    if (!loading) applyTheme(theme);
  }, [theme, loading]);

  const save = async () => {
    setSaving(true);
    try {
      await apiSend("PUT", "admin/settings", { theme, site });
      applyTheme(theme);
      reload();
      show({ title: "Settings saved", description: "Theme applied across the store", tone: "reward" });
    } catch (e: any) {
      show({ title: "Save failed", description: e.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: "rgba(84,84,84,0.5)", padding: 40 }}>Loading…</div>;

  const card: React.CSSProperties = { background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, padding: 26, marginBottom: 18 };
  const labelS: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 500, color: "rgba(84,84,84,0.7)", marginBottom: 7 };
  const inputS: React.CSSProperties = { width: "100%", background: "#faf9f6", border: "1.5px solid rgba(84,84,84,0.18)", borderRadius: 12, padding: "11px 14px", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: TEXT_COLOR, outline: "none" };

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>APPEARANCE & STORE</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR }}>Settings & Theme</h1>
        </div>
        <button onClick={save} disabled={saving} style={{ background: INK, border: "none", borderRadius: 999, padding: "13px 28px", cursor: saving ? "wait" : "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>Theme colors</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {COLOR_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={labelS}>{f.label}</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="color" value={theme[f.key] || "#000000"} onChange={(e) => setTheme((t) => ({ ...t, [f.key]: e.target.value }))}
                  style={{ width: 44, height: 40, border: "1px solid rgba(84,84,84,0.2)", borderRadius: 10, background: "none", cursor: "pointer", padding: 2 }} />
                <input value={theme[f.key] || ""} onChange={(e) => setTheme((t) => ({ ...t, [f.key]: e.target.value }))} style={{ ...inputS, flex: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>Fonts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><label style={labelS}>Display / UI font</label><input value={theme.font_sans || ""} onChange={(e) => setTheme((t) => ({ ...t, font_sans: e.target.value }))} style={inputS} /></div>
          <div><label style={labelS}>Accent serif font</label><input value={theme.font_serif || ""} onChange={(e) => setTheme((t) => ({ ...t, font_serif: e.target.value }))} style={inputS} /></div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>Store</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><label style={labelS}>Site name</label><input value={site.site_name || ""} onChange={(e) => setSite((s) => ({ ...s, site_name: e.target.value }))} style={inputS} /></div>
          <div><label style={labelS}>Free shipping threshold (€)</label><input value={site.free_ship_threshold || ""} onChange={(e) => setSite((s) => ({ ...s, free_ship_threshold: e.target.value }))} style={inputS} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelS}>Tagline</label><input value={site.tagline || ""} onChange={(e) => setSite((s) => ({ ...s, tagline: e.target.value }))} style={inputS} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelS}>Announcement bar</label><input value={site.announcement || ""} onChange={(e) => setSite((s) => ({ ...s, announcement: e.target.value }))} style={inputS} /></div>
        </div>
      </div>
    </div>
  );
}
