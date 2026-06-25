import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SerifGlow from "./SerifGlow";
import { asset, PAGE_MAX } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useHomepage } from "../context/HomepageContent";

const SLIDES = [
  { img: "photo-1.png", name: "Terra", tag: "Everyday tote" },
  { img: "photo-2.png", name: "Love Bag", tag: "Evening clutch" },
  { img: "photo-3.png", name: "Amélie", tag: "City shoulder" },
  { img: "photo-4.png", name: "Belle", tag: "Structured carry" },
  { img: "photo-5.png", name: "Mira", tag: "Soft hobo" },
  { img: "photo-6.png", name: "Adele", tag: "Mini crossbody" },
];

export default function Lookbook() {
  const isMobile = useIsMobile();
  const { open } = useProductNav();
  const { products } = useCatalog();
  const { lookbook: lb } = useHomepage();
  const items = products; // every real product, scrolled horizontally
  const CARD_W = isMobile ? 264 : 440;
  const CARD_H = isMobile ? 360 : 560;
  const GAP = isMobile ? 18 : 36;

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Side padding that matches the shared 1440 container edge so the title, hint
  // and first card line up with the header. Measured here because the scroll
  // distance depends on it.
  const [edge, setEdge] = useState(isMobile ? 24 : 80);
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    const measure = () => {
      // clientWidth excludes the scrollbar, matching the CSS `100%` the header
      // and hero use — so the title/cards line up to the same pixel.
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const e = isMobile
        ? 24
        : Math.round(
            Math.max(0, (vw - PAGE_MAX) / 2) + Math.min(44, Math.max(24, vw * 0.04))
          );
      setEdge(e);
      const count = Math.max(1, items.length);
      const trackWidth = count * CARD_W + (count - 1) * GAP + e * 2;
      setDistance(Math.max(0, trackWidth - vw));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [CARD_W, GAP, isMobile, items.length]);

  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  // No products → hide the lookbook.
  if (!items.length) return null;

  return (
    <section
      ref={ref}
      data-tone="dark"
      style={{
        background: "#111111",
        position: "relative",
        height: "320vh",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", y: 20 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: isMobile ? 40 : 64,
            left: edge,
            zIndex: 20,
            display: "flex",
            alignItems: "baseline",
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: "clamp(38px, 11vw, 64px)",
              fontWeight: 500,
              letterSpacing: "-2.5px",
              lineHeight: 1,
              color: "#FFFFFF",
            }}
          >
            {lb.lead}
          </span>
          <SerifGlow
            word={lb.accent}
            italic
            fontSize="clamp(40px, 12vw, 68px)"
            lineHeight="clamp(40px, 12vw, 66px)"
            letterSpacing={-2.5}
            strokeWidth="clamp(9px, 2.6vw, 15px)"
            inView
            delay={0.5}
          />
        </motion.div>

        {/* scroll hint */}
        <div
          style={{
            position: "absolute",
            top: isMobile ? 96 : 78,
            right: edge,
            zIndex: 20,
            fontSize: isMobile ? 10 : 11,
            fontWeight: 600,
            letterSpacing: "2.5px",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          SCROLL TO EXPLORE →
        </div>

        {/* Horizontal track */}
        <motion.div
          style={{
            display: "flex",
            gap: GAP,
            padding: `0 ${edge}px`,
            x,
            willChange: "transform",
          }}
        >
          {items.map((p, i) => {
            const img = p.images?.[0] || asset(SLIDES[i % SLIDES.length].img);
            return (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              style={{
                position: "relative",
                flex: "0 0 auto",
                width: CARD_W,
                cursor: "pointer",
              }}
            >
              <div
                onClick={(e) => open(p, e.currentTarget, img)}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  overflow: "hidden",
                  borderRadius: 2,
                  background: "#1a1a1a",
                }}
              >
                <img
                  src={img}
                  alt={p.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginTop: 18,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.4px",
                    color: "#FFFFFF",
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {p.category}
                </span>
              </div>
              {/* index numeral */}
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 18,
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: 22,
                  color: "rgba(255,255,255,0.85)",
                  zIndex: 2,
                }}
              >
                ({String(i + 1).padStart(2, "0")})
              </span>
            </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
