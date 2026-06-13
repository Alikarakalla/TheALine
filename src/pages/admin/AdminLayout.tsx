import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useAdminAuth } from "../../context/AdminAuth";

const NAV: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: "◧", end: true },
  { to: "/admin/products", label: "Products", icon: "🛍" },
  { to: "/admin/categories", label: "Categories", icon: "▦" },
  { to: "/admin/brands", label: "Brands", icon: "✦" },
  { to: "/admin/variants", label: "Variants", icon: "⊞" },
  { to: "/admin/tags", label: "Tags", icon: "#" },
  { to: "/admin/inventory", label: "Inventory", icon: "📦" },
  { to: "/admin/orders", label: "Orders", icon: "🧾" },
  { to: "/admin/customers", label: "Customers", icon: "♟" },
  { to: "/admin/loyalty", label: "Loyalty", icon: "✧" },
  { to: "/admin/homepage", label: "Homepage", icon: "▤" },
  { to: "/admin/banners", label: "Banners", icon: "▭" },
  { to: "/admin/seo", label: "SEO", icon: "⌕" },
  { to: "/admin/settings", label: "Settings & Theme", icon: "⚙" },
];

export default function AdminLayout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { admin, loading, logout } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#161616", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter Tight', sans-serif" }}>
        Loading…
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace />;

  const navContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "0 4px" : "4px 8px 24px" }}>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "2.5px", color: "#fff" }}>THE A LINE</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "2px 7px" }}>ADMIN</span>
      </div>
      <nav style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 2, overflowX: isMobile ? "auto" : "visible" }}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} style={{ textDecoration: "none", flexShrink: 0 }}>
            {({ isActive }) => (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  color: isActive ? "#111" : "rgba(255,255,255,0.7)",
                  background: isActive ? GLOW_COLOR : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
              >
                <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{n.icon}</span>
                {n.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1EEE8", fontFamily: "'Inter Tight', sans-serif", display: "flex", flexDirection: isMobile ? "column" : "row" }}>
      {/* sidebar */}
      <aside
        style={{
          background: "#161616",
          width: isMobile ? "100%" : 240,
          flexShrink: 0,
          padding: isMobile ? "16px 16px 12px" : "26px 18px",
          position: isMobile ? "static" : "sticky",
          top: 0,
          height: isMobile ? "auto" : "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {navContent}
        {!isMobile && (
          <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{admin.name}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>{admin.email}</div>
            <button onClick={() => { logout(); navigate("/admin/login"); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "8px 16px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 12.5, color: "#fff" }}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* content */}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? "24px 20px 60px" : "36px 44px 80px" }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
