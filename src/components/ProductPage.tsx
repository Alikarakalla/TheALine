import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring, type PanInfo } from "framer-motion";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR, ASSET, asset } from "../lib/constants";
import { productImageFile, getGallery } from "../lib/products";
import { useIsMobile } from "../lib/useResponsive";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import { useDeliveryConfig } from "../context/SiteSettings";
import { useMoney } from "../context/Currency";
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

/* Full-width mobile image carousel: native scroll-snap, dots + zoom. */
function MobileGallery({
  images,
  panel,
  index,
  setIndex,
  onZoom,
  productId,
}: {
  images: string[];
  panel: string;
  index: number;
  setIndex: (i: number) => void;
  onZoom: () => void;
  productId: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  // True when the index change originated from the user's own swipe — the
  // native snap owns that motion, so the sync effect must NOT scroll back at
  // it (that tug-of-war is what reads as lag/shake mid-gesture).
  const fromTrackScroll = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (fromTrackScroll.current) {
      fromTrackScroll.current = false;
    } else {
      // Thumb tap / colour pick / keyboard: switch instantly — no smooth
      // fly-through fighting scroll-snap, no intermediate images.
      const targetLeft = index * el.clientWidth;
      if (Math.abs(el.scrollLeft - targetLeft) > 2) el.scrollTo({ left: targetLeft });
    }
    // Keep the active thumb reachable — but only nudge the rail when the
    // thumb is actually out of view, never recenter for its own sake.
    const rail = railRef.current;
    const thumb = rail?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    if (rail && thumb) {
      const left = thumb.offsetLeft;
      const right = left + thumb.clientWidth;
      if (left < rail.scrollLeft + 12 || right > rail.scrollLeft + rail.clientWidth - 12) {
        rail.scrollTo({ left: Math.max(0, left - rail.clientWidth / 2 + thumb.clientWidth / 2), behavior: "smooth" });
      }
    }
  }, [index]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.max(0, Math.min(images.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== index) {
      fromTrackScroll.current = true;
      setIndex(i);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <style>{`.pg-track::-webkit-scrollbar{display:none}`}</style>

      {/* main image panel — locked to 3:4 portrait, the fashion-industry
          standard ratio (ASOS/Zalando/catalog guides). Product photos are
          uploaded at 3:4, so cover-fit fills the frame exactly: consistent
          height for every product, no cropping, no empty bands. */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3 / 4",
          background: panel,
          overflow: "hidden",
        }}
      >
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
            overscrollBehaviorX: "contain",
          }}
        >
          {images.map((src, i) => (
            <div
              key={src}
              style={{ flex: "0 0 100%", width: "100%", height: "100%", scrollSnapAlign: "center" }}
            >
              <img
                src={src}
                alt=""
                onClick={onZoom}
                draggable={false}
                decoding="async"
                loading={i === 0 ? "eager" : "lazy"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }}
              />
            </div>
          ))}
        </div>

        {/* image counter — quiet, tabular, on a frosted chip */}
        {images.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 16,
              zIndex: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.6px",
              color: TEXT_COLOR,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {index + 1} / {images.length}
          </div>
        )}

        {/* wishlist heart lives on the image — off the toolbar */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 6 }}>
          <FavoriteButton productId={productId} variant="floating" size={38} />
        </div>

        <ZoomButton onClick={onZoom} style={{ top: "auto", bottom: 14 }} />
      </div>

      {/* thumbnail filmstrip — every image across all colours, running
          edge-to-edge from the left with square frames on the panel colour;
          a full-width ink underline glides to the active thumb. */}
      {images.length > 1 && (
        <div
          ref={railRef}
          className="pg-track"
          style={{
            display: "flex",
            gap: 5,
            padding: "10px 12px 2px",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {images.map((src, i) => (
            <div key={src} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 5 }}>
              <button
                data-thumb={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                style={{
                  width: 60,
                  height: 80, // 3:4, matching the main stage
                  padding: 0,
                  border: "none",
                  borderRadius: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: panel,
                  opacity: i === index ? 1 : 0.5,
                  transition: "opacity 0.3s ease",
                }}
              >
                <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              <span style={{ height: 2, width: "100%", display: "block" }}>
                {i === index && (
                  <motion.span
                    layoutId="pg-thumb-underline"
                    transition={{ duration: 0.35, ease: EASE }}
                    style={{ display: "block", height: 2, width: "100%", background: "#141414" }}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
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
    <div style={{ borderTop: "1px solid rgba(84,84,84,0.14)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: "18px 0",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.4px",
          color: TEXT_COLOR,
        }}
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{ display: "inline-flex", color: TEXT_COLOR }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 4.5v15M4.5 12h15" />
          </svg>
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
                paddingBottom: 20,
                fontSize: 13.5,
                lineHeight: 1.75,
                color: "rgba(84,84,84,0.75)",
                maxWidth: 440,
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
  const navigate = useNavigate();
  const { close, consumeOrigin } = useProductNav();
  const { products, getById, loading: catalogLoading } = useCatalog();
  const { freeOver } = useDeliveryConfig();
  const fmt = useMoney();
  const product = getById(id);

  // Stored click origin for the shared-element morph (null on a direct visit).
  const origin = useRef(product ? consumeOrigin(product.id) : null).current;
  const onClose = close;

  // Selected option per attribute (attrId → optionId) for variant products.
  const [sel, setSel] = useState<Record<number, number>>({});

  // The variant matching the current option selection (gallery-jump lookup).
  const galleryVariant = useMemo(() => {
    const attrs = product?.attributes ?? [];
    if (!product || !attrs.length || !product.variants?.length) return null;
    const ids = attrs.map((a) => sel[a.id] ?? a.options[0]?.id).filter((x): x is number => x != null);
    return product.variants.find((vt) => sameSet(vt.optionIds, ids)) ?? null;
  }, [product, sel]);

  // ONE combined gallery: the product's images first, then every variant's
  // images (deduped, in variant order) — so the thumbnail rail shows the
  // whole story across colours, and picking a colour jumps to its picture.
  // The clicked card image is kept at the front so the shared-element morph
  // lands on the same picture.
  const combined = useMemo(() => {
    const variantStart = new Map<number, number>(); // variant id → first image index
    if (!product) return { list: [] as string[], variantStart };
    const list = product.images?.length ? [...product.images] : getGallery(product).map(asset);
    if (origin && !list.includes(origin.imgSrc)) list.unshift(origin.imgSrc);
    for (const v of product.variants ?? []) {
      for (const src of v.images ?? []) {
        let idx = list.indexOf(src);
        if (idx === -1) { idx = list.length; list.push(src); }
        if (!variantStart.has(v.id)) variantStart.set(v.id, idx);
      }
    }
    return { list, variantStart };
  }, [product, origin]);
  const gallery = combined.list;

  const initialIndex = Math.max(0, gallery.indexOf(origin?.imgSrc ?? gallery[0] ?? ""));
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Switching colour/variant glides the gallery to that variant's first
  // image. `sel` only changes on a real user pick, so the entrance view
  // (hero image) is never disturbed by hydration.
  useEffect(() => {
    if (!Object.keys(sel).length) return;
    if (!galleryVariant) return;
    const idx = combined.variantStart.get(galleryVariant.id);
    if (idx != null) setActiveIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
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
  // Mobile: the bottom bar expands into a variant sheet (color/size/qty).
  const [sheetOpen, setSheetOpen] = useState(false);

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
      title: `${product.name} — ${fmt(product.price)} | The A Line`,
      description: product.description,
      image: product.images?.[0] ?? `${ASSET}/${productImageFile(product)}`,
      url: window.location.href,
      type: "product",
    });
    return () => resetPageMeta();
  }, [product, fmt]);

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

  if (!product) {
    // On a hard refresh the catalog boots from the static seed and the real
    // (admin-created) products arrive a beat later — hold, don't bounce home.
    if (catalogLoading) {
      return (
        <div
          data-tone="light"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            color: "rgba(58,58,58,0.55)",
          }}
        >
          Loading…
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  const hasOrigin = !!origin;

  // ---- Desktop image-panel geometry ------------------------------------
  // PDP gallery: featured portrait box + a column of square thumbnails to
  // its RIGHT, anchored right under the header. Gallery, a fixed gap, and
  // the info text are centered together as ONE composition so no dead
  // space opens up between them. The featured box is the morph target.
  const GALLERY_BG = "rgb(231,231,231)";  // gray image boxes on the white page
  const HEADER_CLEAR = 84;                // clear the fixed <Header />
  const RAIL_W = gallery.length > 1 ? Math.min(200, Math.round(vp.w * 0.12)) : 0;
  const RAIL_GAP = RAIL_W ? 8 : 0;
  const INFO_GAP = 64;                    // gallery → info column gap
  const INFO_W = 560;                     // info text width (maxWidth below)
  const target = (() => {
    const h = Math.min(vp.h - HEADER_CLEAR - 36, 640);  // capped height
    const w = Math.min(h * 0.82, vp.w * 0.34);          // portrait, width-capped
    const groupW = w + RAIL_GAP + RAIL_W;
    const left = Math.max(32, (vp.w - (groupW + INFO_GAP + INFO_W + 56)) / 2);
    return { width: w, height: h, left, top: HEADER_CLEAR + 12 };
  })();
  const railLeft = target.left + target.width + RAIL_GAP;
  const infoStart = railLeft + RAIL_W; // spacer width; the gap is info padding

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
      data-tone="light"
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
              width: "58%",
              height: "100%",
              background: "#ffffff",
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
              borderRadius: 10,
              overflow: "hidden",
              background: GALLERY_BG,
              zIndex: 10,
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
          {/* vertical rail of square thumbnails, right of the featured image */}
          {RAIL_W > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.45 }}
              className="pg-thumbrail"
              style={{
                position: "fixed",
                left: railLeft,
                top: target.top,
                width: RAIL_W,
                maxHeight: target.height,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflowY: "auto",
                overflowX: "hidden",
                zIndex: 20,
                scrollbarWidth: "none",
              }}
            >
              <style>{`.pg-thumbrail::-webkit-scrollbar{display:none}`}</style>
              {gallery.map((src, i) => {
                const active = i === activeIndex;
                return (
                  <button
                    key={src}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`View image ${i + 1}`}
                    style={{
                      flex: "0 0 auto",
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                      background: GALLERY_BG,
                      border: active ? "1.5px solid #111" : "1.5px solid transparent",
                      opacity: active ? 1 : 0.75,
                      transition: "border 0.2s ease, opacity 0.2s ease",
                    }}
                  >
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </button>
                );
              })}
            </motion.div>
          )}
        </>
      )}

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
          /* Start the gallery below the fixed header (66px tall on mobile)
             instead of sliding underneath it. */
          <div style={{ marginTop: 66 }}>
            <MobileGallery
              images={gallery}
              panel={product.panel}
              index={activeIndex}
              setIndex={setActiveIndex}
              onZoom={() => setZoomOpen(true)}
              productId={product.id}
            />
          </div>
        ) : (
          <div style={{ flex: `0 0 ${infoStart}px`, height: "auto", pointerEvents: "none" }} />
        )}

        {/* info column */}
        <div
          style={{
            flex: isMobile ? "none" : "1 1 auto",
            // Desktop: top padding aligns the text with the gallery top just
            // under the fixed <Header />; left padding IS the gallery→info gap.
            // Mobile bottom padding clears the fixed add-to-bag bar.
            padding: isMobile ? "26px 20px 130px" : `${HEADER_CLEAR + 12}px 56px 72px ${INFO_GAP}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            maxWidth: isMobile ? "100%" : INFO_W + INFO_GAP + 56,
          }}
        >
          {/* eyebrow — quiet, editorial, tappable back into the category */}
          {product.category && (
            <motion.button
              {...block(0)}
              onClick={() =>
                navigate(`/shop?category=${encodeURIComponent(product.categories?.[0]?.slug ?? product.category)}`)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                alignSelf: "flex-start",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
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
                {product.category}
              </span>
            </motion.button>
          )}

          {/* name — refined scale; luxury PDPs never shout */}
          <motion.h1
            {...block(1)}
            style={{
              fontSize: isMobile ? "clamp(26px, 7.5vw, 32px)" : 42,
              fontWeight: 500,
              letterSpacing: isMobile ? "-0.6px" : "-1.1px",
              lineHeight: 1.08,
              color: TEXT_COLOR,
              marginBottom: 10,
            }}
          >
            {product.name}
          </motion.h1>

          {/* price — the current price leads; on sale it turns a classic
              fashion-retail red (medium weight, never shouty) with the old
              price struck through beside it. */}
          <motion.div
            {...block(2)}
            style={{ marginBottom: 26, display: "flex", alignItems: "baseline", gap: 10 }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.3px",
                color: unitCompareAt != null && unitCompareAt > unitPrice ? "#c4342c" : TEXT_COLOR,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(unitPrice)}
            </span>
            {unitCompareAt != null && unitCompareAt > unitPrice && (
              <span style={{ fontSize: 14, color: "rgba(84,84,84,0.5)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
                {fmt(unitCompareAt)}
              </span>
            )}
          </motion.div>

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
                              width: 28, height: 28, borderRadius: "50%", background: o.hex, cursor: "pointer",
                              border: "none",
                              // Selected: ink ring with a white breathing gap.
                              boxShadow: isSel
                                ? "0 0 0 2px #ffffff, 0 0 0 3.5px #141414"
                                : "0 0 0 1px rgba(84,84,84,0.25)",
                              outline: "none",
                              opacity: avail ? 1 : 0.35,
                              transition: "box-shadow 0.2s ease, opacity 0.2s ease",
                            }}
                          />
                        ) : (
                          <button
                            key={o.id}
                            onClick={() => setSel((s) => ({ ...s, [a.id]: o.id }))}
                            style={{
                              height: 42, minWidth: 52, padding: "0 16px", borderRadius: 3,
                              background: isSel ? "#141414" : "#ffffff", cursor: "pointer",
                              fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 450, color: isSel ? "#ffffff" : "#141414",
                              border: isSel ? "1px solid #141414" : "1px solid rgba(84,84,84,0.3)",
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
                        width: 28, height: 28, borderRadius: "50%", background: c.hex, cursor: "pointer",
                        border: "none",
                        boxShadow: isSel
                          ? "0 0 0 2px #ffffff, 0 0 0 3.5px #141414"
                          : "0 0 0 1px rgba(84,84,84,0.25)",
                        outline: "none",
                        transition: "box-shadow 0.2s ease",
                      }}
                    />
                  ) : (
                    <button
                      key={`${c.name}-${i}`}
                      onClick={() => setColor(i)}
                      style={{
                        height: 42, minWidth: 52, padding: "0 16px", borderRadius: 3,
                        background: isSel ? "#141414" : "#ffffff", cursor: "pointer",
                        fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 450, color: isSel ? "#ffffff" : "#141414",
                        border: isSel ? "1px solid #141414" : "1px solid rgba(84,84,84,0.3)",
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

          {/* qty + add to bag — inline on desktop; on mobile this lives in a
              fixed bottom bar so it is always one thumb-tap away. */}
          {!isMobile && (
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
          )}

          {/* reassurance — the promises a shopper checks before committing */}
          <motion.div
            {...block(5)}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              columnGap: 10,
              rowGap: 4,
              fontSize: 12,
              color: "rgba(84,84,84,0.65)",
              marginBottom: 26,
            }}
          >
            <span>Cash on delivery</span>
            <span style={{ width: 3, height: 3, borderRadius: 999, background: "rgba(84,84,84,0.4)" }} />
            <span>Free delivery over {fmt(freeOver, true)}</span>
            <span style={{ width: 3, height: 3, borderRadius: 999, background: "rgba(84,84,84,0.4)" }} />
            <span>30-day returns</span>
          </motion.div>

          {/* description — the admin's rich-text editor stores HTML, so render
              it as markup (admin-authored, trusted); plain text passes through
              unchanged. */}
          {/<\/?[a-z][\s\S]*>/i.test(product.description || "") ? (
            <motion.div
              {...block(6)}
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "rgba(84,84,84,0.8)",
                marginBottom: 26,
                maxWidth: 440,
              }}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : product.description ? (
            <motion.p
              {...block(6)}
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
          ) : null}

          {/* accordions */}
          <motion.div {...block(6)}>
            <Accordion title="Details" body={product.details} />
            <Accordion title="Materials & care" body={product.materials} />
            <Accordion
              title="Shipping & returns"
              body={`Cash on delivery across Lebanon — free delivery over ${fmt(freeOver, true)}. 30-day returns, no questions asked.`}
            />
          </motion.div>

          {/* related — a swipeable rail on mobile, grid on desktop */}
          <motion.div {...block(7)} style={{ marginTop: 44 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "2px",
                color: "rgba(84,84,84,0.5)",
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              You may also like
            </div>
            {isMobile ? (
              <div
                className="pg-track"
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  margin: "0 -20px",
                  padding: "0 20px",
                }}
              >
                {related.map((p, i) => (
                  <div key={p.id} style={{ flex: "0 0 46vw", scrollSnapAlign: "start" }}>
                    <ProductCard product={p} index={i} compact showFavorite={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {related.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} compact showFavorite={false} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* mobile: the bottom toolbar — a summary chip that unfolds into a full
          variant sheet (every option axis + quantity), with add-to-bag always
          one thumb-tap away. */}
      {isMobile && (
        <>
          <AnimatePresence>
            {sheetOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={() => setSheetOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 58,
                  background: "rgba(17,17,17,0.35)",
                }}
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ y: 84, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
            style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60 }}
          >
            {/* the sheet */}
            <AnimatePresence initial={false}>
              {sheetOpen && (
                <motion.div
                  key="variant-sheet"
                  initial={{ y: 48, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 48, opacity: 0 }}
                  transition={{ duration: 0.38, ease: EASE }}
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px 20px 0 0",
                    boxShadow: "0 -20px 60px rgba(20,20,20,0.16)",
                    padding: "14px 20px 8px",
                    maxHeight: "58vh",
                    overflowY: "auto",
                  }}
                >
                  {/* grab handle */}
                  <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(20,20,20,0.16)", margin: "0 auto 18px" }} />

                  {hasVariants
                    ? attributes.map((a, gi) => {
                        const selectedId = chosen(a);
                        const selName = a.options.find((o) => o.id === selectedId)?.value ?? "";
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: EASE, delay: 0.06 + gi * 0.07 }}
                            style={{ marginBottom: 20 }}
                          >
                            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", marginBottom: 10, textTransform: "uppercase" }}>
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
                                    style={{
                                      width: 32, height: 32, borderRadius: "50%", background: o.hex, cursor: "pointer", border: "none",
                                      boxShadow: isSel ? "0 0 0 2px #ffffff, 0 0 0 3.5px #141414" : "0 0 0 1px rgba(84,84,84,0.25)",
                                      opacity: avail ? 1 : 0.35,
                                      transition: "box-shadow 0.2s ease, opacity 0.2s ease",
                                    }}
                                  />
                                ) : (
                                  <button
                                    key={o.id}
                                    onClick={() => setSel((s) => ({ ...s, [a.id]: o.id }))}
                                    style={{
                                      height: 42, minWidth: 52, padding: "0 16px", borderRadius: 3,
                                      background: isSel ? "#141414" : "#ffffff", cursor: "pointer",
                                      fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 450,
                                      color: isSel ? "#ffffff" : "#141414",
                                      border: isSel ? "1px solid #141414" : "1px solid rgba(84,84,84,0.3)",
                                      opacity: avail ? 1 : 0.4, textDecoration: avail ? "none" : "line-through",
                                      transition: "background 0.2s ease, border 0.2s ease, opacity 0.2s ease",
                                    }}
                                  >
                                    {o.value}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                      })
                    : product.colors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: EASE, delay: 0.06 }}
                          style={{ marginBottom: 20 }}
                        >
                          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", marginBottom: 10, textTransform: "uppercase" }}>
                            Color — {product.colors[color].name}
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
                                    width: 32, height: 32, borderRadius: "50%", background: c.hex, cursor: "pointer", border: "none",
                                    boxShadow: isSel ? "0 0 0 2px #ffffff, 0 0 0 3.5px #141414" : "0 0 0 1px rgba(84,84,84,0.25)",
                                    transition: "box-shadow 0.2s ease",
                                  }}
                                />
                              ) : (
                                <button
                                  key={`${c.name}-${i}`}
                                  onClick={() => setColor(i)}
                                  style={{
                                    height: 42, minWidth: 52, padding: "0 16px", borderRadius: 3,
                                    background: isSel ? "#141414" : "#ffffff", cursor: "pointer",
                                    fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: isSel ? 600 : 450,
                                    color: isSel ? "#ffffff" : "#141414",
                                    border: isSel ? "1px solid #141414" : "1px solid rgba(84,84,84,0.3)",
                                    transition: "background 0.2s ease, border 0.2s ease",
                                  }}
                                >
                                  {c.name}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                  {/* quantity */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: 0.06 + (hasVariants ? attributes.length : 1) * 0.07 }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase" }}>
                      Quantity
                    </div>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "0 4px", height: 40 }}>
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={qtyBtn}>−</button>
                      <span style={{ width: 24, textAlign: "center", fontSize: 14.5, fontWeight: 500, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
                      <button onClick={() => setQty((q) => q + 1)} style={qtyBtn}>+</button>
                    </div>
                  </motion.div>

                  {(variantUnavailable || variantSoldOut) && (
                    <div style={{ fontSize: 12.5, color: "#c0563f", marginBottom: 12 }}>
                      {variantSoldOut ? "This combination is out of stock." : "This combination isn’t available — pick another."}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* the bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
                background: sheetOpen ? "#ffffff" : "rgba(255,255,255,0.96)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderTop: sheetOpen ? "1px solid rgba(58,58,58,0.06)" : "1px solid rgba(58,58,58,0.1)",
              }}
            >
              {/* selection summary chip → opens the sheet */}
              <button
                onClick={() => setSheetOpen((o) => !o)}
                aria-expanded={sheetOpen}
                aria-label="Choose options"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 46,
                  padding: "0 12px",
                  maxWidth: 132,
                  border: "1px solid rgba(84,84,84,0.25)",
                  borderRadius: 999,
                  background: "#ffffff",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  flexShrink: 0,
                }}
              >
                {selectedHex ? (
                  <span style={{ width: 15, height: 15, borderRadius: "50%", background: selectedHex, boxShadow: "0 0 0 1px rgba(84,84,84,0.25)", flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>×{qty}</span>
                )}
                <span style={{ fontSize: 12.5, fontWeight: 500, color: TEXT_COLOR, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedLabel || "Options"}
                </span>
                <motion.span
                  animate={{ rotate: sheetOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{ display: "inline-flex", color: "rgba(84,84,84,0.6)", flexShrink: 0 }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </motion.span>
              </button>
              <AddToBag
                product={product}
                color={{ name: selectedLabel, hex: selectedHex }}
                variant={hasVariants ? addVariant : undefined}
                unitPrice={unitPrice}
                disabled={variantUnavailable || variantSoldOut}
                qty={qty}
              />
            </div>
          </motion.div>
        </>
      )}

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
  const fmt = useMoney();
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
        background: disabled ? "rgba(84,84,84,0.18)" : "#141414",
        color: disabled ? "rgba(84,84,84,0.7)" : "#ffffff",
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
      {disabled ? "Unavailable" : added ? "Added to bag ✓" : `Add to bag — ${fmt(price * qty)}`}
    </motion.button>
  );
}
