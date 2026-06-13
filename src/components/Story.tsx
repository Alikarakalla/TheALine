import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, asset } from "../lib/constants";
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

export default function Story() {
  const isMobile = useIsMobile();
  const { story } = useHomepage();
  const words = story.body.split(" ");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Parallax for the floating bag image.
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
            top: isMobile ? "auto" : "50%",
            bottom: isMobile ? "8%" : "auto",
            right: isMobile ? "4%" : "8%",
            width: isMobile ? 190 : 360,
            marginTop: isMobile ? 0 : -180,
            opacity: isMobile ? 0.5 : 1,
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
            padding: isMobile ? "0 24px" : "0 64px",
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
