-- ============ size_presets ============
CREATE TABLE public.size_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  portions numeric,
  assembly_minutes numeric NOT NULL DEFAULT 0,
  oven_minutes numeric NOT NULL DEFAULT 0,
  target_weight_g numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_presets TO authenticated;
GRANT ALL ON public.size_presets TO service_role;
ALTER TABLE public.size_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage size presets" ON public.size_presets FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_size_presets_updated_at BEFORE UPDATE ON public.size_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ size_preset_components ============
CREATE TABLE public.size_preset_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_preset_id uuid NOT NULL REFERENCES public.size_presets(id) ON DELETE CASCADE,
  component_type text NOT NULL CHECK (component_type IN ('supply','ingredient')),
  supply_id uuid REFERENCES public.supplies(id) ON DELETE RESTRICT,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'empaque',
  qty numeric NOT NULL DEFAULT 0,
  unit_code text NOT NULL REFERENCES public.units(code),
  base_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (component_type = 'supply' AND supply_id IS NOT NULL AND ingredient_id IS NULL) OR
    (component_type = 'ingredient' AND ingredient_id IS NOT NULL AND supply_id IS NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_preset_components TO authenticated;
GRANT ALL ON public.size_preset_components TO service_role;
ALTER TABLE public.size_preset_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage preset components" ON public.size_preset_components FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.size_presets sp WHERE sp.id = size_preset_id
                 AND sp.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.size_presets sp WHERE sp.id = size_preset_id
                 AND sp.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE TRIGGER update_size_preset_components_updated_at BEFORE UPDATE ON public.size_preset_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_size_preset_component_base_qty()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_base_unit text; v_density numeric; v_unit_weight numeric;
BEGIN
  IF NEW.component_type = 'ingredient' THEN
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
CREATE TRIGGER size_preset_component_base_qty
  BEFORE INSERT OR UPDATE OF qty, unit_code, component_type, ingredient_id, supply_id
  ON public.size_preset_components
  FOR EACH ROW EXECUTE FUNCTION public.trg_size_preset_component_base_qty();

-- ============ size_preset_defaults ============
CREATE TABLE public.size_preset_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_preset_id uuid NOT NULL REFERENCES public.size_presets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('base','relleno','cubierta','decoracion')),
  qty_g numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (size_preset_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.size_preset_defaults TO authenticated;
GRANT ALL ON public.size_preset_defaults TO service_role;
ALTER TABLE public.size_preset_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage preset defaults" ON public.size_preset_defaults FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.size_presets sp WHERE sp.id = size_preset_id
                 AND sp.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.size_presets sp WHERE sp.id = size_preset_id
                 AND sp.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE TRIGGER update_size_preset_defaults_updated_at BEFORE UPDATE ON public.size_preset_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ columnas nuevas ============
ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS size_preset_id uuid REFERENCES public.size_presets(id) ON DELETE SET NULL;
ALTER TABLE public.product_components
  ADD COLUMN IF NOT EXISTS excludes_preset boolean NOT NULL DEFAULT false;

-- ============ resolución ============
CREATE OR REPLACE FUNCTION public.fn_resolve_product_components(
  p_product_id uuid, p_size_id uuid, p_variant_id uuid, p_include_optional boolean DEFAULT false)
RETURNS TABLE(id uuid, product_id uuid, size_id uuid, variant_id uuid, component_type text,
  preparation_id uuid, ingredient_id uuid, supply_id uuid, role text, qty numeric,
  unit_code text, base_qty numeric, is_optional boolean, sort_order integer)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
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
  ),
  winners AS (SELECT * FROM candidates WHERE rn = 1),
  preset AS (
    SELECT spc.*
    FROM public.size_preset_components spc
    JOIN public.product_sizes ps ON ps.size_preset_id = spc.size_preset_id
    WHERE p_size_id IS NOT NULL AND ps.id = p_size_id AND ps.product_id = p_product_id
  )
  SELECT w.id, w.product_id, w.size_id, w.variant_id, w.component_type,
         w.preparation_id, w.ingredient_id, w.supply_id, w.role,
         w.qty, w.unit_code, w.base_qty, w.is_optional, w.sort_order
  FROM winners w
  WHERE NOT w.excludes_preset
  UNION ALL
  SELECT p.id, p_product_id, p_size_id, NULL::uuid, p.component_type,
         NULL::uuid, p.ingredient_id, p.supply_id, p.role,
         p.qty, p.unit_code, p.base_qty, false, 10000
  FROM preset p
  WHERE NOT EXISTS (
    SELECT 1 FROM winners w
    WHERE w.component_type = p.component_type
      AND w.role = p.role
      AND COALESCE(w.ingredient_id, w.supply_id) = COALESCE(p.ingredient_id, p.supply_id)
  )
  ORDER BY 14, 1;
$$;

