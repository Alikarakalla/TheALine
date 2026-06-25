import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, asset, PAGE_EDGE } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useHomepage } from "../context/HomepageContent";

function Word({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Each word lights up across a short, staggered slice of the scroll.
  const start = (index / total) * 0.82;
  const end = start + 1.6 / total;
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [8, 0]);
  return (
    <motion.span
      style={{
        opacity,
        y,
        display: "inline-block",
        marginRight: "0.26em",
      }}
    >
      {word}
    </motion.span>
  );
}

/* ---- Mobile: clean stacked layout, staggered reveal, bag below the text ----
   No 220vh scroll-scrub and no per-word scroll subscriptions (that was the lag),
   and the bag sits under the paragraph instead of overlapping it. */
function StoryMobile() {
  const { story } = useHomepage();
  const VIEWPORT = { once: true, margin: "-70px" } as const;
  const EASE = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      data-tone="light"
      style={{
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 24px 64px" }}>
        {/* eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(84,84,84,0.6)",
            }}
          >
            {story.eyebrow}
          </span>
          <span
            style={{
              width: 40,
              height: 1,
              background: "rgba(84,84,84,0.35)",
              display: "inline-block",
            }}
          />
        </motion.div>

        {/* headline */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 22 }}
        >
          <span
            style={{
              fontSize: "clamp(34px, 9vw, 52px)",
              fontWeight: 500,
              letterSpacing: "-2px",
              lineHeight: 1,
              color: TEXT_COLOR,
            }}
          >
            {story.lead}
          </span>
          <SerifGlow
            word={story.accent}
            italic
            fontSize="clamp(36px, 9.5vw, 56px)"
            lineHeight="clamp(36px, 9.5vw, 54px)"
            letterSpacing={-2}
            strokeWidth="clamp(8px, 2.2vw, 13px)"
            inView
            delay={0.25}
          />
        </motion.div>

        {/* paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
          style={{
            margin: 0,
            fontSize: "clamp(19px, 5vw, 27px)",
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: "-0.4px",
            color: TEXT_COLOR,
          }}
        >
          {story.body}
        </motion.p>

        {/* bag — under the text, centred, no overlap. Pure fade so the drop-shadow
            is painted once (a moving shadow was part of the lag). */}
        <motion.img
          src={asset("baggy-2.png")}
          alt=""
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          style={{
            display: "block",
            width: 220,
            maxWidth: "70%",
            height: "auto",
            margin: "40px auto 0",
            filter: "drop-shadow(0 20px 36px rgba(84,84,84,0.16))",
          }}
        />
      </div>
    </section>
  );
}

/* ---- Desktop: pinned 220vh stage, per-word reveal, parallax bag (unchanged) ---- */
function StoryDesktop() {
  const { story } = useHomepage();
  const words = story.body.split(" ");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const imgRotate = useTransform(scrollYProgress, [0, 1], [-6, 4]);

  return (
    <section
      ref={ref}
      data-tone="light"
      style={{
        background: "#ffffff",
        position: "relative",
        height: "220vh",
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
          alignItems: "center",
        }}
      >
        {/* Floating parallax bag */}
        <motion.img
          src={asset("baggy-2.png")}
          alt=""
          style={{
            position: "absolute",
            top: "50%",
            right: "8%",
            width: 360,
            marginTop: -180,
            y: imgY,
            rotate: imgRotate,
            filter: "drop-shadow(0 30px 50px rgba(84,84,84,0.18))",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Text column */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 720,
            marginLeft: PAGE_EDGE,
            paddingRight: 64,
          }}
        >
          {/* eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2.5px",
                color: "rgba(84,84,84,0.6)",
              }}
            >
              {story.eyebrow}
            </span>
            <span
              style={{
                width: 40,
                height: 1,
                background: "rgba(84,84,84,0.35)",
                display: "inline-block",
              }}
            />
          </div>

          {/* headline */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 26,
            }}
          >
            <span
              style={{
                fontSize: "clamp(34px, 9vw, 52px)",
                fontWeight: 500,
                letterSpacing: "-2px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              {story.lead}
            </span>
            <SerifGlow
              word={story.accent}
              italic
              fontSize="clamp(36px, 9.5vw, 56px)"
              lineHeight="clamp(36px, 9.5vw, 54px)"
              letterSpacing={-2}
              strokeWidth="clamp(8px, 2.2vw, 13px)"
              inView
              delay={0.4}
            />
          </div>

          {/* word-reveal paragraph */}
          <p
            style={{
              fontSize: "clamp(20px, 5.5vw, 30px)",
              fontWeight: 400,
              lineHeight: 1.45,
              letterSpacing: "-0.5px",
              color: TEXT_COLOR,
              maxWidth: 560,
            }}
          >
            {words.map((w, i) => (
              <Word
                key={i}
                word={w}
                index={i}
                total={words.length}
                progress={scrollYProgress}
              />
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Story() {
  const isMobile = useIsMobile();
  return isMobile ? <StoryMobile /> : <StoryDesktop />;
}
