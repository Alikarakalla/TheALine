import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import RewardsContent from "../components/account/RewardsContent";
import { GLOW_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useLoyalty } from "../context/Loyalty";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

function TierRing({ progress, points }: { progress: number; points: number }) {
  const R = 64;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
        <motion.circle
          cx="80" cy="80" r={R} fill="none" strokeWidth="10" strokeLinecap="round" style={{ stroke: GLOW_COLOR }}
          transform="rotate(-90 80 80)" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - C * progress }}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.4 }}
          style={{ fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1 }}
        >
          {points.toLocaleString()}
        </motion.span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Glow Points</span>
      </div>
    </div>
  );
}

export default function Rewards() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { points, tier, next, progressToNext, spendToNext, signedIn } = useLoyalty();

  useEffect(() => {
    setPageMeta({
      title: "The A Line Circle — Rewards",
      description: "Join The A Line Circle: earn Glow Points on every order, unlock tiers, redeem rewards and refer friends.",
      url: window.location.origin + "/rewards",
    });
    return () => resetPageMeta();
  }, []);

  return (
    <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter Tight', sans-serif" }}>
      <Header />
      <div style={{ background: "#161616", color: "#fff", padding: isMobile ? "110px 0 48px" : "150px 0 64px" }}>
        <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: `0 ${PAGE_PAD}`, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>REWARDS PROGRAM</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: isMobile ? "clamp(40px, 13vw, 68px)" : 68, fontWeight: 600, letterSpacing: "-2.5px", lineHeight: 1 }}>The A Line</span>
              <SerifGlow word="Circle" italic fontSize={isMobile ? "clamp(44px, 14vw, 74px)" : 74} lineHeight={isMobile ? "clamp(40px, 13vw, 70px)" : 70} letterSpacing={-2.5} strokeWidth={isMobile ? "clamp(9px, 3vw, 16px)" : 16} fillColor="#fff" delay={0.3} />
            </div>
            <p style={{ marginTop: 18, maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
              Earn <strong style={{ color: GLOW_COLOR }}>Glow Points</strong> on everything — every €1 is a point, and points become rewards.{!signedIn && " Join free in a minute."}
            </p>
            {!signedIn && (
              <button onClick={() => navigate("/register")} style={{ marginTop: 24, background: GLOW_COLOR, color: "#111", border: "none", borderRadius: 999, padding: "15px 30px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 600 }}>
                Join the Circle — get 200 points
              </button>
            )}
          </div>
          {signedIn && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <TierRing progress={progressToNext} points={points} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 22 }}>{tier.name}</div>
                {next ? (
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>€{spendToNext.toFixed(0)} more to {next.name}</div>
                ) : (
                  <div style={{ fontSize: 12.5, color: GLOW_COLOR, marginTop: 2 }}>Top tier — thank you ✦</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: isMobile ? `40px ${PAGE_PAD} 80px` : `56px ${PAGE_PAD} 100px` }}>
        <RewardsContent />
      </div>
    </div>
  );
}
