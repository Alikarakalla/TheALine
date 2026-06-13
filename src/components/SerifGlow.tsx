import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  curlInitial,
  curlAnimate,
  curlTransition,
} from "../lib/constants";

type Size = number | string;

type Props = {
  word: string;
  fontSize: Size;
  lineHeight: Size;
  letterSpacing: Size;
  strokeWidth: Size;
  italic?: boolean;
  delay?: number;
  /** When true, the curl entrance plays on scroll-into-view rather than on mount. */
  inView?: boolean;
  fillColor?: string;
  style?: CSSProperties;
};

// numbers become px; strings (e.g. clamp(...)) pass through untouched.
const px = (v: Size) => (typeof v === "number" ? `${v}px` : v);

/**
 * Signature dual-layer serif accent word with a yellow-green fluorescent halo,
 * playing the "tubular curl" sticker-unfurl entrance.
 */
export default function SerifGlow({
  word,
  fontSize,
  lineHeight,
  letterSpacing,
  strokeWidth,
  italic = false,
  delay = 0.5,
  inView = false,
  fillColor = TEXT_COLOR,
  style,
}: Props) {
  const shared: CSSProperties = {
    fontFamily: "'Instrument Serif', serif",
    fontStyle: italic ? "italic" : "normal",
    fontWeight: 400,
    fontSize: px(fontSize),
    lineHeight: px(lineHeight),
    letterSpacing: px(letterSpacing),
  };

  const anim = inView
    ? { whileInView: curlAnimate, viewport: { once: true, margin: "-60px" } }
    : { animate: curlAnimate };

  return (
    <motion.span
      style={{
        position: "relative",
        display: "inline-block",
        transformPerspective: 600,
        transformOrigin: "top center",
        ...style,
      }}
      initial={curlInitial}
      {...anim}
      transition={{ ...curlTransition, delay }}
    >
      {/* glow layer */}
      <span
        aria-hidden
        style={{
          ...shared,
          position: "absolute",
          left: 0,
          top: 0,
          color: GLOW_COLOR,
          WebkitTextStrokeWidth: px(strokeWidth),
          WebkitTextStrokeColor: GLOW_COLOR,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </span>
      {/* solid fill layer */}
      <span
        style={{
          ...shared,
          position: "relative",
          color: fillColor,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </span>
    </motion.span>
  );
}
