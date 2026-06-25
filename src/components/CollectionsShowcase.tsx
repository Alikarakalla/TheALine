import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCatalog, type CollectionSummary } from "../context/Catalog";

const EASE = [0.22, 1, 0.36, 1] as const;

function CollectionCard({
  c,
  index,
  isMobile,
  onOpen,
}: {
  c: CollectionSummary;
  index: number;
  isMobile: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
      whileHover="hover"
      onClick={onOpen}
      style={{
        position: "relative",
        border: "none",
        padding: 0,
        cursor: "pointer",
        borderRadius: 16,
        overflow: "hidden",
        background: "#ECE7DE",
        aspectRatio: isMobile ? "4 / 3" : "3 / 4",
        textAlign: "left",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {c.image ? (
        <motion.img
          src={c.image}
          alt={c.title}
          variants={{ hover: { scale: 1.06 } }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #ECE7DE 0%, #D9C49A 100%)" }} />
      )}
      {/* scrim for legible label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(20,18,16,0.62) 0%, rgba(20,18,16,0.10) 48%, rgba(20,18,16,0) 72%)",
        }}
      />
      <div style={{ position: "absolute", left: isMobile ? 16 : 22, right: 16, bottom: isMobile ? 16 : 22 }}>
        <div style={{ fontSize: isMobile ? 19 : 24, fontWeight: 600, letterSpacing: "-0.5px", color: "#ffffff" }}>{c.title}</div>
        <motion.div
          variants={{ hover: { x: 6 } }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.85)" }}
        >
          Shop collection <span>→</span>
        </motion.div>
      </div>
    </motion.button>
  );
}

/** Homepage section that surfaces the store's active collections. Hidden when
 *  there are none, so it never shows an empty block. */
export default function CollectionsShowcase() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { collections } = useCatalog();
  if (!collections.length) return null;

  const cols = Math.min(collections.length, isMobile ? 2 : 3);

  return (
    <section
      data-tone="light"
      style={{ background: "#ffffff", padding: "clamp(72px, 14vw, 120px) 0", fontFamily: "'Inter Tight', sans-serif" }}
    >
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: `0 ${PAGE_PAD}` }}>
        {/* header */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)", y: 18 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: isMobile ? 36 : 56 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.55)", marginBottom: 16 }}>CURATED</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "clamp(8px, 2vw, 14px)", flexWrap: "wrap" }}>
            <span style={{ fontSize: "clamp(34px, 9vw, 60px)", fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, color: TEXT_COLOR }}>Shop the</span>
            <SerifGlow
              word="collections"
              italic
              fontSize="clamp(36px, 9.5vw, 64px)"
              lineHeight="clamp(36px, 9.5vw, 62px)"
              letterSpacing={-2}
              strokeWidth="clamp(8px, 2vw, 14px)"
              inView
              delay={0.4}
            />
          </div>
        </motion.div>

        {/* grid */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? 14 : 24 }}>
          {collections.map((c, i) => (
            <CollectionCard key={c.id} c={c} index={i} isMobile={isMobile} onOpen={() => navigate(`/collection/${c.slug}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}
