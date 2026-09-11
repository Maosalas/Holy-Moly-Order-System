
WITH org AS (SELECT '7f3b72e6-4fe8-4302-aad0-1efbac47c27e'::uuid AS id)
INSERT INTO public.ingredients (organization_id, name, provider, qty_provider, units, cost, base_unit, current_cost, last_cost, category)
SELECT id, name, provider, qty_provider, units, cost, base_unit, current_cost, current_cost, category FROM (VALUES
  ('Café molido', 'Proveedor', 250, 'g', 2800, 'g', 11.20, 'Café'),
  ('Agua', '—', 1, 'ml', 0, 'ml', 0, 'Básicos'),
  ('Azúcar', 'Proveedor', 2, 'kg', 1800, 'g', 0.90, 'Endulzantes'),
  ('Harina', 'Proveedor', 45.36, 'kg', 22000, 'g', 0.485009, 'Harinas'),
  ('Huevo', 'Proveedor', 30, 'unidad', 2500, 'unidad', 83.3333, 'Huevos y lácteos'),
  ('Cacao', 'Proveedor', 500, 'g', 4500, 'g', 9.00, 'Chocolates')
) AS v(name, provider, qty_provider, units, cost, base_unit, current_cost, category), org
WHERE NOT EXISTS (SELECT 1 FROM public.ingredients i WHERE i.organization_id = org.id AND i.name = v.name);

INSERT INTO public.ingredient_presentations (organization_id, ingredient_id, description, qty, unit_code, price, is_default, active)
SELECT i.organization_id, i.id, p.description, p.qty, p.unit_code, p.price, true, true
FROM public.ingredients i
JOIN (VALUES
  ('Café molido', 'Bolsa 250 g', 250::numeric, 'g', 2800::numeric),
  ('Agua', 'Litro', 1::numeric, 'l', 0::numeric),
  ('Azúcar', 'Bolsa 2 kg', 2::numeric, 'kg', 1800::numeric),
  ('Harina', 'Saco 45,36 kg', 45.36::numeric, 'kg', 22000::numeric),
  ('Huevo', 'Cartón 30 unidades', 30::numeric, 'unidad', 2500::numeric),
  ('Cacao', 'Bolsa 500 g', 500::numeric, 'g', 4500::numeric)
) AS p(name, description, qty, unit_code, price) ON p.name = i.name
WHERE i.organization_id = '7f3b72e6-4fe8-4302-aad0-1efbac47c27e'::uuid
  AND NOT EXISTS (SELECT 1 FROM public.ingredient_presentations ip WHERE ip.ingredient_id = i.id AND ip.description = p.description);
