# Lebazone → The A Line — feature integration roadmap

Inventory of what the lebazone admin (`C:\xampp\htdocs\lebazone_web`) has that
The A Line doesn't yet. The admin shell (light sidebar with grouped sections,
search, collapse) and the operational dashboard were ported on 2026-08-20 —
everything below is what remains, grouped and roughly ordered by value for a
COD fashion store in Lebanon.

## ✅ Already ported / equivalent exists
- **Add/Edit product flow (ported 2026-08-20, 1:1)** — dedicated create/edit
  pages, EN/AR names + rich-text descriptions, dependent category → sub →
  sub-sub selects, variation matrix (types drawer, generated rows, drag
  reorder, copy-first-row tools, size sort, per-variant media drawers),
  main image + gallery uploads with server-side compression, pre-orders,
  discounts, publish-at, readiness checklist, server-side validation with
  scroll-to-field, animated save loader. Omitted: jersey patches (white-label
  football feature), "Notify users" toggle (needs push — see Marketing).
- Dashboard (KPIs, gross profit trend vs prior period, date + status filters,
  operational status, customers, catalog, recent activity, alerts, quick
  actions, CSV export)
- Sidebar shell (grouped sections, navigation search with Ctrl+K, collapse,
  user footer)
- Products, Categories (tree), Brands, Variants, Tags, Inventory, Orders,
  Customers, Collections
- Currencies (base + rates + set-as-base rebase)
- Loyalty (tiers, rewards, points)
- Homepage content, Banners, basic SEO, Settings & Theme

## 1 — Marketing (highest value first)
- [ ] **Coupons / discount codes** — table exists (`coupons`), no admin UI or
      checkout redemption flow yet
- [ ] **Flash sales** — timed price cuts per product/collection
- [ ] **Cart promotions** — "spend X get Y" rules at cart level
- [ ] **Category discounts** — percentage off whole categories
- [ ] **Influencer coupons** — per-influencer codes with attribution stats
- [ ] **Abandoned carts** — persist carts server-side, list + recovery email
- [ ] **Email campaigns** — newsletter blasts to `newsletter_subscribers`
      (already collected by the storefront footer)
- [ ] **Affiliate / referral tracking** — referral codes exist in loyalty;
      needs an admin report
- [ ] **Push notifications** — web push to shoppers

## 2 — Analytics
- [ ] **Visitor analytics** — page-view tracking (visits, sources, geography,
      live visitors, bounce rate); powers the dashboard's conversion rate
- [ ] **Product views** — per-product view counts → conversion per product
- [ ] **WhatsApp clicks** — track taps on a WhatsApp contact button
- [ ] **Orders by channel** — UTM/referrer capture at checkout (fb / ig /
      direct), shown on the dashboard's sales card
- [ ] **Conversion rate + abandoned carts KPIs** — the two dashboard tiles
      lebazone has that we swapped out (need the two trackers above)

## 3 — Finance
- [ ] **Expenses** — record ad spend, packaging, delivery costs
- [ ] **Revenue reports** — monthly P&L style view (revenue − cost − expenses)
- [ ] **ROAS** — ad spend vs attributed revenue (needs channel tracking)

## 4 — Commerce extensions
- [ ] **Product reviews moderation** — `reviews` table exists; needs an admin
      approve/reject page (dashboard already alerts on pending reviews)
- [ ] **Bundles** — sell product sets at a combined price
- [ ] **Size guide** — per-category size chart editor shown on the PDP

## 5 — Content / informative
- [ ] **Policies pages** — editable shipping/returns/privacy pages (`pages`
      table exists, no editor)
- [ ] **Store locator / stores** — physical store listing
- [ ] **Newsletter subscribers admin** — list + export of signups
- [ ] **Testimonials / clients** — social proof blocks for the storefront

## 6 — Platform / settings
- [ ] **Roles & permissions** — per-admin sidebar/tab permissions (lebazone's
      RolePermission system; we have a single admin)
- [ ] **API keys** — token management for integrations
- [ ] **Integrations** — Meta pixel, Google Analytics, Telegram order pings
- [ ] **AI chat logs** — storefront AI assistant + conversation review
- [ ] **Add-ons marketplace** — lebazone's subscription add-on system
      (only relevant if The A Line becomes multi-tenant)
- [ ] **Design center** — admin-editable theme tokens (we hardcode the design
      system on purpose — revisit only if non-developers need control)
- [ ] **Languages / multi-language storefront** — AR/EN storefront
      (currencies already store Arabic names)

## 7 — SEO extensions
- [ ] **Redirects manager** — `seo_redirects` table exists; needs UI
- [ ] **Sitemap generator** — auto sitemap.xml from products/pages
- [ ] **Per-page SEO editor** — beyond the current basic SEO page

## 8 — Dashboard niceties (small)
- [ ] **Guided tour** — the step-by-step "Tour" overlay lebazone's dashboard has
- [ ] **Recent transactions feed** — becomes meaningful once online payment
      joins COD
- [ ] **PWA manifest for admin** — install the admin panel as an app
