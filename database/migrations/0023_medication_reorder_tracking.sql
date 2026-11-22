ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS reorder_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS reorder_next_date DATE,
  ADD COLUMN IF NOT EXISTS reorder_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS reorder_notified_date DATE;

ALTER TABLE medications
  ADD CONSTRAINT medications_reorder_interval_days_check
    CHECK (reorder_interval_days IS NULL OR reorder_interval_days BETWEEN 7 AND 365),
  ADD CONSTRAINT medications_reorder_status_check
    CHECK (reorder_status IN ('ready', 'ordered'));

CREATE INDEX IF NOT EXISTS medications_reorder_due_idx
  ON medications (reorder_next_date)
  WHERE is_active AND reorder_interval_days IS NOT NULL AND reorder_status = 'ready';
