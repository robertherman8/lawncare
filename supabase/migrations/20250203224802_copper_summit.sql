/*
  # Fix invoice status update policy and trigger

  1. Changes
    - Create trigger function to validate status updates
    - Implement policy using current row context
    - Ensure data integrity during updates
  
  2. Security
    - Maintain RLS for customer invoice updates
    - Prevent modification of sensitive fields
*/

-- Create trigger function to validate status updates
CREATE OR REPLACE FUNCTION check_invoice_update()
RETURNS trigger AS $$
BEGIN
  -- Ensure no sensitive fields are modified
  IF NEW.customer_id != OLD.customer_id OR
     NEW.manager_id != OLD.manager_id OR
     NEW.amount != OLD.amount OR
     NEW.description IS DISTINCT FROM OLD.description THEN
    RAISE EXCEPTION 'Cannot modify invoice details';
  END IF;

  -- Validate status transitions
  IF NOT (
    (OLD.status = 'sent' AND NEW.status = 'opened') OR
    ((OLD.status = 'sent' OR OLD.status = 'opened') AND NEW.status = 'paid')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice updates
DROP TRIGGER IF EXISTS check_invoice_update_trigger ON invoices;
CREATE TRIGGER check_invoice_update_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_update();

-- Drop existing customer update policy if it exists
DROP POLICY IF EXISTS "Customers can update invoice status" ON invoices;

-- Create new policy for customers to update invoice status
CREATE POLICY "Customers can update invoice status"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
  )
  WITH CHECK (
    customer_id = auth.uid()
  );