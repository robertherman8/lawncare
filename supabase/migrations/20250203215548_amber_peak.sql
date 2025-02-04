/*
  # Add customer insert policy for property requests

  1. Changes
    - Add policy allowing customers to create their own property requests
    - Add policy allowing managers to update request status
*/

-- Allow customers to create their own property requests
CREATE POLICY "Customers can create their own requests"
  ON property_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Allow managers to update request status
CREATE POLICY "Managers can update request status"
  ON property_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'manager'
    )
  );