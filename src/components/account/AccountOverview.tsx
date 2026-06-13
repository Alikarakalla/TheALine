import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import RewardsBand from "./RewardsBand";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useOrders } from "../../context/Orders";
import { statusLabel } from "../../lib/tracking";

const EASE = [0.22, 1, 0.36, 1] as const;
const money = (n: number) => `€${n.toFixed(2)}`;
const fmtDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const TILES = [
  { title: "Orders", sub: "Track & view past orders", icon: "📦", to: "/account/orders" },
  { title: "Addresses", sub: "Manage delivery details", icon: "📍", to: "/account/addresses" },
  { title: "Rewards", sub: "Your Glow Points", icon: "✦", to: "/account/rewards" },
  { title: "Wishlist", sub: "Pieces you've saved", icon: "♡", to: "/favorites" },
  { title: "Settings", sub: "Login & preferences", icon: "⚙", to: "/account/settings" },
];

export default function AccountOverview() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { orders } = useOrders();
  const recent = orders.slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <RewardsBand />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 12 : 16 }}>
        {TILES.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -4 }}
          >
            <Link
              to={t.to}
              style={{
                display: "block",
                textDecoration: "none",
                background: "#fff",
                border: "1px solid rgba(84,84,84,0.1)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 12 }}>{t.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>{t.title}</div>
              <div style={{ fontSize: 12, color: "rgba(84,84,84,0.55)", marginTop: 2 }}>{t.sub}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, padding: isMobile ? 22 : 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: TEXT_COLOR }}>Recent orders</span>
          {orders.length > 0 && (
            <Link to="/account/orders" style={{ fontSize: 13, color: TEXT_COLOR, textDecoration: "underline" }}>
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <>
            <div style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginBottom: 18 }}>You haven't placed any orders yet.</div>
            <button
              onClick={() => navigate("/shop")}
              style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "13px 26px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}
            >
              Start shopping
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recent.map((o) => (
              <div key={o.number} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, border: "1px solid rgba(84,84,84,0.12)", borderRadius: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex" }}>
                  {o.items.slice(0, 3).map((it, idx) => (
                    <div key={it.id} style={{ width: 40, height: 46, borderRadius: 7, background: "#ECE7DE", position: "relative", marginLeft: idx === 0 ? 0 : -10, border: "2px solid #fff" }}>
                      <img src={it.image} alt="" style={{ position: "absolute", inset: "14%", width: "72%", height: "72%", objectFit: "contain" }} />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{o.number}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>
                    {fmtDate(o.createdAt)} · {statusLabel(o.createdAt, Date.now())} · {money(o.total)}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/orders/${o.number}`)}
                  style={{ background: "none", border: "1px solid rgba(84,84,84,0.25)", borderRadius: 999, padding: "9px 16px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 500, color: TEXT_COLOR }}
                >
                  View receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
