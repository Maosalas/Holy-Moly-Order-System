ALTER TABLE public.product_components
  ADD COLUMN IF NOT EXISTS is_swappable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS swap_label text;

ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS substitutions jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.fn_calc_product_cost(uuid, uuid, uuid, boolean);

CREATE OR REPLACE FUNCTION public.fn_calc_product_cost(
  p_product_id uuid,
  p_size_id uuid,
  p_variant_id uuid,
  p_include_optional boolean DEFAULT false,
  p_substitutions jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  s public.costing_settings;
  v_assembly numeric := 0;
  v_oven numeric := 0;
  v_portions numeric;
  v_material numeric := 0;
  v_labor numeric := 0;
  v_energy numeric := 0;
  v_packaging numeric := 0;
  v_direct numeric := 0;
  v_loss numeric := 0;
  v_overhead numeric := 0;
  v_total numeric := 0;
  v_price numeric := 0;
  v_breakdown jsonb := '[]'::jsonb;
  c RECORD;
  v_unit_cost numeric;
  v_line_material numeric;
  v_line_labor numeric;
  v_line_energy numeric;
  v_line_pack numeric;
  v_name text;
  v_sub jsonb;
  v_type text;
  v_prep uuid;
  v_ing uuid;
  v_sup uuid;
  v_qty numeric;
  v_unit text;
  v_base numeric;
  v_swapped boolean;
BEGIN
  SELECT organization_id INTO v_org FROM public.products WHERE id = p_product_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  SELECT * INTO s FROM public.costing_settings WHERE organization_id = v_org;
  IF s.organization_id IS NULL THEN
    RAISE EXCEPTION 'Falta la configuración de costeo de la organización';
  END IF;

  IF p_size_id IS NOT NULL THEN
    SELECT COALESCE(assembly_minutes, 0), COALESCE(oven_minutes, 0), portions
      INTO v_assembly, v_oven, v_portions
    FROM public.product_sizes WHERE id = p_size_id AND product_id = p_product_id;
    IF v_assembly IS NULL THEN
      RAISE EXCEPTION 'El tamaño indicado no pertenece a este producto';
    END IF;
  END IF;

  FOR c IN
    SELECT * FROM public.fn_resolve_product_components(p_product_id, p_size_id, p_variant_id, p_include_optional)
  LOOP
    v_line_material := 0; v_line_labor := 0; v_line_energy := 0; v_line_pack := 0;
    v_unit_cost := 0;
    v_type := c.component_type;
    v_prep := c.preparation_id;
    v_ing := c.ingredient_id;
    v_sup := c.supply_id;
    v_qty := c.qty;
    v_unit := c.unit_code;
    v_base := c.base_qty;
    v_swapped := false;

    SELECT e.value INTO v_sub
    FROM jsonb_array_elements(COALESCE(p_substitutions, '[]'::jsonb)) AS e(value)
    WHERE e.value->>'component_id' = c.id::text
    LIMIT 1;

    IF v_sub IS NOT NULL AND COALESCE(v_sub->>'new_id', '') <> '' THEN
      v_type := COALESCE(NULLIF(v_sub->>'new_type', ''), v_type);
      v_prep := NULL; v_ing := NULL; v_sup := NULL;
      IF v_type = 'preparation' THEN
        v_prep := (v_sub->>'new_id')::uuid;
      ELSIF v_type = 'ingredient' THEN
        v_ing := (v_sub->>'new_id')::uuid;
      ELSE
        v_sup := (v_sub->>'new_id')::uuid;
      END IF;
      IF NULLIF(v_sub->>'qty', '') IS NOT NULL THEN
        v_qty := (v_sub->>'qty')::numeric;
      END IF;
      v_swapped := true;

      IF v_type = 'preparation' THEN
        BEGIN
          v_base := public.fn_to_base_qty('g', NULL, NULL, v_qty, v_unit);
        EXCEPTION WHEN OTHERS THEN
          v_unit := 'g';
          v_base := v_qty;
        END;
      ELSIF v_type = 'ingredient' THEN
        SELECT public.fn_to_base_qty(i.base_unit, i.density_g_ml, i.unit_weight_g, v_qty, v_unit)
          INTO v_base
        FROM public.ingredients i WHERE i.id = v_ing;
      ELSE
        SELECT public.fn_to_base_qty(sp.base_unit, NULL, NULL, v_qty, v_unit)
          INTO v_base
        FROM public.supplies sp WHERE sp.id = v_sup;
      END IF;
    END IF;

    IF v_type = 'preparation' THEN
      IF NOT EXISTS (SELECT 1 FROM public.preparation_costs WHERE preparation_id = v_prep) THEN
        RAISE EXCEPTION 'La elaboración usada no tiene costos calculados todavía';
      END IF;
      SELECT p.name INTO v_name FROM public.preparations p WHERE p.id = v_prep;
      SELECT v_base * pc.material_per_g,
             v_base * pc.labor_per_g,
             v_base * pc.energy_per_g,
             pc.cost_per_g
        INTO v_line_material, v_line_labor, v_line_energy, v_unit_cost
      FROM public.preparation_costs pc WHERE pc.preparation_id = v_prep;

    ELSIF v_type = 'ingredient' THEN
      SELECT i.name INTO v_name FROM public.ingredients i WHERE i.id = v_ing;
      IF v_name IS NULL THEN
        RAISE EXCEPTION 'Ingrediente no encontrado';
      END IF;
      v_unit_cost := public.fn_ingredient_effective_cost(v_ing, NULL);
      v_line_material := v_base * v_unit_cost;

    ELSE
      SELECT sp.name, COALESCE(sp.current_cost, 0) INTO v_name, v_unit_cost
      FROM public.supplies sp WHERE sp.id = v_sup;
      IF v_name IS NULL THEN
        RAISE EXCEPTION 'Suministro no encontrado';
      END IF;
      v_line_pack := v_base * v_unit_cost;
    END IF;

    v_material := v_material + v_line_material;
    v_labor := v_labor + v_line_labor;
    v_energy := v_energy + v_line_energy;
    v_packaging := v_packaging + v_line_pack;

    v_breakdown := v_breakdown || jsonb_build_object(
      'component_id', c.id,
      'type', v_type,
      'role', c.role,
      'name', v_name,
      'qty', v_qty,
      'unit', v_unit,
      'base_qty', v_base,
      'unit_cost', v_unit_cost,
      'material', v_line_material,
      'labor', v_line_labor,
      'energy', v_line_energy,
      'packaging', v_line_pack,
      'substituted', v_swapped,
      'total', v_line_material + v_line_labor + v_line_energy + v_line_pack
    );
  END LOOP;

  IF s.include_labor THEN
    v_labor := v_labor + (v_assembly / 60.0) * s.hourly_rate;
  END IF;
  IF s.include_energy THEN
    v_energy := v_energy + (v_oven / 60.0) * s.oven_kw * s.kwh_price;
  END IF;

  v_direct := v_material + v_labor + v_energy;
  v_loss := v_direct * s.production_loss_pct / 100.0;
  v_overhead := v_direct * s.overhead_percent / 100.0;
  v_total := v_direct + v_loss + v_overhead + v_packaging;

  IF s.default_margin_pct >= 100 THEN
    RAISE EXCEPTION 'El margen configurado no puede ser 100%% o más';
  END IF;
  v_price := public.fn_round_price(v_total / (1 - s.default_margin_pct / 100.0), s.price_rounding);

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'size_id', p_size_id,
    'variant_id', p_variant_id,
    'material_cost', v_material,
    'labor_cost', v_labor,
    'energy_cost', v_energy,
    'packaging_cost', v_packaging,
    'direct_cost', v_direct,
    'loss_cost', v_loss,
    'overhead_cost', v_overhead,
    'total_cost', v_total,
    'suggested_price', v_price,
    'labor_minutes', v_assembly,
    'oven_minutes', v_oven,
    'portions', v_portions,
    'cost_per_portion', CASE WHEN COALESCE(v_portions, 0) > 0 THEN v_total / v_portions ELSE NULL END,
    'margin_pct', s.default_margin_pct,
    'substitutions', COALESCE(p_substitutions, '[]'::jsonb),
    'breakdown', v_breakdown,
    'calculated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_calc_product_cost(uuid, uuid, uuid, boolean, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_quote_line_recalc(p_item_id uuid, p_keep_price boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      COALESCE(array_length(it.optional_ids, 1), 0) > 0,
      COALESCE(it.substitutions, '[]'::jsonb)
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
$function$;