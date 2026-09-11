CREATE TABLE public.units (
  code text PRIMARY KEY,
  name text NOT NULL,
  magnitude text NOT NULL CHECK (magnitude IN ('mass','volume','count')),
  factor_to_base numeric NOT NULL CHECK (factor_to_base > 0),
  is_input_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Units are readable by authenticated users"
  ON public.units FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.units (code, name, magnitude, factor_to_base, is_input_only) VALUES
  ('g','gramos','mass',1,false),
  ('kg','kilogramos','mass',1000,false),
  ('ml','mililitros','volume',1,false),
  ('l','litros','volume',1000,false),
  ('unidad','unidades','count',1,false),
  ('taza','tazas','volume',240,true),
  ('cda','cucharadas','volume',15,true),
  ('cdta','cucharaditas','volume',5,true),
  ('pizca','pizcas','volume',0.35,true);

ALTER TABLE public.ingredients
  ADD COLUMN base_unit text NOT NULL DEFAULT 'g'
    REFERENCES public.units(code)
    CHECK (base_unit IN ('g','ml','unidad')),
  ADD COLUMN density_g_ml numeric,
  ADD COLUMN unit_weight_g numeric,
  ADD COLUMN waste_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN current_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN last_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN category text,
  ADD COLUMN active boolean NOT NULL DEFAULT true;

ALTER TABLE public.supplies
  ADD COLUMN base_unit text NOT NULL DEFAULT 'unidad'
    REFERENCES public.units(code),
  ADD COLUMN current_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN last_cost numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.fn_to_base_qty(
  p_base_unit text,
  p_density numeric,
  p_unit_weight numeric,
  p_qty numeric,
  p_unit text
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_in_mag text;
  v_in_factor numeric;
  v_base_mag text;
  v_canonical numeric;
BEGIN
  IF p_qty IS NULL THEN
    RAISE EXCEPTION 'La cantidad no puede ser nula';
  END IF;

  SELECT magnitude, factor_to_base INTO v_in_mag, v_in_factor
  FROM public.units WHERE code = p_unit;

  IF v_in_mag IS NULL THEN
    RAISE EXCEPTION 'Unidad de entrada desconocida: %', p_unit;
  END IF;

  SELECT magnitude INTO v_base_mag
  FROM public.units WHERE code = p_base_unit;

  IF v_base_mag IS NULL THEN
    RAISE EXCEPTION 'Unidad base desconocida: %', p_base_unit;
  END IF;

  -- cantidad en la unidad canónica de su propia magnitud (g, ml o unidad)
  v_canonical := p_qty * v_in_factor;

  IF v_in_mag = v_base_mag THEN
    RETURN v_canonical;
  END IF;

  IF v_in_mag = 'volume' AND v_base_mag = 'mass' THEN
    IF p_density IS NULL OR p_density = 0 THEN
      RAISE EXCEPTION 'Falta la densidad (g/ml) para convertir';
    END IF;
    RETURN v_canonical * p_density;
  END IF;

  IF v_in_mag = 'mass' AND v_base_mag = 'volume' THEN
    IF p_density IS NULL OR p_density = 0 THEN
      RAISE EXCEPTION 'Falta la densidad (g/ml) para convertir';
    END IF;
    RETURN v_canonical / p_density;
  END IF;

  IF v_in_mag = 'count' AND v_base_mag = 'mass' THEN
    IF p_unit_weight IS NULL OR p_unit_weight = 0 THEN
      RAISE EXCEPTION 'Falta el peso por unidad';
    END IF;
    RETURN v_canonical * p_unit_weight;
  END IF;

  IF v_in_mag = 'mass' AND v_base_mag = 'count' THEN
    IF p_unit_weight IS NULL OR p_unit_weight = 0 THEN
      RAISE EXCEPTION 'Falta el peso por unidad';
    END IF;
    RETURN v_canonical / p_unit_weight;
  END IF;

  IF v_in_mag = 'count' AND v_base_mag = 'volume' THEN
    IF p_unit_weight IS NULL OR p_unit_weight = 0 THEN
      RAISE EXCEPTION 'Falta el peso por unidad';
    END IF;
    IF p_density IS NULL OR p_density = 0 THEN
      RAISE EXCEPTION 'Falta la densidad (g/ml) para convertir';
    END IF;
    RETURN (v_canonical * p_unit_weight) / p_density;
  END IF;

  IF v_in_mag = 'volume' AND v_base_mag = 'count' THEN
    IF p_density IS NULL OR p_density = 0 THEN
      RAISE EXCEPTION 'Falta la densidad (g/ml) para convertir';
    END IF;
    IF p_unit_weight IS NULL OR p_unit_weight = 0 THEN
      RAISE EXCEPTION 'Falta el peso por unidad';
    END IF;
    RETURN (v_canonical * p_density) / p_unit_weight;
  END IF;

  RAISE EXCEPTION 'No hay datos suficientes para convertir de % a %', p_unit, p_base_unit;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_round_price(p_value numeric, p_step integer DEFAULT 100)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CEIL(p_value / p_step) * p_step
$$;