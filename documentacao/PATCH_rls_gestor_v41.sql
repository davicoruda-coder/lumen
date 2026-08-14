-- PATCH v4.1 — clínicas já implantadas (Lumen)
-- Permite que owner/superadmin atribuam o papel 'gestor'.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.
-- OBSOLETO: em instalações atuais, use PATCH_security_users_v42.sql, que
-- mantém o suporte a gestor e também bloqueia escalonamento de privilégios.

DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
CREATE POLICY "Admins can update user roles" ON public.users
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('superadmin', 'owner')
)
WITH CHECK (
  role IN ('especialista', 'owner', 'admin', 'superadmin', 'gestor')
);
