-- PATCH v4.1 — clínicas já implantadas (Lumen)
-- Permite que owner/superadmin atribuam o papel 'gestor'.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.

DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
CREATE POLICY "Admins can update user roles" ON public.users
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('superadmin', 'owner')
)
WITH CHECK (
  role IN ('especialista', 'owner', 'admin', 'superadmin', 'gestor')
);
