import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  asset,
  curlInitial,
  curlAnimate,
  curlTransition,
} from "../lib/constants";
import { productImageFile, type Product } from "../lib/products";
import { useIsMobile } from "../lib/useResponsive";
import { useProductNav } from "../context/ProductNav";
import { useCatalog } from "../context/Catalog";
import ProductCard from "./ProductCard";

const EASE = [0.22, 1, 0.36, 1] as const;
const POPULAR = ["Tote", "Black", "Evening", "Crossbody", "Bordeaux", "Mini"];
const RECENT_KEY = "lovebag-recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function rankedSearch(q: string, list: Product[]): Product[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return list
    .map((p) => {
      const name = p.name.toLowerCase();
      const cat = p.category.toLowerCase();
      const colorHit = p.colors.some((c) => c.name.toLowerCase().includes(t));
      let score = -1;
      if (name.startsWith(t)) score = 4;
      else if (name.includes(t)) score = 3;
      else if (cat.includes(t)) score = 2;
      else if (colorHit) score = 1;
      return { p, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

/** Small glowing heart — mirrors the header / overlay-menu brand mark. */
function HeartGlow({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ filter: "drop-shadow(0 0 5px rgba(217,196,154,0.9))" }}>
      <path
        d="M12 21s-7.5-4.9-10-9.2C0 8 2 4.5 5.5 4.5 8 4.5 9.6 6 12 8c2.4-2 4-3.5 6.5-3.5C22 4.5 24 8 22 11.8 19.5 16.1 12 21 12 21z"
        style={{ fill: GLOW_COLOR }}
      />
    </svg>
  );
}

/** Light-theme pill, matching the white overlay-menu aesthetic. */
function Chip({ label, onClick, onRemove }: { label: string; onClick: () => void; onRemove?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: hover ? GLOW_COLOR : "transparent",
        border: `1px solid ${hover ? GLOW_COLOR : "rgba(84,84,84,0.2)"}`,
        borderRadius: 999,
        padding: "8px 14px",
        fontSize: 13,
        color: hover ? "#111" : TEXT_COLOR,
        transition: "background 0.25s ease, color 0.25s ease, border-color 0.25s ease",
      }}
    >
      <button
        onClick={onClick}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, color: "inherit" }}
      >
        {label}
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", opacity: 0.6, fontSize: 13 }}
        >
          ✕
        </button>
      )}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", marginBottom: 14, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

export default function SearchOverlay({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { open } = useProductNav();
  const { products, categories } = useCatalog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [hi, setHi] = useState(0);

  const results = useMemo(() => rankedSearch(q, products), [q, products]);
  const trending = products.slice(0, isMobile ? 2 : 4);
  const hasQuery = q.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 450);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => setHi(0), [q]);

  const saveRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const pick = (p: Product, el: Element) => {
    saveRecent(p.name);
    open(p, el, p.images?.[0] ?? asset(productImageFile(p)));
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" && results[hi]) {
      const card = document.querySelector(`[data-result="${results[hi].id}"] img`);
      if (card) pick(results[hi], card);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "#ffffff",
        color: TEXT_COLOR,
        fontFamily: "'Inter Tight', sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* curtain wipe — champagne flash on the way in */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        style={{ position: "absolute", inset: 0, background: GLOW_COLOR, transformOrigin: "top", zIndex: 1 }}
      />

      {/* top row */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "16px 20px" : "20px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "2.5px", color: TEXT_COLOR }}>THE A LINE</span>
          <HeartGlow />
        </div>
        <button
          onClick={onClose}
          aria-label="Close search"
          style={{
            background: "none",
            border: "1px solid rgba(84,84,84,0.25)",
            borderRadius: 999,
            color: TEXT_COLOR,
            cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            padding: "9px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Close
          <span style={{ fontSize: 16, lineHeight: 1 }}>✕</span>
        </button>
      </div>

      {/* search field */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          padding: isMobile ? "8px 20px 18px" : "12px 32px 22px",
          borderBottom: "1px solid rgba(84,84,84,0.12)",
        }}
      >
        <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: isMobile ? 8 : 12 }}>
          <motion.div
            initial={curlInitial}
            animate={curlAnimate}
            transition={{ ...curlTransition, delay: 0.45 }}
            style={{
              display: "inline-block",
              transformPerspective: 600,
              transformOrigin: "top center",
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: "clamp(30px, 6vw, 52px)",
              lineHeight: 1.04,
              letterSpacing: "-1px",
              color: GLOW_COLOR,
            }}
          >
            Search
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 16 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" strokeWidth="1.6" style={{ stroke: "rgba(84,84,84,0.6)" }} />
            <path d="M20 20l-3.5-3.5" strokeWidth="1.6" strokeLinecap="round" style={{ stroke: "rgba(84,84,84,0.6)" }} />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search for bags, colours, styles…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: isMobile ? 22 : 32,
              fontWeight: 400,
              letterSpacing: "-0.5px",
              color: TEXT_COLOR,
              caretColor: GLOW_COLOR,
            }}
          />
          {q && (
            <button
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              aria-label="Clear"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(84,84,84,0.5)", fontSize: 18 }}
            >
              ✕
            </button>
          )}
        </motion.div>
      </div>

      {/* body */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.55 }}
        style={{ position: "relative", zIndex: 3, flex: 1, overflowY: "auto", padding: isMobile ? "24px 20px 60px" : "36px 32px 80px" }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {!hasQuery ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {recent.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <SectionLabel>Recent</SectionLabel>
                    <button
                      onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(84,84,84,0.55)", textDecoration: "underline", marginBottom: 14 }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {recent.map((r) => (
                      <Chip key={r} label={r} onClick={() => setQ(r)} onRemove={() => removeRecent(r)} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <SectionLabel>Popular searches</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {POPULAR.map((p) => (
                    <Chip key={p} label={p} onClick={() => setQ(p)} />
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Browse categories</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {categories.map((c) => (
                    <Chip key={c} label={c} onClick={() => { navigate("/shop"); onClose(); }} />
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Trending now</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 12 : 18 }}>
                  {trending.map((p, i) => (
                    <div key={p.id} data-result={p.id}>
                      <ProductCard product={p} index={i} baseDelay={0.5} aspectRatio="1 / 1" showFavorite={false} compact onSelect={pick} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div style={{ fontSize: 13, color: "rgba(84,84,84,0.6)", marginBottom: 20 }}>
                {results.length} {results.length === 1 ? "result" : "results"} for “{q}”
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 12 : 18 }}>
                {results.map((p, i) => (
                  <div key={p.id} data-result={p.id}>
                    <ProductCard product={p} index={i} baseDelay={0.5} aspectRatio="1 / 1" showFavorite={false} compact query={q} highlighted={i === hi} onSelect={pick} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 20 }}>
              <div style={{ fontSize: 22, color: TEXT_COLOR, marginBottom: 8 }}>No matches for “{q}”</div>
              <div style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginBottom: 24 }}>
                Check the spelling or try one of these:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {POPULAR.map((p) => (
                  <Chip key={p} label={p} onClick={() => setQ(p)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
