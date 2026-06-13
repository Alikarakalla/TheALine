import { useEffect } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SerifGlow from "../components/SerifGlow";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useAuth } from "../context/Auth";
import { useOrders } from "../context/Orders";
import { setPageMeta, resetPageMeta } from "../lib/meta";

const money = (n: number) => `€${n.toFixed(2)}`;
const fmtDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const EASE = [0.22, 1, 0.36, 1] as const;

const TILES = [
  { title: "Orders", sub: "Track & view past orders", icon: "📦" },
  { title: "Addresses", sub: "Manage delivery details", icon: "📍" },
  { title: "Wishlist", sub: "Pieces you've saved", icon: "♡" },
  { title: "Settings", sub: "Login & preferences", icon: "⚙" },
];

export default function Account() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { orders } = useOrders();

  useEffect(() => {
    setPageMeta({
      title: "My account | The A Line",
      description: "Manage your The A Line account, orders and details.",
      url: window.location.origin + "/account",
    });
    return () => resetPageMeta();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const first = user.name.split(" ")[0];

  return (
    <div
      data-tone="light"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: isMobile ? "110px 24px 80px" : "150px 64px 100px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "2.5px",
              color: "rgba(84,84,84,0.5)",
              marginBottom: 14,
            }}
          >
            MY ACCOUNT
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontSize: isMobile ? "clamp(38px, 12vw, 60px)" : 60,
                fontWeight: 600,
                letterSpacing: "-2.5px",
                lineHeight: 1,
                color: TEXT_COLOR,
              }}
            >
              Hi,
            </span>
            <SerifGlow
              word={first}
              italic
              fontSize={isMobile ? "clamp(40px, 13vw, 64px)" : 64}
              lineHeight={isMobile ? "clamp(36px, 12vw, 60px)" : 60}
              letterSpacing={-2.5}
              strokeWidth={isMobile ? "clamp(8px, 2.6vw, 14px)" : 14}
              delay={0.3}
            />
          </div>
          <div style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginTop: 12 }}>
            {user.email}
          </div>
        </motion.div>

        {/* quick tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 12 : 18,
            marginTop: 40,
          }}
        >
          {TILES.map((t, i) => (
            <motion.button
              key={t.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.06 }}
              whileHover={{ y: -4 }}
              style={{
                textAlign: "left",
                background: "#fff",
                border: "1px solid rgba(84,84,84,0.1)",
                borderRadius: 16,
                padding: 22,
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 14 }}>{t.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_COLOR }}>
                {t.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(84,84,84,0.55)",
                  marginTop: 3,
                }}
              >
                {t.sub}
              </div>
            </motion.button>
          ))}
        </div>

        {/* recent orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
          style={{
            marginTop: 36,
            background: "#fff",
            border: "1px solid rgba(84,84,84,0.1)",
            borderRadius: 16,
            padding: isMobile ? 24 : 32,
          }}
        >
          <div
            style={{ fontSize: 17, fontWeight: 600, color: TEXT_COLOR, marginBottom: 18 }}
          >
            Order history
          </div>

          {orders.length === 0 ? (
            <>
              <div
                style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginBottom: 18 }}
              >
                You haven't placed any orders yet.
              </div>
              <button
                onClick={() => navigate("/shop")}
                style={{
                  background: GLOW_COLOR,
                  border: "none",
                  borderRadius: 999,
                  padding: "13px 26px",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111",
                }}
              >
                Start shopping
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {orders.map((o) => (
                <div
                  key={o.number}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px",
                    border: "1px solid rgba(84,84,84,0.12)",
                    borderRadius: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {/* item thumbnails */}
                  <div style={{ display: "flex" }}>
                    {o.items.slice(0, 3).map((it, idx) => (
                      <div
                        key={it.id}
                        style={{
                          width: 40,
                          height: 46,
                          borderRadius: 7,
                          background: "#ECE7DE",
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
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>
                      {o.number}
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.55)" }}>
                      {fmtDate(o.createdAt)} ·{" "}
                      {o.items.reduce((n, i) => n + i.qty, 0)} items · {money(o.total)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/orders/${o.number}`)}
                    style={{
                      background: "none",
                      border: "1px solid rgba(84,84,84,0.25)",
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

        <button
          onClick={() => {
            signOut();
            navigate("/");
          }}
          style={{
            marginTop: 30,
            background: "none",
            border: "1px solid rgba(84,84,84,0.25)",
            borderRadius: 999,
            padding: "12px 24px",
            cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: TEXT_COLOR,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
