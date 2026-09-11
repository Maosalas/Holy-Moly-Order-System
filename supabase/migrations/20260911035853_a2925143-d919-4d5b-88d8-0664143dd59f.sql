-- Grants (Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.user_global_roles TO authenticated;
GRANT ALL ON public.organizations, public.organization_memberships, public.profiles,
  public.subscriptions, public.subscription_plans, public.audit_logs, public.user_global_roles TO service_role;

-- Reliable organization creation (creates org + owner membership)
CREATE OR REPLACE FUNCTION public.create_organization(_name text, _slug text DEFAULT NULL)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org public.organizations;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (_name, COALESCE(NULLIF(_slug, ''), NULL))
  RETURNING * INTO _org;

  INSERT INTO public.organization_memberships (user_id, organization_id, role)
  VALUES (_uid, _org.id, 'owner')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN _org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;