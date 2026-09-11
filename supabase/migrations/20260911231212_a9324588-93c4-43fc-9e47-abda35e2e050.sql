CREATE TABLE public.costing_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'CRC',
  price_rounding integer NOT NULL DEFAULT 100,
  include_labor boolean NOT NULL DEFAULT true,
  hourly_rate numeric NOT NULL DEFAULT 2500,
  include_energy boolean NOT NULL DEFAULT true,
  oven_kw numeric NOT NULL DEFAULT 2.5,
  kwh_price numeric NOT NULL DEFAULT 120,
  overhead_percent numeric NOT NULL DEFAULT 15,
  production_loss_pct numeric NOT NULL DEFAULT 5,
  default_margin_pct numeric NOT NULL DEFAULT 60,
  min_margin_pct numeric NOT NULL DEFAULT 35,
  tax_enabled boolean NOT NULL DEFAULT false,
  tax_percent numeric NOT NULL DEFAULT 0,
  quote_valid_days integer NOT NULL DEFAULT 7,
  deposit_percent numeric NOT NULL DEFAULT 50,
  min_order_amount numeric NOT NULL DEFAULT 0,
  rush_surcharge_pct numeric NOT NULL DEFAULT 25,
  cost_method text NOT NULL DEFAULT 'weighted_average',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT costing_settings_price_rounding_check CHECK (price_rounding > 0),
  CONSTRAINT costing_settings_cost_method_check CHECK (cost_method IN ('weighted_average','last_cost','fifo'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.costing_settings TO authenticated;
GRANT ALL ON public.costing_settings TO service_role;

ALTER TABLE public.costing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their costing settings"
ON public.costing_settings FOR SELECT TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Members can insert their costing settings"
ON public.costing_settings FOR INSERT TO authenticated
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

CREATE POLICY "Members can update their costing settings"
ON public.costing_settings FOR UPDATE TO authenticated
USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

CREATE TRIGGER update_costing_settings_updated_at
BEFORE UPDATE ON public.costing_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.costing_settings (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_organization_costing_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.costing_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created_costing_settings
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization_costing_settings();

CREATE OR REPLACE FUNCTION public.fn_costing_price(
  p_materials numeric,
  p_hours numeric,
  p_include_labor boolean,
  p_hourly_rate numeric,
  p_include_energy boolean,
  p_oven_kw numeric,
  p_kwh_price numeric,
  p_overhead_percent numeric,
  p_production_loss_pct numeric,
  p_margin_pct numeric,
  p_tax_enabled boolean,
  p_tax_percent numeric,
  p_price_rounding integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_materials numeric;
  v_labor numeric := 0;
  v_energy numeric := 0;
  v_subtotal numeric;
  v_cost numeric;
  v_price numeric;
BEGIN
  IF p_production_loss_pct >= 100 THEN
    RAISE EXCEPTION 'La pérdida de producción no puede ser 100%% o más';
  END IF;
  IF p_margin_pct >= 100 THEN
    RAISE EXCEPTION 'El margen no puede ser 100%% o más';
  END IF;

  v_materials := COALESCE(p_materials, 0) / (1 - COALESCE(p_production_loss_pct, 0) / 100);

  IF COALESCE(p_include_labor, false) THEN
    v_labor := COALESCE(p_hourly_rate, 0) * COALESCE(p_hours, 0);
  END IF;

  IF COALESCE(p_include_energy, false) THEN
    v_energy := COALESCE(p_oven_kw, 0) * COALESCE(p_kwh_price, 0) * COALESCE(p_hours, 0);
  END IF;

  v_subtotal := v_materials + v_labor + v_energy;
  v_cost := v_subtotal * (1 + COALESCE(p_overhead_percent, 0) / 100);
  v_price := v_cost / (1 - COALESCE(p_margin_pct, 0) / 100);

  IF COALESCE(p_tax_enabled, false) THEN
    v_price := v_price * (1 + COALESCE(p_tax_percent, 0) / 100);
  END IF;

  RETURN public.fn_round_price(v_price, COALESCE(p_price_rounding, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_costing_price(numeric, numeric, boolean, numeric, boolean, numeric, numeric, numeric, numeric, numeric, boolean, numeric, integer) TO authenticated;