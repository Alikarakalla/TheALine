import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { TEXT_COLOR, PAGE_MAX, PAGE_PAD } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCatalog } from "../context/Catalog";
import { apiGet } from "../lib/api";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

type CollectionData = {
  title: string;
  description?: string | null;
  image?: string | null;
  productSlugs: string[];
};

export default function CollectionPage() {
  const { slug } = useParams();
  const isMobile = useIsMobile();
  const { byId } = useCatalog();
  const [data, setData] = useState<CollectionData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    apiGet<CollectionData>(`collections/${slug}`)
      .then((d) => { if (alive) { setData(d); setState("ok"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (data) {
      setPageMeta({
        title: `${data.title} | The A Line`,
        description: data.description || `Shop the ${data.title} collection.`,
        url: window.location.href,
      });
    }
    return () => resetPageMeta();
  }, [data]);

  // Map the collection's product slugs onto the live catalog.
  const products = useMemo(
    () => (data?.productSlugs || []).map((s) => byId[s]).filter(Boolean),
    [data, byId]
  );

  if (state === "error") return <Navigate to="/shop" replace />;

  return (
    <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter Tight', sans-serif" }}>
      <Header />

      {/* hero */}
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: isMobile ? `110px ${PAGE_PAD} 8px` : `150px ${PAGE_PAD} 16px` }}>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 14 }}>COLLECTION</div>
          <h1 style={{ fontSize: isMobile ? "clamp(40px, 13vw, 72px)" : 72, fontWeight: 600, letterSpacing: "-3px", lineHeight: 1, color: TEXT_COLOR, margin: 0 }}>
            {data?.title ?? "…"}
          </h1>
          {data?.description && (
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(84,84,84,0.8)", maxWidth: 560, marginTop: 18 }}>{data.description}</p>
          )}
        </motion.div>
      </div>

      {/* grid */}
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: isMobile ? `24px ${PAGE_PAD} 80px` : `36px ${PAGE_PAD} 100px` }}>
        {state === "loading" ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(84,84,84,0.5)" }}>Loading…</div>
        ) : products.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(84,84,84,0.6)" }}>
            <div style={{ fontSize: 22, color: TEXT_COLOR, marginBottom: 8 }}>Nothing here yet</div>
            <div style={{ fontSize: 14 }}>This collection has no products at the moment.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "rgba(84,84,84,0.7)", marginBottom: 22 }}>
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 16 : 28 }}>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} showQuickAdd />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
