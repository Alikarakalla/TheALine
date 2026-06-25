import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring, type PanInfo } from "framer-motion";
import { useParams, Navigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR, ASSET, asset } from "../lib/constants";
import { productImageFile, getGallery } from "../lib/products";
import { useIsMobile } from "../lib/useResponsive";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useCart, type AddVariant } from "../context/Cart";
import FavoriteButton from "./FavoriteButton";
import Header from "./Header";
import ProductCard from "./ProductCard";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import type { Product } from "../lib/products";

const EASE = [0.22, 1, 0.36, 1] as const;
const FLIGHT = 0.7;

/** Two option-id sets describe the same variant combination. */
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

/* Magnifier-plus icon (inherits color from the button). */
function MagnifierIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

/* Round translucent zoom button overlaid on an image. */
function ZoomButton({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="Zoom image"
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 6,
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        color: TEXT_COLOR,
        cursor: "pointer",
        ...style,
      }}
    >
      <MagnifierIcon />
    </button>
  );
}

/* Carousel pagination dots. light=true for a dark backdrop (lightbox). */
function Dots({
  count,
  index,
  onSelect,
  light = false,
}: {
  count: number;
  index: number;
  onSelect: (i: number) => void;
  light?: boolean;
}) {
  if (count <= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 6,
        zIndex: 6,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(i);
          }}
          aria-label={`Go to image ${i + 1}`}
          style={{
            height: 6,
            width: i === index ? 20 : 6,
            borderRadius: 999,
            border: "none",
            padding: 0,
            cursor: "pointer",
            background:
              i === index
                ? light
                  ? "#ffffff"
                  : TEXT_COLOR
                : light
                ? "rgba(255,255,255,0.45)"
                : "rgba(58,58,58,0.3)",
            boxShadow: light ? "none" : "0 1px 2px rgba(255,255,255,0.4)",
            transition: "width 0.25s ease, background 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}

function Thumb({
  src,
  active,
  onSelect,
  delay = 0,
}: {
  src: string;
  active: boolean;
  onSelect: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      whileHover={{ scale: 1.06 }}
      style={{
        flex: "0 0 auto",
        width: 52,
        height: 64,
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

/* Full-width mobile image carousel: native scroll-snap, dots + zoom. */
function MobileGallery({
  images,
  panel,
  index,
  setIndex,
  onZoom,
}: {
  images: string[];
  panel: string;
  index: number;
  setIndex: (i: number) => void;
  onZoom: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Reflect external index changes (dots / keyboard) into the scroll position.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const targetLeft = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - targetLeft) > 2) {
      el.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }, [index]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background: panel,
        overflow: "hidden",
      }}
    >
      <style>{`.pg-track::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="pg-track"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {images.map((src) => (
          <div
            key={src}
            style={{ flex: "0 0 100%", width: "100%", height: "100%", scrollSnapAlign: "center" }}
          >
            <img
              src={src}
              alt=""
              onClick={onZoom}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }}
            />
          </div>
        ))}
      </div>
      <ZoomButton onClick={onZoom} style={{ top: "auto", bottom: 12 }} />
      <Dots count={images.length} index={index} onSelect={setIndex} />
    </motion.div>
  );
}

/* Fullscreen image viewer. Swipe (mobile) / arrows (desktop) / dots / Esc. */
function Lightbox({
  images,
  index,
  setIndex,
  onClose,
  name,
}: {
  images: string[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  name: string;
}) {
  const go = (dir: number) =>
    setIndex((index + dir + images.length) % images.length);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70) go(1);
    else if (info.offset.x > 70) go(-1);
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "#0e0e0e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          zIndex: 3,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          fontSize: 20,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ✕
      </button>

      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={images[index]}
          src={images[index]}
          alt={name}
          drag={images.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          style={{
            width: "92vw",
            height: "82vh",
            objectFit: "contain",
            cursor: images.length > 1 ? "grab" : "default",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "pan-y",
          }}
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous" style={navBtn("left")}>
            ‹
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next" style={navBtn("right")}>
            ›
          </button>
          <Dots count={images.length} index={index} onSelect={setIndex} light />
        </>
      )}
    </motion.div>
  );
}

function navBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 14,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 3,
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    fontSize: 26,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
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
  const { close, consumeOrigin } = useProductNav();
  const { products, getById } = useCatalog();
  const product = getById(id);

  // Stored click origin for the shared-element morph (null on a direct visit).
  const origin = useRef(product ? consumeOrigin(product.id) : null).current;
  const onClose = close;

  // Selected option per attribute (attrId → optionId) for variant products.
  const [sel, setSel] = useState<Record<number, number>>({});

  // Images of the currently-selected variant (when it has its own gallery).
  const variantGallery = useMemo(() => {
    const attrs = product?.attributes ?? [];
    if (!product || !attrs.length || !product.variants?.length) return null;
    const ids = attrs.map((a) => sel[a.id] ?? a.options[0]?.id).filter((x): x is number => x != null);
    const v = product.variants.find((vt) => sameSet(vt.optionIds, ids));
    return v?.images?.length ? v.images : null;
  }, [product, sel]);

  // Gallery — the selected variant's images when present, else the product's.
  // The clicked card image is kept at the front (product view only) so the
  // shared-element morph lands on the same picture.
  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const base = variantGallery ?? (product.images?.length ? product.images : getGallery(product).map(asset));
    const g = [...base];
    if (!variantGallery && origin && !g.includes(origin.imgSrc)) g.unshift(origin.imgSrc);
    return g;
  }, [product, origin, variantGallery]);

  const initialIndex = Math.max(0, gallery.indexOf(origin?.imgSrc ?? gallery[0] ?? ""));
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // When the shopper switches variant, show that variant's gallery from its
  // first image (skip the initial run so the entrance morph isn't disturbed).
  const firstGalleryRun = useRef(true);
  useEffect(() => {
    if (firstGalleryRun.current) { firstGalleryRun.current = false; return; }
    setActiveIndex(0);
  }, [variantGallery]);
  const activeSrc = gallery[activeIndex] ?? "";
  const [zoomOpen, setZoomOpen] = useState(false);

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
  // and restore the exact scroll on close.
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

  // Per-page SEO.
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

  // Keyboard UX: Esc closes (lightbox first, then page), ←/→ moves the gallery.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomOpen) setZoomOpen(false);
        else onClose();
      } else if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i + 1) % gallery.length);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery, onClose, zoomOpen]);

  if (!product) return <Navigate to="/" replace />;

  const hasOrigin = !!origin;

  // Desktop hero image target box (the morph lands here).
  const target = (() => {
    const w = Math.min(440, vp.w * 0.42);
    const h = vp.h * 0.62;
    const panelW = vp.w * 0.5;
    return { width: w, height: h, left: (panelW - w) / 2, top: (vp.h - h) / 2 };
  })();

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

  // Info entrance — staggered. No blur on mobile (cheaper) and it appears sooner.
  const block = (i: number) => ({
    initial: { opacity: 0, y: 18, ...(isMobile ? {} : { filter: "blur(6px)" }) },
    animate: { opacity: 1, y: 0, ...(isMobile ? {} : { filter: "blur(0px)" }) },
    transition: { duration: 0.55, ease: EASE, delay: (isMobile ? 0.1 : 0.32) + i * 0.07 },
  });

  const related = products.filter((p) => p.id !== product.id).slice(0, 3);

  // ---- variant resolution (Shopify-style) -------------------------------
  const attributes = product.attributes ?? [];
  const hasVariants = attributes.length > 0 && (product.variants?.length ?? 0) > 0;
  const chosen = (a: (typeof attributes)[number]) => sel[a.id] ?? a.options[0]?.id;
  const selectedOptionIds = attributes
    .map((a) => chosen(a))
    .filter((x): x is number => x != null);
  const selectedVariant = hasVariants
    ? (product.variants ?? []).find((v) => sameSet(v.optionIds, selectedOptionIds))
    : undefined;
  // Only enforce per-variant stock when the merchant actually tracks it (some
  // variant carries stock). Legacy catalogs that never set per-variant stock
  // fall back to product-level availability instead of showing "sold out".
  const variantStockTracked = (product.variants ?? []).some((v) => v.stock > 0);
  // Is `optId` reachable in an available variant given the OTHER current picks?
  const optionAvailable = (attrId: number, optId: number) => {
    const others = attributes.filter((a) => a.id !== attrId).map((a) => chosen(a));
    return (product.variants ?? []).some(
      (v) =>
        v.status !== "hidden" &&
        (!variantStockTracked || v.stock > 0) &&
        v.optionIds.includes(optId) &&
        others.every((o) => o == null || v.optionIds.includes(o))
    );
  };
  const unitPrice = selectedVariant?.price ?? product.price;
  const unitCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice ?? null;
  const selectedLabel = hasVariants
    ? attributes.map((a) => a.options.find((o) => o.id === chosen(a))?.value).filter(Boolean).join(" / ")
    : product.colors[color]?.name ?? "";
  const selectedHex = hasVariants
    ? attributes.flatMap((a) => a.options).find((o) => selectedOptionIds.includes(o.id) && o.hex)?.hex ?? ""
    : product.colors[color]?.hex ?? "";
  const variantUnavailable = hasVariants && (!selectedVariant || selectedVariant.status === "hidden");
  const variantSoldOut = hasVariants && variantStockTracked && !!selectedVariant && selectedVariant.stock <= 0;
  const addVariant = {
    label: selectedLabel,
    price: unitPrice,
    image: selectedVariant?.image ?? undefined,
    sku: selectedVariant?.sku ?? undefined,
  };

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
      {/* full site header */}
      <Header />

      {/* desktop image panel background + morph hero + thumbnail rail */}
      {!isMobile && (
        <>
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
          <motion.div
            {...imageMotion}
            style={{
              position: "fixed",
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
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            </AnimatePresence>
            <ZoomButton onClick={() => setZoomOpen(true)} />
          </motion.div>
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
                active={i === activeIndex}
                delay={0.45 + i * 0.06}
                onSelect={() => setActiveIndex(i)}
              />
            ))}
          </div>
        </>
      )}

      {/* Back pill */}
      <button
        onClick={onClose}
        style={{
          position: isMobile ? "absolute" : "fixed",
          top: isMobile ? 64 : 84,
          left: isMobile ? 16 : 32,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.7)",
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

      {/* layout */}
      <div
        style={{
          position: "relative",
          zIndex: 15,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          minHeight: "100vh",
        }}
      >
        {isMobile ? (
          <MobileGallery
            images={gallery}
            panel={product.panel}
            index={activeIndex}
            setIndex={setActiveIndex}
            onZoom={() => setZoomOpen(true)}
          />
        ) : (
          <div style={{ flex: "0 0 50%", height: "auto", pointerEvents: "none" }} />
        )}

        {/* info column */}
        <div
          style={{
            flex: isMobile ? "none" : "0 0 50%",
            padding: isMobile ? "28px 24px 56px" : "0 64px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: isMobile ? "100%" : 560,
          }}
        >
          {/* eyebrow */}
          <motion.div
            {...block(0)}
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}
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
            style={{ fontSize: 22, fontWeight: 500, color: TEXT_COLOR, marginBottom: 22, display: "flex", alignItems: "baseline", gap: 10 }}
          >
            <span>€{unitPrice.toFixed(2)}</span>
            {unitCompareAt != null && unitCompareAt > unitPrice && (
              <span style={{ fontSize: 16, color: "rgba(84,84,84,0.5)", textDecoration: "line-through" }}>
                €{unitCompareAt.toFixed(2)}
              </span>
            )}
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

          {/* variant selectors — one group per attribute (Color, Size, …) */}
          {hasVariants ? (
            <motion.div {...block(4)} style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              {attributes.map((a) => {
                const selectedId = chosen(a);
                const selName = a.options.find((o) => o.id === selectedId)?.value ?? "";
                return (
                  <div key={a.id}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", marginBottom: 10, textTransform: "uppercase" }}>
                      {a.name} — {selName}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {a.options.map((o) => {
                        const isSel = o.id === selectedId;
                        const avail = optionAvailable(a.id, o.id);
                        return o.hex ? (
                          <button
                            key={o.id}
                            onClick={() => setSel((s) => ({ ...s, [a.id]: o.id }))}
                            aria-label={o.value}
                            title={avail ? o.value : `${o.value} — unavailable`}
                            style={{
                              width: 30, height: 30, borderRadius: "50%", background: o.hex, cursor: "pointer",
                              border: isSel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                              outline: isSel ? `2px solid ${GLOW_COLOR}` : "none", outlineOffset: 2,
                              opacity: avail ? 1 : 0.35,
                              transition: "outline 0.2s ease, border 0.2s ease, opacity 0.2s ease",
                            }}
                          />
                        ) : (
                          <button
                            key={o.id}
                            onClick={() => setSel((s) => ({ ...s, [a.id]: o.id }))}
                            style={{
                              height: 34, minWidth: 42, padding: "0 14px", borderRadius: 999,
                              background: isSel ? GLOW_COLOR : "transparent", cursor: "pointer",
                              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 400, color: "#111",
                              border: isSel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                              opacity: avail ? 1 : 0.4, textDecoration: avail ? "none" : "line-through",
                              transition: "background 0.2s ease, border 0.2s ease, opacity 0.2s ease",
                            }}
                          >
                            {o.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(variantUnavailable || variantSoldOut) && (
                <div style={{ fontSize: 12.5, color: "#c0563f" }}>
                  {variantSoldOut ? "This combination is out of stock." : "This combination isn’t available — pick another."}
                </div>
              )}
            </motion.div>
          ) : product.colors.length > 0 ? (
            <motion.div {...block(4)} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", marginBottom: 10 }}>
                COLOR — {product.colors[color].name}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {product.colors.map((c, i) => {
                  const isSel = i === color;
                  return c.hex ? (
                    <button
                      key={`${c.name}-${i}`}
                      onClick={() => setColor(i)}
                      aria-label={c.name}
                      style={{
                        width: 30, height: 30, borderRadius: "50%", background: c.hex, cursor: "pointer",
                        border: isSel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                        outline: isSel ? `2px solid ${GLOW_COLOR}` : "none", outlineOffset: 2,
                        transition: "outline 0.2s ease, border 0.2s ease",
                      }}
                    />
                  ) : (
                    <button
                      key={`${c.name}-${i}`}
                      onClick={() => setColor(i)}
                      style={{
                        height: 30, padding: "0 14px", borderRadius: 999,
                        background: isSel ? GLOW_COLOR : "transparent", cursor: "pointer",
                        fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 400, color: "#111",
                        border: isSel ? "2px solid #111" : "2px solid rgba(84,84,84,0.2)",
                        transition: "background 0.2s ease, border 0.2s ease",
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}

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
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={qtyBtn}>
                −
              </button>
              <span
                style={{ width: 26, textAlign: "center", fontSize: 15, fontWeight: 500, color: TEXT_COLOR }}
              >
                {qty}
              </span>
              <button onClick={() => setQty((q) => q + 1)} style={qtyBtn}>
                +
              </button>
            </div>
            <AddToBag
              product={product}
              color={{ name: selectedLabel, hex: selectedHex }}
              variant={hasVariants ? addVariant : undefined}
              unitPrice={unitPrice}
              disabled={variantUnavailable || variantSoldOut}
              qty={qty}
            />
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

      {/* fullscreen image viewer */}
      <AnimatePresence>
        {zoomOpen && (
          <Lightbox
            images={gallery}
            index={activeIndex}
            setIndex={setActiveIndex}
            onClose={() => setZoomOpen(false)}
            name={product.name}
          />
        )}
      </AnimatePresence>
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
  variant,
  unitPrice,
  disabled,
}: {
  product: Product;
  color: { name: string; hex: string };
  qty: number;
  variant?: AddVariant;
  unitPrice?: number;
  disabled?: boolean;
}) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const price = unitPrice ?? product.price;
  return (
    <motion.button
      disabled={disabled}
      onMouseMove={(e) => {
        if (disabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={() => {
        if (disabled) return;
        add(product, color, qty, variant);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
      }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      style={{
        x,
        y,
        flex: 1,
        background: disabled ? "rgba(84,84,84,0.18)" : GLOW_COLOR,
        color: disabled ? "rgba(84,84,84,0.7)" : "#111111",
        border: "none",
        borderRadius: 999,
        padding: "0 28px",
        height: 46,
        fontSize: 14.5,
        fontWeight: 600,
        letterSpacing: "-0.2px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {disabled ? "Unavailable" : added ? "Added to bag ✓" : `Add to bag — €${(price * qty).toFixed(2)}`}
    </motion.button>
  );
}
