import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { useParams, Navigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR, ASSET, asset } from "../lib/constants";
import { productImageFile, getGallery } from "../lib/products";
import { useIsMobile } from "../lib/useResponsive";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useCart } from "../context/Cart";
import FavoriteButton from "./FavoriteButton";
import Header from "./Header";
import ProductCard from "./ProductCard";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import type { Product } from "../lib/products";

const EASE = [0.22, 1, 0.36, 1] as const;
const FLIGHT = 0.7;

function Thumb({
  src,
  active,
  onSelect,
  delay = 0,
  mobile = false,
}: {
  src: string;
  active: boolean;
  onSelect: () => void;
  delay?: number;
  mobile?: boolean;
}) {
  return (
    <motion.button
      onClick={onSelect}
      initial={mobile ? false : { opacity: 0, x: -12 }}
      animate={mobile ? undefined : { opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      whileHover={{ scale: 1.06 }}
      style={{
        flex: "0 0 auto",
        width: mobile ? 58 : 52,
        height: mobile ? 58 : 64,
        borderRadius: 4,
        overflow: "hidden",
        cursor: "pointer",
        padding: 0,
        background: "#fff",
        border: active ? "2px solid #111" : "2px solid rgba(84,84,84,0.15)",
        outline: active ? `2px solid ${GLOW_COLOR}` : "none",
        outlineOffset: 1,
        transition: "border 0.2s ease, outline 0.2s ease",
      }}
    >
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </motion.button>
  );
}

function Accordion({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(84,84,84,0.18)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: "16px 0",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: TEXT_COLOR,
        }}
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{ fontSize: 20, lineHeight: 1, color: TEXT_COLOR }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                paddingBottom: 18,
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(84,84,84,0.75)",
              }}
            >
              {body}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductPage() {
  const isMobile = useIsMobile();
  const { id } = useParams();
  const { open, close, consumeOrigin } = useProductNav();
  const { products, getById } = useCatalog();
  const product = getById(id);

  // Stored click origin for the shared-element morph (null on a direct visit).
  const origin = useRef(product ? consumeOrigin(product.id) : null).current;
  const onClose = close;

  // Image gallery — the clicked image is guaranteed to be in it.
  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const g = product.images?.length ? [...product.images] : getGallery(product).map(asset);
    if (origin && !g.includes(origin.imgSrc)) g.unshift(origin.imgSrc);
    return g;
  }, [product, origin]);
  const [activeSrc, setActiveSrc] = useState(
    origin?.imgSrc ?? gallery[0] ?? ""
  );

  const [vp, setVp] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  useEffect(() => {
    const u = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);

  // Fully lock the page behind: pin <body> so the document scrollbar disappears
  // (it reads as its own page, not an overlay) and restore the exact scroll on
  // close. The product page itself is a fixed element with its own scroll.
  useEffect(() => {
    const scrollY = window.scrollY;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.paddingRight = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Per-page SEO: title, description, canonical, Open Graph / Twitter cards.
  useEffect(() => {
    if (!product) return;
    setPageMeta({
      title: `${product.name} — €${product.price.toFixed(2)} | The A Line`,
      description: product.description,
      image: product.images?.[0] ?? `${ASSET}/${productImageFile(product)}`,
      url: window.location.href,
      type: "product",
    });
    return () => resetPageMeta();
  }, [product]);

  // Keyboard UX: Esc closes, ←/→ moves through the gallery.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setActiveSrc((s) => {
          const idx = gallery.indexOf(s);
          const next =
            (idx + (e.key === "ArrowRight" ? 1 : -1) + gallery.length) %
            gallery.length;
          return gallery[next] ?? s;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery, onClose]);

  if (!product) return <Navigate to="/" replace />;

  const hasOrigin = !!origin;

  // Target box for the hero image.
  const target = isMobile
    ? (() => {
        const w = vp.w * 0.74;
        const h = vp.h * 0.42;
        return { width: w, height: h, left: (vp.w - w) / 2, top: 84 };
      })()
    : (() => {
        const w = Math.min(440, vp.w * 0.42);
        const h = vp.h * 0.62;
        const panelW = vp.w * 0.5;
        return { width: w, height: h, left: (panelW - w) / 2, top: (vp.h - h) / 2 };
      })();

  // Shared-element morph when we know where it was clicked; otherwise fade in.
  const dx = origin ? origin.rect.left - target.left : 0;
  const dy = origin ? origin.rect.top - target.top : 0;
  const sx = origin ? origin.rect.width / target.width : 1;
  const sy = origin ? origin.rect.height / target.height : 1;
  const imageMotion = hasOrigin
    ? {
        initial: { x: dx, y: dy, scaleX: sx, scaleY: sy },
        animate: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
        exit: { x: dx, y: dy, scaleX: sx, scaleY: sy },
        transition: { duration: FLIGHT, ease: EASE },
      }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.5, ease: EASE },
      };

  // Info entrance — staggered after the image lands.
  const block = (i: number) => ({
    initial: { opacity: 0, y: 18, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.55, ease: EASE, delay: 0.32 + i * 0.07 },
  });

  const related = products.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "#ffffff",
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* full site header — navigation, search, cart always available */}
      <Header />

      {/* image panel background */}
      {isMobile ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "52vh",
            background: product.panel,
          }}
        />
      ) : (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 0 }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            background: product.panel,
            transformOrigin: "left",
            zIndex: 1,
          }}
        />
      )}

      {/* Back pill — sits just below the fixed header */}
      <button
        onClick={onClose}
        style={{
          position: isMobile ? "absolute" : "fixed",
          top: isMobile ? 64 : 84,
          left: isMobile ? 20 : 32,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(84,84,84,0.15)",
          borderRadius: 999,
          padding: "9px 16px",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: TEXT_COLOR,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Back
      </button>

      {/* morphing hero image — the container morphs in; gallery images crossfade inside.
          fixed (sticky) on desktop split view; absolute (scrolls with content) on mobile. */}
      <motion.div
        {...imageMotion}
        style={{
          position: isMobile ? "absolute" : "fixed",
          top: target.top,
          left: target.left,
          width: target.width,
          height: target.height,
          transformOrigin: "top left",
          borderRadius: 4,
          overflow: "hidden",
          zIndex: 10,
          boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
        }}
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={activeSrc}
            src={activeSrc}
            alt={product.name}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AnimatePresence>
      </motion.div>

      {/* desktop gallery thumbnails — vertical rail on the panel */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            left: 24,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 20,
          }}
        >
          {gallery.map((src, i) => (
            <Thumb
              key={src}
              src={src}
              active={src === activeSrc}
              delay={0.45 + i * 0.06}
              onSelect={() => setActiveSrc(src)}
            />
          ))}
        </div>
      )}

      {/* layout: spacer for image + info */}
      <div
        style={{
          position: "relative",
          zIndex: 15,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          minHeight: "100vh",
        }}
      >
        {/* spacer where the image floats */}
        <div
          style={{
            flex: isMobile ? "none" : "0 0 50%",
            height: isMobile ? "52vh" : "auto",
            pointerEvents: "none",
          }}
        />

        {/* info column */}
        <div
          style={{
            flex: isMobile ? "none" : "0 0 50%",
            padding: isMobile ? "32px 24px 56px" : "0 64px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: isMobile ? "100%" : 560,
          }}
        >
          {/* mobile gallery thumbnails — horizontal strip */}
          {isMobile && (
            <motion.div
              {...block(0)}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 22,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {gallery.map((src) => (
                <Thumb
                  key={src}
                  src={src}
                  active={src === activeSrc}
                  mobile
                  onSelect={() => setActiveSrc(src)}
                />
              ))}
            </motion.div>
          )}

          {/* eyebrow */}
          <motion.div
            {...block(0)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 20,
                color: "rgba(84,84,84,0.6)",
              }}
            >
              ({String(products.findIndex((p) => p.id === product.id) + 1).padStart(2, "0")})
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2.5px",
                color: "rgba(84,84,84,0.55)",
                textTransform: "uppercase",
              }}
            >
              {product.category}
            </span>
          </motion.div>

          {/* name */}
          <motion.h1
            {...block(1)}
            style={{
              fontSize: isMobile ? "clamp(40px, 13vw, 60px)" : 60,
              fontWeight: 600,
              letterSpacing: "-2px",
              lineHeight: 1,
              color: TEXT_COLOR,
              marginBottom: 12,
            }}
          >
            {product.name}
          </motion.h1>

          {/* price */}
          <motion.div
            {...block(2)}
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: TEXT_COLOR,
              marginBottom: 22,
            }}
          >
            €{product.price.toFixed(2)}
          </motion.div>

          {/* description */}
          <motion.p
            {...block(3)}
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: "rgba(84,84,84,0.8)",
              marginBottom: 26,
              maxWidth: 440,
            }}
          >
            {product.description}
          </motion.p>

          {/* colors */}
          <motion.div {...block(4)} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2px",
                color: "rgba(84,84,84,0.5)",
                marginBottom: 10,
              }}
            >
              COLOR — {product.colors[color].name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {product.colors.map((c, i) => {
                const sel = i === color;
                // Color variants get a swatch; non-colour variants (no hex, e.g.
                // "Gift wrap: Yes") get a readable text pill instead of an
                // invisible circle.
                return c.hex ? (
                  <button
                    key={`${c.name}-${i}`}
                    onClick={() => setColor(i)}
                    aria-label={c.name}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: c.hex,
                      cursor: "pointer",
                      border: sel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                      outline: sel ? `2px solid ${GLOW_COLOR}` : "none",
                      outlineOffset: 2,
                      transition: "outline 0.2s ease, border 0.2s ease",
                    }}
                  />
                ) : (
                  <button
                    key={`${c.name}-${i}`}
                    onClick={() => setColor(i)}
                    style={{
                      height: 30,
                      padding: "0 14px",
                      borderRadius: 999,
                      background: sel ? GLOW_COLOR : "transparent",
                      cursor: "pointer",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13,
                      fontWeight: sel ? 600 : 400,
                      color: "#111",
                      border: sel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                      transition: "background 0.2s ease, border 0.2s ease",
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* qty + add to bag */}
          <motion.div
            {...block(5)}
            style={{ display: "flex", gap: 12, marginBottom: 30, alignItems: "stretch" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid rgba(84,84,84,0.25)",
                borderRadius: 999,
                padding: "0 6px",
              }}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={qtyBtn}
              >
                −
              </button>
              <span
                style={{
                  width: 26,
                  textAlign: "center",
                  fontSize: 15,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                }}
              >
                {qty}
              </span>
              <button onClick={() => setQty((q) => q + 1)} style={qtyBtn}>
                +
              </button>
            </div>
            <AddToBag product={product} color={product.colors[color]} qty={qty} />
            <FavoriteButton productId={product.id} variant="outline" size={46} />
          </motion.div>

          {/* accordions */}
          <motion.div {...block(6)}>
            <Accordion title="Details" body={product.details} />
            <Accordion title="Materials & care" body={product.materials} />
            <Accordion
              title="Shipping & returns"
              body="Free carbon-neutral shipping over €100. 30-day returns, no questions asked."
            />
          </motion.div>

          {/* related */}
          <motion.div {...block(7)} style={{ marginTop: 40 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2px",
                color: "rgba(84,84,84,0.5)",
                marginBottom: 14,
              }}
            >
              YOU MAY ALSO LIKE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} compact showFavorite={false} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 34,
  height: 44,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 18,
  color: TEXT_COLOR,
  fontFamily: "'Inter Tight', sans-serif",
};

function AddToBag({
  product,
  color,
  qty,
}: {
  product: Product;
  color: { name: string; hex: string };
  qty: number;
}) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <motion.button
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={() => {
        add(product, color, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      }}
      whileTap={{ scale: 0.97 }}
      style={{
        x,
        y,
        flex: 1,
        background: GLOW_COLOR,
        color: "#111111",
        border: "none",
        borderRadius: 999,
        padding: "0 28px",
        height: 46,
        fontSize: 14.5,
        fontWeight: 600,
        letterSpacing: "-0.2px",
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {added ? "Added to bag ✓" : `Add to bag — €${(product.price * qty).toFixed(2)}`}
    </motion.button>
  );
}
