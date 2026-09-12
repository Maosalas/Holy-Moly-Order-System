-- =========================
-- clients
-- =========================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_org_all" ON public.clients FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- decoration_tiers
-- =========================
CREATE TABLE public.decoration_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  extra_minutes numeric NOT NULL DEFAULT 0 CHECK (extra_minutes >= 0),
  extra_amount numeric NOT NULL DEFAULT 0 CHECK (extra_amount >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decoration_tiers_org_name_unique UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decoration_tiers TO authenticated;
GRANT ALL ON public.decoration_tiers TO service_role;
ALTER TABLE public.decoration_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decoration_tiers_org_all" ON public.decoration_tiers FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_decoration_tiers_updated_at BEFORE UPDATE ON public.decoration_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- volume_discounts
-- =========================
CREATE TABLE public.volume_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty numeric NOT NULL CHECK (min_qty > 0),
  discount_pct numeric NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct < 100),
  floor_margin_pct numeric NOT NULL DEFAULT 40,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volume_discounts TO authenticated;
GRANT ALL ON public.volume_discounts TO service_role;
ALTER TABLE public.volume_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "volume_discounts_org_all" ON public.volume_discounts FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE INDEX idx_volume_discounts_org_product ON public.volume_discounts(organization_id, product_id, min_qty);
CREATE TRIGGER update_volume_discounts_updated_at BEFORE UPDATE ON public.volume_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- quotation_templates
-- =========================
CREATE TABLE public.quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_templates_org_name_unique UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_templates TO authenticated;
GRANT ALL ON public.quotation_templates TO service_role;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotation_templates_org_all" ON public.quotation_templates FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_quotation_templates_updated_at BEFORE UPDATE ON public.quotation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- quotations: rebuild in place (table is empty; orders.quotation_id keeps pointing here)
-- =========================
ALTER TABLE public.quotations
  DROP COLUMN recipes,
  DROP COLUMN selected_supplies,
  DROP COLUMN additional_expenses,
  DROP COLUMN additional_ingredients;

ALTER TABLE public.quotations
  ADD COLUMN number text,
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN client_phone text,
  ADD COLUMN status text NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador','enviada','aceptada','rechazada','vencida')),
  ADD COLUMN quote_date date NOT NULL DEFAULT current_date,
  ADD COLUMN valid_until date,
  ADD COLUMN delivery_date timestamptz,
  ADD COLUMN items_subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN packaging_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN extras_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN rush_surcharge numeric NOT NULL DEFAULT 0,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN total numeric NOT NULL DEFAULT 0,
  ADD COLUMN cost_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN margin_pct numeric,
  ADD COLUMN labor_minutes numeric NOT NULL DEFAULT 0,
  ADD COLUMN deposit_pct numeric NOT NULL DEFAULT 50,
  ADD COLUMN deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN snapshot_at timestamptz,
  ADD COLUMN costs_changed boolean NOT NULL DEFAULT false,
  ADD COLUMN cost_now numeric,
  ADD COLUMN needs_cake_topper boolean NOT NULL DEFAULT false,
  ADD COLUMN reference_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN client_notes text,
  ADD COLUMN internal_notes text,
  ADD COLUMN pdf_url text,
  ADD COLUMN public_token uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_public_token_unique UNIQUE (public_token),
  ADD CONSTRAINT quotations_org_number_unique UNIQUE (organization_id, number);

CREATE INDEX idx_quotations_org_status ON public.quotations(organization_id, status);
CREATE INDEX idx_quotations_client ON public.quotations(client_id);

-- correlativo COT-YYYY-0001 per organization/year
CREATE OR REPLACE FUNCTION public.fn_next_quotation_number(p_org uuid, p_date date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(p_date, 'YYYY');
  v_seq integer;
BEGIN
  SELECT COALESCE(MAX((split_part(number, '-', 3))::integer), 0) + 1
    INTO v_seq
  FROM public.quotations
  WHERE organization_id = p_org
    AND number LIKE 'COT-' || v_year || '-%';
  RETURN 'COT-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_quotation_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_days integer;
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := public.fn_next_quotation_number(NEW.organization_id, COALESCE(NEW.quote_date, current_date));
  END IF;
  IF NEW.valid_until IS NULL THEN
    SELECT quote_valid_days INTO v_days FROM public.costing_settings WHERE organization_id = NEW.organization_id;
    NEW.valid_until := COALESCE(NEW.quote_date, current_date) + COALESCE(v_days, 7);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quotations_defaults BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_defaults();

-- =========================
-- quotation_items
-- =========================
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('product','preparation','manual')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  preparation_id uuid REFERENCES public.preparations(id) ON DELETE SET NULL,
  decoration_tier_id uuid REFERENCES public.decoration_tiers(id) ON DELETE SET NULL,
  description text,
  optional_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  line_cost numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  margin_pct numeric,
  composition jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_items_ref_check CHECK (
    (item_type = 'product' AND product_id IS NOT NULL AND preparation_id IS NULL) OR
    (item_type = 'preparation' AND preparation_id IS NOT NULL AND product_id IS NULL) OR
    (item_type = 'manual' AND product_id IS NULL AND preparation_id IS NULL AND description IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotation_items_org_all" ON public.quotation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id
    AND q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id
    AND q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE INDEX idx_quotation_items_quotation ON public.quotation_items(quotation_id, sort_order);
CREATE TRIGGER update_quotation_items_updated_at BEFORE UPDATE ON public.quotation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- quotation_extras
-- =========================
CREATE TABLE public.quotation_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'otro' CHECK (kind IN ('entrega','montaje','evento','empaque','otro')),
  unit_price numeric NOT NULL DEFAULT 0,
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  total numeric NOT NULL DEFAULT 0,
  is_cost boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_extras TO authenticated;
GRANT ALL ON public.quotation_extras TO service_role;
ALTER TABLE public.quotation_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotation_extras_org_all" ON public.quotation_extras FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id
    AND q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id
    AND q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))));
