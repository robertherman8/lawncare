/*
  # Add pricing tiers and pricing management

  1. New Tables
    - `pricing_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the tier
      - `base_price` (integer) - Base price in cents
      - `description` (text) - Description of what's included
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `manager_id` (uuid) - Manager who created the tier
      - `is_active` (boolean) - Whether this tier is active

  2. Security
    - Enable RLS on `pricing_tiers` table
    - Add policies for managers to manage tiers
    - Add policies for customers to view active tiers
*/

CREATE TABLE pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_price integer NOT NULL CHECK (base_price >= 0),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Managers can create pricing tiers
CREATE POLICY "Managers can create pricing tiers"
  ON pricing_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );

-- Managers can update their own pricing tiers
CREATE POLICY "Managers can update their pricing tiers"
  ON pricing_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
    AND manager_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
    AND manager_id = auth.uid()
  );

-- Everyone can view active pricing tiers
CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  USING (is_active = true OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  ));