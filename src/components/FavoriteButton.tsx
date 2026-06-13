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
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(6px)",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }
      : {
          width: size,
          height: size,
          borderRadius: 999,
          background: "#fff",
          border: `1px solid ${active ? GLOW_COLOR : "rgba(84,84,84,0.25)"}`,
        };

  return (
    <motion.button
      onClick={(e) => {
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
      <motion.svg
        key={String(active)}
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        initial={{ scale: active ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
      >
        <path
          d="M12 21s-7.5-4.9-10-9.2C0 8 2 4.5 5.5 4.5 8 4.5 9.6 6 12 8c2.4-2 4-3.5 6.5-3.5C22 4.5 24 8 22 11.8 19.5 16.1 12 21 12 21z"
          strokeWidth={active ? 1 : 1.6}
          style={{ fill: active ? GLOW_COLOR : "none", stroke: active ? "#111" : TEXT_COLOR }}
        />
      </motion.svg>
    </motion.button>
  );
}
