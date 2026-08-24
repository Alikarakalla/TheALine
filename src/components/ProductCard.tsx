import { forwardRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR, asset } from "../lib/constants";
import { productImageFile, isSoldOut, type Product } from "../lib/products";
import { useProductNav } from "../context/ProductNav";
import { useMoney } from "../context/Currency";
import FavoriteButton from "./FavoriteButton";

const EASE = [0.22, 1, 0.36, 1] as const;
const SALE_RED = "#c4342c";

function Highlight({ text, q }: { text: string; q?: string }) {
  const t = (q || "").trim();
  if (!t) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(t.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: GLOW_COLOR, color: "#111", borderRadius: 3, padding: "0 1px" }}>
        {text.slice(idx, idx + t.length)}
      </span>
      {text.slice(idx + t.length)}
    </>
  );
}

type Colorway = { name: string; hex: string | null; image: string | null };

export type ProductCardProps = {
  product: Product;
  /** Position in its grid — used for the staggered entrance. */
  index?: number;
  /** Delay added before the stagger (e.g. while an overlay's curtain wipes). */
  baseDelay?: number;
  /** Image tile ratio. Defaults to the catalog-wide 3:4 standard. */
  aspectRatio?: string;
  showFavorite?: boolean;
  showQuickAdd?: boolean;
  /** Tighter type for search / related rows. */
  compact?: boolean;
  /** Keyboard-selected state (search). */
  highlighted?: boolean;
  /** Highlight the matching substring in the name (search). */
  query?: string;
  /** Override the click (e.g. search records the term first). Receives the <img>. */
  onSelect?: (product: Product, imgEl: HTMLImageElement) => void;
};

/**
 * THE product card — one shared component for Shop, Favorites, Search,
 * collections and the "you may also like" rail, modeled on the strongest
 * fashion PDCs: 3:4 stage with hover crossfade to the second photo, sale
 * pricing in retail red with the struck original and saving percentage,
 * a sold-out veil, and colourway thumbnails under the price that swap the
 * card's photo in place.
 */
