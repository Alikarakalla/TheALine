import { motion } from "framer-motion";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../Header";
import SerifGlow from "../SerifGlow";
import {
  TEXT_COLOR,
  TEXT_COLOR_HEX,
  GLOW_COLOR_HEX,
  PAGE_MAX,
  PAGE_PAD,
} from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAuth } from "../../context/Auth";
import AccountNav from "./AccountNav";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AccountLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        data-tone="light"
        style={{
          minHeight: "100vh",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(58,58,58,0.55)",
          fontFamily: "'Inter Tight', sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const first = user.name.split(" ")[0];

  return (
    <div
      data-tone="light"
      className="account-page"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* Browser surfaces carry the brand: selection + focus rings. */}
      <style>{`
        .account-page ::selection{background:rgba(217,196,154,0.5)}
        .account-page button:focus-visible,.account-page a:focus-visible,.account-page input:focus-visible{outline:2px solid ${GLOW_COLOR_HEX};outline-offset:2px}
        .account-row{transition:background 0.2s ease}
        .account-row:hover{background:rgba(58,58,58,0.03)}
        .account-row:hover .account-chev{transform:translateX(3px)}
        .account-chev{transition:transform 0.25s ease}
        .account-link{transition:color 0.2s ease}
        .account-link:hover{color:${TEXT_COLOR_HEX}}
      `}</style>
      <Header />
      <div
        style={{
          maxWidth: PAGE_MAX,
          margin: "0 auto",
          padding: isMobile ? `104px ${PAGE_PAD} 80px` : `138px ${PAGE_PAD} 100px`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ marginBottom: isMobile ? 26 : 38 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontSize: isMobile ? "clamp(34px, 11vw, 52px)" : 52,
                fontWeight: 600,
                letterSpacing: "-2px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              Hi,
            </span>
            <SerifGlow
              word={first}
              italic
              fontSize={isMobile ? "clamp(36px, 11.5vw, 56px)" : 56}
              lineHeight={isMobile ? "clamp(32px, 11vw, 52px)" : 52}
              letterSpacing={-2}
              strokeWidth={isMobile ? "clamp(8px, 2.4vw, 12px)" : 12}
              delay={0.3}
            />
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(58,58,58,0.62)", marginTop: 10 }}>
            {user.email}
          </div>
        </motion.div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 22 : 56,
            alignItems: "flex-start",
          }}
        >
          <aside
            style={{
              flex: isMobile ? "none" : "0 0 208px",
              width: isMobile ? "100%" : 208,
              position: isMobile ? "static" : "sticky",
              top: 104,
            }}
          >
            <AccountNav />
          </aside>
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
            {/* Entrance-only section transition — never gated on an exit
                animation, so navigation always lands instantly. */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Outlet />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
