import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import {
  TEXT_COLOR,
  GLOW_COLOR,
  asset,
  curlInitial,
  curlAnimate,
  curlTransition,
  PAGE_MAX,
  PAGE_PAD,
} from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart } from "../context/Cart";
import { useSearch } from "../context/Search";
import { useAuth } from "../context/Auth";
import { useFavorites } from "../context/Favorites";
import { useCatalog, type CategoryNode } from "../context/Catalog";

type Tone = "light" | "dark";

const MENU = ["Catalog", "Favorites", "Account", "About", "Cart (0)"];
const SOCIALS = ["Instagram", "Pinterest", "Contact"];

/** Small glowing heart, inline so it stays visible on any background. */
function HeartGlow({ size = 13 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ filter: "drop-shadow(0 0 5px rgba(217,196,154,0.9))" }}
    >
      <path
        d="M12 21s-7.5-4.9-10-9.2C0 8 2 4.5 5.5 4.5 8 4.5 9.6 6 12 8c2.4-2 4-3.5 6.5-3.5C22 4.5 24 8 22 11.8 19.5 16.1 12 21 12 21z"
        style={{ fill: GLOW_COLOR }}
      />
    </svg>
  );
}

// Wordmark: "The" + the A-glyph logo + "Line", set in Instrument Serif. The glyph
// is drawn via a CSS mask tinted to `color`, so it adapts to the header tone
// exactly like the text. Responsive: larger on desktop, prominent on mobile.
const LOGO_RATIO = 246 / 218; // brand-a.png is 246×218
function Brand({ color }: { color: string }) {
  const isMobile = useIsMobile();
  const fs = isMobile ? 21 : 27;
  const logoH = isMobile ? 23 : 30;
  const txt: React.CSSProperties = {
    fontFamily: "'Instrument Serif', serif",
    fontSize: fs,
    fontWeight: 400,
    letterSpacing: "0.4px",
    color,
    lineHeight: 1,
    transition: "color 0.4s ease",
  };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: isMobile ? 7 : 9 }}>
      <span style={txt}>The</span>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: Math.round(logoH * LOGO_RATIO),
          height: logoH,
          background: color,
          WebkitMaskImage: "url(/brand-a.png)",
          maskImage: "url(/brand-a.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          transition: "background 0.4s ease",
        }}
      />
      <span style={txt}>Line</span>
    </span>
  );
}

function NavLink({
  label,
  color,
  onClick,
  onHover,
  caret,
}: {
  label: string;
  color: string;
  onClick?: () => void;
  /** Fired alongside the link's own hover — used to open the category menu. */
  onHover?: () => void;
  /** Show a ▾ caret (for the category-menu trigger). */
  caret?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        setHover(true);
        onHover?.();
      }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color,
        transition: "color 0.4s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {label}
      {caret && (
        <svg
          width={10}
          height={10}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.7 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
      <motion.span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -4,
          height: 1.5,
          background: GLOW_COLOR,
          transformOrigin: hover ? "left center" : "right center",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: hover ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
    </button>
  );
}

function CartButton({ color }: { color: string }) {
  const navigate = useNavigate();
  const { count } = useCart();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => navigate("/cart")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        padding: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        opacity: hover ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        {/* soft tote: gently rounded body, tall graceful handle */}
        <path
          d="M6.1 9.2h11.8c.5 0 .93.38.98.88l.78 8.1a2.1 2.1 0 0 1-2.09 2.32H6.43a2.1 2.1 0 0 1-2.09-2.32l.78-8.1c.05-.5.48-.88.98-.88Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ stroke: color }}
        />
        <path
          d="M8.7 9V6.9a3.3 3.3 0 0 1 6.6 0V9"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 16 }}
          style={{
            position: "absolute",
            top: 1,
            right: 1,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 999,
            background: "#141414",
            color: "#ffffff",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          {count}
        </motion.span>
      )}
    </button>
  );
}

