import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import ProductCard from "../components/ProductCard";
import { TEXT_COLOR, GLOW_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { type Product } from "../lib/products";
import { useCatalog } from "../context/Catalog";
import { useIsMobile } from "../lib/useResponsive";
import { useFavorites } from "../context/Favorites";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

/* FavCard is the shared <ProductCard /> (src/components/ProductCard.tsx) */

export default function Favorites() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { ids } = useFavorites();
  const { byId } = useCatalog();

  useEffect(() => {
    setPageMeta({
      title: "Favorites | The A Line",
      description: "The pieces you've saved.",
      url: window.location.origin + "/favorites",
    });
    return () => resetPageMeta();
  }, []);

  const products = useMemo(
    () => ids.map((id) => byId[id]).filter(Boolean) as Product[],
    [ids, byId]
  );
  const empty = products.length === 0;

  return (
    <div
      data-tone="light"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `110px ${PAGE_PAD} 80px` : `150px ${PAGE_PAD} 100px`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}
        >
          <span
            style={{
              fontSize: isMobile ? "clamp(40px, 13vw, 64px)" : 64,
              fontWeight: 600,
              letterSpacing: "-2.5px",
              lineHeight: 1,
              color: TEXT_COLOR,
            }}
          >
            Your
          </span>
          <SerifGlow
            word="favorites"
            italic
            fontSize={isMobile ? "clamp(44px, 14vw, 70px)" : 70}
            lineHeight={isMobile ? "clamp(40px, 13vw, 66px)" : 66}
            letterSpacing={-2.5}
            strokeWidth={isMobile ? "clamp(9px, 3vw, 15px)" : 15}
            delay={0.3}
          />
        </motion.div>
        <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 40 }}>
          {empty
            ? "No saved pieces yet."
            : `${products.length} saved ${products.length === 1 ? "piece" : "pieces"}`}
        </div>

        {empty ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            style={{ maxWidth: 420 }}
          >
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: "rgba(84,84,84,0.75)",
                marginBottom: 26,
              }}
            >
              Tap the heart on any piece to save it here for later.
            </p>
            <button
              onClick={() => navigate("/shop")}
              style={{
                background: GLOW_COLOR,
                border: "none",
                borderRadius: 999,
                padding: "16px 32px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#111",
              }}
            >
              Explore the collection
            </button>
          </motion.div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
              gap: isMobile ? 16 : 28,
            }}
          >
            <AnimatePresence>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
