/*
  # Add description field to invoices

  1. Changes
    - Add description column to invoices table
*/

DO $$ BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices'
    AND column_name = 'description'
  ) THEN
    ALTER TABLE invoices ADD COLUMN description text;
  END IF;
END $$;