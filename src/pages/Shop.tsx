import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import ProductCard from "../components/ProductCard";
import { useMoney } from "../context/Currency";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  TEXT_COLOR_HEX,
  GLOW_COLOR_HEX,
  PAGE_MAX,
  PAGE_PAD,
} from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCatalog, type CategoryNode } from "../context/Catalog";
import { indexBySlug, productInCategories } from "../lib/categoryTree";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.12)";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name", label: "Name: A–Z" },
];

// Bounds are BASE-currency amounts; labels are rendered through the currency
// formatter so they follow the shopper's selected currency.
const PRICE_BUCKETS = [
  { id: "u130", min: 0, max: 130, test: (p: number) => p < 130 },
  { id: "130-150", min: 130, max: 150, test: (p: number) => p >= 130 && p <= 150 },
  { id: "o150", min: 150, max: Infinity, test: (p: number) => p > 150 },
];
const bucketLabel = (
  b: (typeof PRICE_BUCKETS)[number],
  m: (n: number, approx?: boolean) => string
) =>
  b.min === 0
    ? `Under ${m(b.max, true)}`
    : b.max === Infinity
      ? `Over ${m(b.min, true)}`
      : `${m(b.min, true)} – ${m(b.max, true)}`;

const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

/* ------------------------------------------------------------------ icons */
/* Drawn 1.6-stroke glyphs — one consistent weight, no unicode stand-ins. */

function Glyph({
  children,
  size = 13,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto", display: "block" }}
    >
      {children}
    </svg>
  );
}
const ChevronDown = <path d="m6 9 6 6 6-6" />;
const ChevronRight = <path d="m9 6 6 6-6 6" />;
const XGlyph = (
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>
);
const CheckGlyph = <path d="M20 6.5 9.5 17 4 11.5" />;
const SlidersGlyph = (
  <>
    <path d="M4 7h16" />
    <circle cx="9.5" cy="7" r="2.4" />
    <path d="M4 17h16" />
    <circle cx="14.5" cy="17" r="2.4" />
  </>
);

/* ---------------------------------------------------------------- popover */

function FilterPopover({
  label,
  activeCount = 0,
  align = "left",
  children,
}: {
  label: string;
  activeCount?: number;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const engaged = open || activeCount > 0;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: `1px solid ${engaged ? "rgba(58,58,58,0.55)" : "rgba(58,58,58,0.2)"}`,
          borderRadius: 999,
          padding: "9px 16px",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: TEXT_COLOR,
          whiteSpace: "nowrap",
          transition: "border 0.2s ease",
        }}
      >
        {label}
        {activeCount > 0 && (
          <span
            style={{
              background: "#141414",
              color: "#ffffff",
              borderRadius: 999,
              padding: "1px 7px",
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {activeCount}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          style={{ display: "inline-flex", opacity: 0.6 }}
        >
          <Glyph size={12}>{ChevronDown}</Glyph>
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 45 }}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                [align]: 0,
                zIndex: 46,
                background: "#fff",
                borderRadius: 14,
                border: HAIRLINE,
                boxShadow: "0 18px 40px rgba(17,17,17,0.1)",
                padding: 16,
                minWidth: 250,
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- sort UI */

function SortControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = SORTS.find((s) => s.id === value)!;
  return (
    <FilterPopover label={`Sort · ${current.label}`} align="right">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              background: s.id === value ? "rgba(58,58,58,0.06)" : "none",
              border: "none",
              borderRadius: 9,
              padding: "10px 12px",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: s.id === value ? 600 : 400,
              color: TEXT_COLOR,
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
            {s.id === value && <Glyph size={13}>{CheckGlyph}</Glyph>}
          </button>
        ))}
      </div>
    </FilterPopover>
  );
}

