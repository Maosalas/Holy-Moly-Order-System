CREATE OR REPLACE FUNCTION public.fn_quote_line_recalc(p_item_id uuid, p_keep_price boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it public.quotation_items;
  q public.quotations;
  s public.costing_settings;
  t public.decoration_tiers;
  v jsonb;
  v_cost numeric := 0;
  v_price numeric := 0;
  v_labor numeric := 0;
  v_comp jsonb := '{}'::jsonb;
  v_disc jsonb;
  v_warning text := NULL;
BEGIN
  SELECT * INTO it FROM public.quotation_items WHERE id = p_item_id;
  IF it.id IS NULL THEN RAISE EXCEPTION 'Línea no encontrada'; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = it.quotation_id;
  IF NOT (q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO s FROM public.costing_settings WHERE organization_id = q.organization_id;

  IF it.item_type = 'product' AND it.product_id IS NOT NULL THEN
    v := public.fn_calc_product_cost(
      it.product_id, it.size_id, it.variant_id,
      COALESCE(array_length(it.optional_ids, 1), 0) > 0
    );
    v_cost := COALESCE((v->>'total_cost')::numeric, 0);
    v_price := COALESCE((v->>'suggested_price')::numeric, 0);
    v_labor := COALESCE((v->>'labor_minutes')::numeric, 0);
    v_comp := v;
  ELSIF it.item_type = 'preparation' AND it.preparation_id IS NOT NULL THEN
    SELECT c.batch_cost,
           public.fn_round_price(
             c.batch_cost / GREATEST(1 - COALESCE(s.default_margin_pct, 60) / 100, 0.01),
             COALESCE(s.price_rounding, 100)),
           to_jsonb(c)
      INTO v_cost, v_price, v_comp
    FROM public.preparation_costs c WHERE c.preparation_id = it.preparation_id;
    v_cost := COALESCE(v_cost, 0);
    v_price := COALESCE(v_price, 0);
  ELSE
    v_cost := COALESCE(it.unit_cost, 0);
    v_price := COALESCE(it.unit_price, 0);
    v_comp := jsonb_build_object('manual', true, 'description', it.description);
  END IF;

  IF it.decoration_tier_id IS NOT NULL THEN
    SELECT * INTO t FROM public.decoration_tiers WHERE id = it.decoration_tier_id;
    IF t.id IS NOT NULL THEN
      IF COALESCE(s.include_labor, true) THEN
        v_cost := v_cost + t.extra_minutes / 60.0 * COALESCE(s.hourly_rate, 0);
      END IF;
      v_labor := v_labor + t.extra_minutes;
      v_price := v_price + t.extra_amount;
      v_comp := v_comp || jsonb_build_object('decoration_tier',
        jsonb_build_object('name', t.name, 'extra_minutes', t.extra_minutes, 'extra_amount', t.extra_amount));
    END IF;
  END IF;

  IF it.item_type = 'product' THEN
    v_disc := public.fn_volume_discount_check(q.organization_id, it.product_id, it.qty, v_cost, v_price);
    IF (v_disc->>'applies')::boolean THEN
      IF (v_disc->>'allowed')::boolean THEN
        v_price := (v_disc->>'unit_price')::numeric;
        v_comp := v_comp || jsonb_build_object('volume_discount', v_disc);
      ELSE
        v_warning := v_disc->>'message';
      END IF;
    END IF;
  END IF;

  v_comp := v_comp || jsonb_build_object('labor_minutes', v_labor, 'calculated_at', now());

  UPDATE public.quotation_items SET
    unit_cost = v_cost,
    unit_price = CASE WHEN p_keep_price THEN unit_price ELSE v_price END,
    line_cost = v_cost * qty,
    line_total = (CASE WHEN p_keep_price THEN unit_price ELSE v_price END) * qty,
    margin_pct = public.fn_margin_at_price(v_cost, NULLIF(CASE WHEN p_keep_price THEN unit_price ELSE v_price END, 0)),
    composition = v_comp,
    updated_at = now()
  WHERE id = p_item_id;

  PERFORM public.fn_recalc_quotation_totals(it.quotation_id);

  SELECT * INTO it FROM public.quotation_items WHERE id = p_item_id;

  RETURN jsonb_build_object(
    'unit_cost', it.unit_cost,
    'unit_price', it.unit_price,
    'line_cost', it.line_cost,
    'line_total', it.line_total,
    'margin_pct', it.margin_pct,
    'suggested_price', v_price,
    'warning', v_warning
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_quote_line_recalc(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_quote_line_recalc(uuid, boolean) TO authenticated, service_role;

-- los minutos de trabajo de la cotización salen de las líneas
CREATE OR REPLACE FUNCTION public.fn_recalc_quotation_totals(p_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotations;
  s public.costing_settings;
  v_items numeric := 0;
  v_items_cost numeric := 0;
  v_extras numeric := 0;
  v_extras_cost numeric := 0;
  v_labor numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_cost numeric := 0;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE id = p_quotation_id;
  IF q.id IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.costing_settings WHERE organization_id = q.organization_id;

  SELECT COALESCE(SUM(line_total),0), COALESCE(SUM(line_cost),0),
         COALESCE(SUM(COALESCE((composition->>'labor_minutes')::numeric,0) * qty),0)
    INTO v_items, v_items_cost, v_labor
  FROM public.quotation_items WHERE quotation_id = p_quotation_id;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(CASE WHEN is_cost THEN total ELSE 0 END),0)
    INTO v_extras, v_extras_cost FROM public.quotation_extras WHERE quotation_id = p_quotation_id;

  v_total := v_items + q.packaging_total + v_extras + q.rush_surcharge - q.discount_amount;
  IF COALESCE(s.tax_enabled, false) THEN
    v_tax := v_total * COALESCE(s.tax_percent, 0) / 100;
  END IF;
  v_total := v_total + v_tax;
  v_cost := v_items_cost + q.packaging_total + v_extras_cost;

  UPDATE public.quotations SET
    items_subtotal = v_items,
    extras_total = v_extras,
    labor_minutes = v_labor,
    tax_amount = v_tax,
    total = v_total,
    cost_total = v_cost,
    cost_now = CASE WHEN q.status = 'borrador' THEN v_cost ELSE q.cost_now END,
    margin_pct = public.fn_margin_at_price(v_cost, NULLIF(v_total, 0)),
    deposit_amount = v_total * COALESCE(q.deposit_pct, 0) / 100,
    updated_at = now()
  WHERE id = p_quotation_id;
END;
$$;