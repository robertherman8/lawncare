/*
  # Add customer payment information table

  1. New Tables
    - `customer_payment_info`
      - `customer_id` (uuid, references profiles)
      - `street` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `country` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `customer_payment_info` table
    - Add policies for customers to manage their own payment info
    - Add policies for managers to view customer payment info
*/

-- Create customer payment info table
CREATE TABLE customer_payment_info (
  customer_id uuid PRIMARY KEY REFERENCES profiles(id),
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_payment_info ENABLE ROW LEVEL SECURITY;

-- Customers can view and update their own payment info
CREATE POLICY "Customers can manage their own payment info"
  ON customer_payment_info
  FOR ALL
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Managers can view customer payment info
CREATE POLICY "Managers can view customer payment info"
  ON customer_payment_info
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );