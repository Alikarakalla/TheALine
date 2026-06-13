import { Routes, Route, useLocation, type Location } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ProductNavProvider } from "./context/ProductNav";
import { CartProvider } from "./context/Cart";
import { SearchProvider } from "./context/Search";
import { AuthProvider } from "./context/Auth";
import { OrdersProvider } from "./context/Orders";
import { FavoritesProvider } from "./context/Favorites";
import { SiteSettingsProvider } from "./context/SiteSettings";
import { CatalogProvider } from "./context/Catalog";
import { HomepageContentProvider } from "./context/HomepageContent";
import { AdminAuthProvider } from "./context/AdminAuth";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminVariants from "./pages/admin/AdminVariants";
import AdminTags from "./pages/admin/AdminTags";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminLoyalty from "./pages/admin/AdminLoyalty";
import AdminHomepage from "./pages/admin/AdminHomepage";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminSeo from "./pages/admin/AdminSeo";
import AdminSettings from "./pages/admin/AdminSettings";
import { ToastProvider } from "./context/Toast";
import { LoyaltyProvider } from "./context/Loyalty";
import { PreferencesProvider } from "./context/Preferences";
import { AddressesProvider } from "./context/Addresses";
import { PaymentProvider } from "./context/Payment";
import { ReviewsProvider } from "./context/Reviews";
import { RecentlyViewedProvider } from "./context/RecentlyViewed";
import Landing from "./pages/Index";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmed from "./pages/OrderConfirmed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import Receipt from "./pages/Receipt";
import Rewards from "./pages/Rewards";
import AccountLayout from "./components/account/AccountLayout";
import AccountOverview from "./components/account/AccountOverview";
import OrdersPage from "./components/account/OrdersPage";
import AddressesPage from "./components/account/AddressesPage";
import PaymentPage from "./components/account/PaymentPage";
import AccountRewards from "./components/account/AccountRewards";
import SettingsPage from "./components/account/SettingsPage";
import ProductPage from "./components/ProductPage";
import AnnouncementBar from "./components/AnnouncementBar";
import { PRODUCT_LIST } from "./lib/products";

/**
 * The product route renders ON TOP of whichever base page launched it (home or
 * shop), which is kept mounted via the location `background` state so the
 * shared-element morph stays seamless in both directions. Each product is still
 * a real route (/product/:id) with its own URL, title and meta for SEO, and a
 * direct visit renders it standalone.
 */
function ProductOutlet() {
  const location = useLocation();
  const isProduct = location.pathname.startsWith("/product/");
  return (
    <AnimatePresence>
      <Routes location={location} key={isProduct ? location.pathname : "base"}>
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="*" element={null} />
      </Routes>
    </AnimatePresence>
  );
}

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { background?: Location } | null;
  const background = state?.background;

  return (
    <>
      {/* Base pages — render the background page while a product is open. */}
      <Routes location={background || location}>
        <Route path="/" element={<Landing />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmed" element={<OrderConfirmed />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/account" element={<AccountLayout />}>
          <Route index element={<AccountOverview />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="rewards" element={<AccountRewards />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/orders/:number" element={<Receipt />} />

        {/* ===== Admin panel ===== */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="brands" element={<AdminBrands />} />
          <Route path="variants" element={<AdminVariants />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="loyalty" element={<AdminLoyalty />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="seo" element={<AdminSeo />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>

      <ProductOutlet />

      {/* Admin-managed promo bar (storefront only). */}
      {!location.pathname.startsWith("/admin") && <AnnouncementBar />}

      {/* Crawlable product links (discovery / sitemap fallback). */}
      <nav
        aria-label="All products"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          border: 0,
        }}
      >
        <a href="/shop">Shop</a>
        {PRODUCT_LIST.map((p) => (
          <a key={p.id} href={`/product/${p.id}`}>
            {p.name}
          </a>
        ))}
      </nav>
    </>
  );
}

export default function App() {
  return (
    <SiteSettingsProvider>
    <CatalogProvider>
    <HomepageContentProvider>
    <AdminAuthProvider>
    <AuthProvider>
      <ToastProvider>
        <LoyaltyProvider>
          <OrdersProvider>
            <PreferencesProvider>
              <AddressesProvider>
                <PaymentProvider>
                  <ReviewsProvider>
                    <RecentlyViewedProvider>
                      <FavoritesProvider>
                        <CartProvider>
                          <ProductNavProvider>
                            <SearchProvider>
                              <AppRoutes />
                            </SearchProvider>
                          </ProductNavProvider>
                        </CartProvider>
                      </FavoritesProvider>
                    </RecentlyViewedProvider>
                  </ReviewsProvider>
                </PaymentProvider>
              </AddressesProvider>
            </PreferencesProvider>
          </OrdersProvider>
        </LoyaltyProvider>
      </ToastProvider>
    </AuthProvider>
    </AdminAuthProvider>
    </HomepageContentProvider>
    </CatalogProvider>
    </SiteSettingsProvider>
  );
}
