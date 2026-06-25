import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { AdminHeader, DataTable, StatusPill, IconButton, ChevronRightIcon, INK, MUTED, type Column } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;
const fmt = (s: string) => { try { return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; } };

export default function AdminCustomers() {
  const { show } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<any[]>(`admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`, true).then(setList).catch((e) => show({ title: e.message, tone: "error" })).finally(() => setLoading(false));
  };
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);

  const open = (id: number) => apiGet<any>(`admin/customers/${id}`, true).then(setDetail).catch((e) => show({ title: e.message, tone: "error" }));
  const toggleBlock = async (c: any) => {
    const next = c.status === "active" ? "blocked" : "active";
    try { await apiSend("PUT", `admin/customers/${c.id}/status`, { status: next }); show({ title: `${c.name} ${next}`, tone: "success" }); load(); if (detail?.id === c.id) setDetail({ ...detail, status: next }); }
    catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  const columns: Column<any>[] = [
    {
      key: "customer", header: "Customer", width: "minmax(240px, 2fr)",
      render: (c) => (
        <button onClick={() => open(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "'Inter Tight', sans-serif" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(c.name || c.email)[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || "—"}</div>
            <div style={{ fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
          </div>
        </button>
      ),
    },
    { key: "orders", header: "Orders", width: 90, render: (c) => <span style={{ fontSize: 13, color: MUTED }}>{c.ordersCount}</span> },
    { key: "spent", header: "Spent", width: 110, render: (c) => <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{money(c.totalSpent)}</span> },
    { key: "status", header: "Status", width: 120, render: (c) => <StatusPill label={c.status} active={c.status === "active"} onClick={() => toggleBlock(c)} title="Toggle blocked / active" /> },
    { key: "view", header: "", width: 48, align: "right", render: (c) => <IconButton icon={<ChevronRightIcon />} title="View customer" onClick={() => open(c.id)} /> },
  ];

  return (
    <div>
      <AdminHeader
        eyebrow="PEOPLE"
        title="Customers"
        action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ background: "#fff", border: `1px solid ${INK}1f`, borderRadius: 999, padding: "9px 18px", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, color: INK, outline: "none" }} />}
      />

      <DataTable columns={columns} rows={list} rowKey={(c) => c.id} loading={loading} empty="No customers found." />


      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.45)", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.4, ease: EASE }} onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 420, background: "#F4F1EB", height: "100%", overflowY: "auto", padding: 28, fontFamily: "'Inter Tight', sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: TEXT_COLOR }}>{detail.name}</span>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(84,84,84,0.5)" }}>✕</button>
              </div>
              <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 4 }}>{detail.email}{detail.phone ? ` · ${detail.phone}` : ""}</div>
              <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.5)", marginBottom: 20 }}>Member since {fmt(detail.createdAt)}</div>

              {detail.loyalty && (
                <div style={{ background: "#161616", color: "#fff", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: "2px", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>LOVEBAG CIRCLE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{detail.loyalty.points}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>points · {money(detail.loyalty.lifetimeSpend)} lifetime</span>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_COLOR, marginBottom: 10 }}>Orders ({detail.orders?.length || 0})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(detail.orders || []).map((o: any) => (
                  <div key={o.number} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: 10, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: TEXT_COLOR }}>{o.number}</span>
                    <span style={{ color: "rgba(84,84,84,0.55)" }}>{fmt(o.createdAt)}</span>
                    <span style={{ fontWeight: 500, color: TEXT_COLOR }}>{money(o.total)}</span>
                  </div>
                ))}
                {(!detail.orders || detail.orders.length === 0) && <div style={{ fontSize: 13, color: "rgba(84,84,84,0.5)" }}>No orders yet.</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
