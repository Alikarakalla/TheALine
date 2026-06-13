import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import SerifGlow from "./SerifGlow";
import { asset } from "../lib/constants";
import { useViewportWidth, useIsMobile } from "../lib/useResponsive";
import { getProduct } from "../lib/products";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useHomepage } from "../context/HomepageContent";

const ENV_W = 480;
const ENV_H = 340;
const FLAP_W = 480;
const FLAP_H = 200;

const NAMES = ["Terra", "Love Bag", "Amélie", "Belle", "Mira", "Adele"];
const CARD_Z = [2, 4, 6, 6, 4, 2];

// Mid-stage peek positions [x, y, rotateDeg]
const PEEK: [number, number, number][] = [
  [-90, -30, -12],
  [-40, -60, -6],
  [-15, -78, -2],
  [20, -76, 3],
  [55, -58, 7],
  [95, -28, 12],
];

// Final horizontal row positions [x, y, rotateDeg] (desktop, one wide row)
const END: [number, number, number][] = [
  [-625, 0, 0],
  [-375, 0, 0],
  [-125, 0, 0],
  [125, 0, 0],
  [375, 0, 0],
  [625, 0, 0],
];

// Mobile final positions — a tidy 2×3 grid (these are pre-scale coords).
const END_MOBILE: [number, number, number][] = [
  [-178, -225, 0],
  [0, -225, 0],
  [178, -225, 0],
  [-178, 225, 0],
  [0, 225, 0],
  [178, 225, 0],
];

const OFF = [0, 0.015, 0.03, 0.045, 0.06, 0.075];

