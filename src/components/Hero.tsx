import { useState } from "react";
import { motion } from "framer-motion";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, asset } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useHomepage } from "../context/HomepageContent";

const headingType = {
  fontFamily: "'Inter Tight', sans-serif",
  fontSize: 87.999,
  fontWeight: 500,
  lineHeight: "80px",
  letterSpacing: "-3.52px",
  color: TEXT_COLOR,
} as const;

function PolaroidThumb({
  bag,
  tag,
  delay,
  rotate,
  scale = 1,
}: {
  bag: string;
  tag: string;
  delay: number;
  rotate: number;
  scale?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      style={{ transform: `rotate(${rotate}deg)`, position: "relative" }}
    >
      {/* tag numeral above the frame */}
      <div
        style={{
          position: "absolute",
          top: -32,
          right: 14,
          zIndex: 3,
          fontFamily: "'Instrument Serif', serif",
          fontSize: 18,
          fontWeight: 400,
          color: "rgba(84,84,84,0.7)",
          pointerEvents: "none",
        }}
      >
        {tag}
      </div>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: "relative",
          width: 170 * scale,
          height: 210 * scale,
          filter: "drop-shadow(2px 6px 14px rgba(0,0,0,0.10))",
          transition: "all 0.25s ease",
          transform: hover ? "translateY(-4px)" : "translateY(0)",
        }}
      >
        <img
          src={asset("bag-" + bag + ".png")}
          alt=""
          style={{
            position: "absolute",
            top: "14%",
            left: "14%",
            width: "72%",
            height: "62%",
            objectFit: "contain",
            zIndex: 1,
          }}
        />
        <img
          src={asset("snap-bare.png")}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      </div>
    </motion.div>
  );
}

