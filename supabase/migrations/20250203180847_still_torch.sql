/*
  # Fix profile role synchronization

  1. Changes
    - Update handle_new_user() function to use role from user metadata
    - Add trigger to sync role changes from auth.users to profiles
    - Add function to update profile role when user metadata changes

  2. Security
    - Maintains existing RLS policies
    - Functions run with security definer to ensure proper access
*/

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function that reads role from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role text;
BEGIN
    -- Extract role from metadata, default to 'customer' if not found
    user_role := COALESCE(
        (new.raw_user_meta_data->>'role')::text,
        'customer'
    );

    -- Validate role is either customer or manager
    IF user_role NOT IN ('customer', 'manager') THEN
        user_role := 'customer';
    END IF;

    -- Insert or update profile with correct role
    INSERT INTO public.profiles (id, role)
    VALUES (new.id, user_role)
    ON CONFLICT (id) DO UPDATE
    SET role = user_role;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to handle metadata updates
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS trigger AS $$
DECLARE
    user_role text;
BEGIN
    -- Extract role from metadata, default to current role if not found
    user_role := COALESCE(
        (new.raw_user_meta_data->>'role')::text,
        (SELECT role FROM public.profiles WHERE id = new.id),
        'customer'
    );

    -- Validate role
    IF user_role NOT IN ('customer', 'manager') THEN
        user_role := 'customer';
    END IF;

    -- Update profile role
    UPDATE public.profiles
    SET role = user_role,
        updated_at = now()
    WHERE id = new.id;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for metadata updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (old.raw_user_meta_data->>'role' IS DISTINCT FROM new.raw_user_meta_data->>'role')
    EXECUTE FUNCTION sync_user_role();