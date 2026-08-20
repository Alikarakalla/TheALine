import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { API_BASE, apiSend } from "../../lib/api";
import { useToast } from "../../context/Toast";
import { useBaseMoney } from "../../context/Currency";
import { Icon } from "./icons";
import {
  AdminTable, AdminTableShell, adminTableStyles,
  TBL, tblCard, tblBtn, tblInput, tblSelectStyles,
  Pill, Checkbox, Thumb, RowSkeleton, ConfirmModal,
} from "./shared/AdminTable";

/**
 * Products list — 1:1 port of the lebazone admin ProductsPage: header card
 * with live total, search & filters (debounced search, category/brand/status),
 * bulk selection with pinned checkbox column, the shared scrolling table with
 * pinned actions, skeleton loading rows, and numbered pagination.
 */

const PER_PAGE = 20;

type Row = {
  id: number; name: string; slug: string; sku: string | null;
  price: number; stock: number; status: string;
  isFeatured: boolean; trackInventory: boolean;
  image: string | null; category: string | null; brand: string | null;
};
type ListMeta = { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number };
type Opt = { value: number | string; label: string };

const authHeaders = (): Record<string, string> => {
  const t = localStorage.getItem("lovebag-admin-token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function useDebounce<T>(value: T, delay = 380): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STATUS_OPTIONS: Opt[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export default function AdminProducts() {
  const navigate = useNavigate();
  const money = useBaseMoney();
  const { show } = useToast();

  const [meta, setMeta] = useState<{ categories: Opt[]; brands: Opt[] }>({ categories: [], brands: [] });
  const [products, setProducts] = useState<Row[]>([]);
  const [countMeta, setCountMeta] = useState<ListMeta>({ current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0, from: 0, to: 0 });
  const [countLoading, setCountLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 380);
  const [categoryId, setCategoryId] = useState<Opt | null>(null);
  const [brandId, setBrandId] = useState<Opt | null>(null);
  const [status, setStatus] = useState<Opt>(STATUS_OPTIONS[0]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: number[]; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const catVal = categoryId?.value ?? "";
  const brandVal = brandId?.value ?? "";
  const statusVal = String(status?.value ?? "");

  const listUrl = (params: Record<string, string>) => {
    const url = new URL(`${API_BASE}/admin/products/list`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => { if (v !== "") url.searchParams.set(k, v); });
    return url.toString();
  };

  /* filter dropdown lookups (once) */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_BASE}/admin/products/list-meta`, { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setMeta({
        categories: [{ value: "", label: "All categories" }, ...(d.categories || [])],
        brands: [{ value: "", label: "All brands" }, ...(d.brands || [])],
      }))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  /* count — fast total so the header + pagination shell render before rows */
  useEffect(() => {
    const ctrl = new AbortController();
    setCountLoading(true);
    setSelectedIds(new Set());
    setPage(1);
    setProducts([]);
    fetch(listUrl({ perPage: "1", page: "1", search: debouncedSearch, categoryId: String(catVal), brandId: String(brandVal), status: statusVal }), { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setCountMeta((prev) => ({ ...prev, ...d.meta, last_page: Math.max(1, Math.ceil((d.meta?.total || 0) / PER_PAGE)) })); setCountLoading(false); })
      .catch((e) => { if (e.name !== "AbortError") setCountLoading(false); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, catVal, brandVal, statusVal, refreshTick]);

  /* rows */
  useEffect(() => {
    const ctrl = new AbortController();
    setProductsLoading(true);
    fetch(listUrl({ page: String(page), perPage: String(PER_PAGE), search: debouncedSearch, categoryId: String(catVal), brandId: String(brandVal), status: statusVal }), { headers: authHeaders(), signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data || []);
        setCountMeta((prev) => ({ ...prev, ...d.meta }));
        setProductsLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setProductsLoading(false);
        show({ title: "Couldn't load products", tone: "error" });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, catVal, brandVal, statusVal, refreshTick]);

  /* selection */
  const pageIds = useMemo(() => products.map((p) => p.id), [products]);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id));
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;
  const toggleAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    return next;
  });
  const toggleOne = (id: number) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());

  /* delete */
  const execDeleteAndRefresh = async (ids: number[]) => {
    setDeleting(true);
    try {
      if (ids.length === 1) await apiSend("DELETE", `admin/products/${ids[0]}`);
      else await apiSend("POST", "admin/products/bulk-delete", { ids });
      clearSelection();
      show({ title: `${ids.length} product${ids.length === 1 ? "" : "s"} deleted.`, tone: "success" });
      setRefreshTick((t) => t + 1);
    } catch {
      show({ title: "Delete failed. Please try again.", tone: "error" });
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: TBL.font, color: TBL.text }}>
      <style>{adminTableStyles}</style>

      {/* HEADER */}
      <div style={{ ...tblCard, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.4px", margin: 0 }}>Products</h1>
          <p style={{ fontSize: 12, color: TBL.textSub, margin: "4px 0 0" }}>Manage storefront inventory, pricing, visibility and catalog merchandising.</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: TBL.textMuted, marginTop: 8 }}>
            {countLoading ? (
              <span style={{ width: 120, height: 12, borderRadius: 4, background: "#eee", animation: "adminTblPulse 1.4s ease-in-out infinite", display: "inline-block" }} />
            ) : (
              <>
                <span>Total: <strong style={{ color: TBL.text }}>{countMeta.total.toLocaleString()}</strong></span>
                {!productsLoading && countMeta.from > 0 && (
                  <span>Showing: <strong style={{ color: TBL.text }}>{countMeta.from}–{countMeta.to}</strong> of page {page}</span>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...tblBtn, background: "#111", color: "#fff", border: "1px solid #111", fontWeight: 600 }} onClick={() => navigate("/admin/products/create")}>
            <Icon name="plus" size={13} /> Add Product
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div style={tblCard}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#222", marginBottom: 10 }}>Search &amp; filters</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) 1fr 1fr 180px", gap: 8 }} className="prd-filters">
          <input style={tblInput} placeholder="Search by name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select styles={tblSelectStyles} options={meta.categories} value={categoryId ?? meta.categories[0] ?? null}
            onChange={(opt: any) => setCategoryId(opt?.value ? opt : null)} isSearchable />
          <Select styles={tblSelectStyles} options={meta.brands} value={brandId ?? meta.brands[0] ?? null}
            onChange={(opt: any) => setBrandId(opt?.value ? opt : null)} isSearchable />
          <Select styles={tblSelectStyles} options={STATUS_OPTIONS} value={status}
            onChange={(opt: any) => setStatus(opt || STATUS_OPTIONS[0])} isSearchable={false} />
        </div>
        <style>{`@media (max-width: 900px) { .prd-filters { grid-template-columns: 1fr !important; } }`}</style>
      </div>

      {/* BULK BAR */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: TBL.amberBg, border: `1px solid ${TBL.amberBorder}`, borderRadius: 10, fontSize: 12, color: "#92400e", animation: "adminTblFadeIn .15s ease" }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m8.5 12 2.5 2.5 5-5.5" /></svg>
          <span style={{ fontWeight: 600 }}>{selectedIds.size} product{selectedIds.size === 1 ? "" : "s"} selected</span>
          <span style={{ flex: 1 }} />
          <button style={{ ...tblBtn, padding: "7px 12px", background: "transparent", color: "#92400e", border: `1px solid ${TBL.amberBorder}`, fontSize: 11 }} onClick={clearSelection}>✕ Clear</button>
          <button
            style={{ ...tblBtn, padding: "7px 14px", background: TBL.red, color: "#fff", border: "none", fontWeight: 600, fontSize: 11, opacity: deleting ? 0.6 : 1 }}
            onClick={() => setConfirmDelete({ ids: [...selectedIds], label: `${selectedIds.size} selected product${selectedIds.size === 1 ? "" : "s"}` })}>
            {deleting ? "Deleting…" : <><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg> Delete selected</>}
          </button>
        </div>
      )}

      {/* TABLE */}
      <AdminTableShell maxHeight="calc(100vh - 430px)" mobileMaxHeight="calc(100vh - 360px)" minHeight={360} mobileMinHeight={320} minWidth={1180}>
        <AdminTable>
          <thead>
            <tr>
              <th className="admin-pin-left" style={{ width: 44, textAlign: "center" }}>
                <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleAll} ariaLabel="Select all on page" />
              </th>
              <th style={{ width: 58 }}>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Brand</th>
              <th>SKU</th>
              <th style={{ width: 110 }}>Price</th>
              <th style={{ width: 90 }}>Stock</th>
              <th style={{ width: 150 }}>Status</th>
              <th className="admin-pin-right" style={{ width: 96, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {productsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <RowSkeleton key={i} widths={[15, 42, "65%", 70, 60, 110, 50, 30, 55, 80]} />
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: TBL.textMuted }}>No products matched the current filters.</td></tr>
            ) : (
              products.map((p) => {
                const selected = selectedIds.has(p.id);
                return (
                  <tr key={p.id} className={`admin-tbl-row${selected ? " selected" : ""}`}>
                    <td className="admin-pin-left" style={{ textAlign: "center" }}>
                      <Checkbox checked={selected} onChange={() => toggleOne(p.id)} ariaLabel={`Select ${p.name}`} />
                    </td>
                    <td><Thumb src={p.image} alt={p.name} /></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: TBL.textMuted, marginTop: 2, fontFamily: TBL.mono }}>/{p.slug}</div>
                    </td>
                    <td style={{ color: TBL.textSub }}>{p.category ?? "—"}</td>
                    <td style={{ color: TBL.textSub }}>{p.brand ?? "—"}</td>
                    <td><span style={{ fontFamily: TBL.mono, fontSize: 11, color: TBL.textSub }}>{p.sku || "—"}</span></td>
                    <td style={{ fontWeight: 600 }}>{money(p.price)}</td>
                    <td>{p.trackInventory ? p.stock : <Pill label="∞" color={TBL.amber} bg={TBL.amberBg} border={TBL.amberBorder} />}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {p.status === "active"
                          ? <Pill label="Visible" color="#166534" bg={TBL.greenBg} border={TBL.greenBorder} />
                          : <Pill label={p.status === "archived" ? "Archived" : "Hidden"} color="#6b7280" bg="#f9fafb" border="#e5e7eb" />}
                        {p.isFeatured && <Pill label="Featured" color="#1d4ed8" bg={TBL.blueBg} border={TBL.blueBorder} />}
                      </div>
                    </td>
                    <td className="admin-pin-right" style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button className="admin-act-btn" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => navigate(`/admin/products/${p.id}/edit`)}>
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></svg>
                        </button>
                        <button className="admin-act-btn del" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setConfirmDelete({ ids: [p.id], label: `"${p.name}"` })}>
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>
      </AdminTableShell>

      {/* PAGINATION */}
      {!countLoading && countMeta.last_page > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1px solid ${TBL.border}`, borderRadius: 10, background: "#fff", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 11, color: TBL.textMuted }}>
            {countMeta.total.toLocaleString()} products - page {page} of {countMeta.last_page}
          </span>
          <ReactPaginate
            pageCount={countMeta.last_page}
            forcePage={page - 1}
            onPageChange={({ selected }) => { setPage(selected + 1); clearSelection(); }}
            marginPagesDisplayed={1}
            pageRangeDisplayed={4}
            previousLabel="<"
            nextLabel=">"
            breakLabel="..."
            containerClassName="admin-pagination"
            activeClassName="selected"
            disabledClassName="disabled"
          />
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.label}?`}
          body="This is permanent - all product images, variants and options will also be removed."
          confirmLabel={`Delete ${confirmDelete.ids.length > 1 ? `${confirmDelete.ids.length} products` : "product"}`}
          busy={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => execDeleteAndRefresh(confirmDelete.ids)}
        />
      )}
    </div>
  );
}
