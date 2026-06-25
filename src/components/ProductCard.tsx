import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR, asset } from "../lib/constants";
import { productImageFile, type Product } from "../lib/products";
import { useProductNav } from "../context/ProductNav";
import FavoriteButton from "./FavoriteButton";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pick black or white text for legibility on a given hex background. */
function readableOn(hex?: string | null): string {
  if (!hex) return "#fff";
  const h = hex.replace("#", "");
  if (h.length < 6) return "#fff";
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#111" : "#fff";
}

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

export type ProductCardProps = {
  product: Product;
  /** Position in its grid — used for the staggered entrance. */
  index?: number;
  /** Delay added before the stagger (e.g. while an overlay's curtain wipes). */
  baseDelay?: number;
  /** Image tile ratio. Defaults to the storefront 4:5. */
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
 * The one product card used across Shop, Favorites, Search and the
 * "you may also like" row. The image always fills the tile (`cover`) so any
 * uploaded photo fits consistently; variants are driven by props.
 */
const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(function ProductCard(
  {
    product,
    index = 0,
    baseDelay = 0,
    aspectRatio = "4 / 5",
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
  const [hover, setHover] = useState(false);
  const img = product.images?.[0] || asset(productImageFile(product));

  const handleClick = (e: React.MouseEvent) => {
    const el = (e.currentTarget as HTMLElement).querySelector("img") as HTMLImageElement | null;
    if (!el) return;
    if (onSelect) onSelect(product, el);
    else open(product, el, img);
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.5, ease: EASE, delay: baseDelay + Math.min(index * 0.05, 0.4) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        width: "100%",
        background: highlighted ? "rgba(0,0,0,0.03)" : "transparent",
        border: highlighted ? `1px solid ${GLOW_COLOR}` : "1px solid transparent",
        borderRadius: 14,
        padding: highlighted ? 8 : 0,
        fontFamily: "'Inter Tight', sans-serif",
        textAlign: "left",
      }}
    >
      <div style={{ position: "relative", background: product.panel, borderRadius: 12, overflow: "hidden", aspectRatio }}>
        <motion.img
          src={img}
          alt={product.name}
          animate={{ scale: hover ? 1.05 : 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {showFavorite && (
          <div style={{ position: "absolute", top: 12, right: 12 }} onClick={(e) => e.stopPropagation()}>
            <FavoriteButton productId={product.id} />
          </div>
        )}
        {/* tag badges — top-left, coloured per the tag's admin colour */}
        {product.tags && product.tags.length > 0 && (
          <div style={{ position: "absolute", top: 12, left: 12, zIndex: 3, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", maxWidth: "70%" }}>
            {product.tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                style={{
                  display: "inline-block",
                  background: t.color || "#111111",
                  color: readableOn(t.color),
                  fontSize: compact ? 9.5 : 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.4px",
                  textTransform: "uppercase",
                  padding: compact ? "2px 7px" : "3px 9px",
                  borderRadius: 999,
                  lineHeight: 1.3,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        {showQuickAdd && (
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: compact ? 10 : 14, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: compact ? 14 : 17, fontWeight: 500, letterSpacing: "-0.3px", color: TEXT_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <Highlight text={product.name} q={query} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)", marginTop: 2 }}>{product.category}</div>
        </div>
        <div style={{ fontSize: compact ? 13 : 15, fontWeight: 500, color: TEXT_COLOR, whiteSpace: "nowrap" }}>
          €{product.price.toFixed(2)}
        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
