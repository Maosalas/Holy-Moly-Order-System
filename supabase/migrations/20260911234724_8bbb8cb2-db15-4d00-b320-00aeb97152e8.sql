CREATE OR REPLACE FUNCTION public.fn_margin_at_price(p_cost numeric, p_price numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN COALESCE(p_price, 0) = 0 THEN 0
              ELSE (p_price - COALESCE(p_cost, 0)) / p_price * 100 END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calc_product_cost(
  p_product_id uuid,
  p_size_id uuid,
  p_variant_id uuid,
  p_include_optional boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

    IF c.component_type = 'preparation' THEN
      IF NOT EXISTS (SELECT 1 FROM public.preparation_costs WHERE preparation_id = c.preparation_id) THEN
        RAISE EXCEPTION 'La elaboración usada no tiene costos calculados todavía';
      END IF;
      SELECT p.name INTO v_name FROM public.preparations p WHERE p.id = c.preparation_id;
      SELECT c.base_qty * pc.material_per_g,
             c.base_qty * pc.labor_per_g,
             c.base_qty * pc.energy_per_g,
             pc.cost_per_g
        INTO v_line_material, v_line_labor, v_line_energy, v_unit_cost
      FROM public.preparation_costs pc WHERE pc.preparation_id = c.preparation_id;

    ELSIF c.component_type = 'ingredient' THEN
      SELECT i.name INTO v_name FROM public.ingredients i WHERE i.id = c.ingredient_id;
      v_unit_cost := public.fn_ingredient_effective_cost(c.ingredient_id, NULL);
      v_line_material := c.base_qty * v_unit_cost;

    ELSE
      SELECT sp.name, COALESCE(sp.current_cost, 0) INTO v_name, v_unit_cost
      FROM public.supplies sp WHERE sp.id = c.supply_id;
      IF v_name IS NULL THEN
        RAISE EXCEPTION 'Suministro no encontrado';
      END IF;
      v_line_pack := c.base_qty * v_unit_cost;
    END IF;

    v_material := v_material + v_line_material;
    v_labor := v_labor + v_line_labor;
    v_energy := v_energy + v_line_energy;
    v_packaging := v_packaging + v_line_pack;

    v_breakdown := v_breakdown || jsonb_build_object(
      'type', c.component_type,
      'role', c.role,
      'name', v_name,
      'qty', c.qty,
      'unit', c.unit_code,
      'base_qty', c.base_qty,
      'unit_cost', v_unit_cost,
      'material', v_line_material,
      'labor', v_line_labor,
      'energy', v_line_energy,
      'packaging', v_line_pack,
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
    'breakdown', v_breakdown,
    'calculated_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_product_costs(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  j jsonb;
BEGIN
  DELETE FROM public.product_costs WHERE product_id = p_product_id;

  FOR r IN
    SELECT sz.id AS size_id, va.id AS variant_id
    FROM (SELECT NULL::uuid AS id UNION ALL SELECT id FROM public.product_sizes WHERE product_id = p_product_id AND active) sz
    CROSS JOIN (SELECT NULL::uuid AS id UNION ALL SELECT id FROM public.product_variants WHERE product_id = p_product_id AND active) va
  LOOP
    j := public.fn_calc_product_cost(p_product_id, r.size_id, r.variant_id, false);

    INSERT INTO public.product_costs (
      product_id, size_id, variant_id, material_cost, labor_cost, energy_cost,
      packaging_cost, direct_cost, overhead_cost, loss_cost, total_cost,
      suggested_price, cost_per_portion, labor_minutes, breakdown, calculated_at
    ) VALUES (
      p_product_id, r.size_id, r.variant_id,
      (j->>'material_cost')::numeric, (j->>'labor_cost')::numeric, (j->>'energy_cost')::numeric,
      (j->>'packaging_cost')::numeric, (j->>'direct_cost')::numeric, (j->>'overhead_cost')::numeric,
      (j->>'loss_cost')::numeric, (j->>'total_cost')::numeric, (j->>'suggested_price')::numeric,
      NULLIF(j->>'cost_per_portion', '')::numeric, (j->>'labor_minutes')::numeric,
      j->'breakdown', now()
    );
  END LOOP;
END;
$$;

-- La cascada de elaboraciones ahora recalcula los productos afectados
CREATE OR REPLACE FUNCTION public.fn_recalc_preparation_cascade(p_prep_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_ids uuid[];
BEGIN
  PERFORM public.fn_recalc_preparation_cost(p_prep_id);
  v_ids := ARRAY[p_prep_id];

  FOR r IN
    WITH RECURSIVE ancestors AS (
      SELECT c.preparation_id AS id, 1 AS lvl
      FROM public.preparation_components c
      WHERE c.component_type = 'preparation' AND c.child_prep_id = p_prep_id
      UNION
      SELECT c.preparation_id, a.lvl + 1
      FROM public.preparation_components c
      JOIN ancestors a ON c.child_prep_id = a.id
      WHERE c.component_type = 'preparation'
    )
    SELECT id, MAX(lvl) AS lvl FROM ancestors GROUP BY id ORDER BY MAX(lvl)
  LOOP
    PERFORM public.fn_recalc_preparation_cost(r.id);
    v_ids := v_ids || r.id;
  END LOOP;

  FOR r IN
    SELECT DISTINCT pc.product_id
    FROM public.product_components pc
    WHERE pc.component_type = 'preparation' AND pc.preparation_id = ANY (v_ids)
  LOOP
    PERFORM public.fn_recalc_product_costs(r.product_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_all(p_org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  r RECORD;
BEGIN
  FOR i IN 1..3 LOOP
    FOR r IN
      SELECT id FROM public.preparations WHERE organization_id = p_org
    LOOP
      PERFORM public.fn_recalc_preparation_cost(r.id);
    END LOOP;
  END LOOP;

  FOR r IN SELECT id FROM public.products WHERE organization_id = p_org LOOP
    PERFORM public.fn_recalc_product_costs(r.id);
  END LOOP;
END;
$$;
