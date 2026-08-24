import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { TEXT_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCatalog } from "../context/Catalog";
import { isSoldOut } from "../lib/products";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A dead end that stays on brand and gives the shopper somewhere to go.
 *
 * Previously every unknown URL silently redirected to the homepage with a 200,
 * so a mistyped or retired product link looked like the site had simply
 * forgotten the piece — and crawlers indexed the soft-404s. The `noindex` tag
 * keeps these out of the index while the real pages stay crawlable.
 */
export default function NotFound({ what = "page" }: { what?: "page" | "product" }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { products } = useCatalog();

  useEffect(() => {
    const token = setPageMeta({
      title: "Page not found | The A Line",
      description: "The page you were looking for isn't here — browse the collection instead.",
    });
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      robots.remove();
      resetPageMeta(token);
    };
  }, []);

  const picks = products.filter((p) => !isSoldOut(p)).slice(0, isMobile ? 4 : 4);

  return (
    <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter Tight', sans-serif" }}>
      <Header />
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: `${isMobile ? 120 : 168}px ${PAGE_PAD} 96px` }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase" }}>
            Error 404
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: isMobile ? "clamp(38px, 12vw, 56px)" : 76,
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-1.5px",
              color: TEXT_COLOR,
              margin: "14px 0 0",
            }}
          >
            This one got away
          </h1>
          <p style={{ marginTop: 16, maxWidth: 460, fontSize: 14.5, lineHeight: 1.75, color: "rgba(84,84,84,0.75)" }}>
            {what === "product"
              ? "That piece isn't in the collection any more — it may have sold out or been retired. Here's what's available now."
              : "We couldn't find that page. The link may be old, or the address slightly off."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            <button
              onClick={() => navigate("/shop")}
              style={{
                height: 46, padding: "0 28px", borderRadius: 999, border: "none",
                background: "#141414", color: "#fff", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontSize: 14.5, fontWeight: 600,
              }}
            >
              Shop the collection
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                height: 46, padding: "0 28px", borderRadius: 999,
                border: "1px solid rgba(84,84,84,0.28)", background: "none",
                color: TEXT_COLOR, cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontSize: 14.5, fontWeight: 500,
              }}
            >
              Back home
            </button>
          </div>
        </motion.div>

        {picks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            style={{ marginTop: isMobile ? 56 : 80 }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase", marginBottom: 16 }}>
              In the collection
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                gap: isMobile ? 12 : 18,
              }}
            >
              {picks.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} compact={isMobile} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
