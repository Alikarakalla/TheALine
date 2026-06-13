import { motion, useMotionValue, useSpring } from "framer-motion";
import type { CSSProperties } from "react";
import SerifGlow from "./SerifGlow";
import { TEXT_COLOR, asset } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { getProduct } from "../lib/products";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useHomepage } from "../context/HomepageContent";

type Cell = {
  img: string;
  label: string;
  sub: string;
  col: string; // grid-column (desktop, 4-col)
  row: string; // grid-row (desktop)
  mCol: string; // grid-column on mobile (2-col)
  bg: string;
};

const CELLS: Cell[] = [
  { img: "baggy-1.png", label: "Terra", sub: "The everyday", col: "1 / 3", row: "1 / 3", mCol: "1 / 3", bg: "#ECE7DE" },
  { img: "baggy-3.png", label: "Amélie", sub: "City edit", col: "3 / 4", row: "1 / 2", mCol: "1 / 2", bg: "#E4E0D6" },
  { img: "baggy-4.png", label: "Belle", sub: "After dark", col: "4 / 5", row: "1 / 3", mCol: "2 / 3", bg: "#E8E3DA" },
  { img: "baggy-5.png", label: "Mira", sub: "Soft form", col: "3 / 4", row: "2 / 3", mCol: "1 / 2", bg: "#EFEAE1" },
  { img: "baggy-6.png", label: "Adele", sub: "The mini", col: "1 / 2", row: "3 / 4", mCol: "2 / 3", bg: "#E4E0D6" },
  { img: "baggy-2.png", label: "Love Bag", sub: "Signature", col: "2 / 5", row: "3 / 4", mCol: "1 / 3", bg: "#ECE7DE" },
];

function TiltCard({ cell, index, isMobile }: { cell: Cell; index: number; isMobile: boolean }) {
  const { open } = useProductNav();
  const { products } = useCatalog();
  const product =
    products.find((p) => p.name.toLowerCase() === cell.label.toLowerCase()) ?? getProduct(cell.label);
  const rotateX = useSpring(0, { stiffness: 150, damping: 16 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 16 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return; // no pointer-tilt on touch
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotateY.set((px - 0.5) * 14);
    rotateX.set(-(py - 0.5) * 14);
    glowX.set(px * 100);
    glowY.set(py * 100);
  };
  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const cardStyle: CSSProperties = {
    gridColumn: isMobile ? cell.mCol : cell.col,
    gridRow: isMobile ? "auto" : cell.row,
    background: cell.bg,
    borderRadius: 14,
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
    transformStyle: "preserve-3d",
    minHeight: 200,
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={(e) => {
        const img = e.currentTarget.querySelector("img");
        if (img) open(product, img, asset(cell.img));
      }}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.08,
      }}
      style={{
        ...cardStyle,
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
    >
      <motion.img
        src={asset(cell.img)}
        alt={cell.label}
        style={{
          // Bound the image to the upper area so it never sits under the label.
          position: "absolute",
          top: isMobile ? "7%" : "10%",
          left: "15%",
          right: "15%",
          bottom: isMobile ? "44%" : "30%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          translateZ: 40,
          filter: "drop-shadow(0 16px 28px rgba(84,84,84,0.22))",
        }}
      />
      <motion.div
        style={{
          position: "absolute",
          left: isMobile ? 14 : 20,
          right: 14,
          bottom: isMobile ? 12 : 18,
          translateZ: 30,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 17 : 20,
            fontWeight: 600,
            letterSpacing: "-0.4px",
            color: TEXT_COLOR,
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(84,84,84,0.6)",
            marginTop: 2,
          }}
        >
          {cell.sub}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BentoGrid() {
  const isMobile = useIsMobile();
  const { bento } = useHomepage();
  return (
    <section
      data-tone="light"
      style={{
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
        padding: "clamp(72px, 16vw, 120px) clamp(20px, 6vw, 64px) clamp(80px, 18vw, 140px)",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, filter: "blur(10px)", y: 18 }}
        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ textAlign: "center", marginBottom: 64 }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "2.5px",
            color: "rgba(84,84,84,0.55)",
            marginBottom: 16,
          }}
        >
          {bento.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "clamp(8px, 2vw, 14px)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "clamp(34px, 9vw, 60px)",
              fontWeight: 600,
              letterSpacing: "-2px",
              lineHeight: 1,
              color: TEXT_COLOR,
            }}
          >
            {bento.lead}
          </span>
          <SerifGlow
            word={bento.accent}
            italic
            fontSize="clamp(36px, 9.5vw, 64px)"
            lineHeight="clamp(36px, 9.5vw, 62px)"
            letterSpacing={-2}
            strokeWidth="clamp(8px, 2vw, 14px)"
            inView
            delay={0.45}
          />
        </div>
      </motion.div>

      {/* Bento grid */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gridAutoRows: isMobile ? "208px" : undefined,
          gridTemplateRows: isMobile ? undefined : "240px 240px 240px",
          gap: isMobile ? 12 : 18,
        }}
      >
        {CELLS.map((cell, i) => (
          <TiltCard key={cell.img} cell={cell} index={i} isMobile={isMobile} />
        ))}
      </div>
    </section>
  );
}
