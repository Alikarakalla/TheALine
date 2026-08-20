import { useEffect, useState } from "react";
import { TEXT_COLOR } from "../../lib/constants";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, ui, useConfirm } from "./ui";
import { AdminTable, AdminTableShell, adminTableStyles, TBL, RowSkeleton } from "./shared/AdminTable";

export default function AdminSeo() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [seo, setSeo] = useState<Record<string, string>>({});
  const [redirects, setRedirects] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [rd, setRd] = useState({ from: "", to: "", code: "301" });
  const [loading, setLoading] = useState(true);

  const load = () => apiGet<any>("admin/seo", true).then((d) => {
    setSeo(d.seo || {}); setRedirects(d.redirects || []); setPages(d.pages || []);
  }).catch((e) => show({ title: e.message, tone: "error" }));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const saveSeo = async () => { try { await apiSend("PUT", "admin/seo", { seo }); show({ title: "SEO defaults saved", tone: "success" }); } catch (e: any) { show({ title: e.message, tone: "error" }); } };
  const addRedirect = async () => {
    if (!rd.from || !rd.to) return show({ title: "From and To required", tone: "error" });
    try { await apiSend("POST", "admin/seo/redirects", rd); setRd({ from: "", to: "", code: "301" }); load(); } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const savePage = async (p: any) => { try { await apiSend("PUT", `admin/pages/${p.id}`, { title: p.title, metaTitle: p.meta_title, metaDescription: p.meta_description }); show({ title: `${p.title} saved`, tone: "success" }); } catch (e: any) { show({ title: e.message, tone: "error" }); } };
  const setPage = (id: number, patch: any) => setPages((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div style={{ maxWidth: 760 }}>
      <style>{adminTableStyles}</style>
      <AdminHeader eyebrow="DISCOVERABILITY" title="SEO Settings" />

      <div style={{ ...ui.card, marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}>Default meta</div>
        <label style={ui.label}>Meta title</label>
        <input value={seo.meta_title || ""} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} style={{ ...ui.input, marginBottom: 14 }} />
        <label style={ui.label}>Meta description</label>
        <textarea value={seo.meta_description || ""} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} rows={3} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />
        <label style={ui.label}>Default OG image URL</label>
        <input value={seo.og_image || ""} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })} style={{ ...ui.input, marginBottom: 16 }} />
        <button onClick={saveSeo} style={ui.primaryBtn}>Save SEO defaults</button>
      </div>

      <div style={{ ...ui.card, marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 16 }}>Redirects</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={rd.from} onChange={(e) => setRd({ ...rd, from: e.target.value })} placeholder="/old-path" style={{ ...ui.input, flex: 1, minWidth: 120 }} />
          <input value={rd.to} onChange={(e) => setRd({ ...rd, to: e.target.value })} placeholder="/new-path" style={{ ...ui.input, flex: 1, minWidth: 120 }} />
          <select value={rd.code} onChange={(e) => setRd({ ...rd, code: e.target.value })} style={{ ...ui.input, width: 90 }}><option value="301">301</option><option value="302">302</option></select>
          <button onClick={addRedirect} style={ui.primaryBtn}>Add</button>
        </div>
        <AdminTableShell minWidth={560} maxHeight="50vh" mobileMaxHeight="50vh" minHeight={160} mobileMinHeight={160}>
          <AdminTable>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th style={{ width: 70 }}>Code</th>
                <th className="admin-pin-right" style={{ width: 80, textAlign: "right" }}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} widths={["70%", "70%", 30, 20]} />)
              ) : redirects.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No redirects.</td></tr>
              ) : (
                redirects.map((r) => (
                  <tr key={r.id} className="admin-tbl-row">
                    <td>{r.from_path}</td>
                    <td>{r.to_path}</td>
                    <td style={{ color: TBL.textSub }}>{r.code}</td>
                    <td className="admin-pin-right" style={{ textAlign: "right" }}>
                      <button className="admin-act-btn del" title="Remove redirect" aria-label={`Remove redirect ${r.from_path}`}
                        onClick={async () => { if (!(await confirm({ title: "Remove redirect?", message: `${r.from_path} → ${r.to_path} will no longer redirect. This can’t be undone.`, confirmLabel: "Remove redirect" }))) return; await apiSend("DELETE", `admin/seo/redirects/${r.id}`); load(); }}>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </div>

      <div style={ui.card}>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR, marginBottom: 16 }}>Content pages</div>
        {pages.map((p) => (
          <div key={p.id} style={{ padding: "14px 0", borderTop: "1px solid rgba(84,84,84,0.08)" }}>
            <div style={{ fontSize: 11.5, color: "rgba(84,84,84,0.45)", marginBottom: 6 }}>/{p.slug}</div>
            <input value={p.title} onChange={(e) => setPage(p.id, { title: e.target.value })} style={{ ...ui.input, marginBottom: 8, fontWeight: 600 }} />
            <input value={p.meta_title || ""} onChange={(e) => setPage(p.id, { meta_title: e.target.value })} placeholder="Meta title" style={{ ...ui.input, marginBottom: 8 }} />
            <textarea value={p.meta_description || ""} onChange={(e) => setPage(p.id, { meta_description: e.target.value })} placeholder="Meta description" rows={2} style={{ ...ui.input, marginBottom: 8, resize: "vertical" }} />
            <button onClick={() => savePage(p)} style={{ ...ui.primaryBtn, padding: "8px 16px" }}>Save page</button>
          </div>
        ))}
      </div>
    </div>
  );
}
