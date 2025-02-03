/*
  # Add missing invoice policies

  This migration safely adds invoice policies if they don't already exist.
  
  1. Changes
    - Adds policies for invoice management if they don't exist:
      - Manager creation policy
      - View policy for managers and customers
*/

DO $$ BEGIN
  -- Check if the "Managers can create invoices" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' 
    AND policyname = 'Managers can create invoices'
  ) THEN
    CREATE POLICY "Managers can create invoices"
      ON invoices FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'manager'
        )
      );
  END IF;

  -- Check if the "Managers can view all invoices" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' 
    AND policyname = 'Managers can view all invoices'
  ) THEN
    CREATE POLICY "Managers can view all invoices"
      ON invoices FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'manager'
        )
        OR customer_id = auth.uid()
      );
  END IF;
END $$;