function HeroMobile() {
  const { hero } = useHomepage();
  return (
    <div
      data-tone="light"
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        style={{
          padding: "84px 24px 0",
          fontSize: "clamp(30px, 9vw, 46px)",
          fontWeight: 500,
          lineHeight: 1.04,
          letterSpacing: "-1.5px",
          color: TEXT_COLOR,
          position: "relative",
          zIndex: 10,
        }}
      >
        {hero.line1} {hero.line2}{" "}
        <SerifGlow
          word={hero.accent}
          fontSize="clamp(32px, 9.5vw, 50px)"
          lineHeight="clamp(30px, 9vw, 48px)"
          letterSpacing={-1.6}
          strokeWidth="clamp(7px, 2.4vw, 12px)"
          delay={0.4}
          style={{ verticalAlign: "baseline" }}
        />{" "}
        {hero.tail}
      </motion.div>

      {/* THE A LINE mini block */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.45 }}
        style={{ padding: "16px 24px 0", position: "relative", zIndex: 10 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: TEXT_COLOR }}>
            THE A LINE
          </span>
          <img src={asset("heart.svg")} alt="" width={13} height={13} />
        </div>
        <p
          style={{
            marginTop: 8,
            maxWidth: 320,
            fontSize: 12.5,
            fontWeight: 400,
            lineHeight: 1.7,
            color: TEXT_COLOR,
          }}
        >
          {hero.loveBag}
        </p>
      </motion.div>

      {/* Model stage with overlaid stickers */}
      <div
        style={{
          position: "relative",
          marginTop: 8,
          height: "58vh",
          minHeight: 360,
        }}
      >
        <motion.img
          src={asset("woman.png")}
          alt=""
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            margin: "0 auto",
            height: "100%",
            width: "auto",
            objectFit: "contain",
            objectPosition: "bottom center",
            zIndex: 6,
          }}
        />

        {/* snap polaroid frame — overlaid on the bag the model is holding */}
        <motion.img
          src={asset("snap.png")}
          alt=""
          initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ duration: 0.55, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "29%",
            left: "calc(50% - 40px)",
            width: 150,
            zIndex: 8,
            transformOrigin: "top center",
          }}
        />

        {/* smile */}
        <motion.img
          src={asset("smile.png")}
          alt=""
          initial={{ opacity: 0, scale: 0.4, rotate: -40 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ position: "absolute", top: "10%", left: "8%", width: 44, height: 44, zIndex: 7 }}
        />

        {/* elegance sticker */}
        <div
          style={{
            position: "absolute",
            bottom: "12%",
            left: "8%",
            zIndex: 10,
            transform: "rotate(6.206deg)",
          }}
        >
          <SerifGlow
            word="elegance"
            italic
            fontSize={26}
            lineHeight={25}
            letterSpacing={-1}
            strokeWidth={8.5}
            delay={1.2}
          />
        </div>
      </div>

      {/* Polaroid thumbnails row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 18,
          padding: "20px 24px 36px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <PolaroidThumb bag="1" tag="(02)" delay={1.4} rotate={-2} scale={0.78} />
        <PolaroidThumb bag="2" tag="(03)" delay={1.55} rotate={1.5} scale={0.78} />
      </div>

      {/* (01) watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 16,
          zIndex: 4,
          fontFamily: "'Instrument Serif', serif",
          fontSize: 56,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-2px",
          color: "rgba(84,84,84,0.16)",
        }}
      >
        (01)
      </div>
    </div>
  );
}

export default function Hero() {
  const isMobile = useIsMobile();
  const { hero } = useHomepage();
  if (isMobile) return <HeroMobile />;
  return (
    <div
      data-tone="light"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Heading block */}
      <div
        style={{
          position: "absolute",
          top: 92,
          left: 40,
          maxWidth: 500,
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(14px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          style={headingType}
        >
          {hero.line1}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, filter: "blur(14px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.28 }}
          style={headingType}
        >
          {hero.line2}
        </motion.div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginTop: -2,
          }}
        >
          <SerifGlow
            word={hero.accent}
            fontSize={94.969}
            lineHeight={93.413}
            letterSpacing={-3.799}
            strokeWidth={20.55}
            delay={0.5}
          />
          <motion.span
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.78 }}
            style={headingType}
          >
            {hero.tail}
          </motion.span>
        </div>
      </div>

      {/* Woman model */}
      <motion.img
        src={asset("woman.png")}
        alt=""
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          marginLeft: "auto",
          marginRight: "auto",
          height: "100vh",
          width: "auto",
          objectFit: "contain",
          objectPosition: "bottom center",
          zIndex: 6,
        }}
      />

      {/* Sticks flourish */}
      <motion.img
        src={asset("sticks.svg")}
        alt=""
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{
          opacity: 1,
          scale: [0, 1.4, 0.85, 1.15, 0.95, 1.05, 1],
          rotate: [-180, -20, 25, -15, 10, -5, 0],
          y: [0, -6, 0],
        }}
        transition={{
          opacity: { duration: 0.3, delay: 0.85, ease: "easeOut" },
          scale: { duration: 0.95, delay: 0.85, ease: [0.34, 1.56, 0.64, 1] },
          rotate: { duration: 0.95, delay: 0.85, ease: [0.34, 1.56, 0.64, 1] },
          y: {
            duration: 3.2,
            delay: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        style={{
          position: "absolute",
          top: 24,
          left: "calc(50% + 40px)",
          zIndex: 7,
          width: 32,
          transformOrigin: "bottom center",
        }}
      />

      {/* Smile sticker */}
      <motion.img
        src={asset("smile.png")}
        alt=""
        initial={{ opacity: 0, scale: 0.4, rotate: -40 }}
        animate={{ opacity: 1, scale: 1, rotate: [0, 10, -5, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1.05, ease: [0.34, 1.56, 0.64, 1] },
          scale: { duration: 0.5, delay: 1.05, ease: [0.34, 1.56, 0.64, 1] },
          rotate: {
            duration: 5,
            delay: 1.55,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        style={{
          position: "absolute",
          top: "calc(55% - 60px)",
          left: "calc(50% - 260px)",
          zIndex: 7,
          width: 60,
          height: 60,
        }}
      />

      {/* Snap polaroid (center, in front of model) */}
      <motion.img
        src={asset("snap.png")}
        alt=""
        initial={{ opacity: 0 }}
        animate={{
          rotateX: [-100, -60, -15, 4, -1, 0],
          scaleY: [0.1, 0.35, 0.8, 1.03, 0.99, 1],
          opacity: [0, 0.35, 0.85, 1, 1, 1],
          rotate: [-6, -4, -7, -6],
        }}
        transition={{
          rotateX: {
            duration: 0.65,
            delay: 1.1,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.2, 0.55, 0.78, 0.9, 1],
          },
          scaleY: {
            duration: 0.65,
            delay: 1.1,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.2, 0.55, 0.78, 0.9, 1],
          },
          opacity: {
            duration: 0.65,
            delay: 1.1,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.2, 0.55, 0.78, 0.9, 1],
          },
          rotate: {
            duration: 7,
            delay: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        style={{
          position: "absolute",
          top: "35%",
          left: "calc(50% - 5px)",
          zIndex: 8,
          width: 200,
          transformPerspective: 500,
          transformOrigin: "top center",
        }}
      />

      {/* Card (gift card left of model) */}
      <motion.img
        src={asset("card.png")}
        alt=""
        initial={{ opacity: 0 }}
        animate={{
          rotateX: [-90, -50, -10, 3, 0],
          scaleY: [0.12, 0.5, 0.9, 1.02, 1],
          opacity: [0, 0.4, 0.9, 1, 1],
          rotate: -3,
        }}
        transition={{
          rotateX: {
            duration: 0.6,
            delay: 1.2,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.25, 0.65, 0.85, 1],
          },
          scaleY: {
            duration: 0.6,
            delay: 1.2,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.25, 0.65, 0.85, 1],
          },
          opacity: {
            duration: 0.6,
            delay: 1.2,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.25, 0.65, 0.85, 1],
          },
          rotate: { duration: 0.6, delay: 1.2 },
        }}
        style={{
          position: "absolute",
          bottom: "22%",
          left: "calc(50% - 170px)",
          zIndex: 9,
          width: 150,
          transformPerspective: 600,
          transformOrigin: "top center",
        }}
      />

      {/* "elegance" sticker */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(16% + 40px)",
          left: "calc(50% - 100px)",
          zIndex: 10,
          transform: "rotate(6.206deg)",
        }}
      >
        <SerifGlow
          word="elegance"
          italic
          fontSize={32}
          lineHeight={31}
          letterSpacing={-1.2}
          strokeWidth={10.27}
          delay={1.35}
        />
      </div>

      {/* Text-heart sticker */}
      <motion.img
        src={asset("text-heart.png")}
        alt=""
        initial={{ opacity: 0, scale: 0.5, rotate: 18 }}
        animate={{ opacity: 1, scale: 1, rotate: 4 }}
        transition={{ duration: 0.5, delay: 1.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: "absolute",
          top: "57%",
          left: "calc(50% + 150px)",
          zIndex: 7,
          width: 110,
        }}
      />

      {/* Arrow */}
      <motion.img
        src={asset("arrow.svg")}
        alt=""
        initial={{ opacity: 0, x: 24, rotate: 20 }}
        animate={{ opacity: 0.8, rotate: 0, x: [0, -5, 0] }}
        transition={{
          opacity: { duration: 0.55, delay: 1.4, ease: "easeOut" },
          rotate: { duration: 0.55, delay: 1.4, ease: "easeOut" },
          x: {
            duration: 2.2,
            delay: 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        style={{
          position: "absolute",
          top: "44%",
          left: "calc(50% + 250px)",
          zIndex: 7,
          width: 90,
        }}
      />

      {/* THE A LINE label */}
      <motion.div
        initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "48%",
          right: 32,
          zIndex: 10,
          maxWidth: 210,
          transform: "translateY(-50%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: TEXT_COLOR,
            }}
          >
            THE A LINE
          </span>
          <img src={asset("heart.svg")} alt="" width={13} height={13} />
        </div>
        <p
          style={{
            marginTop: 10,
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.7,
            color: TEXT_COLOR,
            textAlign: "justify",
          }}
        >
          {hero.loveBag}
        </p>
      </motion.div>

      {/* Large (01) watermark */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        style={{
          position: "absolute",
          bottom: 20,
          right: 32,
          zIndex: 4,
          fontFamily: "'Instrument Serif', serif",
          fontSize: 87.999,
          fontWeight: 400,
          lineHeight: "80px",
          letterSpacing: "-3.52px",
          color: "rgba(84,84,84,0.18)",
        }}
      >
        (01)
      </motion.div>

      {/* Bottom-left polaroid thumbnails */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 32,
          zIndex: 10,
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
        }}
      >
        <PolaroidThumb bag="1" tag="(02)" delay={1.65} rotate={-2} />
        <PolaroidThumb bag="2" tag="(03)" delay={1.8} rotate={1.5} />
      </div>
    </div>
  );
}
