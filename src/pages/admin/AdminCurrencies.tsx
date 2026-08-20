import { useEffect, useState } from "react";
import { TEXT_COLOR } from "../../lib/constants";
import { INK, MUTED, FAINT } from "./ui";
import { apiGet, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import type { StoreCurrency } from "../../context/Currency";
import { AdminTable, AdminTableShell, adminTableStyles, TBL, Pill, RowSkeleton } from "./shared/AdminTable";

type Draft = {
  code: string;
  nameEn: string;
  nameAr: string;
  symbol: string;
  rate: string;
  decimals: string;
  sortOrder: string;
  isActive: boolean;
};
const BLANK: Draft = {
  code: "",
  nameEn: "",
  nameAr: "",
  symbol: "",
  rate: "1",
  decimals: "2",
  sortOrder: "0",
  isActive: true,
};

const inputS: React.CSSProperties = {
  width: "100%",
  background: "#f5f5f4",
  border: "1.5px solid rgba(20,20,20,0.14)",
  borderRadius: 10,
  padding: "10px 13px",
  fontFamily: "'Inter Tight', sans-serif",
  fontSize: 13.5,
  color: TEXT_COLOR,
  outline: "none",
};
const labelS: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "1.4px",
  textTransform: "uppercase",
  color: "rgba(20,20,20,0.5)",
  marginBottom: 6,
};

function CurrencyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: StoreCurrency;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [d, setD] = useState<Draft>(
    initial
      ? {
          code: initial.code,
          nameEn: initial.nameEn,
          nameAr: initial.nameAr || "",
          symbol: initial.symbol,
          rate: String(initial.rate),
          decimals: String(initial.decimals),
          sortOrder: String(initial.sortOrder ?? 0),
          isActive: initial.isActive ?? true,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Draft, v: string | boolean) => setD((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        code: d.code.trim().toUpperCase(),
        nameEn: d.nameEn.trim(),
        nameAr: d.nameAr.trim(),
        symbol: d.symbol.trim(),
        rate: parseFloat(d.rate) || 1,
        decimals: parseInt(d.decimals, 10) || 0,
        sortOrder: parseInt(d.sortOrder, 10) || 0,
        isActive: d.isActive,
      };
      if (initial) await apiSend("PUT", `admin/currencies/${initial.id}`, body);
      else await apiSend("POST", "admin/currencies", body);
      show({ title: initial ? "Currency updated" : "Currency added", tone: "success" });
      onSaved();
      onClose();
    } catch (e: any) {
      show({ title: "Couldn't save", description: e.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(17,17,17,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 16,
          padding: 26,
          fontFamily: "'Inter Tight', sans-serif",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", color: TEXT_COLOR, marginBottom: 18 }}>
          {initial ? `Edit ${initial.code}` : "Add currency"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelS}>Code</label>
            <input value={d.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="USD" maxLength={8} style={inputS} disabled={!!initial?.isBase} />
          </div>
          <div>
            <label style={labelS}>Symbol</label>
            <input value={d.symbol} onChange={(e) => set("symbol", e.target.value)} placeholder="$" style={inputS} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelS}>Name (EN)</label>
            <input value={d.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="US Dollar" style={inputS} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelS}>Name (AR)</label>
            <input dir="rtl" value={d.nameAr} onChange={(e) => set("nameAr", e.target.value)} placeholder="الدولار الأمريكي" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Exchange rate</label>
            <input
              inputMode="decimal"
              value={d.rate}
              onChange={(e) => set("rate", e.target.value.replace(/[^\d.]/g, ""))}
              style={{ ...inputS, ...(initial?.isBase ? { opacity: 0.5 } : {}) }}
              disabled={!!initial?.isBase}
            />
            {initial?.isBase && (
              <div style={{ fontSize: 11.5, color: FAINT, marginTop: 5 }}>The base currency's rate is always 1.</div>
            )}
          </div>
          <div>
            <label style={labelS}>Decimals</label>
            <input inputMode="numeric" value={d.decimals} onChange={(e) => set("decimals", e.target.value.replace(/\D/g, ""))} placeholder="2" style={inputS} />
          </div>
          <div>
            <label style={labelS}>Sort order</label>
            <input inputMode="numeric" value={d.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} style={inputS} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: initial?.isBase ? "default" : "pointer", fontSize: 13.5, color: TEXT_COLOR }}>
              <input
                type="checkbox"
                checked={initial?.isBase ? true : d.isActive}
                disabled={!!initial?.isBase}
                onChange={(e) => set("isActive", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#141414" }}
              />
              Active
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{ flex: "0 0 auto", background: "none", border: "1px solid rgba(20,20,20,0.25)", borderRadius: 999, padding: "11px 22px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, color: TEXT_COLOR }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 999, padding: "11px 0", cursor: saving ? "wait" : "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: 600 }}
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Add currency"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCurrencies() {
  const { show } = useToast();
  const [rows, setRows] = useState<StoreCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { editing?: StoreCurrency }>(null);

  const reload = () => {
    apiGet<StoreCurrency[]>("admin/currencies", true)
      .then((r) => setRows(r || []))
      .catch((e) => show({ title: "Couldn't load currencies", description: e.message, tone: "error" }))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const setBase = async (c: StoreCurrency) => {
    try {
      await apiSend("PUT", `admin/currencies/${c.id}/base`);
      show({ title: `${c.code} is now the base currency`, description: "All rates were re-expressed relative to it", tone: "success" });
      reload();
    } catch (e: any) {
      show({ title: "Couldn't set base", description: e.message, tone: "error" });
    }
  };
  const remove = async (c: StoreCurrency) => {
    if (!window.confirm(`Delete ${c.code}? Shoppers using it fall back to the base currency.`)) return;
    try {
      await apiSend("DELETE", `admin/currencies/${c.id}`);
      show({ title: `${c.code} deleted`, tone: "default" });
      reload();
    } catch (e: any) {
      show({ title: "Couldn't delete", description: e.message, tone: "error" });
    }
  };

  return (
    <div>
      <style>{adminTableStyles}</style>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1.2px", color: TEXT_COLOR, margin: 0 }}>Currencies</h1>
          <p style={{ fontSize: 13.5, color: MUTED, margin: "5px 0 0" }}>
            Prices are stored in the base currency; shoppers can browse in any active one.
          </p>
        </div>
        <button
          onClick={() => setModal({})}
          style={{ background: INK, border: "none", borderRadius: 999, padding: "12px 22px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#fff" }}
        >
          Add currency
        </button>
      </div>

      <AdminTableShell minWidth={900} maxHeight="calc(100vh - 280px)" minHeight={260}>
        <AdminTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Name (AR)</th>
              <th>Symbol</th>
              <th style={{ textAlign: "center" }}>Rate</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Base</th>
              <th className="admin-pin-right" style={{ width: 96, textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <RowSkeleton key={i} widths={[40, "60%", 80, 30, 60, 70, 70, 40]} />
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No currencies yet.</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="admin-tbl-row">
                  <td style={{ fontWeight: 700 }}>{c.code}</td>
                  <td>{c.nameEn}</td>
                  <td dir="rtl" style={{ color: TBL.textSub }}>{c.nameAr || "—"}</td>
                  <td>{c.symbol}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {c.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {c.isActive
                      ? <Pill label="Active" color="#166534" bg={TBL.greenBg} border={TBL.greenBorder} />
                      : <Pill label="Inactive" color="#6b7280" bg="#f9fafb" border="#e5e7eb" />}
                  </td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    {c.isBase ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "1px", color: TEXT_COLOR }}>BASE</span>
                    ) : (
                      <button
                        onClick={() => setBase(c)}
                        style={{ background: "none", border: "1px solid rgba(20,20,20,0.25)", borderRadius: 999, padding: "6px 13px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 12, fontWeight: 500, color: TEXT_COLOR }}
                      >
                        Set as base
                      </button>
                    )}
                  </td>
                  <td className="admin-pin-right" style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button className="admin-act-btn" title="Edit" aria-label={`Edit ${c.code}`} onClick={() => setModal({ editing: c })}>
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></svg>
                      </button>
                      <button
                        className="admin-act-btn del"
                        title="Delete"
                        aria-label={`Delete ${c.code}`}
                        disabled={c.isBase}
                        style={c.isBase ? { opacity: 0.3, cursor: "default" } : undefined}
                        onClick={() => remove(c)}
                      >
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </AdminTableShell>

      {modal && <CurrencyModal initial={modal.editing} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}
