-- ============ suppliers ============
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_org ON public.suppliers(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage suppliers" ON public.suppliers FOR ALL TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ingredient_presentations ============
CREATE TABLE public.ingredient_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description text NOT NULL,
  qty numeric NOT NULL CHECK (qty > 0),
  unit_code text NOT NULL REFERENCES public.units(code),
  price numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ing_pres_ingredient ON public.ingredient_presentations(ingredient_id);
CREATE INDEX idx_ing_pres_org ON public.ingredient_presentations(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredient_presentations TO authenticated;
GRANT ALL ON public.ingredient_presentations TO service_role;
ALTER TABLE public.ingredient_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage ingredient presentations" ON public.ingredient_presentations FOR ALL TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_ingredient_presentations_updated_at BEFORE UPDATE ON public.ingredient_presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ingredient_price_history ============
CREATE TABLE public.ingredient_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  cost_per_base numeric NOT NULL,
  source text NOT NULL CHECK (source IN ('purchase','manual','import')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ing_price_hist_ingredient ON public.ingredient_price_history(ingredient_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.ingredient_price_history TO authenticated;
GRANT ALL ON public.ingredient_price_history TO service_role;
ALTER TABLE public.ingredient_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view ingredient price history" ON public.ingredient_price_history FOR SELECT TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE POLICY "Members insert ingredient price history" ON public.ingredient_price_history FOR INSERT TO authenticated
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

-- ============ purchase_invoices ============
CREATE TABLE public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  freight numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  receipt_url text,
  notes text,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_invoices_org ON public.purchase_invoices(organization_id, purchase_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoices TO authenticated;
GRANT ALL ON public.purchase_invoices TO service_role;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage purchase invoices" ON public.purchase_invoices FOR ALL TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ inventory_purchases as invoice lines ============
ALTER TABLE public.inventory_purchases
  ADD COLUMN purchase_invoice_id uuid REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  ADD COLUMN ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  ADD COLUMN supply_id uuid REFERENCES public.supplies(id) ON DELETE SET NULL,
  ADD COLUMN presentation_id uuid REFERENCES public.ingredient_presentations(id) ON DELETE SET NULL,
  ADD COLUMN base_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN cost_per_base numeric NOT NULL DEFAULT 0;

ALTER TABLE public.inventory_purchases ALTER COLUMN inventory_item_id DROP NOT NULL;

CREATE INDEX idx_inv_purchases_invoice ON public.inventory_purchases(purchase_invoice_id);
CREATE INDEX idx_inv_purchases_ingredient ON public.inventory_purchases(ingredient_id, purchase_date DESC);

-- ============ fn_ingredient_effective_cost ============
CREATE OR REPLACE FUNCTION public.fn_ingredient_effective_cost(p_ingredient_id uuid, p_waste_override numeric DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cost numeric;
  v_waste numeric;
  v_name text;
BEGIN
  SELECT current_cost, waste_pct, name INTO v_cost, v_waste, v_name
  FROM public.ingredients WHERE id = p_ingredient_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Ingrediente no encontrado';
  END IF;

  v_waste := COALESCE(p_waste_override, v_waste, 0);

  IF v_waste >= 100 THEN
    RAISE EXCEPTION 'La merma de % no puede ser 100%% o más', v_name;
  END IF;

  RETURN COALESCE(v_cost, 0) / (1 - v_waste / 100);
END;
$$;

-- ============ fn_process_purchase ============
CREATE OR REPLACE FUNCTION public.fn_process_purchase(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.fn_process_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_process_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ingredient_effective_cost(uuid, numeric) TO authenticated;