import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import RewardsBand from "./RewardsBand";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useOrders } from "../../context/Orders";
import { statusLabel } from "../../lib/tracking";
import {
  Glyph,
  OrdersGlyph,
  AddressGlyph,
  PaymentGlyph,
  RewardsGlyph,
  WishlistGlyph,
  SettingsGlyph,
  ChevronRightGlyph,
} from "./icons";

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.1)";
import { useBaseMoney } from "../../context/Currency";
const fmtDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const LINKS = [
  { title: "Orders", sub: "Track & view past orders", glyph: OrdersGlyph, to: "/account/orders" },
  { title: "Addresses", sub: "Manage delivery details", glyph: AddressGlyph, to: "/account/addresses" },
  { title: "Payment", sub: "Saved cards & methods", glyph: PaymentGlyph, to: "/account/payment" },
  { title: "Rewards", sub: "Your Glow Points", glyph: RewardsGlyph, to: "/account/rewards" },
  { title: "Wishlist", sub: "Pieces you've saved", glyph: WishlistGlyph, to: "/favorites" },
  { title: "Settings", sub: "Login & preferences", glyph: SettingsGlyph, to: "/account/settings" },
];

export default function AccountOverview() {
  const money = useBaseMoney();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { orders } = useOrders();
  const recent = orders.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <RewardsBand />

      {/* directory of account sections — hairline rows, drawn icons */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
        style={{
          border: HAIRLINE,
          borderRadius: 16,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        }}
      >
        {LINKS.map((l, i) => {
          const lastRow = isMobile ? i === LINKS.length - 1 : i >= LINKS.length - 2;
          const firstCol = !isMobile && i % 2 === 0;
          return (
            <Link
              key={l.title}
              to={l.to}
              className="account-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "17px 20px",
                textDecoration: "none",
                borderBottom: lastRow ? "none" : HAIRLINE,
                borderRight: firstCol ? HAIRLINE : "none",
              }}
            >
              <span style={{ color: "rgba(58,58,58,0.72)", display: "inline-flex" }}>
                <Glyph size={17}>{l.glyph}</Glyph>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: TEXT_COLOR,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {l.title}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: "rgba(58,58,58,0.62)", marginTop: 1 }}>
                  {l.sub}
                </span>
              </span>
              <span className="account-chev" style={{ color: "rgba(58,58,58,0.45)", display: "inline-flex" }}>
                <Glyph size={14}>{ChevronRightGlyph}</Glyph>
              </span>
            </Link>
          );
        })}
      </motion.div>

      {/* recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.16 }}
        style={{ border: HAIRLINE, borderRadius: 16, padding: isMobile ? "20px 20px 22px" : "24px 28px 26px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: recent.length ? 6 : 16,
          }}
        >
          <span style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: "-0.2px", color: TEXT_COLOR }}>
            Recent orders
          </span>
          {orders.length > 0 && (
            <Link
              to="/account/orders"
              className="account-link"
              style={{
                fontSize: 13,
                color: "rgba(58,58,58,0.72)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <>
            <div style={{ fontSize: 14, color: "rgba(58,58,58,0.72)", marginBottom: 18 }}>
              You haven't placed any orders yet — your story starts with the first piece.
            </div>
            <button
              onClick={() => navigate("/shop")}
              style={{
                background: "#141414",
                border: "none",
                borderRadius: 999,
                padding: "13px 26px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Start shopping
            </button>
          </>
        ) : (
          <div>
            {recent.map((o, i) => (
              <div
                key={o.number}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 0",
                  borderTop: i === 0 ? "none" : HAIRLINE,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex" }}>
                  {o.items.slice(0, 3).map((it, idx) => (
                    <div
                      key={it.id}
                      style={{
                        width: 42,
                        height: 48,
                        borderRadius: 8,
                        background: "rgb(231,231,231)",
                        position: "relative",
                        marginLeft: idx === 0 ? 0 : -10,
                        border: "2px solid #fff",
                      }}
                    >
                      <img
                        src={it.image}
                        alt=""
                        style={{
                          position: "absolute",
                          inset: "14%",
                          width: "72%",
                          height: "72%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{o.number}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(58,58,58,0.62)", marginTop: 2 }}>
                    {fmtDate(o.createdAt)} · {statusLabel(o.createdAt, Date.now())}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT_COLOR,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {money(o.total)}
                </div>
                <button
                  onClick={() => navigate(`/orders/${o.number}`)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(58,58,58,0.25)",
                    borderRadius: 999,
                    padding: "9px 16px",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: TEXT_COLOR,
                  }}
                >
                  View receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