function SearchButton({ color }: { color: string }) {
  const { open } = useSearch();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={open}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Search"
      style={{
        background: "none",
        border: "none",
        padding: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        opacity: hover ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        {/* refined lens: smaller ring, longer stem */}
        <circle cx="10.6" cy="10.6" r="6.1" strokeWidth="1.5" style={{ stroke: color }} />
        <path
          d="M20.4 20.4 15 15"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
    </button>
  );
}

function AccountButton({ color }: { color: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => navigate(user ? "/account" : "/login")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={user ? "Account" : "Sign in"}
      style={{
        background: "none",
        border: "none",
        padding: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        opacity: hover ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        {/* finer figure: smaller head, open soft shoulders */}
        <circle cx="12" cy="7.6" r="3.4" strokeWidth="1.5" style={{ stroke: color }} />
        <path
          d="M5.2 19.8c.7-3.7 3.5-5.9 6.8-5.9s6.1 2.2 6.8 5.9"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ stroke: color }}
        />
      </svg>
    </button>
  );
}

function Burger({
  color,
  onClick,
}: {
  color: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Open menu"
      style={{
        background: "none",
        border: "none",
        padding: "6px 6px 6px 8px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        width: 33,
      }}
    >
      {/* editorial burger: uneven lines, evening out on hover */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          animate={{ width: i === 1 ? (hover ? "100%" : "62%") : "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            height: 1.4,
            background: color,
            display: "block",
            borderRadius: 999,
            transition: "background 0.4s ease",
          }}
        />
      ))}
    </button>
  );
}

/** Mobile menu body — a calm, structured list: serif primary rows with
 *  hairlines and drawn chevrons, an accordion for the category tree, and
 *  collections as quiet chips. Replaces the desktop's editorial spread. */
