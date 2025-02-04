/*
  # Add yard type to property info

  1. Changes
    - Add yard_type column to property_info table with validation
    - Set default value to 'both'
    - Add check constraint to ensure valid values

  2. Notes
    - Valid yard types are: 'front', 'back', 'both'
    - Default value is 'both'
*/

-- Add yard_type column with validation
ALTER TABLE property_info 
ADD COLUMN yard_type text NOT NULL DEFAULT 'both' 
CHECK (yard_type IN ('front', 'back', 'both'));