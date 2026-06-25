import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, asset } from "../lib/constants";
import { useIsMobile, useViewportWidth } from "../lib/useResponsive";
import { useCatalog } from "../context/Catalog";
import { useHomepage } from "../context/HomepageContent";
import { useProductNav } from "../context/ProductNav";

const LABEL_GAP = 8;

const BAGS = [
  { img: "baggy-1.png", baseAngle: 270, label: "(01)" },
  { img: "baggy-2.png", baseAngle: 330, label: "(02)" },
  { img: "baggy-3.png", baseAngle: 30, label: "(03)" },
  { img: "baggy-4.png", baseAngle: 150, label: "(04)" },
  { img: "baggy-5.png", baseAngle: 210, label: "(05)" },
  { img: "baggy-6.png", baseAngle: 90, label: "(06)" },
];

export default function PerfectMatch() {
  const isMobile = useIsMobile();
  const vw = useViewportWidth();
  const { open } = useProductNav();
  const { products } = useCatalog();
  const { perfectmatch: pm } = useHomepage();
  // Real products only, evenly spaced around the ring (cap at 6 for the orbit).
  const items = products.slice(0, BAGS.length);

  // Responsive orbit geometry. On mobile: keep bags small enough that the ring
  // clears the centred title, and pull the radius in so the *labels* (which sit
  // ~LABEL_DIST beyond each bag's centre) never spill past the viewport edge.
  const BAG_SIZE = isMobile ? 86 : 160;
  const BAG_HALF = BAG_SIZE / 2;
  const LABEL_DIST = BAG_HALF + (isMobile ? 6 : LABEL_GAP);
  const ORBIT_RADIUS = isMobile
    ? Math.max(108, Math.min(140, vw / 2 - LABEL_DIST - 20))
    : 260;
  const STAGE_H = isMobile ? 2 * (ORBIT_RADIUS + BAG_HALF) + 70 : 640;

  const [angle, setAngle] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { margin: "200px" });

  // The orbit was driven by React state on every animation frame, re-rendering
  // the whole section ~60x/sec for the life of the page — the main cause of
  // mobile jank. Now: static ring on mobile (no loop at all), and on desktop the
  // loop only runs while the section is actually on screen.
  useEffect(() => {
    if (isMobile || !inView) return;
    let raf = 0;
    const tick = () => {
      if (!pausedRef.current) {
        setAngle((a) => a + 0.12);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile, inView]);

  return (
    <section
      ref={sectionRef}
      data-tone="light"
      style={{
        background: "#ffffff",
        // On mobile, don't force full-viewport height — the content is shorter,
        // which left a big empty gap before the next section.
        minHeight: isMobile ? "auto" : "100vh",
        paddingBottom: isMobile ? 36 : 80,
        fontFamily: "'Inter Tight', sans-serif",
        overflow: "visible",
        position: "relative",
      }}
    >
      {/* Torn paper top edge — tinted pure white so it blends into the white
          section (no grey band) while still tearing over the dark section above. */}
      <img
        src={asset("paper.png")}
        alt=""
        style={{
          position: "absolute",
          top: -188,
          left: 0,
          right: 0,
          width: "100%",
          height: "auto",
          objectFit: "cover",
          objectPosition: "top center",
          filter: "brightness(0) invert(1)",
          zIndex: 50,
          pointerEvents: "none",
        }}
      />

      {/* Top badge text */}
      <motion.div
        initial={{ opacity: 0, y: 12, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
        whileInView={{ opacity: 1, y: 0, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          textAlign: "center",
          paddingTop: 120,
          zIndex: 60,
          position: "relative",
        }}
      >
        {[pm.eyebrowTop, pm.eyebrowBottom].map((line) => (
          <div
            key={line}
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "2.5px",
              lineHeight: 1.8,
              color: "rgba(84,84,84,0.55)",
            }}
          >
            {line}
          </div>
        ))}
      </motion.div>

      {/* Orbit stage */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: STAGE_H,
          zIndex: 60,
          marginTop: 20,
        }}
      >
        {/* Center title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, ...(isMobile ? {} : { filter: "blur(10px)" }) }}
          whileInView={{ opacity: 1, scale: 1, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              display: "block",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: "clamp(21px, 5.6vw, 64px)",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-2px",
              color: TEXT_COLOR,
            }}
          >
            {pm.lead}
          </span>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: "clamp(34px, 9vw, 64px)",
                fontWeight: 700,
                letterSpacing: "-2px",
                color: TEXT_COLOR,
              }}
            >
              perfect&nbsp;
            </span>
            <SerifGlow
              word={pm.accent}
              fontSize="clamp(22px, 5.8vw, 64px)"
              lineHeight="clamp(22px, 5.8vw, 64px)"
              letterSpacing={-2}
              strokeWidth="clamp(5px, 1.4vw, 14px)"
              inView
              delay={0.5}
            />
          </div>
        </motion.div>

        {/* Orbit center */}
        <div style={{ position: "absolute", top: "50%", left: "50%" }}>
          {items.map((p, i) => {
            const baseAngle = (360 / items.length) * i;
            const img = p.images?.[0] || asset(BAGS[i % BAGS.length].img);
            const rad = ((angle + baseAngle) * Math.PI) / 180;
            const x = Math.cos(rad) * ORBIT_RADIUS;
            const y = Math.sin(rad) * ORBIT_RADIUS;
            return (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                  zIndex: 6,
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1],
                    delay: i * 0.08,
                  }}
                  whileHover={{
                    scale: 1.12,
                    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.15))",
                  }}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                  onClick={(e) => open(p, e.currentTarget, img)}
                  style={{
                    width: BAG_SIZE,
                    height: BAG_SIZE,
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={img}
                    alt={p.name}
                    style={{
                      width: BAG_SIZE,
                      height: BAG_SIZE,
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom block — eye + manifesto */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          maxWidth: 380,
          margin: "50px auto 0",
          padding: "0 40px",
          zIndex: 5,
          position: "relative",
        }}
      >
        <motion.img
          src={asset("eye.png")}
          alt=""
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
          whileInView={{ opacity: 0.7, scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: 32,
            height: 32,
            objectFit: "contain",
            flexShrink: 0,
            marginTop: 12,
          }}
        />
        <motion.p
          initial={{ opacity: 0, x: 16, ...(isMobile ? {} : { filter: "blur(8px)" }) }}
          whileInView={{ opacity: 1, x: 0, ...(isMobile ? {} : { filter: "blur(0px)" }) }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          style={{
            marginTop: 10,
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.75,
            color: "rgba(84,84,84,0.75)",
            textAlign: "justify",
          }}
        >
          {pm.body}
        </motion.p>
      </div>
    </section>
  );
}
