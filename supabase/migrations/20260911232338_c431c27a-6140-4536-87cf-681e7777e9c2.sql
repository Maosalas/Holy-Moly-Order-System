CREATE OR REPLACE FUNCTION public.fn_recalc_preparation_cost(p_prep_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prep public.preparations;
  v_cs public.costing_settings;
  r RECORD;
  v_material numeric := 0;
  v_labor numeric := 0;
  v_energy numeric := 0;
  v_batch numeric;
  v_child public.preparation_costs;
  v_unit_cost numeric;
  v_line_total numeric;
  v_depth integer := 0;
  v_breakdown jsonb := '[]'::jsonb;
  v_name text;
BEGIN
  SELECT * INTO v_prep FROM public.preparations WHERE id = p_prep_id;
  IF v_prep.id IS NULL THEN
    RAISE EXCEPTION 'Elaboración no encontrada';
  END IF;

  SELECT * INTO v_cs FROM public.costing_settings WHERE organization_id = v_prep.organization_id;

  FOR r IN
    SELECT * FROM public.preparation_components
    WHERE preparation_id = p_prep_id
    ORDER BY sort_order, created_at
  LOOP
    IF r.component_type = 'ingredient' THEN
      v_unit_cost := public.fn_ingredient_effective_cost(r.ingredient_id, r.waste_pct_override);
      v_line_total := r.base_qty * v_unit_cost;
      v_material := v_material + v_line_total;

      SELECT name INTO v_name FROM public.ingredients WHERE id = r.ingredient_id;
    ELSE
      SELECT * INTO v_child FROM public.preparation_costs WHERE preparation_id = r.child_prep_id;
      IF v_child.preparation_id IS NULL THEN
        PERFORM public.fn_recalc_preparation_cost(r.child_prep_id);
        SELECT * INTO v_child FROM public.preparation_costs WHERE preparation_id = r.child_prep_id;
      END IF;

      -- cada rubro sube por su propio canal
      v_material := v_material + r.base_qty * COALESCE(v_child.material_per_g, 0);
      v_labor    := v_labor    + r.base_qty * COALESCE(v_child.labor_per_g, 0);
      v_energy   := v_energy   + r.base_qty * COALESCE(v_child.energy_per_g, 0);

      v_unit_cost := COALESCE(v_child.cost_per_g, 0);
      v_line_total := r.base_qty * v_unit_cost;
      v_depth := GREATEST(v_depth, COALESCE(v_child.depth, 0) + 1);

      SELECT name INTO v_name FROM public.preparations WHERE id = r.child_prep_id;
    END IF;

    v_breakdown := v_breakdown || jsonb_build_object(
      'type', r.component_type,
      'name', v_name,
      'qty', r.qty,
      'unit', r.unit_code,
      'base_qty', r.base_qty,
      'unit_cost', v_unit_cost,
      'total', v_line_total
    );
  END LOOP;

  v_material := v_material * (1 + COALESCE(v_prep.waste_pct, 0) / 100);

  IF COALESCE(v_cs.include_labor, false) THEN
    v_labor := v_labor + ((COALESCE(v_prep.time_minutes, 0) + COALESCE(v_prep.setup_minutes, 0)) / 60.0) * COALESCE(v_cs.hourly_rate, 0);
  END IF;

  IF COALESCE(v_cs.include_energy, false) THEN
    v_energy := v_energy + (COALESCE(v_prep.oven_minutes, 0) / 60.0) * COALESCE(v_cs.oven_kw, 0) * COALESCE(v_cs.kwh_price, 0);
  END IF;

  v_batch := v_material + v_labor + v_energy;

  INSERT INTO public.preparation_costs (
    preparation_id, material_cost, labor_cost, energy_cost, batch_cost,
    cost_per_g, material_per_g, labor_per_g, energy_per_g, cost_per_portion,
    depth, breakdown, calculated_at
  ) VALUES (
    p_prep_id, v_material, v_labor, v_energy, v_batch,
    v_batch / v_prep.yield_g, v_material / v_prep.yield_g,
    v_labor / v_prep.yield_g, v_energy / v_prep.yield_g,
    CASE WHEN COALESCE(v_prep.yield_portions, 0) > 0 THEN v_batch / v_prep.yield_portions ELSE NULL END,
    v_depth, v_breakdown, now()
  )
  ON CONFLICT (preparation_id) DO UPDATE SET
    material_cost = EXCLUDED.material_cost,
    labor_cost = EXCLUDED.labor_cost,
    energy_cost = EXCLUDED.energy_cost,
    batch_cost = EXCLUDED.batch_cost,
    cost_per_g = EXCLUDED.cost_per_g,
    material_per_g = EXCLUDED.material_per_g,
    labor_per_g = EXCLUDED.labor_per_g,
    energy_per_g = EXCLUDED.energy_per_g,
    cost_per_portion = EXCLUDED.cost_per_portion,
    depth = EXCLUDED.depth,
    breakdown = EXCLUDED.breakdown,
    calculated_at = EXCLUDED.calculated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_preparation_cascade(p_prep_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  PERFORM public.fn_recalc_preparation_cost(p_prep_id);

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
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_recalc_preparations_using_ingredient(p_ingredient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT preparation_id
    FROM public.preparation_components
    WHERE component_type = 'ingredient' AND ingredient_id = p_ingredient_id
  LOOP
    PERFORM public.fn_recalc_preparation_cascade(r.preparation_id);
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
  -- Los productos se recalculan aquí cuando exista su modelo (Fase siguiente).
END;
$$;

-- Triggers de recálculo
CREATE OR REPLACE FUNCTION public.trg_preparation_components_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_recalc_preparation_cascade(OLD.preparation_id);
    RETURN OLD;
  END IF;
  PERFORM public.fn_recalc_preparation_cascade(NEW.preparation_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER preparation_components_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.preparation_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_preparation_components_recalc();

CREATE OR REPLACE FUNCTION public.trg_preparations_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_recalc_preparation_cascade(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER preparations_recalc
  AFTER UPDATE OF yield_g, waste_pct, time_minutes, setup_minutes, oven_minutes
  ON public.preparations
  FOR EACH ROW EXECUTE FUNCTION public.trg_preparations_recalc();

CREATE OR REPLACE FUNCTION public.trg_costing_settings_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_recalc_all(NEW.organization_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER costing_settings_recalc
  AFTER UPDATE ON public.costing_settings
  FOR EACH ROW EXECUTE FUNCTION public.trg_costing_settings_recalc();

-- fn_process_purchase: recalcular elaboraciones tras actualizar current_cost
CREATE OR REPLACE FUNCTION public.fn_process_purchase(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv public.purchase_invoices;
  v_lines_total numeric;
  r RECORD;
  v_ing public.ingredients;
  v_base_qty numeric;
  v_freight_share numeric;
  v_cost_per_base numeric;
  v_prev numeric;
  v_wavg numeric;
  v_last numeric;
BEGIN
  SELECT * INTO v_inv FROM public.purchase_invoices WHERE id = p_invoice_id;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Factura de compra no encontrada';
  END IF;

  IF NOT public.is_organization_member(v_inv.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(SUM(cost), 0) INTO v_lines_total
  FROM public.inventory_purchases WHERE purchase_invoice_id = p_invoice_id;

  IF v_lines_total <= 0 THEN
    RAISE EXCEPTION 'La factura no tiene líneas con importe';
  END IF;

  FOR r IN
    SELECT * FROM public.inventory_purchases WHERE purchase_invoice_id = p_invoice_id ORDER BY created_at
  LOOP
    v_freight_share := COALESCE(v_inv.freight, 0) * (r.cost / v_lines_total);

    IF r.ingredient_id IS NOT NULL THEN
      SELECT * INTO v_ing FROM public.ingredients WHERE id = r.ingredient_id;
      IF v_ing.id IS NULL THEN
        RAISE EXCEPTION 'Ingrediente de la línea % no encontrado', r.item_name;
      END IF;

      v_base_qty := public.fn_to_base_qty(
        v_ing.base_unit, v_ing.density_g_ml, v_ing.unit_weight_g, r.quantity, r.unit
      );
    ELSE
      v_base_qty := r.quantity;
    END IF;

    IF v_base_qty IS NULL OR v_base_qty = 0 THEN
      RAISE EXCEPTION 'La cantidad en unidad base de % no puede ser cero', r.item_name;
    END IF;

    v_cost_per_base := (r.cost + v_freight_share) / v_base_qty;

    UPDATE public.inventory_purchases
    SET base_qty = v_base_qty, cost_per_base = v_cost_per_base
    WHERE id = r.id;

    IF r.ingredient_id IS NOT NULL THEN
      INSERT INTO public.ingredient_price_history (organization_id, ingredient_id, cost_per_base, source, recorded_at)
      VALUES (v_inv.organization_id, r.ingredient_id, v_cost_per_base, 'purchase', COALESCE(v_inv.purchase_date, CURRENT_DATE)::timestamptz);

      SELECT SUM(cost_per_base * base_qty) / NULLIF(SUM(base_qty), 0)
        INTO v_wavg
      FROM public.inventory_purchases
      WHERE ingredient_id = r.ingredient_id
        AND base_qty > 0
        AND cost_per_base > 0
        AND purchase_date >= (CURRENT_DATE - INTERVAL '6 months');

      SELECT cost_per_base INTO v_last
      FROM public.inventory_purchases
      WHERE ingredient_id = r.ingredient_id AND cost_per_base > 0
      ORDER BY purchase_date DESC, created_at DESC
      LIMIT 1;

      UPDATE public.ingredients
      SET current_cost = COALESCE(v_wavg, v_cost_per_base),
          last_cost = COALESCE(v_last, v_cost_per_base)
      WHERE id = r.ingredient_id;

      PERFORM public.fn_recalc_preparations_using_ingredient(r.ingredient_id);
    END IF;

    IF r.inventory_item_id IS NOT NULL THEN
      SELECT current_stock INTO v_prev FROM public.inventory_items WHERE id = r.inventory_item_id;

      INSERT INTO public.inventory_movements (
        organization_id, inventory_item_id, item_name, movement_type, quantity, unit,
        previous_stock, new_stock, reference_type, reference_id, notes
      ) VALUES (
        v_inv.organization_id, r.inventory_item_id, r.item_name, 'in', v_base_qty,
        (SELECT unit FROM public.inventory_items WHERE id = r.inventory_item_id),
        COALESCE(v_prev, 0), COALESCE(v_prev, 0) + v_base_qty,
        'purchase_invoice', p_invoice_id, 'Ingreso por factura de compra'
      );

      UPDATE public.inventory_items
      SET current_stock = COALESCE(v_prev, 0) + v_base_qty,
          last_restock_date = now()
      WHERE id = r.inventory_item_id;
    END IF;
  END LOOP;

  UPDATE public.purchase_invoices
  SET total = v_lines_total + COALESCE(v_inv.freight, 0)
  WHERE id = p_invoice_id;
END;
$function$;