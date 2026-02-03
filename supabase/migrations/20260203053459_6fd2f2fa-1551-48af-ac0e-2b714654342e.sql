-- Fix security warnings

-- 1. Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. Fix overly permissive INSERT policy for organizations
-- Drop and recreate with proper check
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a function to validate organization creation (user must become owner)
CREATE OR REPLACE FUNCTION public.validate_organization_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Automatically add creator as owner
    INSERT INTO public.organization_memberships (user_id, organization_id, role)
    VALUES (auth.uid(), NEW.id, 'owner');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.validate_organization_creation();

-- Recreate the policy with a proper check - user must be authenticated
CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);