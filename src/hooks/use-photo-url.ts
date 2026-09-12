import { useEffect, useState } from "react";
import { resolvePhotoUrl } from "@/lib/photos";

/** Devuelve una URL mostrable para una foto guardada (archivo subido o enlace externo). */
export function usePhotoUrl(value?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    resolvePhotoUrl(value).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}
