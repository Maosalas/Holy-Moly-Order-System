CREATE OR REPLACE FUNCTION public.fn_apply_presentation_pricing(p_ingredient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ing public.ingredients;
  v_pres public.ingredient_presentations;
  v_base_qty numeric;
  v_cost_per_base numeric;
  v_has_purchase boolean;
BEGIN
  SELECT * INTO v_ing FROM public.ingredients WHERE id = p_ingredient_id;
  IF v_ing.id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.inventory_purchases
    WHERE ingredient_id = p_ingredient_id AND cost_per_base > 0
  ) INTO v_has_purchase;

  IF v_has_purchase THEN
    RETURN;
  END IF;

  SELECT * INTO v_pres
  FROM public.ingredient_presentations
  WHERE ingredient_id = p_ingredient_id
    AND active
    AND price > 0
    AND qty > 0
  ORDER BY is_default DESC, created_at DESC
  LIMIT 1;

  IF v_pres.id IS NULL THEN
    UPDATE public.ingredients
    SET current_cost = 0, last_cost = 0
    WHERE id = p_ingredient_id;
    PERFORM public.fn_recalc_preparations_using_ingredient(p_ingredient_id);
    RETURN;
  END IF;

  v_base_qty := public.fn_to_base_qty(
    v_ing.base_unit, v_ing.density_g_ml, v_ing.unit_weight_g, v_pres.qty, v_pres.unit_code
  );

  IF v_base_qty IS NULL OR v_base_qty = 0 THEN
    RAISE EXCEPTION 'No se puede convertir la presentación de "%" a su unidad base (%). Indica la densidad o el peso por unidad.',
      v_ing.name, v_ing.base_unit;
  END IF;

  v_cost_per_base := v_pres.price / v_base_qty;

  INSERT INTO public.ingredient_price_history (organization_id, ingredient_id, cost_per_base, source, recorded_at)
  VALUES (v_ing.organization_id, p_ingredient_id, v_cost_per_base, 'presentation', now());

  UPDATE public.ingredients
  SET current_cost = v_cost_per_base,
      last_cost = v_cost_per_base
  WHERE id = p_ingredient_id;

  PERFORM public.fn_recalc_preparations_using_ingredient(p_ingredient_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_apply_presentation_pricing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_apply_presentation_pricing(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_presentation_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_apply_presentation_pricing(OLD.ingredient_id);
    RETURN OLD;
  END IF;

  PERFORM public.fn_apply_presentation_pricing(NEW.ingredient_id);
  IF TG_OP = 'UPDATE' AND OLD.ingredient_id IS DISTINCT FROM NEW.ingredient_id THEN
    PERFORM public.fn_apply_presentation_pricing(OLD.ingredient_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ingredient_presentations_pricing ON public.ingredient_presentations;
CREATE TRIGGER trg_ingredient_presentations_pricing
AFTER INSERT OR UPDATE OR DELETE ON public.ingredient_presentations
FOR EACH ROW EXECUTE FUNCTION public.trg_presentation_pricing();