CREATE POLICY "Org members read item photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1]::uuid = ANY (public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org members upload item photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1]::uuid = ANY (public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org members update item photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1]::uuid = ANY (public.get_user_organization_ids(auth.uid()))
)
WITH CHECK (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1]::uuid = ANY (public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org members delete item photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'item-photos'
  AND (storage.foldername(name))[1]::uuid = ANY (public.get_user_organization_ids(auth.uid()))
);