/* ---------------------------------------------------------- filter pieces */

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
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                width: 14,
                color: "rgba(58,58,58,0.55)",
                lineHeight: 1,
              }}
            >
              <motion.span
                animate={{ rotate: open ? 90 : 0 }}
                style={{ display: "inline-flex" }}
              >
                <Glyph size={11}>{ChevronRight}</Glyph>
              </motion.span>
            </button>
          ) : (
            <span style={{ width: 14, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Check label={n.name} checked={selected.includes(n.slug)} onChange={() => onToggle(n.slug)} />
          </div>
          {n.totalCount > 0 && (
            <span
              style={{
                fontSize: 11.5,
                color: "rgba(58,58,58,0.45)",
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {n.totalCount}
            </span>
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

function CategoryFilterBody({
  cats,
  onToggleCat,
}: {
  cats: string[];
  onToggleCat: (v: string) => void;
}) {
  const { categories, categoryTree } = useCatalog();
  return categoryTree.length > 0 ? (
    <CategoryTreeFilter nodes={categoryTree} selected={cats} onToggle={onToggleCat} />
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {categories.map((c) => (
        <Check key={c} label={c} checked={cats.includes(c)} onChange={() => onToggleCat(c)} />
      ))}
    </div>
  );
}

function ColorFilterBody({
  colors,
  onToggleColor,
}: {
  colors: string[];
  onToggleColor: (v: string) => void;
}) {
  const { colors: allColors } = useCatalog();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 250 }}>
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
            aria-pressed={on}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: c.hex,
              cursor: "pointer",
              border: on ? "2px solid #111" : "2px solid rgba(58,58,58,0.2)",
              outline: "none",
              outlineOffset: 2,
              transition: "outline 0.2s ease, border 0.2s ease",
            }}
          />
        ) : (
          <button
            key={c.name}
            onClick={() => onToggleColor(c.name)}
            title={c.name}
            aria-pressed={on}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 999,
              background: on ? "#141414" : "transparent",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12.5,
              fontWeight: on ? 600 : 400,
              color: on ? "#ffffff" : "#111",
              border: on ? "2px solid #111" : "2px solid rgba(58,58,58,0.2)",
              transition: "background 0.2s ease, border 0.2s ease",
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function PriceFilterBody({
  buckets,
  onToggleBucket,
}: {
  buckets: string[];
  onToggleBucket: (v: string) => void;
}) {
  const fmt = useMoney();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {PRICE_BUCKETS.map((b) => (
        <Check
          key={b.id}
          label={bucketLabel(b, fmt)}
          checked={buckets.includes(b.id)}
          onChange={() => onToggleBucket(b.id)}
        />
      ))}
    </div>
  );
}

/** Full stacked filter set — used by the mobile drawer. */
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <div>
        <FilterTitle>Category</FilterTitle>
        <CategoryFilterBody cats={cats} onToggleCat={onToggleCat} />
      </div>
      <div>
        <FilterTitle>Color</FilterTitle>
        <ColorFilterBody colors={colors} onToggleColor={onToggleColor} />
      </div>
      <div>
        <FilterTitle>Price</FilterTitle>
        <PriceFilterBody buckets={buckets} onToggleBucket={onToggleBucket} />
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
        color: "rgba(58,58,58,0.62)",
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
      role="checkbox"
      aria-checked={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 13.5,
        color: TEXT_COLOR,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: checked ? "none" : "1.5px solid rgba(58,58,58,0.35)",
          background: checked ? "#141414" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#ffffff",
          transition: "background 0.2s ease",
        }}
      >
        {checked && <Glyph size={11}>{CheckGlyph}</Glyph>}
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

  const fmt = useMoney();
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
      label: bucketLabel(PRICE_BUCKETS.find((x) => x.id === b)!, fmt),
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
      className="shop-page"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Browser surfaces carry the brand too: selection + focus rings. */}
      <style>{`
        .shop-page ::selection{background:rgba(217,196,154,0.5)}
        .shop-page button:focus-visible{outline:2px solid #141414;outline-offset:2px}
        .shop-chip{transition:border 0.2s ease,color 0.2s ease}
        .shop-chip:hover{border-color:rgba(58,58,58,0.55)}
        .shop-clear{transition:color 0.2s ease}
        .shop-clear:hover{color:${TEXT_COLOR_HEX}}
      `}</style>
      <Header />

      {/* title */}
      <div
        style={{
          padding: isMobile ? `108px ${PAGE_PAD} 26px` : `142px ${PAGE_PAD} 36px`,
          maxWidth: PAGE_MAX,
          margin: "0 auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: "flex", alignItems: "baseline", gap: 14 }}
        >
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
        </motion.div>
      </div>

      {/* filter bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: HAIRLINE,
          borderBottom: HAIRLINE,
        }}
      >
        <div
          style={{
            maxWidth: PAGE_MAX,
            margin: "0 auto",
            padding: isMobile ? `11px ${PAGE_PAD}` : `13px ${PAGE_PAD}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          {isMobile ? (
            <button
              onClick={() => setDrawer(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                border: `1px solid ${activeChips.length ? "rgba(58,58,58,0.55)" : "rgba(58,58,58,0.2)"}`,
                borderRadius: 999,
                padding: "9px 16px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: TEXT_COLOR,
              }}
            >
              <Glyph size={13}>{SlidersGlyph}</Glyph>
              Filter
              {activeChips.length > 0 && (
                <span
                  style={{
                    background: "#141414",
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {activeChips.length}
                </span>
              )}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(58,58,58,0.72)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {results.length} {results.length === 1 ? "result" : "results"}
              </span>
              {activeChips.length > 0 && (
                <button
                  onClick={clearAll}
                  className="shop-clear"
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 4px",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "rgba(58,58,58,0.62)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
          <SortControl value={sort} onChange={setSort} />
        </div>
      </div>

      {/* body */}
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `24px ${PAGE_PAD} 80px` : `36px ${PAGE_PAD} 100px`,
          display: "flex",
          gap: isMobile ? 0 : 56,
          alignItems: "flex-start",
        }}
      >
        {/* desktop sidebar */}
        {!isMobile && (
          <aside style={{ flex: "0 0 230px", position: "sticky", top: 96 }}>
            <FilterPanel {...panelProps} />
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
        {/* active chips */}
        {activeChips.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: isMobile ? 20 : 28,
              alignItems: "center",
            }}
          >
            {activeChips.map((c) => (
              <button
                key={c.kind + c.value}
                onClick={() => removeChip(c.kind, c.value)}
                className="shop-chip"
                aria-label={`Remove filter ${c.label}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#fff",
                  border: "1px solid rgba(58,58,58,0.18)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12.5,
                  color: TEXT_COLOR,
                }}
              >
                {c.label}
                <span style={{ opacity: 0.55, display: "inline-flex" }}>
                  <Glyph size={11}>{XGlyph}</Glyph>
                </span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 ? (
          <div
            style={{
              padding: "90px 0",
              textAlign: "center",
              color: "rgba(58,58,58,0.62)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 500, color: TEXT_COLOR, marginBottom: 8 }}>
              Nothing matches
            </div>
            <div style={{ fontSize: 14, marginBottom: 22 }}>
              Try removing a filter to see more pieces.
            </div>
            <button
              onClick={clearAll}
              style={{
                background: "#141414",
                border: "none",
                borderRadius: 999,
                padding: "13px 28px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
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
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                gap: isMobile ? "24px 16px" : "44px 32px",
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
                <span style={{ fontSize: 18, fontWeight: 600, color: TEXT_COLOR }}>
                  Filter
                </span>
                <button
                  onClick={() => setDrawer(false)}
                  aria-label="Close filters"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 6,
                    cursor: "pointer",
                    color: TEXT_COLOR,
                    display: "inline-flex",
                  }}
                >
                  <Glyph size={16}>{XGlyph}</Glyph>
                </button>
              </div>
              <FilterPanel {...panelProps} />
              <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                <button
                  onClick={clearAll}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "1px solid rgba(58,58,58,0.25)",
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
                    background: "#141414",
                    border: "none",
                    borderRadius: 999,
                    padding: "13px 0",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  Show {results.length} result{results.length === 1 ? "" : "s"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
