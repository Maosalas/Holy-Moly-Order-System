-- ============ Desvío de costos ============
CREATE OR REPLACE FUNCTION public.fn_check_quote_drift(p_quotation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotations;
  it public.quotation_items;
  v jsonb;
  v_now numeric := 0;
  v_diff numeric := 0;
  v_changed boolean := false;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE id = p_quotation_id;
  IF q.id IS NULL THEN RETURN NULL; END IF;

  FOR it IN SELECT * FROM public.quotation_items WHERE quotation_id = p_quotation_id LOOP
    IF it.item_type = 'product' AND it.product_id IS NOT NULL THEN
      v := public.fn_calc_product_cost(
        it.product_id, it.size_id, it.variant_id,
        COALESCE(array_length(it.optional_ids, 1), 0) > 0
      );
      v_now := v_now + COALESCE((v->>'total_cost')::numeric, 0) * it.qty;
    ELSE
      v_now := v_now + COALESCE(it.line_cost, 0);
    END IF;
  END LOOP;

  IF COALESCE(q.cost_total, 0) > 0 THEN
    v_diff := (v_now - q.cost_total) / q.cost_total * 100;
    v_changed := abs(v_diff) > 1;
  END IF;

  UPDATE public.quotations
     SET cost_now = v_now,
         costs_changed = v_changed,
         updated_at = now()
   WHERE id = p_quotation_id;

  RETURN jsonb_build_object(
    'quotation_id', p_quotation_id,
    'cost_total', q.cost_total,
    'cost_now', v_now,
    'diff_pct', round(v_diff, 2),
    'costs_changed', v_changed,
    'snapshot_at', q.snapshot_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_check_quote_drift(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_quote_drift(uuid) TO authenticated, service_role;

-- ============ Enviar: congelar snapshot y vigencia ============
CREATE OR REPLACE FUNCTION public.fn_send_quotation(p_quotation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotations;
  v_days integer;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE id = p_quotation_id;
  IF q.id IS NULL THEN RAISE EXCEPTION 'Cotización no encontrada'; END IF;
  IF NOT (q.organization_id = ANY (public.get_user_organization_ids(auth.uid()))) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT quote_valid_days INTO v_days FROM public.costing_settings WHERE organization_id = q.organization_id;

  SELECT jsonb_build_object(
    'frozen_at', now(),
    'totals', jsonb_build_object(
      'items_subtotal', q.items_subtotal,
      'packaging_total', q.packaging_total,
      'extras_total', q.extras_total,
      'rush_surcharge', q.rush_surcharge,
      'discount_amount', q.discount_amount,
      'tax_amount', q.tax_amount,
      'total', q.total,
      'cost_total', q.cost_total,
      'margin_pct', q.margin_pct,
      'labor_minutes', q.labor_minutes,
      'deposit_pct', q.deposit_pct,
      'deposit_amount', q.deposit_amount
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order)
      FROM public.quotation_items i WHERE i.quotation_id = q.id
    ), '[]'::jsonb),
    'extras', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.sort_order)
      FROM public.quotation_extras e WHERE e.quotation_id = q.id
    ), '[]'::jsonb)
  ) INTO v_snapshot;

  UPDATE public.quotations
     SET status = 'enviada',
         snapshot = v_snapshot,
         snapshot_at = now(),
         valid_until = COALESCE(quote_date, current_date) + COALESCE(v_days, 7),
         cost_now = q.cost_total,
         costs_changed = false,
         updated_at = now()
   WHERE id = p_quotation_id;

  RETURN jsonb_build_object('status', 'enviada', 'snapshot_at', now(),
    'valid_until', COALESCE(q.quote_date, current_date) + COALESCE(v_days, 7));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_send_quotation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_send_quotation(uuid) TO authenticated, service_role;

