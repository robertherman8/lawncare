/*
  # Add property requests table

  1. New Tables
    - `property_requests`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `status` (text, either 'pending' or 'reviewed')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for customers and managers
*/

-- Create property requests table
CREATE TABLE property_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('pending', 'reviewed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests
CREATE POLICY "Customers can view their own requests"
  ON property_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Managers can view all requests
CREATE POLICY "Managers can view all requests"
  ON property_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );

-- Create function to get property requests with details
CREATE OR REPLACE FUNCTION get_property_requests_with_details()
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  status text,
  created_at timestamptz,
  customer_email text,
  property_info jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if the current user is a manager
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only managers can view property requests.';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    pr.customer_id,
    pr.status,
    pr.created_at,
    u.email::text as customer_email,
    jsonb_build_object(
      'acres', pi.acres,
      'is_sloped', pi.is_sloped,
      'yard_type', pi.yard_type,
      'notes', pi.notes
    ) as property_info
  FROM property_requests pr
  JOIN auth.users u ON u.id = pr.customer_id
  LEFT JOIN property_info pi ON pi.customer_id = pr.customer_id
  WHERE pr.status = 'pending'
  ORDER BY pr.created_at DESC;
END;
$$;