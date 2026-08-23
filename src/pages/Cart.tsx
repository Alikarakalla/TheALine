import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { TEXT_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart, type CartItem } from "../context/Cart";
import { useCatalog } from "../context/Catalog";
import { useFavorites } from "../context/Favorites";
import { useDeliveryConfig } from "../context/SiteSettings";
import { useMoney } from "../context/Currency";
import { setPageMeta, resetPageMeta } from "../lib/meta";

/**
 * The bag — rebuilt in the storefront's current language: hairline-separated
 * 3:4 line items, a free-delivery progress bar, quiet text actions, a sticky
 * summary (desktop) / sticky checkout bar (mobile), and a cross-sell rail.
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.1)";
const PANEL_FALLBACK = "#F2EEE6";

const microLabel: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "2px",
  color: "rgba(84,84,84,0.5)",
  textTransform: "uppercase",
};

function QtyStepper({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  const btn: React.CSSProperties = {
    width: 30,
    height: 32,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Inter Tight', sans-serif",
    fontSize: 15,
    color: TEXT_COLOR,
    lineHeight: 1,
  };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "0 2px", height: 34 }}>
      <button style={btn} onClick={() => onChange(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
      <span style={{ width: 22, textAlign: "center", fontSize: 13.5, fontWeight: 500, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
      <button style={btn} onClick={() => onChange(qty + 1)} aria-label="Increase quantity">+</button>
    </div>
  );
}

function LineItem({ item, index }: { item: CartItem; index: number }) {
  const { remove, setQty } = useCart();
  const { getById } = useCatalog();
  const { toggle, has } = useFavorites();
  const fmt = useMoney();
  const product = getById(item.productId);
  // Prefer the stored (variant-exact) photo; fall back to the product's
  // current hero when the stored URL has gone stale. The error can fire
  // before React attaches its handler, so also check the already-failed
  // state (complete with zero natural width) after mount.
  const [src, setSrc] = useState(item.image);
  const imgRef = useRef<HTMLImageElement>(null);
  const fallback = () => {
    const f = product?.images?.[0];
    if (f && f !== src) setSrc(f);
  };
  useEffect(() => setSrc(item.image), [item.image]);
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) fallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, product]);

  const moveToFavorites = () => {
    if (!has(item.productId)) toggle(item.productId);
    remove(item.id);
  };

  // Sale context for this line: the matching variant's compare-at (by SKU,
  // then by label) falls back to the product-level compare-at.
  const compareAt = useMemo(() => {
    const v =
      (item.sku && product?.variants?.find((vt) => vt.sku === item.sku)) ||
      product?.variants?.find((vt) => vt.name === item.colorName);
    const c = v?.compareAtPrice ?? product?.compareAtPrice ?? null;
    return c != null && c > item.price ? c : null;
  }, [product, item.sku, item.colorName, item.price]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{ duration: 0.45, ease: EASE, delay: Math.min(index * 0.06, 0.3) }}
      style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: HAIRLINE }}
    >
      {/* 3:4 thumb on the panel colour — same stage as everywhere else */}
      <div style={{ width: 84, height: 112, borderRadius: 8, overflow: "hidden", background: product?.panel || PANEL_FALLBACK, flexShrink: 0 }}>
        <img
          ref={imgRef}
          src={src}
          alt={item.name}
          onError={fallback}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* name / variant / actions */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.2px", color: TEXT_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, fontSize: 12.5, color: "rgba(84,84,84,0.65)" }}>
              {item.colorHex && (
                <span style={{ width: 11, height: 11, borderRadius: 999, background: item.colorHex, boxShadow: "0 0 0 1px rgba(84,84,84,0.2)", flexShrink: 0 }} />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.colorName}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: compareAt ? "#c4342c" : TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>
              {fmt(item.price * item.qty)}
            </div>
            {compareAt && (
              <div style={{ fontSize: 12, color: "rgba(84,84,84,0.5)", textDecoration: "line-through", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                {fmt(compareAt * item.qty)}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <QtyStepper qty={item.qty} onChange={(q) => setQty(item.id, q)} />
          <div style={{ display: "flex", gap: 14 }}>
            <button
              onClick={moveToFavorites}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: "rgba(84,84,84,0.65)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Move to favorites
            </button>
            <button
              onClick={() => remove(item.id)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: "rgba(84,84,84,0.65)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FreeDeliveryBar({ subtotal }: { subtotal: number }) {
  const { freeOver } = useDeliveryConfig();
  const fmt = useMoney();
  if (!freeOver || freeOver <= 0) return null;
  const unlocked = subtotal >= freeOver;
  const pct = Math.min(100, Math.round((subtotal / freeOver) * 100));
  return (
    <div style={{ padding: "16px 0 4px" }}>
      <div style={{ fontSize: 12.5, color: unlocked ? TEXT_COLOR : "rgba(84,84,84,0.7)", fontWeight: unlocked ? 500 : 400, marginBottom: 8 }}>
        {unlocked ? "Free delivery unlocked" : <>You're <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(freeOver - subtotal)}</strong> away from free delivery</>}
      </div>
      <div style={{ height: 2, borderRadius: 999, background: "rgba(58,58,58,0.12)", overflow: "hidden" }}>
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ height: "100%", borderRadius: 999, background: "#141414" }}
        />
      </div>
    </div>
  );
}

function SummaryLines({ subtotal }: { subtotal: number }) {
  const { fee, freeOver } = useDeliveryConfig();
  const fmt = useMoney();
  const deliveryFree = fee <= 0 || (freeOver > 0 && subtotal >= freeOver);
  const delivery = deliveryFree ? 0 : fee;
  const total = subtotal + delivery;
  const line: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "rgba(84,84,84,0.75)", marginBottom: 10 };
  return (
    <>
      <div style={line}>
        <span>Subtotal</span>
        <span style={{ color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{fmt(subtotal)}</span>
      </div>
      <div style={line}>
        <span>Delivery</span>
        <span style={{ color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{deliveryFree ? "Free" : fmt(delivery)}</span>
      </div>
      <div style={{ borderTop: HAIRLINE, margin: "14px 0", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: TEXT_COLOR }}>Total</span>
        <span style={{ fontSize: 17, fontWeight: 600, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</span>
      </div>
    </>
  );
}

function TrustLine() {
  const { freeOver } = useDeliveryConfig();
  const fmt = useMoney();
  const dot = <span style={{ width: 3, height: 3, borderRadius: 999, background: "rgba(84,84,84,0.4)" }} />;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 9, rowGap: 4, fontSize: 11.5, color: "rgba(84,84,84,0.6)", marginTop: 14 }}>
      <span>Cash on delivery</span>
      {dot}
      <span>Free delivery over {fmt(freeOver, true)}</span>
      {dot}
      <span>30-day returns</span>
    </div>
  );
}

export default function Cart() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { products } = useCatalog();
  const { fee, freeOver } = useDeliveryConfig();
  const fmt = useMoney();

  useEffect(() => {
    setPageMeta({ title: "Your bag | The A Line", description: "Review the pieces in your bag and check out with cash on delivery across Lebanon." });
    return () => resetPageMeta();
  }, []);

  const deliveryFree = fee <= 0 || (freeOver > 0 && subtotal >= freeOver);
  const total = subtotal + (deliveryFree ? 0 : fee);

  // Cross-sell: catalog products not already in the bag.
  const suggestions = useMemo(() => {
    const inBag = new Set(items.map((i) => i.productId));
    return products.filter((p) => !inBag.has(p.id)).slice(0, isMobile ? 6 : 4);
  }, [products, items, isMobile]);

  const empty = items.length === 0;
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter Tight', sans-serif" }}>
      <Header />

      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `96px ${PAGE_PAD} 140px` : `150px ${PAGE_PAD} 110px`,
        }}
      >
        {/* no headline — just the quiet page label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isMobile ? 4 : 10 }}
        >
          <span style={{ width: 22, height: 1, background: "rgba(84,84,84,0.4)", display: "block" }} />
          <span style={{ ...microLabel, letterSpacing: "2.5px" }}>
            Shopping bag{!empty ? ` · ${count} ${count === 1 ? "item" : "items"}` : ""}
          </span>
        </motion.div>

        {empty ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            style={{ padding: "48px 0 20px" }}
          >
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(84,84,84,0.7)", maxWidth: 380, margin: "0 0 26px" }}>
              Your bag is empty. The pieces you add will wait for you here.
            </p>
            <button
              onClick={() => navigate("/shop")}
              style={{ background: "#141414", color: "#fff", border: "none", borderRadius: 999, padding: "15px 32px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14.5, fontWeight: 600 }}
            >
              Continue shopping
            </button>
          </motion.div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 0 : 64,
              alignItems: "flex-start",
            }}
          >
            {/* items */}
            <div style={{ flex: "1 1 auto", minWidth: 0, width: isMobile ? "100%" : "auto" }}>
              <FreeDeliveryBar subtotal={subtotal} />
              <div style={{ borderTop: HAIRLINE, marginTop: 14 }}>
                <AnimatePresence initial={false}>
                  {items.map((item, i) => (
                    <LineItem key={item.id} item={item} index={i} />
                  ))}
                </AnimatePresence>
              </div>
              <button
                onClick={() => navigate("/shop")}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13.5, color: TEXT_COLOR }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
                </svg>
                Continue shopping
              </button>
            </div>

            {/* summary — sticky panel on desktop, in-flow block on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
              style={{
                flex: isMobile ? "none" : "0 0 360px",
                width: isMobile ? "100%" : 360,
                position: isMobile ? "static" : "sticky",
                top: 110,
                marginTop: isMobile ? 34 : 58,
                background: "#FBFAF7",
                border: HAIRLINE,
                borderRadius: 14,
                padding: "22px 22px 20px",
              }}
            >
              <div style={{ ...microLabel, marginBottom: 16 }}>Summary</div>
              <SummaryLines subtotal={subtotal} />
              {!isMobile && (
                <button
                  onClick={() => navigate("/checkout")}
                  style={{ width: "100%", marginTop: 6, background: "#141414", color: "#fff", border: "none", borderRadius: 999, padding: "16px 0", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14.5, fontWeight: 600 }}
                >
                  Checkout — {fmt(total)}
                </button>
              )}
              <TrustLine />
            </motion.div>
          </div>
        )}

        {/* cross-sell */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
            style={{ marginTop: isMobile ? 48 : 72 }}
          >
            <div style={{ ...microLabel, marginBottom: 16 }}>{empty ? "Start here" : "You may also like"}</div>
            {isMobile ? (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  margin: `0 -${PAGE_PAD}`,
                  padding: `0 ${PAGE_PAD}`,
                }}
              >
                {suggestions.map((p, i) => (
                  <div key={p.id} style={{ flex: "0 0 46vw", scrollSnapAlign: "start" }}>
                    <ProductCard product={p} index={i} compact showFavorite={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
                {suggestions.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} compact showFavorite={false} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* mobile: sticky checkout bar — same frosted language as the PDP toolbar */}
      {isMobile && !empty && (
        <motion.div
          initial={{ y: 84, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderTop: HAIRLINE,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1.6px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase" }}>Total</div>
            <div style={{ fontSize: 16.5, fontWeight: 600, color: TEXT_COLOR, fontVariantNumeric: "tabular-nums" }}>{fmt(total)}</div>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            style={{ flex: 1, background: "#141414", color: "#fff", border: "none", borderRadius: 999, height: 50, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14.5, fontWeight: 600 }}
          >
            Checkout
          </button>
        </motion.div>
      )}
    </div>
  );
}
