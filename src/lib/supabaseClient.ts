import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// NOTE:
// In Lovable Cloud, environment variables are injected automatically.
// Sometimes the URL isn't injected as VITE_SUPABASE_URL in the preview;
// we can safely derive it from VITE_SUPABASE_PROJECT_ID.

const env = import.meta.env as ImportMetaEnv & {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
};

const projectId = env.VITE_SUPABASE_PROJECT_ID;

const supabaseUrl =
  env.VITE_SUPABASE_URL ??
  (projectId ? `https://${projectId}.supabase.co` : undefined);

const supabaseAnonKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throwing here is still better than a confusing `supabaseUrl is required`.
  // This message will show in the console and error overlay.
  // eslint-disable-next-line no-console
  console.error("Missing Lovable Cloud env:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    projectId,
  });
  throw new Error(
    "Lovable Cloud configuration is missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
