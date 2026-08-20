import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ConfirmProvider } from "./ui";
import { Icon } from "./icons";
import { useIsMobile } from "../../lib/useResponsive";
import { useAdminAuth } from "../../context/AdminAuth";

/**
 * Admin shell — lebazone-style light sidebar: brand header with collapse
 * toggle, navigation search, grouped collapsible sections, and a user footer.
 * Active item renders as an ink pill (The A Line's accent).
 */

const SB = {
  bg: "#ffffff",
  border: "#e8e8e5",
  brand: "#171717",
  subtitle: "#7b7b75",
  sectionTitle: "#747474",
  itemText: "#505050",
  icon: "#7a7a73",
  hoverBg: "#f3f4f6",
  activeBg: "#141414",
  activeText: "#ffffff",
  searchBg: "#e6e6e1",
  contentBg: "#f5f5f3",
};
const EXPANDED_W = 245;
const COLLAPSED_W = 74;

type NavItem = { to: string; label: string; icon: string; end?: boolean };
type NavSection = { key: string; label: string; items: NavItem[] };

const DASHBOARD: NavItem = { to: "/admin", label: "Dashboard", icon: "home", end: true };

const SECTIONS: NavSection[] = [
  {
    key: "commerce",
    label: "Commerce",
    items: [
      { to: "/admin/products", label: "Products", icon: "box" },
      { to: "/admin/categories", label: "Categories", icon: "folder" },
      { to: "/admin/collections", label: "Collections", icon: "layers" },
      { to: "/admin/brands", label: "Brands", icon: "star" },
      { to: "/admin/variants", label: "Variants", icon: "grid" },
      { to: "/admin/tags", label: "Tags", icon: "tag" },
      { to: "/admin/inventory", label: "Inventory", icon: "package" },
      { to: "/admin/orders", label: "Orders", icon: "cart" },
      { to: "/admin/customers", label: "Customers", icon: "users" },
    ],
  },
  {
    key: "loyalty",
    label: "Loyalty",
    items: [{ to: "/admin/loyalty", label: "Loyalty Program", icon: "heart" }],
  },
  {
    key: "informative",
    label: "Informative",
    items: [
      { to: "/admin/homepage", label: "Homepage", icon: "layout" },
      { to: "/admin/banners", label: "Banners", icon: "image" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    items: [
      { to: "/admin/currencies", label: "Currencies", icon: "coins" },
      { to: "/admin/settings", label: "Settings & Theme", icon: "gear" },
    ],
  },
  {
    key: "seo",
    label: "SEO",
    items: [{ to: "/admin/seo", label: "SEO Management", icon: "globe" }],
  },
];

const sectionOfPath = (path: string): string | null => {
  for (const s of SECTIONS) {
    if (s.items.some((i) => path === i.to || path.startsWith(i.to + "/"))) return s.key;
  }
  return null;
};

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to={item.to} end={item.end} title={collapsed ? item.label : undefined} style={{ textDecoration: "none" }} onClick={onNavigate}>
      {({ isActive }) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            minHeight: 37,
            padding: collapsed ? 0 : "0 9px",
            justifyContent: collapsed ? "center" : "flex-start",
            margin: "1px 0",
            borderRadius: 8,
            background: isActive ? SB.activeBg : "transparent",
            boxShadow: isActive ? "0 1px 2px rgba(17,17,17,0.12)" : "none",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = SB.hoverBg; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? SB.activeText : SB.icon }}>
            <Icon name={item.icon} size={17} />
          </span>
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? SB.activeText : SB.itemText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
}

function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(() => {
    const cur = sectionOfPath(location.pathname);
    return cur ? [cur] : ["commerce"];
  });
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep the section that owns the current page open as the admin navigates.
  useEffect(() => {
    const cur = sectionOfPath(location.pathname);
    if (cur) setExpanded((p) => (p.includes(cur) ? p : [...p, cur]));
  }, [location.pathname]);

  // Ctrl/Cmd+K focuses navigation search (the kbd chip in the box hints it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const match = (i: NavItem) => i.label.toLowerCase().includes(q);
  const visibleSections = SECTIONS.map((s) => ({ ...s, items: searching ? s.items.filter(match) : s.items })).filter(
    (s) => s.items.length > 0
  );
  const dashVisible = !searching || match(DASHBOARD);
  const noResults = searching && !dashVisible && visibleSections.length === 0;

  const toggleSection = (key: string) =>
    setExpanded((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const initial = (admin?.name || "A").trim().charAt(0).toUpperCase();

  return (
    <div style={{ width: "100%", height: "100%", background: SB.bg, display: "flex", flexDirection: "column", fontFamily: "'Inter Tight', sans-serif" }}>
      {/* header */}
      <div style={{ padding: "14px 10px 10px", borderBottom: `1px solid ${SB.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 8, marginBottom: collapsed ? 0 : 10, minHeight: 32 }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, padding: "0 3px" }}>
              <span style={{ width: 20, height: 20, background: "#111", color: "#fff", borderRadius: 5, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                A
              </span>
              <span style={{ fontSize: 13, fontWeight: 650, color: SB.brand, letterSpacing: "0.4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                THE A LINE
              </span>
            </div>
          )}
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ width: 24, height: 24, border: 0, background: "transparent", cursor: "pointer", color: "#4f4f4f", display: "grid", placeItems: "center", borderRadius: 7, flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.045)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="panel" size={17} />
          </button>
        </div>
        {!collapsed && (
          <>
            <div style={{ fontSize: 11, color: SB.subtitle, fontWeight: 500, padding: "0 3px" }}>Admin Panel</div>
            <div style={{ position: "relative", marginTop: 10 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex" }}>
                <Icon name="search" size={15} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search navigation..."
                style={{ width: "100%", padding: "10px 58px 10px 34px", background: SB.searchBg, border: "none", borderRadius: 10, color: "#334155", fontSize: 13, fontWeight: 500, outline: "none", fontFamily: "inherit" }}
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, background: "#ecece8", border: 0, borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer", color: "#7c7c76" }}
                >
                  <Icon name="x" size={11} />
                </button>
              ) : (
                <kbd style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", height: 22, minWidth: 34, padding: "0 7px", borderRadius: 6, background: "#d5d5d0", color: "#737373", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "inherit", fontWeight: 650 }}>
                  Ctrl K
                </kbd>
              )}
            </div>
          </>
        )}
      </div>

      {/* navigation */}
      <nav style={{ flex: 1, padding: "12px 6px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {dashVisible && <SidebarLink item={DASHBOARD} collapsed={collapsed} onNavigate={onNavigate} />}

        {visibleSections.map((s) => {
          const open = collapsed || searching || expanded.includes(s.key);
          return (
            <div key={s.key} style={{ marginBottom: 10 }}>
              {!collapsed && (
                <div
                  onClick={() => toggleSection(s.key)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 7px", cursor: "pointer", userSelect: "none", minHeight: 20, margin: "14px 0 6px" }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: SB.sectionTitle, textTransform: "uppercase", letterSpacing: "0.02em" }}>{s.label}</span>
                  <span style={{ color: "#8b8b86", display: "flex", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>
                    <Icon name="chevron" size={12} />
                  </span>
                </div>
              )}
              <div style={{ overflow: "hidden", maxHeight: open ? s.items.length * 44 + 8 : 0, opacity: open ? 1 : 0, transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease" }}>
                {s.items.map((i) => (
                  <SidebarLink key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}

        {noResults && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#6b7280" }}>
            <div style={{ width: 48, height: 48, background: "#f3f4f6", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "#9ca3af" }}>
              <Icon name="search" size={22} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No results found</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Try a different search term</div>
          </div>
        )}
      </nav>

      {/* footer */}
      <div style={{ padding: collapsed ? "12px 8px" : "12px 16px", borderTop: `1px solid ${SB.border}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 10, flexDirection: collapsed ? "column" : "row" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: collapsed ? undefined : 1, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #2b3242, #111827)", borderRadius: 12, display: "grid", placeItems: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0, boxShadow: "0 6px 14px rgba(17,24,39,0.09)" }}>
            {initial}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{admin?.name}</div>
              <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>Administrator</div>
            </div>
          )}
        </div>
        <button
          onClick={() => { logout(); navigate("/admin/login"); }}
          aria-label="Sign out"
          title="Sign out"
          style={{ width: 34, height: 34, background: "#fff", border: "1px solid #e5d8d8", borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer", color: "#dc2626", flexShrink: 0, transition: "background 0.2s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fff3f3")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <Icon name="logout" size={15} />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const isMobile = useIsMobile();
  const { admin, loading } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("aline-admin-sidebar-collapsed") === "1"; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("aline-admin-sidebar-collapsed", c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  };

  const content = useMemo(
    () => (
      <ConfirmProvider>
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 0.9, 0.3, 1] }}>
          <Outlet />
        </motion.div>
      </ConfirmProvider>
    ),
    [location.pathname]
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: SB.contentBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontFamily: "'Inter Tight', sans-serif", fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace />;

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: SB.contentBg, fontFamily: "'Inter Tight', sans-serif" }}>
        {/* top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 60, background: SB.bg, borderBottom: `1px solid ${SB.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, background: "#111", color: "#fff", borderRadius: 5, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>A</span>
            <span style={{ fontSize: 13, fontWeight: 650, color: SB.brand, letterSpacing: "0.4px" }}>THE A LINE</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: 999, padding: "2px 7px" }}>ADMIN</span>
          </div>
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{ width: 34, height: 34, border: `1px solid ${SB.border}`, background: "#fff", borderRadius: 9, display: "grid", placeItems: "center", cursor: "pointer", color: "#111" }}>
            <Icon name="panel" size={17} />
          </button>
        </div>
        {drawerOpen && (
          <>
            <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.4)", zIndex: 90 }} />
            <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: Math.min(300, typeof window !== "undefined" ? window.innerWidth - 56 : 300), zIndex: 100, boxShadow: "0 10px 40px rgba(0,0,0,0.18)" }}>
              <Sidebar collapsed={false} onToggle={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </>
        )}
        <main style={{ padding: "18px 14px 60px" }}>{content}</main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: SB.contentBg, fontFamily: "'Inter Tight', sans-serif" }}>
      <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: sidebarW, borderRight: `1px solid ${SB.border}`, zIndex: 50, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden" }}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
      </aside>
      <main style={{ marginLeft: sidebarW, transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)", padding: "18px 22px 70px", minWidth: 0 }}>
        {content}
      </main>
    </div>
  );
}
