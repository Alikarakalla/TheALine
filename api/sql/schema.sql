-- Lovebag e-commerce schema (MariaDB 10.4, InnoDB, utf8mb4)
SET FOREIGN_KEY_CHECKS = 0;

-- ===== Admins & access =====
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('owner','admin','manager','editor') NOT NULL DEFAULT 'admin',
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Global settings & theme (key/value, grouped) =====
CREATE TABLE IF NOT EXISTS settings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_key   VARCHAR(60) NOT NULL,          -- theme | site | seo | shipping | checkout ...
  item_key    VARCHAR(100) NOT NULL,
  item_value  LONGTEXT NULL,
  value_type  ENUM('string','number','bool','color','json') NOT NULL DEFAULT 'string',
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settings (group_key, item_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Media library =====
CREATE TABLE IF NOT EXISTS media (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename   VARCHAR(255) NOT NULL,
  url        VARCHAR(500) NOT NULL,
  mime       VARCHAR(100) NULL,
  size       INT UNSIGNED NULL,
  alt        VARCHAR(255) NULL,
  width      INT NULL,
  height     INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Brands =====
CREATE TABLE IF NOT EXISTS brands (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NULL,
  logo_url    VARCHAR(500) NULL,
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  position    INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Categories (self-referential; unlimited nesting depth) =====
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT UNSIGNED NULL,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(160) NOT NULL,
  description TEXT NULL,
  image_url   VARCHAR(500) NULL,
  position    INT NOT NULL DEFAULT 0,
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_slug (slug),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Collections (manual hand-picked, or smart rule-based) =====
CREATE TABLE IF NOT EXISTS collections (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NULL,
  image_url   VARCHAR(500) NULL,
  type        ENUM('manual','smart') NOT NULL DEFAULT 'manual',
  match_type  ENUM('all','any') NOT NULL DEFAULT 'all',  -- smart: match ALL or ANY rule
  rules       LONGTEXT NULL,                              -- smart: JSON [{field,op,value}]
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  position    INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_collections (
  product_id    INT UNSIGNED NOT NULL,
  collection_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, collection_id),
  CONSTRAINT fk_pcol_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcol_col  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Tags =====
CREATE TABLE IF NOT EXISTS tags (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  slug  VARCHAR(120) NOT NULL UNIQUE,
  color VARCHAR(9) NULL                  -- badge background shown on the storefront card
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Variant attributes & options (e.g. Color -> Cognac #9c5a2d) =====
CREATE TABLE IF NOT EXISTS variant_attributes (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(80) NOT NULL,            -- Color, Size ...
  slug     VARCHAR(90) NOT NULL UNIQUE,
  position INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS variant_options (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attribute_id INT UNSIGNED NOT NULL,
  value        VARCHAR(100) NOT NULL,       -- Cognac
  meta         VARCHAR(120) NULL,           -- hex for colors
  position     INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_opt_attr FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Customers =====
CREATE TABLE IF NOT EXISTS customers (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(190) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NULL,
  phone          VARCHAR(40) NULL,
  status         ENUM('active','blocked') NOT NULL DEFAULT 'active',
  marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1,
  prefs          LONGTEXT NULL,                  -- JSON: currency, sms, language ...
  birthday       DATE NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Loyalty tiers =====
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tier_key           VARCHAR(40) NOT NULL UNIQUE,
  name               VARCHAR(80) NOT NULL,
  min_spend          DECIMAL(10,2) NOT NULL DEFAULT 0,
  earn_rate          DECIMAL(6,3) NOT NULL DEFAULT 1,
  free_ship_threshold DECIMAL(10,2) NOT NULL DEFAULT 100,
  perks              LONGTEXT NULL,         -- JSON array
  position           INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Products =====
CREATE TABLE IF NOT EXISTS products (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  slug             VARCHAR(210) NOT NULL UNIQUE,
  sku              VARCHAR(80) NULL,
  brand_id         INT UNSIGNED NULL,
  short_description VARCHAR(500) NULL,
  description      LONGTEXT NULL,
  details          TEXT NULL,
  materials        TEXT NULL,
  care             TEXT NULL,
  dimensions       VARCHAR(120) NULL,
  weight           VARCHAR(60) NULL,
  fit              VARCHAR(255) NULL,
  price            DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2) NULL,
  cost_price       DECIMAL(10,2) NULL,
  panel_hex        VARCHAR(9) NULL,
  badge            ENUM('','New','Bestseller','Limited') NOT NULL DEFAULT '',
  status           ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
  is_featured      TINYINT(1) NOT NULL DEFAULT 0,
  stock            INT NOT NULL DEFAULT 0,
  rating           DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count     INT NOT NULL DEFAULT 0,
  position         INT NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_prod_status (status),
  INDEX idx_prod_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  url        VARCHAR(500) NOT NULL,
  alt        VARCHAR(255) NULL,
  position   INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_img_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_img_prod (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, category_id),
  CONSTRAINT fk_pc_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INT UNSIGNED NOT NULL,
  tag_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, tag_id),
  CONSTRAINT fk_pt_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  sku        VARCHAR(80) NULL,
  name       VARCHAR(160) NULL,            -- combination label, e.g. "Beige / L"
  color_hex  VARCHAR(9) NULL,
  price      DECIMAL(10,2) NULL,           -- override; null = product price
  compare_at_price DECIMAL(10,2) NULL,     -- per-variant "was" price (discount)
  stock      INT NOT NULL DEFAULT 0,
  image_url  VARCHAR(500) NULL,                 -- primary (first) variant image
  images     LONGTEXT NULL,                     -- JSON array of gallery image URLs
  position   INT NOT NULL DEFAULT 0,
  status     ENUM('active','hidden') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_var_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_var_prod (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variant_options (
  variant_id INT UNSIGNED NOT NULL,
  option_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (variant_id, option_id),
  CONSTRAINT fk_pvo_var FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_pvo_opt FOREIGN KEY (option_id) REFERENCES variant_options(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_seo (
  product_id       INT UNSIGNED PRIMARY KEY,
  meta_title       VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  og_image_url     VARCHAR(500) NULL,
  canonical_url    VARCHAR(500) NULL,
  keywords         VARCHAR(500) NULL,
  CONSTRAINT fk_seo_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NULL,
  variant_id INT UNSIGNED NULL,
  change_qty INT NOT NULL,
  reason     VARCHAR(120) NOT NULL,
  reference  VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sm_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_var  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Customer addresses & payment methods =====
CREATE TABLE IF NOT EXISTS customer_addresses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  label       VARCHAR(60) NULL,
  full_name   VARCHAR(150) NULL,
  line1       VARCHAR(200) NULL,
  line2       VARCHAR(200) NULL,
  city        VARCHAR(120) NULL,
  postcode    VARCHAR(40) NULL,
  country     VARCHAR(80) NULL,
  phone       VARCHAR(40) NULL,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  brand       VARCHAR(40) NULL,
  last4       VARCHAR(4) NULL,
  exp_month   VARCHAR(2) NULL,
  exp_year    VARCHAR(4) NULL,
  holder      VARCHAR(150) NULL,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Customer favorites / wishlist =====
CREATE TABLE IF NOT EXISTS customer_favorites (
  customer_id INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, product_id),
  CONSTRAINT fk_fav_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Coupons / discounts =====
CREATE TABLE IF NOT EXISTS coupons (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(60) NOT NULL UNIQUE,
  type         ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'percent',
  value        DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  starts_at    DATETIME NULL,
  ends_at      DATETIME NULL,
  usage_limit  INT NULL,
  used_count   INT NOT NULL DEFAULT 0,
  status       ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Orders =====
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number          VARCHAR(40) NOT NULL UNIQUE,
  customer_id     INT UNSIGNED NULL,
  email           VARCHAR(190) NOT NULL,
  name            VARCHAR(150) NULL,
  status          ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'paid',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(3) NOT NULL DEFAULT 'EUR',
  coupon_code     VARCHAR(60) NULL,
  points_earned   INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  gift_is         TINYINT(1) NOT NULL DEFAULT 0,
  gift_note       VARCHAR(500) NULL,
  gift_wrap       TINYINT(1) NOT NULL DEFAULT 0,
  shipping_method VARCHAR(60) NULL,
  shipping_address LONGTEXT NULL,           -- JSON snapshot
  tracking_number VARCHAR(60) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_order_status (status),
  INDEX idx_order_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NULL,
  variant_id  INT UNSIGNED NULL,
  name        VARCHAR(200) NOT NULL,
  color_name  VARCHAR(100) NULL,
  color_hex   VARCHAR(9) NULL,
  unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
  qty         INT NOT NULL DEFAULT 1,
  line_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url   VARCHAR(500) NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_prod  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_oi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  status     VARCHAR(40) NOT NULL,
  note       VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Loyalty accounts / ledger / rewards =====
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id        INT UNSIGNED NOT NULL UNIQUE,
  points             INT NOT NULL DEFAULT 0,
  lifetime_spend     DECIMAL(10,2) NOT NULL DEFAULT 0,
  referral_code      VARCHAR(40) NOT NULL UNIQUE,
  referred_by        VARCHAR(40) NULL,
  signup_bonus_given TINYINT(1) NOT NULL DEFAULT 0,
  last_birthday_year INT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_la_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id  INT UNSIGNED NOT NULL,
  type        VARCHAR(30) NOT NULL,
  points      INT NOT NULL,
  label       VARCHAR(200) NULL,
  order_number VARCHAR(40) NULL,
  ref         VARCHAR(120) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ll_acct FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_catalog (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reward_key  VARCHAR(40) NOT NULL UNIQUE,
  label       VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  cost_points INT NOT NULL,
  kind        ENUM('shipping','discount','giftwrap','early') NOT NULL DEFAULT 'discount',
  value       DECIMAL(10,2) NULL,
  status      ENUM('active','hidden') NOT NULL DEFAULT 'active',
  position    INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id  INT UNSIGNED NOT NULL,
  reward_id   INT UNSIGNED NULL,
  code        VARCHAR(60) NOT NULL,
  points_cost INT NOT NULL,
  used        TINYINT(1) NOT NULL DEFAULT 0,
  order_number VARCHAR(40) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rr_acct FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_reward FOREIGN KEY (reward_id) REFERENCES reward_catalog(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Reviews =====
CREATE TABLE IF NOT EXISTS reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  customer_id INT UNSIGNED NULL,
  author      VARCHAR(120) NOT NULL,
  rating      TINYINT NOT NULL DEFAULT 5,
  title       VARCHAR(200) NULL,
  body        TEXT NULL,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_prod FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_rev_prod (product_id),
  INDEX idx_rev_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Homepage content sections =====
CREATE TABLE IF NOT EXISTS homepage_sections (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(60) NOT NULL UNIQUE,  -- hero | collection | perfectmatch | story | lookbook | bento | footer | announcement
  title      VARCHAR(150) NULL,
  enabled    TINYINT(1) NOT NULL DEFAULT 1,
  position   INT NOT NULL DEFAULT 0,
  data       LONGTEXT NULL,                  -- JSON content
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Banners / promotions =====
CREATE TABLE IF NOT EXISTS banners (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200) NULL,
  subtitle   VARCHAR(300) NULL,
  image_url  VARCHAR(500) NULL,
  link_url   VARCHAR(500) NULL,
  link_label VARCHAR(80) NULL,
  placement  VARCHAR(60) NOT NULL DEFAULT 'home',  -- home | announcement | shop | popup
  position   INT NOT NULL DEFAULT 0,
  starts_at  DATETIME NULL,
  ends_at    DATETIME NULL,
  status     ENUM('active','hidden') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Navigation menus =====
CREATE TABLE IF NOT EXISTS navigation_menus (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  location   VARCHAR(40) NOT NULL,          -- header | footer | overlay
  label      VARCHAR(100) NOT NULL,
  url        VARCHAR(300) NOT NULL,
  parent_id  INT UNSIGNED NULL,
  position   INT NOT NULL DEFAULT 0,
  status     ENUM('active','hidden') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Content pages (FAQ / About / Shipping) =====
CREATE TABLE IF NOT EXISTS pages (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  title       VARCHAR(200) NOT NULL,
  content     LONGTEXT NULL,
  status      ENUM('published','draft') NOT NULL DEFAULT 'published',
  meta_title  VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== SEO redirects =====
CREATE TABLE IF NOT EXISTS seo_redirects (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_path  VARCHAR(300) NOT NULL,
  to_path    VARCHAR(300) NOT NULL,
  code       INT NOT NULL DEFAULT 301,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Newsletter =====
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL UNIQUE,
  status     ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  source     VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Audit log =====
CREATE TABLE IF NOT EXISTS audit_log (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id   INT UNSIGNED NULL,
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(60) NULL,
  entity_id  VARCHAR(60) NULL,
  meta       LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
