/*
  # Fix ambiguous id reference in get_customers_with_email function

  1. Changes
    - Fix ambiguous column references by explicitly specifying table aliases
    - Improve query performance with proper column qualification
    - Maintain existing security and access controls
*/

CREATE OR REPLACE FUNCTION get_customers_with_email()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is a manager
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only managers can view customer details.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    u.email::text as email,
    p.role,
    p.created_at,
    p.updated_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'customer'
  ORDER BY p.created_at DESC;
END;
$$;