import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";

type Kind = "New" | "Bestseller" | "Limited" | "Low stock" | "Sold out";

const STYLES: Record<Kind, React.CSSProperties> = {
  New: { background: GLOW_COLOR, color: "#111" },
  Bestseller: { background: "#111", color: "#fff" },
  Limited: { background: "#6e2230", color: "#fff" },
  "Low stock": { background: "rgba(255,255,255,0.85)", color: TEXT_COLOR, border: "1px solid rgba(84,84,84,0.25)" },
  "Sold out": { background: "rgba(17,17,17,0.85)", color: "#fff" },
};

export default function Badge({ kind }: { kind: Kind }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 11px",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "1px",
        textTransform: "uppercase",
        backdropFilter: "blur(4px)",
        ...STYLES[kind],
      }}
    >
      {kind}
    </span>
  );
}
