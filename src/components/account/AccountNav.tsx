import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TEXT_COLOR, TEXT_COLOR_HEX, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAuth } from "../../context/Auth";
import {
  Glyph,
  OverviewGlyph,
  OrdersGlyph,
  AddressGlyph,
  PaymentGlyph,
  RewardsGlyph,
  SettingsGlyph,
  SignOutGlyph,
} from "./icons";

const ITEMS = [
  { to: "/account", label: "Overview", end: true, glyph: OverviewGlyph },
  { to: "/account/orders", label: "Orders", glyph: OrdersGlyph },
  { to: "/account/addresses", label: "Addresses", glyph: AddressGlyph },
  { to: "/account/payment", label: "Payment", glyph: PaymentGlyph },
  { to: "/account/rewards", label: "Rewards", glyph: RewardsGlyph },
  { to: "/account/settings", label: "Settings", glyph: SettingsGlyph },
];

export default function AccountNav() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <nav
      aria-label="Account"
      className="account-nav"
      style={{
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        gap: 4,
        overflowX: isMobile ? "auto" : "visible",
        paddingBottom: isMobile ? 4 : 0,
        scrollbarWidth: isMobile ? "none" : undefined,
      }}
    >
      <style>{`
        .account-nav::-webkit-scrollbar{display:none}
        .account-signout{transition:color 0.2s ease}
        .account-signout:hover{color:${TEXT_COLOR_HEX}}
      `}</style>
      {ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} style={{ textDecoration: "none", flexShrink: 0 }}>
          {({ isActive }) => (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 15px",
                borderRadius: 999,
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: isActive ? 600 : 450,
                color: isActive ? "#ffffff" : TEXT_COLOR,
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
                    background: "#141414",
                    borderRadius: 999,
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1, display: "inline-flex", opacity: isActive ? 1 : 0.7 }}>
                <Glyph>{it.glyph}</Glyph>
              </span>
              <span style={{ position: "relative", zIndex: 1 }}>{it.label}</span>
            </div>
          )}
        </NavLink>
      ))}

      {/* sign out — quiet, always within reach */}
      {!isMobile && (
        <div style={{ borderTop: "1px solid rgba(58,58,58,0.12)", marginTop: 10, paddingTop: 10 }}>
          <button
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="account-signout"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "11px 15px",
              background: "none",
              border: "none",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              fontWeight: 450,
              color: "rgba(58,58,58,0.62)",
              textAlign: "left",
            }}
          >
            <Glyph>{SignOutGlyph}</Glyph> Sign out
          </button>
        </div>
      )}
      {isMobile && (
        <button
          onClick={() => {
            signOut();
            navigate("/");
          }}
          className="account-signout"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            padding: "11px 15px",
            background: "none",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            color: "rgba(58,58,58,0.62)",
          }}
        >
          <Glyph size={14}>{SignOutGlyph}</Glyph> Sign out
        </button>
      )}
    </nav>
  );
}
