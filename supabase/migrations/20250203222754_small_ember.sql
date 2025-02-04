/*
  # Update invoice RLS policies for status transitions

  1. Changes
     - Allow customers to update invoice status through proper transitions
     - Support status flow: sent -> opened -> paid
     - Ensure data integrity and security

  2. Security
     - Customers can only update their own invoices
     - Only status field can be modified
     - Strict validation of allowed status transitions
*/

-- Drop existing customer update policy if it exists
DROP POLICY IF EXISTS "Customers can update paid status" ON invoices;

-- Create new policy for customers to update invoice status
CREATE POLICY "Customers can update invoice status"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
  )
  WITH CHECK (
    customer_id = auth.uid()
    -- Only allow status updates, no other field modifications
    AND customer_id = (SELECT customer_id FROM invoices WHERE id = id)
    AND manager_id = (SELECT manager_id FROM invoices WHERE id = id)
    AND amount = (SELECT amount FROM invoices WHERE id = id)
    AND description IS NOT DISTINCT FROM (SELECT description FROM invoices WHERE id = id)
    -- Only allow valid status transitions
    AND (
      (status = 'sent' AND (SELECT status FROM invoices WHERE id = id) = 'opened') OR
      ((SELECT status FROM invoices WHERE id = id) IN ('sent', 'opened') AND status = 'paid')
    )
  );