function MobileMenuBody({
  onGo,
  onCat,
  onCol,
}: {
  onGo: (label: string) => void;
  onCat: (slug?: string) => void;
  onCol: (slug: string) => void;
}) {
  const { categoryTree, collections } = useCatalog();
  const { count } = useCart();
  const [openCat, setOpenCat] = useState<number | null>(null);

  const hairline = "1px solid rgba(58,58,58,0.1)";
  const microLabel: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "2.2px",
    color: "rgba(84,84,84,0.5)",
    textTransform: "uppercase",
  };
  const Chevron = ({ rotated = false }: { rotated?: boolean }) => (
    <motion.span
      animate={{ rotate: rotated ? 90 : 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ display: "inline-flex", color: "rgba(84,84,84,0.45)" }}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 5.5 6.5 6.5L9 18.5" />
      </svg>
    </motion.span>
  );

  const primary: { label: string; extra?: string }[] = [
    { label: "Catalog" },
    { label: "Favorites" },
    { label: "Account" },
    { label: "About" },
  ];

  const renderChildren = (nodes: CategoryNode[], depth: number): React.ReactNode =>
    nodes.map((n) => (
      <div key={n.id}>
        <button
          onClick={() => onCat(n.slug)}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            minHeight: 42,
            paddingLeft: 14 + depth * 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            color: "rgba(84,84,84,0.8)",
            textAlign: "left",
          }}
        >
          {n.name}
          <span style={{ marginLeft: 8, fontSize: 11.5, color: "rgba(84,84,84,0.4)", fontVariantNumeric: "tabular-nums" }}>
            {n.totalCount || ""}
          </span>
        </button>
        {n.children.length > 0 && renderChildren(n.children, depth + 1)}
      </div>
    ));

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px 28px", display: "flex", flexDirection: "column" }}>
      {/* primary rows */}
      <nav style={{ display: "flex", flexDirection: "column" }}>
        {primary.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.3 + i * 0.06 }}
            onClick={() => onGo(item.label)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 56,
              background: "none",
              border: "none",
              borderBottom: hairline,
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 26, color: TEXT_COLOR }}>
              {item.label}
            </span>
            <Chevron />
          </motion.button>
        ))}
        {/* bag row with the live count */}
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.3 + primary.length * 0.06 }}
          onClick={() => onGo("Cart (0)")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 56,
            background: "none",
            border: "none",
            borderBottom: hairline,
            padding: 0,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 26, color: TEXT_COLOR }}>Bag</span>
            {count > 0 && (
              <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "#141414", color: "#fff", fontFamily: "'Inter Tight', sans-serif", fontSize: 11, fontWeight: 600, lineHeight: "20px", textAlign: "center" }}>
                {count}
              </span>
            )}
          </span>
          <Chevron />
        </motion.button>
      </nav>

      {/* category accordion */}
      {categoryTree.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.62 }}
        >
          <div style={{ ...microLabel, margin: "26px 0 4px" }}>Shop by category</div>
          {categoryTree.map((cat) => {
            const open = openCat === cat.id;
            const hasKids = cat.children.length > 0;
            return (
              <div key={cat.id} style={{ borderBottom: hairline }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <button
                    onClick={() => onCat(cat.slug)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      minHeight: 50,
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 15,
                      fontWeight: 500,
                      color: TEXT_COLOR,
                      textAlign: "left",
                    }}
                  >
                    {cat.name}
                  </button>
                  {hasKids && (
                    <button
                      onClick={() => setOpenCat(open ? null : cat.id)}
                      aria-expanded={open}
                      aria-label={`${open ? "Collapse" : "Expand"} ${cat.name}`}
                      style={{ width: 44, height: 50, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
                    >
                      <Chevron rotated={open} />
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {open && hasKids && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ paddingBottom: 8 }}>{renderChildren(cat.children, 0)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* collections as chips */}
      {collections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.72 }}
        >
          <div style={{ ...microLabel, margin: "26px 0 12px" }}>Collections</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => onCol(c.slug)}
                style={{
                  border: "1px solid rgba(58,58,58,0.22)",
                  background: "none",
                  borderRadius: 999,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13,
                  color: TEXT_COLOR,
                }}
              >
                {c.title}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function OverlayMenu({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { categoryTree, categoryNodes, collections } = useCatalog();
  const go = (label: string) => {
    if (ROUTE_FOR[label]) navigate(ROUTE_FOR[label]);
    onClose();
  };
  const goCat = (slug?: string) => {
    navigate(slug ? `/shop?category=${slug}` : "/shop");
    onClose();
  };
  const goCol = (slug: string) => {
    navigate(`/collection/${slug}`);
    onClose();
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
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
        style={{
          position: "absolute",
          inset: 0,
          background: "#141414",
          transformOrigin: "top",
          zIndex: 1,
        }}
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
          <Brand color={TEXT_COLOR} />
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
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

      {/* body */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          padding: isMobile ? 0 : "0 32px 40px",
        }}
      >
        {isMobile ? (
          <MobileMenuBody onGo={go} onCat={goCat} onCol={goCol} />
        ) : (
        <>
        {/* nav words + category tree */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MENU.map((item, i) => (
              <MenuWord key={item} label={item} index={i} onClose={() => go(item)} />
            ))}
          </nav>

          {categoryTree.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto", paddingRight: 8 }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "2px",
                  color: "rgba(84,84,84,0.5)",
                  textTransform: "uppercase",
                }}
              >
                Shop by category
              </div>
              {categoryNodes.map(({ node, depth }) => (
                <button
                  key={node.id}
                  onClick={() => goCat(node.slug)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: depth === 0 ? 15 : 14,
                    fontWeight: depth === 0 ? 600 : 400,
                    color: depth === 0 ? TEXT_COLOR : "rgba(84,84,84,0.75)",
                    textAlign: "left",
                    paddingLeft: depth * 16,
                  }}
                >
                  {depth > 0 && <span style={{ color: "rgba(84,84,84,0.3)", marginRight: 6 }}>—</span>}
                  {node.name}
                </button>
              ))}
            </motion.div>
          )}

          {collections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.72 }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase" }}>
                Collections
              </div>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goCol(c.slug)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 600, color: TEXT_COLOR, textAlign: "left" }}
                >
                  {c.title}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* featured image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          style={{ position: "relative", marginRight: 60 }}
        >
          <img
            src={asset("baggy-2.png")}
            alt=""
            style={{ width: 300, height: "auto", objectFit: "contain" }}
          />
          <span
            style={{
              position: "absolute",
              bottom: -10,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: 22,
              color: GLOW_COLOR,
              whiteSpace: "nowrap",
            }}
          >
            this season
          </span>
        </motion.div>
        </>
        )}
      </div>

      {/* socials */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          gap: 28,
          padding: isMobile ? "24px 20px 32px" : "0 32px 36px",
          borderTop: "1px solid rgba(84,84,84,0.14)",
          marginTop: isMobile ? 24 : 0,
          paddingTop: 24,
        }}
      >
        {SOCIALS.map((s) => (
          <a
            key={s}
            href="#"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(84,84,84,0.6)",
              textDecoration: "none",
            }}
          >
            {s}
          </a>
        ))}
      </motion.div>
    </motion.div>
  );
}

