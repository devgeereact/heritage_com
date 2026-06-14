-- HeritOS — Phase 11 migration. Additive only; safe to run on a live DB.
-- Wires the public storefront to the live products table. Adds a routing slug,
-- a published flag, and a storefront JSON blob (the curated copy + visual tile
-- the static site used). Then seeds the six launch pieces so the shop is never
-- empty. Import via phpMyAdmin AFTER schema_phase10.sql.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug       VARCHAR(190) NULL AFTER code,
  ADD COLUMN IF NOT EXISTS published  TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS storefront JSON NULL AFTER care;

ALTER TABLE products
  ADD UNIQUE KEY IF NOT EXISTS uniq_slug (slug);

-- ── Seed the launch collection (skip if a slug already exists) ──────────────
INSERT IGNORE INTO products (code, slug, name, category, fabric, description, story, care, base_price, cost_price, status, published, storefront)
VALUES
('PRD-S01','everyday-shirt-ankara','Everyday Shirt','Shirts','Ankara',
 'Hand-cut Ankara, lined for comfort and made to be lived in.',
 'This shirt is made from bold Ankara wax print, chosen for the way the pattern carries movement. Cut for an easy everyday fit, it takes culture out of the festival and into your week.',
 'Machine wash cold, inside out. Iron medium. Wash with like colours.',
 18500, 9000, 'active', 1,
 '{"fabricKey":"ankara","tile":"hc-tile-ankara","type":"Shirts","occasion":"Everyday","priceUsd":12,"short":"Hand-cut Ankara, lined for comfort and made to be lived in. Heritage, tailored for now.","fit":"True to size; size up for a relaxed fit.","material":"100% cotton Ankara, lined yoke.","model":"Model wears size M, height 5’9\\"."}'),
('PRD-S02','signature-shirt-adire','Signature Shirt','Shirts','Adire (hand-dyed)',
 'Hand-dyed Adire, finished to be lived in. No two pieces are ever exactly the same.',
 'This shirt is made from Adire, hand-dyed by hand in Yorubaland — which means no two are ever exactly alike. We chose it for the deep indigo and the way the pattern moves.',
 'Hand-wash cold separately for the first few washes (indigo may bleed). Dry in shade.',
 24000, 12000, 'active', 1,
 '{"fabricKey":"adire","tile":"hc-tile-adire","type":"Shirts","occasion":"Everyday","priceUsd":16,"short":"Hand-dyed Adire, finished to be lived in. No two pieces are ever exactly the same.","fit":"True to size.","material":"100% cotton, hand-dyed Adire.","model":"Model wears size M, height 5’9\\"."}'),
('PRD-S03','wrap-dress-adire','Wrap Dress','Dresses','Adire (hand-dyed)',
 'A modern wrap silhouette in hand-dyed Adire — made to move, made to last.',
 'Cut as a contemporary wrap, this dress is made from hand-dyed Adire. Each length of cloth is dyed by hand, so the indigo and pattern are unique to your piece.',
 'Hand-wash cold, dry in shade. Cool iron.',
 32000, 16000, 'active', 1,
 '{"fabricKey":"adire","tile":"hc-tile-adire","type":"Dresses","occasion":"Owambe","priceUsd":21,"short":"A modern wrap silhouette in hand-dyed Adire — made to move, made to last.","fit":"True to size; adjustable wrap tie.","material":"100% cotton, hand-dyed Adire.","model":"Model wears size M, height 5’9\\"."}'),
('PRD-S04','two-piece-set-ankara','Two-Piece Set','Sets','Ankara',
 'A considered, modern two-piece in bold Ankara — made to be lived in.',
 'A coordinated two-piece in bold Ankara wax print, cut for a clean modern silhouette. Wear it together for an occasion, or split it across your everyday wardrobe.',
 'Machine wash cold inside out. Iron medium.',
 45000, 22000, 'active', 1,
 '{"fabricKey":"ankara","tile":"hc-tile-ankara","type":"Sets","occasion":"Owambe","priceUsd":30,"short":"A considered, modern two-piece in bold Ankara — made to be lived in.","fit":"True to size; relaxed through the body.","material":"100% cotton Ankara, lined.","model":"Model wears size M, height 5’9\\"."}'),
('PRD-S05','heritage-set-asooke','Heritage Set','Sets','Aso-Oke',
 'Our premium woven Aso-Oke set — ceremonial heritage, contemporary tailoring.',
 'Made from woven Aso-Oke, the cloth of ceremony, this premium set honours its origin while sitting in a modern cut. A piece for the moments that matter.',
 'Dry-clean only. Store folded with tissue.',
 68000, 34000, 'active', 1,
 '{"fabricKey":"asooke","tile":"hc-tile-asooke","type":"Sets","occasion":"Owambe","priceUsd":45,"premium":true,"short":"Our premium woven Aso-Oke set — ceremonial heritage, contemporary tailoring.","fit":"True to size; structured fit.","material":"Handwoven Aso-Oke, fully lined.","model":"Model wears size M, height 5’9\\"."}'),
('PRD-S06','heritage-accessory','Headwrap / Tie','Accessories','Mixed',
 'A finishing piece in mixed heritage fabric — headwrap or tie, your way.',
 'A small piece with the same heritage behind it. Made from offcuts of our heritage fabrics, each accessory is one of a kind.',
 'Hand-wash cold, dry flat.',
 6500, 2500, 'active', 1,
 '{"fabricKey":"mixed","tile":"hc-tile-mixed","type":"Accessories","occasion":"Gift","priceUsd":5,"short":"A finishing piece in mixed heritage fabric — headwrap or tie, your way.","fit":"One size.","material":"Mixed heritage fabrics.","model":"—"}');

-- Variants (size × stock). One-size for the accessory. Skip if SKU exists.
INSERT IGNORE INTO product_variants (product_id, sku, size, color, stock)
SELECT p.id, CONCAT(p.slug,'-',LOWER(s.sz)), s.sz, 'Default', 10
  FROM products p
  JOIN (SELECT 'S' AS sz UNION SELECT 'M' UNION SELECT 'L' UNION SELECT 'XL') s
 WHERE p.slug IN ('everyday-shirt-ankara','signature-shirt-adire','wrap-dress-adire','two-piece-set-ankara','heritage-set-asooke');

INSERT IGNORE INTO product_variants (product_id, sku, size, color, stock)
SELECT p.id, CONCAT(p.slug,'-one size'), 'One size', 'Default', 8
  FROM products p WHERE p.slug = 'heritage-accessory';
