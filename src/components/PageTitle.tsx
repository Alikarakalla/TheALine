import { motion } from "framer-motion";
import { TEXT_COLOR } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The storefront's page headline — the same quiet editorial language as the
 * product page: a hairline dash + tracked-caps eyebrow, a refined
 * medium-weight title, and (optionally) one word set in ink serif italic.
 * Replaces the old oversized gold-stroked display headlines.
 */
export default function PageTitle({
  eyebrow,
  title,
  accent,
  sub,
  delay = 0,
}: {
  eyebrow?: string;
  title: string;
  /** One word carrying the brand's serif-italic accent (plain ink, no gold). */
  accent?: string;
  sub?: React.ReactNode;
  delay?: number;
}) {
  const isMobile = useIsMobile();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ width: 22, height: 1, background: "rgba(84,84,84,0.4)", display: "block" }} />
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(84,84,84,0.6)",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </span>
        </div>
      )}
      <h1
        style={{
          margin: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
          fontSize: isMobile ? "clamp(26px, 7.5vw, 32px)" : 40,
          fontWeight: 500,
          letterSpacing: isMobile ? "-0.6px" : "-1px",
          lineHeight: 1.1,
          color: TEXT_COLOR,
          fontFamily: "'Inter Tight', sans-serif",
        }}
      >
        {title}
        {accent && (
          <span
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "1.14em",
              color: TEXT_COLOR,
            }}
          >
            {accent}
          </span>
        )}
      </h1>
      {sub && <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)", marginTop: 10 }}>{sub}</div>}
    </motion.div>
  );
}
