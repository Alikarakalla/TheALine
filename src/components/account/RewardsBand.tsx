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
        background: "#161616",
        color: "#fff",
        borderRadius: 18,
        padding: 26,
        fontFamily: "'Inter Tight', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            LOVEBAG CIRCLE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-1.5px", color: GLOW_COLOR, lineHeight: 1 }}>
              {points.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Glow Points</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 17, color: "#fff" }}>
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
              padding: "10px 18px",
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
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
            €{spendToNext.toFixed(0)} more to{" "}
            <span style={{ color: "#fff", fontWeight: 600 }}>{next.name}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
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
