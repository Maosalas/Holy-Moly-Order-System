DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.oid::regclass AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','v','m','f') LOOP
    EXECUTE format('REVOKE ALL ON %s FROM anon', r.t);
  END LOOP;
END $$;

REVOKE ALL ON public.audit_logs FROM authenticated;

-- SECURITY DEFINER functions: lock down, then re-grant only what the app calls
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- Public (token-based) endpoints
GRANT EXECUTE ON FUNCTION public.get_quotation_by_public_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_quotation_by_public_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_portal_token(uuid) TO anon, authenticated;

-- Signed-in app functions
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_quote_drift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_quote_line_recalc(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_recalc_quotation_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_send_quotation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_volume_discount_check(uuid, uuid, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_recalc_all(uuid) TO authenticated;

-- Helpers used inside RLS policies
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_plan_limit(uuid, text, bigint) TO authenticated;