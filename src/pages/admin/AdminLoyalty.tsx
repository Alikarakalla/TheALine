import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../../lib/constants";
import { INK } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { AdminHeader, Modal, ui, useConfirm, MUTED } from "./ui";
import { Field, AuthButton } from "../../components/AuthUI";

const money = (n: number) => `€${n.toFixed(0)}`;

export default function AdminLoyalty() {
  const { show } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"tiers" | "rewards" | "members">("tiers");
  const [tiers, setTiers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [rewardModal, setRewardModal] = useState<null | { editing?: any }>(null);
  const [rf, setRf] = useState({ label: "", description: "", cost: 0, kind: "discount", value: "" });

  const loadTiers = () => apiGet<any[]>("admin/loyalty/tiers", true).then(setTiers);
  const loadRewards = () => apiGet<any[]>("admin/loyalty/rewards", true).then(setRewards);
  const loadMembers = () => apiGet<any[]>("admin/loyalty/accounts", true).then(setMembers);
  useEffect(() => { loadTiers(); loadRewards(); loadMembers(); }, []);

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
      <AdminHeader eyebrow="LOVEBAG CIRCLE" title="Loyalty" />
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>{tabBtn("tiers", "Tiers")}{tabBtn("rewards", "Rewards")}{tabBtn("members", `Members (${members.length})`)}</div>

      {tab === "tiers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {tiers.map((t) => (
            <div key={t.id} style={ui.card}>
              <input value={t.name} onChange={(e) => setTier(t.id, { name: e.target.value })} style={{ ...ui.input, fontWeight: 600, fontSize: 18, marginBottom: 14 }} />
              <label style={ui.label}>Min lifetime spend (€)</label>
              <input type="number" value={t.minSpend} onChange={(e) => setTier(t.id, { minSpend: e.target.value })} style={{ ...ui.input, marginBottom: 12 }} />
              <label style={ui.label}>Earn rate (pts per €)</label>
              <input type="number" step="0.05" value={t.earnRate} onChange={(e) => setTier(t.id, { earnRate: e.target.value })} style={{ ...ui.input, marginBottom: 12 }} />
              <label style={ui.label}>Free shipping over (€, 0 = always)</label>
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
          <div style={ui.panel}>
            {rewards.map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_COLOR }}>{r.label}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{r.description} · {r.kind}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_COLOR }}>{r.cost} pts</span>
                <button onClick={() => { setRf({ label: r.label, description: r.description || "", cost: r.cost, kind: r.kind, value: r.value ?? "" }); setRewardModal({ editing: r }); }} style={ui.linkBtn}>Edit</button>
                <button onClick={async () => { if (!(await confirm({ title: `Delete “${r.label}”?`, message: "This reward is removed from the catalog. This can’t be undone.", confirmLabel: "Delete reward" }))) return; await apiSend("DELETE", `admin/loyalty/rewards/${r.id}`); loadRewards(); }} style={{ ...ui.linkBtn, color: MUTED }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div style={ui.panel}>
          {members.map((m, i) => (
            <div key={m.email} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.07)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>{m.email} · {m.referralCode}</div>
              </div>
              <span style={{ fontSize: 13, color: "rgba(84,84,84,0.6)" }}>{money(m.lifetimeSpend)} lifetime</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#7e9400" }}>{m.points} pts</span>
            </div>
          ))}
          {members.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "rgba(84,84,84,0.5)" }}>No members yet</div>}
        </div>
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
          {rf.kind === "discount" && <Field label="€ value" value={String(rf.value)} onChange={(v) => setRf({ ...rf, value: v })} />}
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
