/*
  # Final fix for get_customers_with_email function

  1. Changes
    - Explicitly qualify all column references with table aliases
    - Add proper schema qualification for auth.users
    - Ensure consistent table aliases throughout the query
    - Maintain security and access controls
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
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if the current user is a manager
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = current_user_id
    AND p.role = 'manager'
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
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'customer'
  ORDER BY p.created_at DESC;
END;
$$;