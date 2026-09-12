import { supabase } from "@/lib/supabaseClient";

export const ITEM_PHOTOS_BUCKET = "item-photos";

const signedCache = new Map<string, { url: string; expires: number }>();

export const isExternalUrl = (value?: string | null) =>
  !!value && /^(https?:)?\/\//i.test(value);

/** Sube una foto al almacenamiento de la organización y devuelve la ruta guardada. */
export async function uploadItemPhoto(file: File, organizationId: string): Promise<string> {
  if (!organizationId) throw new Error("No hay una organización seleccionada.");
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen no puede pesar más de 10 MB.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (error) throw new Error(error.message);
  return path;
}

/** Convierte el valor guardado (ruta interna o enlace externo) en una URL mostrable. */
export async function resolvePhotoUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  if (isExternalUrl(value)) return value;

  const cached = signedCache.get(value);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .createSignedUrl(value, 60 * 60);

  if (error || !data?.signedUrl) return null;
  signedCache.set(value, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
