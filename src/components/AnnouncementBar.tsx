import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GLOW_COLOR } from "../lib/constants";
import { apiGet } from "../lib/api";

type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  link: string | null;
  linkLabel: string | null;
  placement: string;
};

const DISMISS_KEY = "lovebag-announce-dismissed";

/**
 * Slim, dismissible promo bar fixed to the bottom of the storefront. Shows the
 * active admin-managed "announcement" banner. Placed at the bottom so it never
 * disturbs the fixed header / full-bleed hero.
 */
export default function AnnouncementBar() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet<Banner[]>("banners")
      .then((rows) => {
        const a = (rows || []).find((b) => b.placement === "announcement");
        if (!a) return;
        let dismissed = "";
        try { dismissed = sessionStorage.getItem(DISMISS_KEY) || ""; } catch { /* ignore */ }
        if (dismissed === String(a.id)) return;
        setBanner(a);
        setOpen(true);
      })
      .catch(() => {});
  }, []);

  const close = () => {
    setOpen(false);
    try { if (banner) sessionStorage.setItem(DISMISS_KEY, String(banner.id)); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && banner && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            background: "#161616",
            color: "#fff",
            fontFamily: "'Inter Tight', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "12px 48px 12px 20px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13.5, letterSpacing: "0.2px" }}>
            {banner.title}
            {banner.subtitle ? <span style={{ color: "rgba(255,255,255,0.6)" }}> — {banner.subtitle}</span> : null}
          </span>
          {banner.link && banner.linkLabel && (
            <button
              onClick={() => { close(); navigate(banner.link!); }}
              style={{
                background: GLOW_COLOR,
                color: "#111",
                border: "none",
                borderRadius: 999,
                padding: "6px 16px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {banner.linkLabel}
            </button>
          )}
          <button
            onClick={close}
            aria-label="Dismiss"
            style={{
              position: "absolute",
              right: 16,
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.55)",
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