-- ============ Descuento por volumen con piso de margen ============
CREATE OR REPLACE FUNCTION public.fn_volume_discount_check(
  p_organization_id uuid,
  p_product_id uuid,
  p_qty numeric,
  p_unit_cost numeric,
  p_unit_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.volume_discounts;
  v_price numeric;
  v_margin numeric;
BEGIN
  SELECT * INTO d
  FROM public.volume_discounts
  WHERE organization_id = p_organization_id
    AND active
    AND (product_id = p_product_id OR product_id IS NULL)
    AND min_qty <= p_qty
  ORDER BY (product_id IS NOT NULL) DESC, min_qty DESC
  LIMIT 1;

  IF d.id IS NULL THEN
    RETURN jsonb_build_object('applies', false, 'discount_pct', 0,
      'unit_price', p_unit_price,
      'margin_pct', public.fn_margin_at_price(p_unit_cost, NULLIF(p_unit_price, 0)),
      'allowed', true, 'message', NULL);
  END IF;

  v_price := p_unit_price * (1 - d.discount_pct / 100);
  v_margin := public.fn_margin_at_price(p_unit_cost, NULLIF(v_price, 0));

  RETURN jsonb_build_object(
    'applies', true,
    'discount_pct', d.discount_pct,
    'min_qty', d.min_qty,
    'floor_margin_pct', d.floor_margin_pct,
    'unit_price', v_price,
    'margin_pct', v_margin,
    'allowed', COALESCE(v_margin, 0) >= d.floor_margin_pct,
    'message', CASE WHEN COALESCE(v_margin, 0) >= d.floor_margin_pct THEN NULL
      ELSE 'El descuento de ' || d.discount_pct || '% deja un margen de ' ||
           round(COALESCE(v_margin, 0), 1) || '%, por debajo del mínimo permitido de ' ||
           d.floor_margin_pct || '%.' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_volume_discount_check(uuid, uuid, numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_volume_discount_check(uuid, uuid, numeric, numeric, numeric) TO authenticated, service_role;

-- ============ Vencimiento diario ============
CREATE OR REPLACE FUNCTION public.fn_expire_quotations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.quotations
     SET status = 'vencida', updated_at = now()
   WHERE status = 'enviada'
     AND valid_until IS NOT NULL
     AND valid_until < current_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_expire_quotations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_expire_quotations() TO authenticated, service_role;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule('expire-quotations-daily')
    FROM cron.job WHERE jobname = 'expire-quotations-daily';
  PERFORM cron.schedule('expire-quotations-daily', '15 6 * * *',
    'SELECT public.fn_expire_quotations();');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible: %', SQLERRM;
END;
$$;

-- ============ Vista pública (con negocio) y aceptación por token ============
CREATE OR REPLACE FUNCTION public.get_quotation_by_public_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.quotations; o public.organizations; v_items jsonb; v_extras jsonb;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE public_token = _token;
  IF q.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO o FROM public.organizations WHERE id = q.organization_id;

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
      'name', e.name, 'kind', e.kind, 'qty', e.qty, 'unitPrice', e.unit_price, 'total', e.total
    ) ORDER BY e.sort_order), '[]'::jsonb)
  INTO v_extras
  FROM public.quotation_extras e WHERE e.quotation_id = q.id;

  RETURN jsonb_build_object(
    'number', q.number,
    'status', q.status,
    'orgName', o.name,
    'orgLogoUrl', o.logo_url,
    'clientName', q.client_name,
    'clientPhone', q.client_phone,
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

CREATE OR REPLACE FUNCTION public.accept_quotation_by_public_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.quotations;
BEGIN
  SELECT * INTO q FROM public.quotations WHERE public_token = _token;
  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Cotización no encontrada');
  END IF;
  IF q.status = 'aceptada' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'aceptada', 'message', 'Esta cotización ya estaba aceptada');
  END IF;
  IF q.status <> 'enviada' THEN
    RETURN jsonb_build_object('ok', false, 'status', q.status,
      'message', 'Esta cotización no está disponible para aceptar');
  END IF;
  IF q.valid_until IS NOT NULL AND q.valid_until < current_date THEN
    UPDATE public.quotations SET status = 'vencida', updated_at = now() WHERE id = q.id;
    RETURN jsonb_build_object('ok', false, 'status', 'vencida',
      'message', 'La cotización venció el ' || to_char(q.valid_until, 'DD/MM/YYYY'));
  END IF;

  UPDATE public.quotations SET status = 'aceptada', updated_at = now() WHERE id = q.id;
  RETURN jsonb_build_object('ok', true, 'status', 'aceptada', 'message', '¡Cotización aceptada!');
END;
$$;

REVOKE ALL ON FUNCTION public.accept_quotation_by_public_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_quotation_by_public_token(uuid) TO anon, authenticated, service_role;