function Photo({
  i,
  scrollY,
  cardsOut,
  end,
}: {
  i: number;
  scrollY: MotionValue<number>;
  cardsOut: boolean;
  end: [number, number, number];
}) {
  const { open } = useProductNav();
  const { products } = useCatalog();
  const product = products[i] ?? getProduct(NAMES[i]);
  const label = product?.name ?? NAMES[i];
  const a0 = 0.3 + OFF[i];
  const a1 = 0.5 + OFF[i];
  const b0 = 0.55 + OFF[i];
  const b1 = 0.78 + OFF[i];

  const x = useTransform(scrollY, [a0, a1, b0, b1], [0, PEEK[i][0], PEEK[i][0], end[0]]);
  const y = useTransform(scrollY, [a0, a1, b0, b1], [60, PEEK[i][1], PEEK[i][1], end[1]]);
  const r = useTransform(scrollY, [a0, a1, b0, b1], [0, PEEK[i][2], PEEK[i][2], end[2]]);
  const s = useTransform(scrollY, [a0, a1], [0.5, 1]);

  return (
    <motion.div
      whileHover={{ rotate: [0, -3, 3, -2, 2, 0] }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      onClick={(e) =>
        open(product, e.currentTarget, asset("photo-" + (i + 1) + ".png"))
      }
      style={{
        position: "absolute",
        left: -90,
        top: -90,
        width: 180,
        zIndex: CARD_Z[i],
        pointerEvents: "auto",
        cursor: "pointer",
        opacity: 1,
        visibility: "visible",
        x,
        y,
        rotate: r,
        scale: s,
      }}
    >
      <img
        src={asset("photo-" + (i + 1) + ".png")}
        alt={label}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "contain",
          opacity: 1,
          visibility: "visible",
          pointerEvents: "none",
        }}
      />
      {cardsOut && (
        <motion.div
          initial={false}
          animate={{ opacity: cardsOut ? 1 : 0, y: cardsOut ? 0 : 8 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 + i * 0.05 }}
          style={{
            position: "absolute",
            top: "calc(100% + 18px)",
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.3px",
              lineHeight: 1.2,
              color: "#FFFFFF",
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            €{(product?.price ?? 129.9).toFixed(2)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function Collection() {
  const { collection } = useHomepage();
  const containerRef = useRef<HTMLDivElement>(null);
  const vw = useViewportWidth();
  const isMobile = useIsMobile();
  // On mobile the cards fan into a 2×3 grid (~±205 wide), so the stage can be
  // much bigger than the desktop single-row case. On desktop the row spans
  // ~±625px + half a card, so scale the whole stage to fit narrow viewports.
  const endPositions = isMobile ? END_MOBILE : END;
  const stageScale = isMobile
    ? Math.min(0.66, (vw - 16) / 540)
    : Math.min(1, (vw - 24) / 1430);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const envelopeY = useTransform(
    scrollYProgress,
    [0, 0.18, 0.45, 0.7, 1],
    [145, 20, 90, 600, 900]
  );
  const envelopeIn = useTransform(scrollYProgress, [0.6, 0.75], [1, 0]);
  const flapRotate = useTransform(scrollYProgress, [0.2, 0.45], [180, 0]);
  // The wrapper lives inside the scaled stage, so its counter-translation is
  // scaled too — divide by stageScale so it fully cancels the stage's drop and
  // the photos stay locked to viewport centre (otherwise they drift down).
  const photoCounterY = useTransform(envelopeY, (v) => -v / stageScale);

  const [cardsOut, setCardsOut] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [photosAboveFlap, setPhotosAboveFlap] = useState(false);

  useEffect(() => {
    const unsubProg = scrollYProgress.on("change", (v) => {
      setCardsOut(v >= 0.52);
      setCardsVisible(v >= 0.3);
    });
    const unsubEnv = envelopeY.on("change", (v) => {
      setPhotosAboveFlap(v > 85);
    });
    return () => {
      unsubProg();
      unsubEnv();
    };
  }, [scrollYProgress, envelopeY]);

  return (
    <section
      ref={containerRef}
      data-tone="dark"
      style={{
        background: "#111111",
        position: "relative",
        height: "400vh",
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
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", y: 20 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            zIndex: 20,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: "clamp(42px, 12vw, 72px)",
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-3px",
                color: "#FFFFFF",
              }}
            >
              {collection.lead}
            </span>
            <SerifGlow
              word={collection.accent}
              italic
              fontSize="clamp(46px, 13vw, 78px)"
              lineHeight="clamp(46px, 13vw, 78px)"
              letterSpacing={-3}
              strokeWidth="clamp(10px, 2.7vw, 16px)"
              inView
              delay={0.5}
            />
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: "clamp(42px, 12vw, 72px)",
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: "-3px",
              color: "#FFFFFF",
            }}
          >
            {collection.title}
          </div>
          <motion.p
            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
            whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            style={{
              marginTop: 14,
              maxWidth: 320,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {collection.body}
          </motion.p>
        </motion.div>

        {/* Envelope stage */}
        <motion.div
          style={{
            position: "absolute",
            top: "58%",
            left: "50%",
            width: ENV_W,
            height: ENV_H,
            marginLeft: -ENV_W / 2,
            marginTop: -ENV_H / 2,
            overflow: "visible",
            y: envelopeY,
            scale: stageScale,
            transformOrigin: "center center",
          }}
        >
          {/* body */}
          <motion.img
            src={asset("envelop.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: ENV_W,
              height: ENV_H,
              zIndex: 1,
              opacity: envelopeIn,
              pointerEvents: "none",
            }}
          />
          {/* left flap */}
          <motion.img
            src={asset("tapa-left.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: ENV_H,
              width: "auto",
              zIndex: 3,
              opacity: envelopeIn,
            }}
          />
          {/* right flap */}
          <motion.img
            src={asset("tapa-right.webp")}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: ENV_H,
              width: "auto",
              zIndex: 3,
              opacity: envelopeIn,
            }}
          />
          {/* bottom flap */}
          <motion.img
            src={asset("tapa-bajo.webp")}
            alt=""
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: ENV_W,
              zIndex: 4,
              transformOrigin: "bottom center",
              transformPerspective: 1400,
              rotateX: 0,
              opacity: envelopeIn,
            }}
          />

          {/* Photo wrapper — drifts with envelope, counter-translated to viewport center */}
          <motion.div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 0,
              height: 0,
              pointerEvents: "none",
              display: cardsVisible ? "block" : "none",
              opacity: 1,
              overflow: "visible",
              zIndex: photosAboveFlap || cardsOut ? 999 : 2,
              y: photoCounterY,
            }}
          >
            {NAMES.map((_, i) => (
              <Photo
                key={i}
                i={i}
                scrollY={scrollYProgress}
                cardsOut={cardsOut}
                end={endPositions[i]}
              />
            ))}
          </motion.div>

          {/* triangular top flap (rendered above photos' base z when closed) */}
          <motion.div
            style={{
              position: "absolute",
              top: -FLAP_H + 5,
              left: 0,
              width: FLAP_W,
              height: FLAP_H,
              zIndex: 8,
              transformOrigin: "bottom center",
              transformPerspective: 1400,
              rotateX: flapRotate,
              opacity: envelopeIn,
            }}
          >
            <img
              src={asset("open-top.webp")}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
