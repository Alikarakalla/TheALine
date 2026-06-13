import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";

const ITEMS = [
  { to: "/account", label: "Overview", end: true },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/payment", label: "Payment" },
  { to: "/account/rewards", label: "Rewards" },
  { to: "/account/settings", label: "Settings" },
];

export default function AccountNav() {
  const isMobile = useIsMobile();
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        gap: 4,
        overflowX: isMobile ? "auto" : "visible",
        paddingBottom: isMobile ? 4 : 0,
      }}
    >
      {ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} style={{ textDecoration: "none", flexShrink: 0 }}>
          {({ isActive }) => (
            <div
              style={{
                position: "relative",
                padding: "11px 16px",
                borderRadius: 999,
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#111" : TEXT_COLOR,
                whiteSpace: "nowrap",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="accountNavActive"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: GLOW_COLOR,
                    borderRadius: 999,
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{it.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
