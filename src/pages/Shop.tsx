import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import ProductCard from "../components/ProductCard";
import { TEXT_COLOR, GLOW_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCatalog, type CategoryNode } from "../context/Catalog";
import { indexBySlug, productInCategories } from "../lib/categoryTree";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name", label: "Name: A–Z" },
];

const PRICE_BUCKETS = [
  { id: "u130", label: "Under €130", test: (p: number) => p < 130 },
  { id: "130-150", label: "€130 – €150", test: (p: number) => p >= 130 && p <= 150 },
  { id: "o150", label: "Over €150", test: (p: number) => p > 150 },
];

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/* ----------------------------------------------------------------- sort UI */

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.id === value)!;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#fff",
          border: "1px solid rgba(84,84,84,0.2)",
          borderRadius: 999,
          padding: "10px 18px",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: TEXT_COLOR,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: 0.55 }}>Sort</span> {current.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ fontSize: 10 }}>
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 30,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(84,84,84,0.12)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
              padding: 6,
              minWidth: 210,
            }}
          >
            {SORTS.map((s) => (
              <button
                key={s.id}
                onMouseDown={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: s.id === value ? "rgba(84,84,84,0.06)" : "none",
                  border: "none",
                  borderRadius: 9,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13,
                  fontWeight: s.id === value ? 600 : 400,
                  color: TEXT_COLOR,
                  textAlign: "left",
                }}
              >
                {s.label}
                {s.id === value && <span style={{ color: "#9bb400" }}>●</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------- filter panel */

/** Collect every slug in a tree (for the default-expanded set). */
const allSlugs = (nodes: CategoryNode[]): string[] =>
  nodes.flatMap((n) => [n.slug, ...allSlugs(n.children || [])]);

/** Recursive, collapsible category picker. Selecting a parent matches all of
 *  its descendants too (handled by the page-level filter). */
function CategoryTreeFilter({
  nodes,
  selected,
  onToggle,
}: {
  nodes: CategoryNode[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allSlugs(nodes)));
  const toggleExpand = (slug: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

  const renderNode = (n: CategoryNode, depth: number) => {
    const kids = n.children || [];
    const open = expanded.has(n.slug);
    return (
      <div key={n.id}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: depth * 14 }}>
          {kids.length ? (
            <button
              onClick={() => toggleExpand(n.slug)}
              aria-label={open ? "Collapse" : "Expand"}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", width: 14, color: "rgba(84,84,84,0.55)", lineHeight: 1 }}
            >
              <motion.span animate={{ rotate: open ? 90 : 0 }} style={{ display: "inline-block", fontSize: 10 }}>
                ▸
              </motion.span>
            </button>
          ) : (
            <span style={{ width: 14, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Check label={n.name} checked={selected.includes(n.slug)} onChange={() => onToggle(n.slug)} />
          </div>
          {n.totalCount > 0 && (
            <span style={{ fontSize: 11.5, color: "rgba(84,84,84,0.4)", flexShrink: 0 }}>{n.totalCount}</span>
          )}
        </div>
        {kids.length > 0 && (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}
              >
                {kids.map((k) => renderNode(k, depth + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{nodes.map((n) => renderNode(n, 0))}</div>;
}

function FilterPanel({
  cats,
  colors,
  buckets,
  onToggleCat,
  onToggleColor,
  onToggleBucket,
}: {
  cats: string[];
  colors: string[];
  buckets: string[];
  onToggleCat: (v: string) => void;
  onToggleColor: (v: string) => void;
  onToggleBucket: (v: string) => void;
}) {
  const { categories, categoryTree, colors: allColors } = useCatalog();
  const hasTree = categoryTree.length > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      {/* category */}
      <div>
        <FilterTitle>Category</FilterTitle>
        {hasTree ? (
          <CategoryTreeFilter nodes={categoryTree} selected={cats} onToggle={onToggleCat} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map((c) => (
              <Check key={c} label={c} checked={cats.includes(c)} onChange={() => onToggleCat(c)} />
            ))}
          </div>
        )}
      </div>

      {/* color */}
      <div>
        <FilterTitle>Color</FilterTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {allColors.map((c) => {
            const on = colors.includes(c.name);
            // Colour options render as a swatch; non-colour variants (no hex)
            // render as a readable text pill so the filter stays discoverable.
            return c.hex ? (
              <button
                key={c.name}
                onClick={() => onToggleColor(c.name)}
                title={c.name}
                aria-label={c.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c.hex,
                  cursor: "pointer",
                  border: on ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                  outline: on ? `2px solid ${GLOW_COLOR}` : "none",
                  outlineOffset: 2,
                  transition: "outline 0.2s ease, border 0.2s ease",
                }}
              />
            ) : (
              <button
                key={c.name}
                onClick={() => onToggleColor(c.name)}
                title={c.name}
                style={{
                  height: 28,
                  padding: "0 12px",
                  borderRadius: 999,
                  background: on ? GLOW_COLOR : "transparent",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12.5,
                  fontWeight: on ? 600 : 400,
                  color: "#111",
                  border: on ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                  transition: "background 0.2s ease, border 0.2s ease",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* price */}
      <div>
        <FilterTitle>Price</FilterTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PRICE_BUCKETS.map((b) => (
            <Check
              key={b.id}
              label={b.label}
              checked={buckets.includes(b.id)}
              onChange={() => onToggleBucket(b.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "2px",
        color: "rgba(84,84,84,0.5)",
        marginBottom: 14,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14,
        color: TEXT_COLOR,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: checked ? "none" : "1.5px solid rgba(84,84,84,0.35)",
          background: checked ? GLOW_COLOR : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.2s ease",
        }}
      >
        {checked && (
          <span style={{ color: "#111", fontSize: 12, lineHeight: 1 }}>✓</span>
        )}
      </span>
      {label}
    </button>
  );
}

/* product card is the shared <ProductCard /> (src/components/ProductCard.tsx) */

/* -------------------------------------------------------------------- page */

export default function Shop() {
  const isMobile = useIsMobile();
  const { products, categoryTree } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cats, setCats] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [sort, setSort] = useState("featured");
  const [drawer, setDrawer] = useState(false);

  // In tree mode `cats` holds category slugs; without a tree (offline seed) it
  // falls back to category names.
  const hasTree = categoryTree.length > 0;
  const bySlug = useMemo(() => indexBySlug(categoryTree), [categoryTree]);

  useEffect(() => {
    setPageMeta({
      title: "Shop all bags | The A Line",
      description:
        "Browse the full The A Line collection — totes, clutches, shoulder bags and crossbodies. Filter by category, colour and price.",
      url: window.location.origin + "/shop",
    });
    return () => resetPageMeta();
  }, []);

  // Preselect a category from the URL (?category=slug), e.g. from the header
  // menu. Runs once the tree is available and the slug resolves to a category.
  useEffect(() => {
    const slug = searchParams.get("category");
    if (slug && hasTree && bySlug.has(slug)) setCats([slug]);
  }, [searchParams, hasTree, bySlug]);

  const results = useMemo(() => {
    let list = products.filter((p) => {
      if (cats.length) {
        const inCat = hasTree
          ? productInCategories(p, cats, bySlug)
          : cats.includes(p.category);
        if (!inCat) return false;
      }
      if (colors.length && !p.colors.some((c) => colors.includes(c.name)))
        return false;
      if (
        buckets.length &&
        !PRICE_BUCKETS.some((b) => buckets.includes(b.id) && b.test(p.price))
      )
        return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc")
      list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "name")
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, cats, colors, buckets, sort, hasTree, bySlug]);

  // Drop the ?category= param so a cleared/removed category filter doesn't get
  // re-applied from the URL on the next render.
  const dropCategoryParam = () => {
    if (searchParams.has("category")) {
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const activeChips = [
    ...cats.map((c) => ({
      kind: "cat" as const,
      value: c,
      label: hasTree ? bySlug.get(c)?.name ?? c : c,
    })),
    ...colors.map((c) => ({ kind: "color" as const, value: c, label: c })),
    ...buckets.map((b) => ({
      kind: "bucket" as const,
      value: b,
      label: PRICE_BUCKETS.find((x) => x.id === b)!.label,
    })),
  ];
  const clearAll = () => {
    setCats([]);
    setColors([]);
    setBuckets([]);
    dropCategoryParam();
  };
  const removeChip = (kind: string, value: string) => {
    if (kind === "cat") {
      setCats((a) => a.filter((x) => x !== value));
      dropCategoryParam();
    } else if (kind === "color") setColors((a) => a.filter((x) => x !== value));
    else setBuckets((a) => a.filter((x) => x !== value));
  };

  const panelProps = {
    cats,
    colors,
    buckets,
    onToggleCat: (v: string) => setCats((a) => toggle(a, v)),
    onToggleColor: (v: string) => setColors((a) => toggle(a, v)),
    onToggleBucket: (v: string) => setBuckets((a) => toggle(a, v)),
  };

  return (
    <div
      data-tone="light"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />

      {/* title */}
      <div
        style={{
          padding: isMobile ? `110px ${PAGE_PAD} 24px` : `150px ${PAGE_PAD} 30px`,
          maxWidth: PAGE_MAX,
          margin: "0 auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(84,84,84,0.5)",
              marginBottom: 14,
            }}
          >
            THE CATALOG
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontSize: isMobile ? "clamp(40px, 13vw, 72px)" : 72,
                fontWeight: 600,
                letterSpacing: "-3px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              Shop
            </span>
            <SerifGlow
              word="all"
              italic
              fontSize={isMobile ? "clamp(44px, 14vw, 78px)" : 78}
              lineHeight={isMobile ? "clamp(40px, 13vw, 74px)" : 74}
              letterSpacing={-3}
              strokeWidth={isMobile ? "clamp(9px, 3vw, 16px)" : 16}
              delay={0.3}
            />
          </div>
        </motion.div>
      </div>

      {/* toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(84,84,84,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: PAGE_MAX,
            margin: "0 auto",
            padding: isMobile ? `12px ${PAGE_PAD}` : `16px ${PAGE_PAD}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isMobile && (
              <button
                onClick={() => setDrawer(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid rgba(84,84,84,0.2)",
                  borderRadius: 999,
                  padding: "9px 16px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                }}
              >
                Filters
                {activeChips.length > 0 && (
                  <span
                    style={{
                      background: GLOW_COLOR,
                      color: "#111",
                      borderRadius: 999,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {activeChips.length}
                  </span>
                )}
              </button>
            )}
            <span style={{ fontSize: 13, color: "rgba(84,84,84,0.7)" }}>
              {results.length} {results.length === 1 ? "result" : "results"}
            </span>
          </div>
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>

      {/* body */}
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `24px ${PAGE_PAD} 80px` : `40px ${PAGE_PAD} 100px`,
          display: "flex",
          gap: 48,
          alignItems: "flex-start",
        }}
      >
        {/* desktop sidebar */}
        {!isMobile && (
          <aside
            style={{
              flex: "0 0 220px",
              position: "sticky",
              top: 80,
            }}
          >
            <FilterPanel {...panelProps} />
          </aside>
        )}

        {/* grid + chips */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* active chips */}
          {activeChips.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 24,
                alignItems: "center",
              }}
            >
              {activeChips.map((c) => (
                <button
                  key={c.kind + c.value}
                  onClick={() => removeChip(c.kind, c.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#fff",
                    border: "1px solid rgba(84,84,84,0.18)",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12.5,
                    color: TEXT_COLOR,
                  }}
                >
                  {c.label}
                  <span style={{ opacity: 0.5, fontSize: 14 }}>✕</span>
                </button>
              ))}
              <button
                onClick={clearAll}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "rgba(84,84,84,0.7)",
                  textDecoration: "underline",
                }}
              >
                Clear all
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div
              style={{
                padding: "80px 0",
                textAlign: "center",
                color: "rgba(84,84,84,0.6)",
              }}
            >
              <div style={{ fontSize: 22, color: TEXT_COLOR, marginBottom: 8 }}>
                Nothing matches
              </div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>
                Try removing a filter to see more pieces.
              </div>
              <button
                onClick={clearAll}
                style={{
                  background: GLOW_COLOR,
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 26px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111",
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <LayoutGroup>
              <motion.div
                layout
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, 1fr)"
                    : "repeat(3, 1fr)",
                  gap: isMobile ? 16 : 28,
                }}
              >
                <AnimatePresence mode="popLayout">
                  {results.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} showQuickAdd />
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
        </div>
      </div>

      {/* mobile filter drawer */}
      <AnimatePresence>
        {drawer && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: "rgba(17,17,17,0.4)",
              }}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: "82%",
                maxWidth: 340,
                zIndex: 201,
                background: "#ffffff",
                padding: "24px 24px 40px",
                overflowY: "auto",
                boxShadow: "20px 0 60px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 28,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: TEXT_COLOR,
                  }}
                >
                  Filters
                </span>
                <button
                  onClick={() => setDrawer(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    color: TEXT_COLOR,
                  }}
                >
                  ✕
                </button>
              </div>
              <FilterPanel {...panelProps} />
              <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                <button
                  onClick={clearAll}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "1px solid rgba(84,84,84,0.25)",
                    borderRadius: 999,
                    padding: "13px 0",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    color: TEXT_COLOR,
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setDrawer(false)}
                  style={{
                    flex: 2,
                    background: GLOW_COLOR,
                    border: "none",
                    borderRadius: 999,
                    padding: "13px 0",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  Show {results.length} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
