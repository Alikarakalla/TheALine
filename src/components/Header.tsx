import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useCart } from "../context/Cart";
import { useSearch } from "../context/Search";
import { useAuth } from "../context/Auth";
import { useFavorites } from "../context/Favorites";

type Tone = "light" | "dark";

const NAV = ["Catalog", "Favorites", "Cart (0)"];
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
}: {
  label: string;
  color: string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
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
      }}
    >
      {label}
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

function CartPill({ tone }: { tone: Tone }) {
  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  const { count } = useCart();
  const dark = tone === "dark";
  return (
    <motion.button
      onClick={() => navigate("/cart")}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.4);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.4);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        x.set(0);
        y.set(0);
      }}
      style={{
        x,
        y,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 18px",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : "rgba(84,84,84,0.25)"}`,
        background: hover ? GLOW_COLOR : "transparent",
        color: hover ? "#111111" : dark ? "#FFFFFF" : TEXT_COLOR,
        transition: "background 0.3s ease, color 0.3s ease, border-color 0.3s ease",
      }}
    >
      Cart
      <motion.span
        key={count}
        initial={{ scale: 1.45 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 16 }}
        style={{ opacity: count ? 1 : 0.7, fontWeight: count ? 600 : 500 }}
      >
        ({count})
      </motion.span>
    </motion.button>
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" strokeWidth="1.6" style={{ stroke: color }} />
        <path
          d="M20 20l-3.5-3.5"
          strokeWidth="1.6"
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" strokeWidth="1.6" style={{ stroke: color }} />
        <path
          d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"
          strokeWidth="1.6"
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
        padding: 6,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        width: 34,
      }}
    >
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          animate={{ width: hover && i === 1 ? "70%" : "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            height: 1.5,
            background: color,
            display: "block",
            transition: "background 0.4s ease",
          }}
        />
      ))}
    </button>
  );
}

function OverlayMenu({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const go = (label: string) => {
    if (ROUTE_FOR[label]) navigate(ROUTE_FOR[label]);
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
          background: GLOW_COLOR,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 20px" : "0 32px 40px",
        }}
      >
        {/* nav words */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MENU.map((item, i) => (
            <MenuWord key={item} label={item} index={i} onClose={() => go(item)} />
          ))}
        </nav>

        {/* featured image */}
        {!isMobile && (
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

export default function Header() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { count: favCount } = useFavorites();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState<Tone>("light");
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    const s = latest > 40;
    setScrolled((cur) => (cur === s ? cur : s));
    if (open) return;
    const h = latest > prev && latest > 220;
    setHidden((cur) => (cur === h ? cur : h));
  });

  // Contrast adaptation: a 1px detection line just under the bar reports the
  // tone of whichever section is crossing it.
  useEffect(() => {
    const line = 28;
    let io: IntersectionObserver;
    const build = () => {
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              setTone((e.target.getAttribute("data-tone") as Tone) || "light");
            }
          });
        },
        {
          rootMargin: `-${line}px 0px -${window.innerHeight - line - 1}px 0px`,
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
        ? "rgba(17,17,17,0.92)"
        : "rgba(17,17,17,0.55)"
      : isMobile
      ? "rgba(255,255,255,0.92)"
      : "rgba(255,255,255,0.6)"
    : "transparent";

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: hidden ? -90 : 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: scrolled
            ? isMobile
              ? "12px 20px"
              : "14px 32px"
            : isMobile
            ? "16px 20px"
            : "20px 32px",
          background: barBg,
          backdropFilter: scrolled && !isMobile ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled && !isMobile ? "blur(14px)" : "none",
          borderBottom: scrolled
            ? `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(84,84,84,0.1)"}`
            : "1px solid transparent",
          transition: "background 0.4s ease, border-color 0.4s ease",
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 28 }}>
          {!isMobile &&
            NAV.slice(0, 2).map((l) => (
              <NavLink
                key={l}
                label={
                  l === "Favorites" && favCount > 0
                    ? `Favorites (${favCount})`
                    : l
                }
                color={fg}
                onClick={ROUTE_FOR[l] ? () => navigate(ROUTE_FOR[l]) : undefined}
              />
            ))}
          <SearchButton color={fg} />
          {!isMobile && <AccountButton color={fg} />}
          <CartPill tone={tone} />
          <Burger color={fg} onClick={() => setOpen(true)} />
        </div>
      </motion.header>

      <AnimatePresence>
        {open && <OverlayMenu onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