function MenuWord({
  label,
  index,
  onClose,
}: {
  label: string;
  index: number;
  onClose: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ overflow: "hidden", paddingBottom: 4 }}>
      <motion.button
        onClick={onClose}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        initial={curlInitial}
        animate={curlAnimate}
        transition={{ ...curlTransition, delay: 0.45 + index * 0.08 }}
        style={{
          display: "inline-block",
          transformPerspective: 600,
          transformOrigin: "top center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'Instrument Serif', serif",
          fontStyle: "italic",
          fontSize: "clamp(44px, 9vw, 88px)",
          lineHeight: 1.04,
          letterSpacing: "-1px",
          color: hover ? GLOW_COLOR : TEXT_COLOR,
          x: hover ? 18 : 0,
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </motion.button>
    </div>
  );
}

const ROUTE_FOR: Record<string, string> = {
  Catalog: "/shop",
  Favorites: "/favorites",
  "Cart (0)": "/cart",
  Account: "/account",
};

/** Recursive list of sub-categories inside a mega-menu column. */
function CatSubList({
  nodes,
  depth,
  onPick,
}: {
  nodes: CategoryNode[];
  depth: number;
  onPick: (slug: string) => void;
}) {
  if (!nodes?.length) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: depth === 0 ? 12 : 7,
        paddingLeft: depth > 0 ? 12 : 0,
        borderLeft: depth > 0 ? "1px solid rgba(84,84,84,0.12)" : "none",
      }}
    >
      {nodes.map((n) => (
        <div key={n.id}>
          <button
            onClick={() => onPick(n.slug)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: depth === 0 ? 13.5 : 13,
              fontWeight: 400,
              color: "rgba(84,84,84,0.78)",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_COLOR)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(84,84,84,0.78)")}
          >
            {n.name}
          </button>
          <CatSubList nodes={n.children || []} depth={depth + 1} onPick={onPick} />
        </div>
      ))}
    </div>
  );
}

