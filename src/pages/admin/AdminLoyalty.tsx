import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { INK } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Modal, ui, useConfirm, MUTED } from "./ui";
import { Field, AuthButton } from "../../components/AuthUI";
import { AdminTable, AdminTableShell, adminTableStyles, TBL, RowSkeleton } from "./shared/AdminTable";

import { useBaseCurrency, useBaseMoney } from "../../context/Currency";

export default function AdminLoyalty() {
  const base = useBaseCurrency();
  const fmtBase = useBaseMoney();
  const money = (n: number) => fmtBase(n, true);
  const { show } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"tiers" | "rewards" | "members">("tiers");
  const [tiers, setTiers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [rewardModal, setRewardModal] = useState<null | { editing?: any }>(null);
  const [rf, setRf] = useState({ label: "", description: "", cost: 0, kind: "discount", value: "" });
  const [loading, setLoading] = useState(true);

  const loadTiers = () => apiGet<any[]>("admin/loyalty/tiers", true).then(setTiers);
  const loadRewards = () => apiGet<any[]>("admin/loyalty/rewards", true).then(setRewards);
  const loadMembers = () => apiGet<any[]>("admin/loyalty/accounts", true).then(setMembers);
  useEffect(() => { Promise.all([loadTiers(), loadRewards(), loadMembers()]).finally(() => setLoading(false)); }, []);

  const saveTier = async (t: any) => {
    try {
      await apiSend("PUT", `admin/loyalty/tiers/${t.id}`, {
        name: t.name, minSpend: Number(t.minSpend), earnRate: Number(t.earnRate),
        freeShipThreshold: Number(t.freeShipThreshold), perks: t.perks,
      });
      show({ title: `${t.name} tier saved`, tone: "success" });
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };
  const setTier = (id: number, patch: any) => setTiers((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const saveReward = async () => {
    if (!rf.label.trim()) return show({ title: "Label required", tone: "error" });
    const body = { ...rf, cost: Number(rf.cost), value: rf.value === "" ? null : Number(rf.value) };
    try {
      if (rewardModal?.editing) await apiSend("PUT", `admin/loyalty/rewards/${rewardModal.editing.id}`, body);
      else await apiSend("POST", "admin/loyalty/rewards", body);
      show({ title: "Reward saved", tone: "success" }); setRewardModal(null); loadRewards();
    } catch (e: any) { show({ title: e.message, tone: "error" }); }
  };

  const tabBtn = (id: typeof tab, label: string) => (
    <button onClick={() => setTab(id)} style={{ background: tab === id ? INK : "transparent", color: tab === id ? "#fff" : TEXT_COLOR, border: "none", borderRadius: 999, padding: "9px 18px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: tab === id ? 600 : 400 }}>{label}</button>
  );

  return (
    <div>
      <style>{adminTableStyles}</style>
      <AdminHeader eyebrow="LOVEBAG CIRCLE" title="Loyalty" />
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>{tabBtn("tiers", "Tiers")}{tabBtn("rewards", "Rewards")}{tabBtn("members", `Members (${members.length})`)}</div>

      {tab === "tiers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {tiers.map((t) => (
            <div key={t.id} style={ui.card}>
              <input value={t.name} onChange={(e) => setTier(t.id, { name: e.target.value })} style={{ ...ui.input, fontWeight: 600, fontSize: 18, marginBottom: 14 }} />
              <label style={ui.label}>Min lifetime spend ({base.symbol})</label>
              <input type="number" value={t.minSpend} onChange={(e) => setTier(t.id, { minSpend: e.target.value })} style={{ ...ui.input, marginBottom: 12 }} />
              <label style={ui.label}>Earn rate (pts per {base.symbol})</label>
              <input type="number" step="0.05" value={t.earnRate} onChange={(e) => setTier(t.id, { earnRate: e.target.value })} style={{ ...ui.input, marginBottom: 12 }} />
              <label style={ui.label}>Free shipping over ({base.symbol}, 0 = always)</label>
              <input type="number" value={t.freeShipThreshold} onChange={(e) => setTier(t.id, { freeShipThreshold: e.target.value })} style={{ ...ui.input, marginBottom: 12 }} />
              <label style={ui.label}>Perks (one per line)</label>
              <textarea value={(t.perks || []).join("\n")} onChange={(e) => setTier(t.id, { perks: e.target.value.split("\n").filter(Boolean) })} rows={4} style={{ ...ui.input, marginBottom: 14, resize: "vertical" }} />
              <button onClick={() => saveTier(t)} style={ui.primaryBtn}>Save tier</button>
            </div>
          ))}
        </div>
      )}

      {tab === "rewards" && (
        <div>
          <button onClick={() => { setRf({ label: "", description: "", cost: 0, kind: "discount", value: "" }); setRewardModal({}); }} style={{ ...ui.primaryBtn, marginBottom: 16 }}>+ New reward</button>
          <AdminTableShell minWidth={620} maxHeight="60vh" mobileMaxHeight="60vh" minHeight={200} mobileMinHeight={200}>
            <AdminTable>
              <thead>
                <tr>
                  <th>Reward</th>
                  <th style={{ width: 90 }}>Cost</th>
                  <th className="admin-pin-right" style={{ width: 110, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} widths={["65%", 50, 80]} />)
                ) : rewards.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No rewards yet</td></tr>
                ) : (
                  rewards.map((r) => (
                    <tr key={r.id} className="admin-tbl-row">
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{r.label}</div>
                        <div style={{ fontSize: 10.5, color: TBL.textSub, marginTop: 2 }}>{r.description} · {r.kind}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.cost} pts</td>
                      <td className="admin-pin-right" style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 10 }}>
                          <button onClick={() => { setRf({ label: r.label, description: r.description || "", cost: r.cost, kind: r.kind, value: r.value ?? "" }); setRewardModal({ editing: r }); }} style={ui.linkBtn}>Edit</button>
                          <button onClick={async () => { if (!(await confirm({ title: `Delete “${r.label}”?`, message: "This reward is removed from the catalog. This can’t be undone.", confirmLabel: "Delete reward" }))) return; await apiSend("DELETE", `admin/loyalty/rewards/${r.id}`); loadRewards(); }} style={{ ...ui.linkBtn, color: MUTED }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableShell>
        </div>
      )}

      {tab === "members" && (
        <AdminTableShell minWidth={620} maxHeight="60vh" mobileMaxHeight="60vh" minHeight={200} mobileMinHeight={200}>
          <AdminTable>
            <thead>
              <tr>
                <th>Member</th>
                <th style={{ width: 130 }}>Lifetime</th>
                <th style={{ width: 90 }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} widths={["60%", 70, 40]} />)
              ) : members.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No members yet</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.email} className="admin-tbl-row">
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: TBL.textSub, marginTop: 2 }}>{m.email} · {m.referralCode}</div>
                    </td>
                    <td style={{ color: TBL.textSub }}>{money(m.lifetimeSpend)}</td>
                    <td style={{ fontWeight: 700, color: "#7e9400" }}>{m.points} pts</td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      )}

      <AnimatePresence>
      {rewardModal && (
        <Modal title={rewardModal.editing ? "Edit reward" : "New reward"} onClose={() => setRewardModal(null)}>
          <Field label="Label" value={rf.label} onChange={(v) => setRf({ ...rf, label: v })} />
          <Field label="Description" value={rf.description} onChange={(v) => setRf({ ...rf, description: v })} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Field label="Cost (points)" type="text" value={String(rf.cost)} onChange={(v) => setRf({ ...rf, cost: Number(v.replace(/\D/g, "")) || 0 })} /></div>
            <div style={{ flex: 1 }}>
              <label style={ui.label}>Kind</label>
              <select value={rf.kind} onChange={(e) => setRf({ ...rf, kind: e.target.value })} style={{ ...ui.input, marginBottom: 18 }}>
                <option value="discount">Discount</option><option value="shipping">Shipping</option><option value="giftwrap">Gift wrap</option><option value="early">Early access</option>
              </select>
            </div>
          </div>
          {rf.kind === "discount" && <Field label={`${base.symbol} value`} value={String(rf.value)} onChange={(v) => setRf({ ...rf, value: v })} />}
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button onClick={() => setRewardModal(null)} style={ui.ghostBtn}>Cancel</button>
            <AuthButton type="button"><span onClick={saveReward}>{rewardModal.editing ? "Save" : "Create"}</span></AuthButton>
          </div>
        </Modal>
      )}
      </AnimatePresence>
    </div>
  );
}
