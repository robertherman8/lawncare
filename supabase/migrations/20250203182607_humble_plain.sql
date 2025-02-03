/*
  # Add function to get customers with emails

  1. New Functions
    - `get_customers_with_email`: Returns customer profiles with their emails
      - Returns: id, email, role, created_at, updated_at
      - Only accessible by managers
      - Filters for customer role only

  2. Security
    - Function is SECURITY DEFINER to access auth.users
    - Only managers can execute the function
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
    (auth.users.email)::text as email,
    p.role,
    p.created_at,
    p.updated_at
  FROM profiles p
  JOIN auth.users ON auth.users.id = p.id
  WHERE p.role = 'customer'
  ORDER BY p.created_at DESC;
END;
$$;