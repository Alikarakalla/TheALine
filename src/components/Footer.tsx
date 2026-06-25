import { useRef } from "react";
import { motion, useSpring, useInView } from "framer-motion";
import SerifGlow from "./SerifGlow";
import { GLOW_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useHomepage } from "../context/HomepageContent";

function MagneticButton() {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileTap={{ scale: 0.96 }}
      style={{
        x,
        y,
        background: GLOW_COLOR,
        color: "#111111",
        border: "none",
        borderRadius: 999,
        padding: "20px 44px",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "-0.2px",
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      Shop the collection
    </motion.button>
  );
}

export default function Footer() {
  const { footer } = useHomepage();
  // Only run the marquee's infinite loop while the footer is on screen — it sits
  // at the very bottom, so otherwise it burns frame budget the whole session.
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInView = useInView(marqueeRef, { margin: "150px" });
  return (
    <footer
      data-tone="dark"
      style={{
        background: "#111111",
        color: "#FFFFFF",
        fontFamily: "'Inter Tight', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Marquee */}
      <div
        ref={marqueeRef}
        style={{
          borderTop: "1px solid rgba(255,255,255,0.12)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: "clamp(18px, 4vw, 28px) 0",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <motion.div
          animate={marqueeInView ? { x: ["0%", "-50%"] } : { x: "0%" }}
          transition={
            marqueeInView
              ? { duration: 22, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          {[0, 1].map((dup) => (
            <span key={dup} style={{ display: "inline-flex", alignItems: "center" }}>
              {footer.marquee.map((word, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "clamp(26px, 7vw, 46px)",
                      fontWeight: 500,
                      letterSpacing: "-1px",
                      color: "#FFFFFF",
                      padding: "0 clamp(14px, 4vw, 28px)",
                    }}
                  >
                    {word}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontStyle: "italic",
                      fontSize: "clamp(26px, 7vw, 46px)",
                      color: GLOW_COLOR,
                      padding: "0 clamp(14px, 4vw, 28px)",
                    }}
                  >
                    ✦
                  </span>
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>

      {/* CTA block */}
      <div
        style={{
          padding: "clamp(64px, 14vw, 110px) clamp(24px, 6vw, 64px) clamp(56px, 12vw, 90px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "clamp(8px, 2vw, 16px)",
            marginBottom: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "clamp(38px, 11vw, 72px)",
              fontWeight: 600,
              letterSpacing: "-3px",
              lineHeight: 1,
              color: "#FFFFFF",
            }}
          >
            {footer.headlineLead}
          </span>
          <SerifGlow
            word={footer.accent}
            fontSize="clamp(42px, 12vw, 78px)"
            lineHeight="clamp(42px, 12vw, 76px)"
            letterSpacing={-3}
            strokeWidth="clamp(9px, 2.4vw, 16px)"
            inView
            fillColor="#FFFFFF"
            delay={0.4}
          />
        </div>
        <p
          style={{
            maxWidth: 380,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 40,
          }}
        >
          {footer.body}
        </p>
        <MagneticButton />
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: `24px ${PAGE_PAD}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "-0.2px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          © 2026 THE A LINE
        </span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Instagram", "Pinterest", "Contact", "Privacy"].map((l) => (
            <a
              key={l}
              href="#"
              className="transition-opacity duration-200 hover:opacity-100"
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: "rgba(255,255,255,0.45)",
                textDecoration: "none",
              }}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
      </div>
    </footer>
  );
}