-- ============ duplicar producto ============
CREATE OR REPLACE FUNCTION public.fn_duplicate_product(p_product_id uuid, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_org uuid;
  v_new uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.products WHERE id = p_product_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
  IF NOT public.is_organization_member(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'No tenés acceso a este producto';
  END IF;

  INSERT INTO public.products (organization_id, name, category, description, photo_url,
                               price_basis, is_seasonal, active)
  SELECT organization_id, COALESCE(NULLIF(btrim(p_name), ''), name || ' (copia)'),
         category, description, photo_url, price_basis, is_seasonal, active
  FROM public.products WHERE id = p_product_id
  RETURNING id INTO v_new;

  CREATE TEMP TABLE _size_map (old_id uuid, new_id uuid) ON COMMIT DROP;
  CREATE TEMP TABLE _variant_map (old_id uuid, new_id uuid) ON COMMIT DROP;

  WITH ins AS (
    INSERT INTO public.product_sizes (product_id, name, portions, target_weight_g,
      assembly_minutes, oven_minutes, is_default, sort_order, active, size_preset_id)
    SELECT v_new, name, portions, target_weight_g, assembly_minutes, oven_minutes,
           is_default, sort_order, active, size_preset_id
    FROM public.product_sizes WHERE product_id = p_product_id
    ORDER BY sort_order, id
    RETURNING id, name
  )
  INSERT INTO _size_map (old_id, new_id)
  SELECT o.id, i.id FROM ins i JOIN public.product_sizes o
    ON o.product_id = p_product_id AND o.name = i.name;

  WITH ins AS (
    INSERT INTO public.product_variants (product_id, name, description, is_default, sort_order, active)
    SELECT v_new, name, description, is_default, sort_order, active
    FROM public.product_variants WHERE product_id = p_product_id
    ORDER BY sort_order, id
    RETURNING id, name
  )
  INSERT INTO _variant_map (old_id, new_id)
  SELECT o.id, i.id FROM ins i JOIN public.product_variants o
    ON o.product_id = p_product_id AND o.name = i.name;

  INSERT INTO public.product_components (product_id, size_id, variant_id, component_type,
    preparation_id, ingredient_id, supply_id, role, qty, unit_code, is_optional,
    sort_order, excludes_preset)
  SELECT v_new, sm.new_id, vm.new_id, pc.component_type,
         pc.preparation_id, pc.ingredient_id, pc.supply_id, pc.role, pc.qty, pc.unit_code,
         pc.is_optional, pc.sort_order, pc.excludes_preset
  FROM public.product_components pc
  LEFT JOIN _size_map sm ON sm.old_id = pc.size_id
  LEFT JOIN _variant_map vm ON vm.old_id = pc.variant_id
  WHERE pc.product_id = p_product_id;

  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_duplicate_product(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_duplicate_product(uuid, text) TO authenticated;

-- ============ aplicar un preset a un tamaño de producto ============
CREATE OR REPLACE FUNCTION public.fn_apply_size_preset(p_product_id uuid, p_preset_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_org uuid;
  pr public.size_presets;
  v_size uuid;
  v_order integer;
  d RECORD;
  v_prep uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.products WHERE id = p_product_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
  IF NOT public.is_organization_member(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'No tenés acceso a este producto';
  END IF;

  SELECT * INTO pr FROM public.size_presets WHERE id = p_preset_id AND organization_id = v_org;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'El tamaño del catálogo no existe'; END IF;

  SELECT COALESCE(MAX(sort_order) + 1, 0) INTO v_order FROM public.product_sizes WHERE product_id = p_product_id;

  INSERT INTO public.product_sizes (product_id, name, portions, target_weight_g,
    assembly_minutes, oven_minutes, is_default, sort_order, size_preset_id)
  VALUES (p_product_id, pr.name, pr.portions, pr.target_weight_g,
    pr.assembly_minutes, pr.oven_minutes,
    NOT EXISTS (SELECT 1 FROM public.product_sizes WHERE product_id = p_product_id),
    v_order, pr.id)
  RETURNING id INTO v_size;

  -- cantidades sugeridas copiadas como filas propias del producto
  SELECT COALESCE(MAX(sort_order) + 1, 0) INTO v_order FROM public.product_components WHERE product_id = p_product_id;
  FOR d IN SELECT role, qty_g FROM public.size_preset_defaults WHERE size_preset_id = pr.id ORDER BY role LOOP
    SELECT pc.preparation_id INTO v_prep
    FROM public.product_components pc
    WHERE pc.product_id = p_product_id AND pc.role = d.role
      AND pc.component_type = 'preparation' AND pc.preparation_id IS NOT NULL
    ORDER BY (pc.size_id IS NULL) DESC
    LIMIT 1;
    IF v_prep IS NOT NULL AND d.qty_g > 0 THEN
      INSERT INTO public.product_components (product_id, size_id, component_type,
        preparation_id, role, qty, unit_code, sort_order)
      VALUES (p_product_id, v_size, 'preparation', v_prep, d.role, d.qty_g, 'g', v_order);
      v_order := v_order + 1;
    END IF;
  END LOOP;

  RETURN v_size;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_apply_size_preset(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_apply_size_preset(uuid, uuid) TO authenticated;