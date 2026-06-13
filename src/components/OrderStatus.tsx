import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";
import { STAGES, stageIndexFor } from "../lib/tracking";

export default function OrderStatus({ createdAt }: { createdAt: number }) {
  const now = Date.now();
  const active = stageIndexFor(createdAt, now);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "nowrap" }}>
      {STAGES.map((s, i) => {
        const done = i < active;
        const isActive = i === active;
        const reached = i <= active;
        return (
          <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i < STAGES.length - 1 && (
              <span
                style={{
                  position: "absolute",
                  top: 11,
                  left: "50%",
                  width: "100%",
                  height: 2,
                  background: i < active ? GLOW_COLOR : "rgba(84,84,84,0.2)",
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 1,
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                background: reached ? GLOW_COLOR : "transparent",
                border: reached ? "none" : "1.5px solid rgba(84,84,84,0.3)",
                color: reached ? "#111" : "rgba(84,84,84,0.5)",
              }}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              style={{
                marginTop: 8,
                fontSize: 10.5,
                textAlign: "center",
                lineHeight: 1.3,
                fontWeight: isActive ? 600 : 400,
                color: reached ? TEXT_COLOR : "rgba(84,84,84,0.5)",
              }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
