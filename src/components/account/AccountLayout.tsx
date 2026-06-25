import { motion, AnimatePresence } from "framer-motion";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "../Header";
import SerifGlow from "../SerifGlow";
import AccountNav from "./AccountNav";
import { TEXT_COLOR, PAGE_MAX, PAGE_PAD } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAuth } from "../../context/Auth";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AccountLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(84,84,84,0.5)", fontFamily: "'Inter Tight', sans-serif" }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const first = user.name.split(" ")[0];

  return (
    <div data-tone="light" style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Inter Tight', sans-serif" }}>
      <Header />
      <div style={{ maxWidth: PAGE_MAX, margin: "0 auto", padding: isMobile ? `104px ${PAGE_PAD} 80px` : `140px ${PAGE_PAD} 100px` }}>
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 12 }}>
            MY ACCOUNT
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: isMobile ? "clamp(34px, 11vw, 52px)" : 52, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1, color: TEXT_COLOR }}>
              Hi,
            </span>
            <SerifGlow word={first} italic fontSize={isMobile ? "clamp(36px, 11.5vw, 56px)" : 56} lineHeight={isMobile ? "clamp(32px, 11vw, 52px)" : 52} letterSpacing={-2} strokeWidth={isMobile ? "clamp(8px, 2.4vw, 12px)" : 12} delay={0.3} />
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(84,84,84,0.6)", marginTop: 10 }}>{user.email}</div>
        </motion.div>

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 24 : 48, alignItems: "flex-start" }}>
          <aside style={{ flex: isMobile ? "none" : "0 0 200px", width: isMobile ? "100%" : 200, position: isMobile ? "static" : "sticky", top: 100 }}>
            <AccountNav />
          </aside>
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