/** Full-width category mega-menu that drops below the header bar on hover. */
function CategoryMegaPanel({ tree, onPick }: { tree: CategoryNode[]; onPick: (slug?: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#ffffff",
        borderTop: "1px solid rgba(84,84,84,0.08)",
        borderBottom: "1px solid rgba(84,84,84,0.1)",
        boxShadow: "0 26px 50px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: `30px ${PAGE_PAD} 34px`,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "26px 40px",
        }}
      >
        {tree.map((top) => (
          <div key={top.id}>
            <button
              onClick={() => onPick(top.slug)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: TEXT_COLOR,
                textAlign: "left",
              }}
            >
              {top.name}
            </button>
            <CatSubList nodes={top.children || []} depth={0} onPick={onPick} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(84,84,84,0.08)" }}>
        <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: `14px ${PAGE_PAD}` }}>
          <button
            onClick={() => onPick()}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: TEXT_COLOR,
            }}
          >
            View all products →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { count: favCount } = useFavorites();
  const { categoryTree } = useCatalog();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState<Tone>("light");
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const goCat = (slug?: string) => {
    navigate(slug ? `/shop?category=${slug}` : "/shop");
    setCatOpen(false);
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const s = latest > 40;
    setScrolled((cur) => (cur === s ? cur : s));
    if (open) return;
    const h = latest > prev && latest > 220;
    setHidden((cur) => (cur === h ? cur : h));
  });

  // Overlay pages (the product page) scroll an inner container, not the
  // window — a capture-phase listener catches those scrolls too so the bar
  // still turns white the moment content moves under it.
  useEffect(() => {
    const onAnyScroll = (e: Event) => {
      const t = e.target;
      if (t === document || t === window) return; // window path handled above
      const el = t as HTMLElement;
      if (!el || typeof el.scrollTop !== "number") return;
      // Only full-height vertical scrollers count (ignore rails/carousels).
      if (el.clientHeight >= window.innerHeight * 0.7 && el.scrollHeight > el.clientHeight + 60) {
        const s = el.scrollTop > 40;
        setScrolled((cur) => (cur === s ? cur : s));
      }
    };
    document.addEventListener("scroll", onAnyScroll, true);
    return () => document.removeEventListener("scroll", onAnyScroll, true);
  }, []);

  // Closing an overlay leaves no scroll event behind — resync on route change.
  const { pathname } = useLocation();
  useEffect(() => {
    if (window.scrollY <= 40) setScrolled(false);
  }, [pathname]);

  // Contrast adaptation: a 1px detection line just under the bar reports the
  // tone of whichever section is crossing it. Several sections can cross it at
  // once (an overlay page keeps its base page mounted underneath), so the LAST
  // [data-tone] element in document order wins — that's the topmost overlay.
  useEffect(() => {
    const line = 28;
    let io: IntersectionObserver;
    const hits = new Set<Element>();
    const apply = () => {
      const els = Array.from(document.querySelectorAll("[data-tone]"));
      for (let i = els.length - 1; i >= 0; i--) {
        if (hits.has(els[i])) {
          setTone((els[i].getAttribute("data-tone") as Tone) || "light");
          return;
        }
      }
    };
    const build = () => {
      io?.disconnect();
      hits.clear();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) hits.add(e.target);
            else hits.delete(e.target);
          });
          apply();
        },
        {
          // Clamp: in a zero/tiny-height viewport (hidden tab, prerender) the
          // raw math goes negative and "--Npx" throws, unmounting the app.
          rootMargin: `-${line}px 0px -${Math.max(0, window.innerHeight - line - 1)}px 0px`,
        }
      );
      document.querySelectorAll("[data-tone]").forEach((el) => io.observe(el));
    };
    build();
    window.addEventListener("resize", build);
    return () => {
      io?.disconnect();
      window.removeEventListener("resize", build);
    };
  }, []);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const dark = tone === "dark";
  const fg = dark ? "#FFFFFF" : TEXT_COLOR;
  // On mobile we drop the backdrop blur (it re-rasterizes the whole bar every
  // scroll frame), so make the bar more opaque there to keep text legible.
  const barBg = scrolled
    ? dark
      ? isMobile
        ? "rgba(17,17,17,0.97)"
        : "rgba(17,17,17,0.55)"
      : isMobile
      ? "#ffffff" // solid white once scrolled — content disappears cleanly under it
      : "rgba(255,255,255,0.92)"
    : "transparent";

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: hidden ? -90 : 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onMouseLeave={() => setCatOpen(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: scrolled
            ? isMobile
              ? "12px 0"
              : "14px 0"
            : isMobile
            ? "16px 0"
            : "20px 0",
          background: barBg,
          backdropFilter: scrolled && !isMobile ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled && !isMobile ? "blur(14px)" : "none",
          borderBottom: scrolled
            ? `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(84,84,84,0.1)"}`
            : "1px solid transparent",
          transition: "background 0.4s ease, border-color 0.4s ease",
        }}
      >
        <div
          style={{
            maxWidth: PAGE_MAX,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${PAGE_PAD}`,
          }}
        >
          {/* logo */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <Brand color={fg} />
        </button>

        {/* right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 16 }}>
          {!isMobile && (
            <>
              <NavLink
                label="Catalog"
                color={fg}
                caret={categoryTree.length > 0}
                onClick={() => navigate("/shop")}
                onHover={() => setCatOpen(categoryTree.length > 0)}
              />
              <NavLink
                label={favCount > 0 ? `Favorites (${favCount})` : "Favorites"}
                color={fg}
                onClick={() => navigate("/favorites")}
                onHover={() => setCatOpen(false)}
              />
            </>
          )}
          <SearchButton color={fg} />
          <AccountButton color={fg} />
          <CartButton color={fg} />
          <Burger color={fg} onClick={() => setOpen(true)} />
        </div>
        </div>

        {/* category mega-menu (desktop, on hover) */}
        <AnimatePresence>
          {catOpen && !isMobile && categoryTree.length > 0 && (
            <CategoryMegaPanel tree={categoryTree} onPick={goCat} />
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {open && <OverlayMenu onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
