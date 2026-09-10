CREATE TYPE public.global_app_role AS ENUM ('super_admin');

CREATE TABLE public.user_global_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.global_app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_global_roles TO authenticated;
GRANT ALL ON public.user_global_roles TO service_role;

ALTER TABLE public.user_global_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own global roles"
ON public.user_global_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_global_role(_user_id uuid, _role public.global_app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_global_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_global_role(uuid, public.global_app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_global_role(uuid, public.global_app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_role(uuid, public.global_app_role) TO service_role;

CREATE TRIGGER update_user_global_roles_updated_at
BEFORE UPDATE ON public.user_global_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();