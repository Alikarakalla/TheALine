import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GLOW_COLOR } from "../../lib/constants";
import { useLoyalty } from "../../context/Loyalty";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function RewardsBand({ cta = true }: { cta?: boolean }) {
  const navigate = useNavigate();
  const { points, tier, next, progressToNext, spendToNext, signedIn } = useLoyalty();

  return (
    <div
      style={{
        background: "#141414",
        color: "#fff",
        borderRadius: 18,
        padding: "26px 28px",
        fontFamily: "'Inter Tight', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* soft gold sheen, top-right */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,196,154,0.16) 0%, rgba(217,196,154,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          position: "relative",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(255,255,255,0.55)",
              marginBottom: 12,
            }}
          >
            THE A LINE CIRCLE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-1.5px",
                color: GLOW_COLOR,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {points.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>Glow Points</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                fontSize: 17,
                color: "#fff",
              }}
            >
              {tier.name}
            </span>{" "}
            member
          </div>
        </div>
        {cta && (
          <button
            onClick={() => navigate("/rewards")}
            style={{
              background: GLOW_COLOR,
              color: "#111",
              border: "none",
              borderRadius: 999,
              padding: "11px 20px",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {signedIn ? "View rewards" : "Join the Circle"}
          </button>
        )}
      </div>

      {next && (
        <div style={{ marginTop: 22, position: "relative" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              fontSize: 12.5,
              color: "rgba(255,255,255,0.65)",
              marginBottom: 9,
            }}
          >
            <span>
              <span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                €{spendToNext.toFixed(0)}
              </span>{" "}
              more to <span style={{ color: "#fff", fontWeight: 600 }}>{next.name}</span>
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progressToNext * 100)}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progressToNext * 100)}%` }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ height: "100%", background: GLOW_COLOR }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