CREATE INDEX idx_quotation_extras_quotation ON public.quotation_extras(quotation_id, sort_order);
CREATE TRIGGER update_quotation_extras_updated_at BEFORE UPDATE ON public.quotation_extras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- totals recalculation (all math stays in the database)
-- =========================
CREATE OR REPLACE FUNCTION public.fn_recalc_quotation_totals(p_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotations;
  s public.costing_settings;
  v_items numeric := 0;
  v_items_cost numeric := 0;
  v_extras numeric := 0;
  v_extras_cost numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_cost numeric := 0;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE id = p_quotation_id;
  IF q.id IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.costing_settings WHERE organization_id = q.organization_id;

  SELECT COALESCE(SUM(line_total),0), COALESCE(SUM(line_cost),0)
    INTO v_items, v_items_cost FROM public.quotation_items WHERE quotation_id = p_quotation_id;

  SELECT COALESCE(SUM(total),0), COALESCE(SUM(CASE WHEN is_cost THEN total ELSE 0 END),0)
    INTO v_extras, v_extras_cost FROM public.quotation_extras WHERE quotation_id = p_quotation_id;

  v_total := v_items + q.packaging_total + v_extras + q.rush_surcharge - q.discount_amount;
  IF COALESCE(s.tax_enabled, false) THEN
    v_tax := v_total * COALESCE(s.tax_percent, 0) / 100;
  END IF;
  v_total := v_total + v_tax;
  v_cost := v_items_cost + q.packaging_total + v_extras_cost;

  UPDATE public.quotations SET
    items_subtotal = v_items,
    extras_total = v_extras,
    tax_amount = v_tax,
    total = v_total,
    cost_total = v_cost,
    cost_now = v_cost,
    margin_pct = public.fn_margin_at_price(v_cost, NULLIF(v_total, 0)),
    deposit_amount = v_total * COALESCE(q.deposit_pct, 0) / 100,
    updated_at = now()
  WHERE id = p_quotation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_recalc_quotation_totals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_recalc_quotation_totals(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_next_quotation_number(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_next_quotation_number(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_quotation_children_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_recalc_quotation_totals(COALESCE(NEW.quotation_id, OLD.quotation_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_quotation_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_children_recalc();
CREATE TRIGGER trg_quotation_extras_recalc AFTER INSERT OR UPDATE OR DELETE ON public.quotation_extras
  FOR EACH ROW EXECUTE FUNCTION public.trg_quotation_children_recalc();

-- public read of a quotation by token (no auth), only client-facing fields
CREATE OR REPLACE FUNCTION public.get_quotation_by_public_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.quotations; v_items jsonb; v_extras jsonb;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE public_token = _token;
  IF q.id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'description', COALESCE(i.description, p.name, pr.name),
      'qty', i.qty,
      'unitPrice', i.unit_price,
      'lineTotal', i.line_total
    ) ORDER BY i.sort_order), '[]'::jsonb)
  INTO v_items
  FROM public.quotation_items i
  LEFT JOIN public.products p ON p.id = i.product_id
  LEFT JOIN public.preparations pr ON pr.id = i.preparation_id
  WHERE i.quotation_id = q.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', e.name, 'qty', e.qty, 'unitPrice', e.unit_price, 'total', e.total
    ) ORDER BY e.sort_order), '[]'::jsonb)
  INTO v_extras
  FROM public.quotation_extras e WHERE e.quotation_id = q.id;

  RETURN jsonb_build_object(
    'number', q.number,
    'status', q.status,
    'clientName', q.client_name,
    'quoteDate', q.quote_date,
    'validUntil', q.valid_until,
    'deliveryDate', q.delivery_date,
    'itemsSubtotal', q.items_subtotal,
    'packagingTotal', q.packaging_total,
    'extrasTotal', q.extras_total,
    'rushSurcharge', q.rush_surcharge,
    'discountAmount', q.discount_amount,
    'taxAmount', q.tax_amount,
    'total', q.total,
    'depositPct', q.deposit_pct,
    'depositAmount', q.deposit_amount,
    'needsCakeTopper', q.needs_cake_topper,
    'referencePhotos', q.reference_photos,
    'clientNotes', q.client_notes,
    'pdfUrl', q.pdf_url,
    'items', v_items,
    'extras', v_extras
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quotation_by_public_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quotation_by_public_token(uuid) TO anon, authenticated, service_role;