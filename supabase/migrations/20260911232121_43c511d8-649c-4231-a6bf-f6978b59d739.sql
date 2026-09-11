CREATE TABLE public.preparations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'otro' CHECK (type IN ('base','relleno','cubierta','decoracion','salsa','masa','otro')),
  photo_url text,
  yield_g numeric NOT NULL CHECK (yield_g > 0),
  yield_portions numeric,
  baking_loss_pct numeric NOT NULL DEFAULT 0,
  waste_pct numeric NOT NULL DEFAULT 0,
  time_minutes numeric NOT NULL DEFAULT 0,
  setup_minutes numeric NOT NULL DEFAULT 0,
  oven_minutes numeric NOT NULL DEFAULT 0,
  oven_temp_c numeric,
  procedure_text text,
  notes text,
  source_url text,
  is_seasonal boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preparations_org_name_unique UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparations TO authenticated;
GRANT ALL ON public.preparations TO service_role;
ALTER TABLE public.preparations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own org preparations" ON public.preparations
  FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

CREATE TRIGGER update_preparations_updated_at BEFORE UPDATE ON public.preparations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.preparation_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id uuid NOT NULL REFERENCES public.preparations(id) ON DELETE CASCADE,
  component_type text NOT NULL CHECK (component_type IN ('ingredient','preparation')),
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  child_prep_id uuid REFERENCES public.preparations(id) ON DELETE RESTRICT,
  qty numeric NOT NULL CHECK (qty > 0),
  unit_code text NOT NULL REFERENCES public.units(code),
  base_qty numeric NOT NULL DEFAULT 0,
  waste_pct_override numeric,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preparation_components_type_check CHECK (
    (component_type = 'ingredient' AND ingredient_id IS NOT NULL AND child_prep_id IS NULL)
    OR
    (component_type = 'preparation' AND child_prep_id IS NOT NULL AND ingredient_id IS NULL)
  )
);

CREATE INDEX idx_preparation_components_preparation_id ON public.preparation_components(preparation_id);
CREATE INDEX idx_preparation_components_child_prep_id ON public.preparation_components(child_prep_id);
CREATE INDEX idx_preparation_components_ingredient_id ON public.preparation_components(ingredient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_components TO authenticated;
GRANT ALL ON public.preparation_components TO service_role;
ALTER TABLE public.preparation_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own org preparation components" ON public.preparation_components
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.preparations p
    WHERE p.id = preparation_components.preparation_id
      AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.preparations p
    WHERE p.id = preparation_components.preparation_id
      AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))
  ));

CREATE TRIGGER update_preparation_components_updated_at BEFORE UPDATE ON public.preparation_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.preparation_costs (
  preparation_id uuid PRIMARY KEY REFERENCES public.preparations(id) ON DELETE CASCADE,
  material_cost numeric NOT NULL DEFAULT 0,
  labor_cost numeric NOT NULL DEFAULT 0,
  energy_cost numeric NOT NULL DEFAULT 0,
  batch_cost numeric NOT NULL DEFAULT 0,
  cost_per_g numeric NOT NULL DEFAULT 0,
  material_per_g numeric NOT NULL DEFAULT 0,
  labor_per_g numeric NOT NULL DEFAULT 0,
  energy_per_g numeric NOT NULL DEFAULT 0,
  cost_per_portion numeric,
  depth integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preparation_costs TO authenticated;
GRANT ALL ON public.preparation_costs TO service_role;
ALTER TABLE public.preparation_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own org preparation costs" ON public.preparation_costs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.preparations p
    WHERE p.id = preparation_costs.preparation_id
      AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.preparations p
    WHERE p.id = preparation_costs.preparation_id
      AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))
  ));

-- base_qty calculation
CREATE OR REPLACE FUNCTION public.trg_preparation_component_base_qty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ing public.ingredients;
BEGIN
  IF NEW.component_type = 'ingredient' THEN
    SELECT * INTO v_ing FROM public.ingredients WHERE id = NEW.ingredient_id;
    IF v_ing.id IS NULL THEN
      RAISE EXCEPTION 'Ingrediente no encontrado';
    END IF;
    NEW.base_qty := public.fn_to_base_qty(
      v_ing.base_unit, v_ing.density_g_ml, v_ing.unit_weight_g, NEW.qty, NEW.unit_code
    );
  ELSE
    NEW.base_qty := public.fn_to_base_qty('g', NULL, NULL, NEW.qty, NEW.unit_code);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER preparation_components_base_qty
  BEFORE INSERT OR UPDATE ON public.preparation_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_preparation_component_base_qty();

-- cycle prevention
CREATE OR REPLACE FUNCTION public.trg_preparation_component_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.component_type <> 'preparation' OR NEW.child_prep_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.child_prep_id = NEW.preparation_id THEN
    RAISE EXCEPTION 'Una elaboración no puede contenerse a sí misma';
  END IF;

  IF EXISTS (
    WITH RECURSIVE descendants AS (
      SELECT c.child_prep_id AS id
      FROM public.preparation_components c
      WHERE c.preparation_id = NEW.child_prep_id
        AND c.component_type = 'preparation'
        AND c.child_prep_id IS NOT NULL
      UNION
      SELECT c.child_prep_id
      FROM public.preparation_components c
      JOIN descendants d ON c.preparation_id = d.id
      WHERE c.component_type = 'preparation'
        AND c.child_prep_id IS NOT NULL
    )
    SELECT 1 FROM descendants WHERE id = NEW.preparation_id
  ) THEN
    RAISE EXCEPTION 'Ciclo detectado: esa elaboración ya depende de la actual';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER preparation_components_no_cycle
  BEFORE INSERT OR UPDATE ON public.preparation_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_preparation_component_no_cycle();