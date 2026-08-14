-- PATCH v4.2 — segurança de cargos em clínicas Lumen já implantadas
-- Corrige escalonamento de privilégio na tabela public.users.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.

BEGIN;

-- Consulta o papel atual com SECURITY DEFINER para evitar recursão nas
-- políticas RLS da própria tabela public.users.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- O nome e o avatar do perfil são salvos em auth.users.user_metadata.
-- public.users contém autorização; o usuário não deve editar a própria linha.
DROP POLICY IF EXISTS "Edicao proprio perfil" ON public.users;

DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
CREATE POLICY "Admins can update user roles" ON public.users
FOR UPDATE TO authenticated
USING (
  current_user_role() = 'superadmin'
  OR (
    current_user_role() = 'owner'
    AND id <> (select auth.uid())
    AND role NOT IN ('owner', 'superadmin')
  )
)
WITH CHECK (
  (
    current_user_role() = 'superadmin'
    AND role IN ('especialista', 'owner', 'admin', 'superadmin', 'gestor', 'user')
  )
  OR (
    current_user_role() = 'owner'
    AND id <> (select auth.uid())
    AND role IN ('especialista', 'admin', 'gestor', 'user')
  )
);

COMMIT;

-- Resultado esperado:
-- - usuário comum/especialista/gestor/admin não altera role;
-- - owner gerencia especialista/gestor/admin/user, exceto a própria conta;
-- - owner não cria nem altera owner/superadmin;
-- - superadmin gerencia todos os cargos.
