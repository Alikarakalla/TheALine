import { motion } from "framer-motion";
import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";
import { useFavorites } from "../context/Favorites";

export default function FavoriteButton({
  productId,
  size = 36,
  variant = "floating",
}: {
  productId: string;
  size?: number;
  /** "floating" = circular chip (on image tiles); "outline" = bordered square (in rows). */
  variant?: "floating" | "outline";
}) {
  const { has, toggle } = useFavorites();
  const active = has(productId);
  const iconSize = Math.round(size * 0.5);

  const base: React.CSSProperties =
    variant === "floating"
      ? {
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          border: "none",
          boxShadow: "0 0 0 1px rgba(20,20,20,0.06), 0 2px 8px rgba(0,0,0,0.06)",
        }
      : {
          width: size,
          height: size,
          borderRadius: 999,
          background: "#fff",
          border: `1px solid ${active ? "#141414" : "rgba(84,84,84,0.25)"}`,
        };

  return (
    <motion.button
      onClick={(e) => {
        // This button sits inside the product card's <a>. preventDefault must
        // happen here — stopPropagation alone keeps the ancestor handler from
        // running, so nothing would cancel the browser's own link navigation.
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      whileTap={{ scale: 0.85 }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {/* classically proportioned heart; saved = the brand's gold */}
      <motion.svg
        key={String(active)}
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        initial={{ scale: active ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
      >
        <path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.51 4.05 3 5.5l7 7Z"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            fill: active ? GLOW_COLOR : "none",
            stroke: active ? "#C9B183" : TEXT_COLOR,
            transition: "fill 0.2s ease, stroke 0.2s ease",
          }}
        />
      </motion.svg>
    </motion.button>
  );
}
