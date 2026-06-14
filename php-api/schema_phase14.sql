-- HeritOS — Phase 14 migration. Additive only; safe to run on a live DB.
-- Wishlist (saved items, per customer) + customer birthday for gifting prompts.
-- Import via phpMyAdmin AFTER schema_phase13.sql.

CREATE TABLE IF NOT EXISTS wishlist_items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  INT UNSIGNED NOT NULL,
  product_slug VARCHAR(190) NOT NULL,
  product_name VARCHAR(190) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_cust_slug (customer_id, product_slug),
  KEY idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS birthday DATE NULL AFTER email;