const ProductCard = forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard(
  {
    product,
    index = 0,
    baseDelay = 0,
    aspectRatio = "3 / 4",
    showFavorite = true,
    showQuickAdd = false,
    compact = false,
    highlighted = false,
    query,
    onSelect,
  },
  ref
) {
  const { open } = useProductNav();
  const fmt = useMoney();
  const [hover, setHover] = useState(false);
  const [activeColor, setActiveColor] = useState<number | null>(null);

  // One entry per colour: its swatch hex and (when the colour's variants
  // carry photos) the image that represents it.
  const colorways = useMemo<Colorway[]>(() => {
    const colorAttr = product.attributes?.find((a) => a.options.some((o) => o.hex));
    if (colorAttr) {
      return colorAttr.options.map((o) => {
        const v = product.variants?.find(
          (vt) => vt.optionIds.includes(o.id) && (vt.image || vt.images?.length)
        );
        return { name: o.value, hex: o.hex ?? null, image: v?.image ?? v?.images?.[0] ?? null };
      });
    }
    return (product.colors ?? []).map((c) => ({ name: c.name, hex: c.hex || null, image: null }));
  }, [product]);

  const baseImg = product.images?.[0] || asset(productImageFile(product));
  const hoverImg = product.images?.[1] ?? null;
  const img = (activeColor != null && colorways[activeColor]?.image) || baseImg;

  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const savePct = onSale ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100) : 0;
  const soldOut = isSoldOut(product);

  const hasColorImages = colorways.some((c) => c.image);
  const maxSwatches = compact ? 3 : 4;
  const extra = Math.max(0, colorways.length - maxSwatches);

  const handleClick = (e: React.MouseEvent) => {
    // Let the browser own modified clicks (new tab/window, download) — this is
    // a real link, so cmd/ctrl/shift-click and middle-click must keep working.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = (e.currentTarget as HTMLElement).querySelector("img") as HTMLImageElement | null;
    if (!el) return;
    e.preventDefault();
    if (onSelect) onSelect(product, el);
    else open(product, el, img);
  };

  return (
    // A real <a href> — the card used to be a click-handler div, so keyboard
    // users could not reach any product and nobody could open one in a new tab.
    // The morph still runs for plain clicks; the href is the fallback.
    <motion.a
      ref={ref}
      href={`/product/${product.id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.5, ease: EASE, delay: baseDelay + Math.min(index * 0.05, 0.4) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // Capture phase: a click on any control inside the card (favourite heart,
      // colour swatch) must not follow the card's href. Those handlers call
      // stopPropagation, so a bubble-phase guard here would never see the
      // event — capture runs first and cancels the navigation regardless.
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        display: "block",
        color: "inherit",
        textDecoration: "none",
        width: "100%",
        background: highlighted ? "rgba(0,0,0,0.03)" : "transparent",
        border: highlighted ? "1px solid #141414" : "1px solid transparent",
        borderRadius: 14,
        padding: highlighted ? 8 : 0,
        fontFamily: "'Inter Tight', sans-serif",
        textAlign: "left",
      }}
    >
      {/* image stage — 3:4, panel colour, crossfade to the 2nd photo on hover */}
      <div style={{ position: "relative", background: product.panel, borderRadius: 10, overflow: "hidden", aspectRatio }}>
        <motion.img
          src={img}
          alt={product.name}
          animate={{ scale: hover && !hoverImg ? 1.04 : 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            filter: soldOut ? "grayscale(0.7) opacity(0.6)" : "none",
            transition: "filter 0.3s ease",
          }}
        />
        {hoverImg && activeColor == null && !soldOut && (
          <motion.img
            src={hoverImg}
            alt=""
            aria-hidden="true"
            initial={false}
            animate={{ opacity: hover ? 1 : 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
          />
        )}

        {showFavorite && (
          <div
            style={{ position: "absolute", top: 10, right: 10, zIndex: 4 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteButton productId={product.id} size={compact ? 30 : 34} />
          </div>
        )}

        {/* ONE quiet label, never a stack: sale wins, else the first tag as a
            frosted chip with the tag's colour as a small dot. */}
        {!soldOut && (onSale || (product.tags && product.tags.length > 0)) && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 3, maxWidth: "72%" }}>
            {onSale ? (
              <span
                style={{
                  display: "inline-block",
                  background: SALE_RED,
                  color: "#fff",
                  fontSize: compact ? 9.5 : 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.4px",
                  padding: compact ? "3px 7px" : "4px 8px",
                  borderRadius: 3,
                  lineHeight: 1.3,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                −{savePct}%
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(255,255,255,0.82)",
                  backdropFilter: "blur(5px)",
                  WebkitBackdropFilter: "blur(5px)",
                  color: "rgba(20,20,20,0.85)",
                  fontSize: compact ? 9 : 9.5,
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  padding: compact ? "3px 8px" : "4px 9px",
                  borderRadius: 3,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {product.tags![0].color && (
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: product.tags![0].color!, flexShrink: 0 }} />
                )}
                {product.tags![0].name}
              </span>
            )}
          </div>
        )}

        {/* sold out — the photo dims to grey with one centred chip */}
        {soldOut && (
          <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", padding: compact ? "6px 12px" : "8px 16px", borderRadius: 3, fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: "1.6px", textTransform: "uppercase", color: "rgba(20,20,20,0.8)" }}>
              Sold out
            </span>
          </div>
        )}

        {showQuickAdd && !soldOut && (
          <motion.div
            initial={false}
            animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 8 }}
            transition={{ duration: 0.3, ease: EASE }}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              textAlign: "center",
              background: "rgba(17,17,17,0.9)",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 500,
              backdropFilter: "blur(6px)",
            }}
          >
            View product
          </motion.div>
        )}
      </div>

      {/* info block — name, price row, colourways */}
      <div style={{ marginTop: compact ? 9 : 12 }}>
        <div style={{ fontSize: compact ? 13 : 14.5, fontWeight: 500, letterSpacing: "-0.2px", color: TEXT_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Highlight text={product.name} q={query} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: compact ? 13 : 14.5, fontWeight: 500, color: onSale ? SALE_RED : TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>
            {fmt(product.price)}
          </span>
          {onSale && (
            <span style={{ fontSize: compact ? 11 : 12, color: "rgba(84,84,84,0.5)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
              {fmt(product.compareAtPrice as number)}
            </span>
          )}
        </div>

        {/* colourways — variant photos when they exist, swatch dots otherwise */}
        {colorways.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: hasColorImages ? 5 : 7, marginTop: compact ? 6 : 8 }}>
            {colorways.slice(0, maxSwatches).map((c, i) => {
              const selected = activeColor === i;
              const pick = (e: React.MouseEvent) => {
                // Inside the card's <a>: block the browser's own link
                // activation too, or picking a colour would navigate away.
                e.preventDefault();
                e.stopPropagation();
                setActiveColor(selected ? null : i);
              };
              return hasColorImages ? (
                <button
                  key={`${c.name}-${i}`}
                  onClick={pick}
                  aria-label={c.name}
                  title={c.name}
                  style={{
                    width: compact ? 24 : 28,
                    height: compact ? 31 : 36, // 3:4, matching the stage
                    padding: 0,
                    border: "none",
                    borderRadius: 3,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: product.panel,
                    outline: "none",
                    boxShadow: selected ? "0 0 0 1.5px #141414" : "0 0 0 1px rgba(84,84,84,0.16)",
                    transition: "box-shadow 0.2s ease",
                  }}
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt=""
                      draggable={false}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <span style={{ display: "block", width: "100%", height: "100%", background: c.hex || product.panel }} />
                  )}
                </button>
              ) : (
                <button
                  key={`${c.name}-${i}`}
                  onClick={pick}
                  aria-label={c.name}
                  title={c.name}
                  style={{
                    width: compact ? 11 : 13,
                    height: compact ? 11 : 13,
                    padding: 0,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    background: c.hex || "#ccc",
                    boxShadow: selected ? "0 0 0 1.5px #fff, 0 0 0 2.5px #141414" : "0 0 0 1px rgba(84,84,84,0.25)",
                    transition: "box-shadow 0.2s ease",
                  }}
                />
              );
            })}
            {extra > 0 && (
              <span style={{ fontSize: compact ? 10.5 : 11.5, color: "rgba(84,84,84,0.55)" }}>+{extra}</span>
            )}
          </div>
        )}
      </div>
    </motion.a>
  );
});

export default ProductCard;
