-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  description text,
  photo_url text,
  price_basis text NOT NULL DEFAULT 'unit' CHECK (price_basis IN ('unit','portion')),
  is_seasonal boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage products" ON public.products FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCT SIZES ============
CREATE TABLE public.product_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  portions numeric,
  target_weight_g numeric,
  assembly_minutes numeric NOT NULL DEFAULT 0,
  oven_minutes numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage product_sizes" ON public.product_sizes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE TRIGGER update_product_sizes_updated_at BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_product_sizes_product ON public.product_sizes(product_id);

-- ============ PRODUCT VARIANTS ============
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage product_variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);

-- ============ PRODUCT COMPONENTS ============
CREATE TABLE public.product_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  component_type text NOT NULL CHECK (component_type IN ('preparation','ingredient','supply')),
  preparation_id uuid REFERENCES public.preparations(id) ON DELETE RESTRICT,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  supply_id uuid REFERENCES public.supplies(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'otro' CHECK (role IN ('base','relleno','cubierta','decoracion','empaque','otro')),
  qty numeric NOT NULL CHECK (qty > 0),
  unit_code text NOT NULL REFERENCES public.units(code),
  base_qty numeric NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_components_target_check CHECK (
    (component_type = 'preparation' AND preparation_id IS NOT NULL AND ingredient_id IS NULL AND supply_id IS NULL)
    OR (component_type = 'ingredient' AND ingredient_id IS NOT NULL AND preparation_id IS NULL AND supply_id IS NULL)
    OR (component_type = 'supply' AND supply_id IS NOT NULL AND preparation_id IS NULL AND ingredient_id IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_components TO authenticated;
GRANT ALL ON public.product_components TO service_role;
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage product_components" ON public.product_components FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE TRIGGER update_product_components_updated_at BEFORE UPDATE ON public.product_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_product_components_product ON public.product_components(product_id);
CREATE INDEX idx_product_components_size ON public.product_components(size_id);
CREATE INDEX idx_product_components_variant ON public.product_components(variant_id);
CREATE INDEX idx_product_components_prep ON public.product_components(preparation_id);
CREATE INDEX idx_product_components_ingredient ON public.product_components(ingredient_id);
CREATE INDEX idx_product_components_supply ON public.product_components(supply_id);

-- base_qty automatico
CREATE OR REPLACE FUNCTION public.trg_product_component_base_qty()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base_unit text;
  v_density numeric;
  v_unit_weight numeric;
BEGIN
  IF NEW.component_type = 'preparation' THEN
    v_base_unit := 'g';
    v_density := NULL;
    v_unit_weight := NULL;
  ELSIF NEW.component_type = 'ingredient' THEN
    SELECT i.base_unit, i.density_g_ml, i.unit_weight_g
      INTO v_base_unit, v_density, v_unit_weight
    FROM public.ingredients i WHERE i.id = NEW.ingredient_id;
    IF v_base_unit IS NULL THEN
      RAISE EXCEPTION 'El insumo del componente no existe o no tiene unidad base';
    END IF;
  ELSE
    SELECT s.base_unit INTO v_base_unit FROM public.supplies s WHERE s.id = NEW.supply_id;
    IF v_base_unit IS NULL THEN
      RAISE EXCEPTION 'El suministro del componente no existe o no tiene unidad base';
    END IF;
  END IF;

  NEW.base_qty := public.fn_to_base_qty(v_base_unit, v_density, v_unit_weight, NEW.qty, NEW.unit_code);
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_components_base_qty
  BEFORE INSERT OR UPDATE ON public.product_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_product_component_base_qty();

-- ============ PRODUCT COSTS ============
CREATE TABLE public.product_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  material_cost numeric NOT NULL DEFAULT 0,
  labor_cost numeric NOT NULL DEFAULT 0,
  energy_cost numeric NOT NULL DEFAULT 0,
  packaging_cost numeric NOT NULL DEFAULT 0,
  direct_cost numeric NOT NULL DEFAULT 0,
  overhead_cost numeric NOT NULL DEFAULT 0,
  loss_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  suggested_price numeric NOT NULL DEFAULT 0,
  cost_per_portion numeric,
  labor_minutes numeric NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_product_costs_combo
  ON public.product_costs (product_id, COALESCE(size_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT ALL ON public.product_costs TO service_role;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read product_costs" ON public.product_costs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));

-- ============ RESOLUCION DE COMPONENTES ============
CREATE OR REPLACE FUNCTION public.fn_resolve_product_components(
  p_product_id uuid,
  p_size_id uuid,
  p_variant_id uuid,
  p_include_optional boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  size_id uuid,
  variant_id uuid,
  component_type text,
  preparation_id uuid,
  ingredient_id uuid,
  supply_id uuid,
  role text,
  qty numeric,
  unit_code text,
  base_qty numeric,
  is_optional boolean,
  sort_order integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT pc.*,
      ROW_NUMBER() OVER (
        PARTITION BY pc.component_type, pc.role,
          COALESCE(pc.preparation_id, pc.ingredient_id, pc.supply_id)
        ORDER BY (pc.size_id IS NOT NULL) DESC, (pc.variant_id IS NOT NULL) DESC
      ) AS rn
    FROM public.product_components pc
    WHERE pc.product_id = p_product_id
      AND (pc.size_id IS NULL OR pc.size_id = p_size_id)
      AND (pc.variant_id IS NULL OR pc.variant_id = p_variant_id)
      AND (p_include_optional OR NOT pc.is_optional)
  )
  SELECT id, product_id, size_id, variant_id, component_type,
         preparation_id, ingredient_id, supply_id, role,
         qty, unit_code, base_qty, is_optional, sort_order
  FROM candidates
  WHERE rn = 1
  ORDER BY sort_order, id;
$$;
