-- ============================================================================
-- Production migration: bring an older DB (deployed pre-collections) up to the
-- current code's schema.  Idempotent — safe to run more than once on MariaDB.
--
-- Fixes the 500 errors on:
--   /api/collections, /api/admin/collections   (missing collections tables)
--   /api/products,    /api/admin/products      (missing product_variants cols)
--   /api/admin/tags                            (missing tags.color)
--
-- HOW TO RUN: Hostinger hPanel -> Databases -> phpMyAdmin -> select the shop DB
-- -> SQL tab -> paste this whole file -> Go.
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ----- Collections (manual hand-picked, or smart rule-based) -----------------
CREATE TABLE IF NOT EXISTS collections (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NULL,
  image_url   VARCHAR(500) NULL,
  type        ENUM('manual','smart') NOT NULL DEFAULT 'manual',
  match_type  ENUM('all','any') NOT NULL DEFAULT 'all',
  rules       LONGTEXT NULL,
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

-- ----- tags.color (badge background) -----------------------------------------
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS color VARCHAR(9) NULL AFTER slug;

-- ----- product_variants: compare_at_price + images ---------------------------
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10,2) NULL AFTER price;
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS images LONGTEXT NULL AFTER image_url;

SET FOREIGN_KEY_CHECKS = 1;
