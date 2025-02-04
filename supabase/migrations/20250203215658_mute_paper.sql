/*
  # Fix ambiguous id reference in property requests function

  1. Changes
    - Update get_property_requests_with_details function to use explicit table references
*/

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