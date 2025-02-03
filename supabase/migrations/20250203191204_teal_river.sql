/*
  # Fix invoice policies and add status transition validation

  1. Changes
    - Add policy for managers to update their own invoices
    - Add policy for customers to update their own invoices
    - Add trigger to validate status transitions
  
  2. Security
    - Ensure proper RLS for invoice updates
    - Validate status transitions to prevent invalid states
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can update invoices" ON invoices;
DROP POLICY IF EXISTS "Customers can update invoices" ON invoices;

-- Create policy for managers to update their invoices
CREATE POLICY "Managers can update invoices"
  ON invoices FOR UPDATE
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

-- Create policy for customers to update paid status
CREATE POLICY "Customers can update paid status"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
    AND status = 'sent'
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'sent'
  );

-- Create function to validate invoice status transitions
CREATE OR REPLACE FUNCTION validate_invoice_status_transition()
RETURNS trigger AS $$
BEGIN
  -- Only allow specific status transitions
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    RETURN NEW;
  ELSIF OLD.status = 'sent' AND NEW.status = 'paid' THEN
    RETURN NEW;
  ELSIF OLD.status = NEW.status THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transition validation
DROP TRIGGER IF EXISTS validate_invoice_status_transition_trigger ON invoices;
CREATE TRIGGER validate_invoice_status_transition_trigger
  BEFORE UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_status_transition();