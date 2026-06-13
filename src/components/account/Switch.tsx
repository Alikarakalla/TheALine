import { motion } from "framer-motion";
import { GLOW_COLOR } from "../../lib/constants";

export default function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        padding: 3,
        background: on ? GLOW_COLOR : "rgba(84,84,84,0.25)",
        display: "flex",
        justifyContent: on ? "flex-end" : "flex-start",
        transition: "background 0.25s ease",
        flexShrink: 0,
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
      />
    </button>
  );
}
