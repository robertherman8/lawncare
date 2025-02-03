/*
  # Fix profile roles synchronization

  1. Changes
    - Update existing profiles to match user metadata roles
    - Add additional logging for role synchronization
*/

-- Update existing profiles to match user metadata roles
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT 
            au.id,
            au.raw_user_meta_data->>'role' as meta_role,
            p.role as current_role
        FROM auth.users au
        LEFT JOIN profiles p ON p.id = au.id
        WHERE au.raw_user_meta_data->>'role' IS NOT NULL
    LOOP
        -- Only update if the roles don't match
        IF user_record.meta_role != user_record.current_role THEN
            UPDATE profiles
            SET role = user_record.meta_role,
                updated_at = now()
            WHERE id = user_record.id;
        END IF;
    END LOOP;
END $$;