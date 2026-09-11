-- INGREDIENTS
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  provider text NOT NULL DEFAULT '',
  qty_provider numeric NOT NULL DEFAULT 0,
  units text NOT NULL DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredients TO authenticated;
GRANT ALL ON public.ingredients TO service_role;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage ingredients" ON public.ingredients FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUPPLIES
CREATE TABLE public.supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  supplier_name text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplies TO authenticated;
GRANT ALL ON public.supplies TO service_role;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage supplies" ON public.supplies FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_supplies_updated_at BEFORE UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RECIPE PARAMETERS
CREATE TABLE public.recipe_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parameter_key text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'gr',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, parameter_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_parameters TO authenticated;
GRANT ALL ON public.recipe_parameters TO service_role;
ALTER TABLE public.recipe_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage recipe parameters" ON public.recipe_parameters FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_recipe_parameters_updated_at BEFORE UPDATE ON public.recipe_parameters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RECIPES
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  image text,
  elaborations jsonb NOT NULL DEFAULT '[]'::jsonb,
  variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplies jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_weight numeric,
  total_weight_unit text,
  total_cost numeric NOT NULL DEFAULT 0,
  units numeric,
  unit_cost numeric,
  notes text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage recipes" ON public.recipes FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUOTATIONS
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  client_name text NOT NULL,
  size text,
  recipes jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_supplies jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  additional_ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost numeric NOT NULL DEFAULT 0,
  selling_price numeric,
  profit numeric,
  profit_margin numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage quotations" ON public.quotations FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  phone_number text NOT NULL DEFAULT '',
  order_details text NOT NULL DEFAULT '',
  delivery_date timestamptz NOT NULL DEFAULT now(),
  client_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_cake_topper boolean NOT NULL DEFAULT false,
  topper_details text,
  topper_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_amount numeric NOT NULL DEFAULT 0,
  charge_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Efectivo',
  down_payment numeric NOT NULL DEFAULT 0,
  supplies_needed text NOT NULL DEFAULT '',
  statuses jsonb NOT NULL DEFAULT '["waiting_for_payment"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage orders" ON public.orders FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER PORTAL TOKENS
CREATE TABLE public.order_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_portal_tokens TO authenticated;
GRANT ALL ON public.order_portal_tokens TO service_role;
ALTER TABLE public.order_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage portal tokens" ON public.order_portal_tokens FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_order_portal_tokens_updated_at BEFORE UPDATE ON public.order_portal_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public portal lookup (no auth required, only via token)
CREATE OR REPLACE FUNCTION public.get_order_by_portal_token(_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'clientName', o.client_name,
    'orderDetails', o.order_details,
    'deliveryDate', o.delivery_date,
    'needsCakeTopper', o.needs_cake_topper,
    'topperDetails', o.topper_details,
    'chargeAmount', o.charge_amount,
    'downPayment', o.down_payment,
    'statuses', o.statuses,
    'createdAt', o.created_at,
    'organizationName', org.name,
    'organizationLogoUrl', org.logo_url
  )
  FROM public.order_portal_tokens t
  JOIN public.orders o ON o.id = t.order_id
  JOIN public.organizations org ON org.id = o.organization_id
  WHERE t.token = _token
    AND t.revoked = false
    AND (t.expires_at IS NULL OR t.expires_at > now())
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_portal_token(uuid) TO anon, authenticated;

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  supermarket_name text NOT NULL DEFAULT '',
  purchase_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL DEFAULT 0,
  card_type text NOT NULL DEFAULT '',
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVENTORY ITEMS
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE SET NULL,
  supply_id uuid REFERENCES public.supplies(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'ingredient',
  item_name text NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  min_stock_threshold numeric NOT NULL DEFAULT 0,
  last_restock_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage inventory items" ON public.inventory_items FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVENTORY MOVEMENTS
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL DEFAULT '',
  movement_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  previous_stock numeric NOT NULL DEFAULT 0,
  new_stock numeric NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage inventory movements" ON public.inventory_movements FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

-- INVENTORY PURCHASES
CREATE TABLE public.inventory_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  supplier_name text,
  purchase_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_purchases TO authenticated;
GRANT ALL ON public.inventory_purchases TO service_role;
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage inventory purchases" ON public.inventory_purchases FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

-- INVENTORY ALERTS
CREATE TABLE public.inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  item_name text NOT NULL DEFAULT '',
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock_threshold numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  alert_type text NOT NULL DEFAULT 'low_stock',
  is_read boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_alerts TO authenticated;
GRANT ALL ON public.inventory_alerts TO service_role;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage inventory alerts" ON public.inventory_alerts FOR ALL TO authenticated
  USING (organization_id = ANY (public.get_user_organization_ids(auth.uid())))
  WITH CHECK (organization_id = ANY (public.get_user_organization_ids(auth.uid())));

-- Auto-generate low stock alerts
CREATE OR REPLACE FUNCTION public.handle_inventory_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_alerts
      WHERE inventory_item_id = NEW.id AND is_resolved = false
    ) THEN
      INSERT INTO public.inventory_alerts (
        organization_id, inventory_item_id, item_name, current_stock,
        min_stock_threshold, unit, alert_type
      ) VALUES (
        NEW.organization_id, NEW.id, NEW.item_name, NEW.current_stock,
        NEW.min_stock_threshold, NEW.unit,
        CASE WHEN NEW.current_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END
      );
    END IF;
  ELSE
    UPDATE public.inventory_alerts
    SET is_resolved = true, resolved_at = now()
    WHERE inventory_item_id = NEW.id AND is_resolved = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_items_stock_alerts
AFTER INSERT OR UPDATE OF current_stock, min_stock_threshold ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.handle_inventory_stock_change();

-- Indexes
CREATE INDEX idx_ingredients_org ON public.ingredients(organization_id);
CREATE INDEX idx_supplies_org ON public.supplies(organization_id);
CREATE INDEX idx_recipes_org ON public.recipes(organization_id);
CREATE INDEX idx_quotations_org ON public.quotations(organization_id);
CREATE INDEX idx_orders_org ON public.orders(organization_id);
CREATE INDEX idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX idx_inventory_items_org ON public.inventory_items(organization_id);
CREATE INDEX idx_inventory_movements_item ON public.inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_alerts_item ON public.inventory_alerts(inventory_item_id);
CREATE INDEX idx_order_portal_tokens_order ON public.order_portal_tokens(order_id);