-- International medication portability. Patient records keep immutable snapshots
-- of a confirmed composition; the shared catalogue deliberately contains no
-- household or contributor information.

ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS original_brand_name TEXT,
  ADD COLUMN IF NOT EXISTS purchase_country CHAR(2),
  ADD COLUMN IF NOT EXISTS indication TEXT,
  ADD COLUMN IF NOT EXISTS stopped_reason TEXT;

UPDATE medications
SET original_brand_name = name
WHERE original_brand_name IS NULL;

ALTER TABLE medications
  DROP CONSTRAINT IF EXISTS medications_purchase_country_check;

ALTER TABLE medications
  ADD CONSTRAINT medications_purchase_country_check
  CHECK (purchase_country IS NULL OR purchase_country IN ('IN', 'US', 'GB'));

CREATE TABLE IF NOT EXISTS medication_catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country CHAR(2) NOT NULL CHECK (country IN ('IN', 'US', 'GB')),
  brand_name TEXT NOT NULL,
  normalized_brand_name TEXT NOT NULL,
  formulation TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  source_reference TEXT,
  external_id TEXT,
  display_rank INTEGER NOT NULL DEFAULT 100 CHECK (display_rank > 0),
  review_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (review_status IN ('PENDING', 'VERIFIED', 'FLAGGED')),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  discontinued BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country, source_name, external_id)
);

CREATE INDEX IF NOT EXISTS medication_catalog_products_search_idx
  ON medication_catalog_products (country, normalized_brand_name);
CREATE INDEX IF NOT EXISTS medication_catalog_products_review_idx
  ON medication_catalog_products (review_status, reviewed_at);

CREATE TABLE IF NOT EXISTS medication_catalog_product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES medication_catalog_products(id) ON DELETE CASCADE,
  canonical_inn TEXT NOT NULL,
  local_alias TEXT,
  strength TEXT NOT NULL,
  strength_unit TEXT NOT NULL,
  ingredient_order SMALLINT NOT NULL CHECK (ingredient_order > 0),
  UNIQUE (product_id, ingredient_order)
);

CREATE INDEX IF NOT EXISTS medication_catalog_ingredients_product_idx
  ON medication_catalog_product_ingredients (product_id, ingredient_order);
CREATE INDEX IF NOT EXISTS medication_catalog_ingredients_inn_idx
  ON medication_catalog_product_ingredients (canonical_inn);

CREATE TABLE IF NOT EXISTS medication_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'UNCONFIRMED', 'REVIEW_NEEDED')),
  formulation TEXT,
  catalog_product_id UUID REFERENCES medication_catalog_products(id) ON DELETE SET NULL,
  source_name TEXT,
  source_version TEXT,
  confirmed_at TIMESTAMPTZ,
  created_by TEXT REFERENCES profiles(user_id) ON DELETE SET NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'CONFIRMED' AND catalog_product_id IS NOT NULL AND confirmed_at IS NOT NULL)
    OR status <> 'CONFIRMED'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS medication_compositions_one_current_idx
  ON medication_compositions (medication_id) WHERE is_current;

CREATE TABLE IF NOT EXISTS medication_composition_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composition_id UUID NOT NULL REFERENCES medication_compositions(id) ON DELETE CASCADE,
  canonical_inn TEXT NOT NULL,
  local_alias TEXT,
  strength TEXT NOT NULL,
  strength_unit TEXT NOT NULL,
  ingredient_order SMALLINT NOT NULL CHECK (ingredient_order > 0),
  UNIQUE (composition_id, ingredient_order)
);

CREATE INDEX IF NOT EXISTS medication_composition_ingredients_composition_idx
  ON medication_composition_ingredients (composition_id, ingredient_order);
