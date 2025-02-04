/*
  # Add property information table
  
  1. New Tables
    - `property_info`
      - `customer_id` (uuid, primary key, references profiles)
      - `acres` (numeric, not null)
      - `is_sloped` (boolean, not null)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for customer access
    - Add policies for manager viewing
*/

CREATE TABLE property_info (
  customer_id uuid PRIMARY KEY REFERENCES profiles(id),
  acres numeric NOT NULL CHECK (acres > 0),
  is_sloped boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_info ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own property info
CREATE POLICY "Customers can manage their own property info"
  ON property_info
  FOR ALL
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Managers can view property info
CREATE POLICY "Managers can view property info"
  ON property_info
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );