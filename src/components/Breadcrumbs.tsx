import { useNavigate } from "react-router-dom";
import { TEXT_COLOR } from "../lib/constants";

export default function Breadcrumbs({
  trail,
}: {
  trail: { label: string; to?: string }[];
}) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 7,
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 12.5,
        color: "rgba(84,84,84,0.55)",
      }}
    >
      {trail.map((c, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {c.to ? (
            <button
              onClick={() => navigate(c.to!)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 12.5,
                color: "rgba(84,84,84,0.7)",
              }}
            >
              {c.label}
            </button>
          ) : (
            <span style={{ color: TEXT_COLOR }}>{c.label}</span>
          )}
          {i < trail.length - 1 && <span style={{ opacity: 0.5 }}>/</span>}
        </span>
      ))}
    </div>
  );
}
