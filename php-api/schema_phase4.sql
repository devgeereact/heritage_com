-- HeritOS — Phase 4 migration. Additive only; safe to run on a live DB.
-- Deepens the made-to-measure / bespoke engine (the high-margin differentiator):
-- per-project cost → profit, and a dedicated fitting-appointment date.
--
-- Import via phpMyAdmin AFTER schema_phase3.sql. Uses MariaDB's
-- `ADD COLUMN IF NOT EXISTS`, so re-running is harmless.
-- price + deposit + due_date already ship in schema.sql; measurements (JSON) too.

ALTER TABLE tailoring_orders
  ADD COLUMN IF NOT EXISTS fabric_cost  DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER deposit,
  ADD COLUMN IF NOT EXISTS labour_cost  DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER fabric_cost,
  ADD COLUMN IF NOT EXISTS fitting_date DATE NULL AFTER due_date;
