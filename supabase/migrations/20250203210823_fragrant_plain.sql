/*
  # Add land dimensions and price per square meter

  1. Updates to pricing_tiers table:
    - Add `price_per_sqm` (integer) - Price per square meter in cents
    - Add `min_area` (integer) - Minimum area in square meters
    - Add `max_area` (integer) - Maximum area in square meters (null for unlimited)

  2. Security:
    - Existing RLS policies will handle the new columns
*/

ALTER TABLE pricing_tiers
ADD COLUMN price_per_sqm integer DEFAULT 0 CHECK (price_per_sqm >= 0),
ADD COLUMN min_area integer DEFAULT 0 CHECK (min_area >= 0),
ADD COLUMN max_area integer;