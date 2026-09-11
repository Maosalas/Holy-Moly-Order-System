REVOKE EXECUTE ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_recalc_product_costs(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_resolve_product_components(uuid, uuid, uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_recalc_product_costs(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_resolve_product_components(uuid, uuid, uuid, boolean) TO authenticated, service_role;
