-- PATCH v4.3 — segurança de prontuário, estoque e arquivos
-- Alinha o banco às permissões já usadas pela interface do Lumen.
-- Pré-requisito: PATCH_security_users_v42.sql.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.

BEGIN;

-- -------------------------------------------------------------------------
-- 1. TABELAS CLÍNICAS
-- Equipe clínica: superadmin, owner, admin, gestor e especialista.
-- Exclusões e gestão de modelos ficam restritas aos perfis administrativos.
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Acesso total fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos leem fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos criam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos atualizam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Admins excluem fichas" ON public.fichas_clinicas;
CREATE POLICY "Clinicos leem fichas" ON public.fichas_clinicas FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam fichas" ON public.fichas_clinicas FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos atualizam fichas" ON public.fichas_clinicas FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'))
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem fichas" ON public.fichas_clinicas FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos leem anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos criam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos atualizam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Admins excluem anamneses" ON public.anamneses;
CREATE POLICY "Clinicos leem anamneses" ON public.anamneses FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam anamneses" ON public.anamneses FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos atualizam anamneses" ON public.anamneses FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'))
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem anamneses" ON public.anamneses FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Clinicos leem evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Clinicos criam evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Admins excluem evolucoes" ON public.evolucoes;
CREATE POLICY "Clinicos leem evolucoes" ON public.evolucoes FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam evolucoes" ON public.evolucoes FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem evolucoes" ON public.evolucoes FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Clinicos leem galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Clinicos criam galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Admins excluem galeria" ON public.galeria_paciente;
CREATE POLICY "Clinicos leem galeria" ON public.galeria_paciente FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam galeria" ON public.galeria_paciente FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem galeria" ON public.galeria_paciente FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Clinicos leem templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins criam templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins atualizam templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins excluem templates" ON public.templates_clinicos;
CREATE POLICY "Clinicos leem templates" ON public.templates_clinicos FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins criam templates" ON public.templates_clinicos FOR INSERT TO authenticated
WITH CHECK (public.check_is_admin());
CREATE POLICY "Admins atualizam templates" ON public.templates_clinicos FOR UPDATE TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Admins excluem templates" ON public.templates_clinicos FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total doc_pacientes" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Clinicos leem documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Clinicos criam documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Admins excluem documentos" ON public.documentos_pacientes;
CREATE POLICY "Clinicos leem documentos" ON public.documentos_pacientes FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam documentos" ON public.documentos_pacientes FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem documentos" ON public.documentos_pacientes FOR DELETE TO authenticated
USING (public.check_is_admin());

-- -------------------------------------------------------------------------
-- 2. ESTOQUE
-- A rota de estoque é administrativa; o banco agora aplica a mesma regra.
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Acesso total produtos" ON public.produtos_estoque;
DROP POLICY IF EXISTS "Admins gerenciam produtos" ON public.produtos_estoque;
CREATE POLICY "Admins gerenciam produtos" ON public.produtos_estoque FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total movimentacoes" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Admins gerenciam movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Admins gerenciam movimentacoes" ON public.movimentacoes_estoque FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Acesso total kits" ON public.kits_procedimento;
DROP POLICY IF EXISTS "Admins gerenciam kits" ON public.kits_procedimento;
CREATE POLICY "Admins gerenciam kits" ON public.kits_procedimento FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- -------------------------------------------------------------------------
-- 3. STORAGE
-- Buckets públicos continuam públicos; somente escrita/exclusão é restringida.
-- Buckets privados passam a seguir os mesmos papéis das respectivas telas.
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir upload de avatares para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload de avatares para autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE ((select auth.uid())::text || '-%')
);
DROP POLICY IF EXISTS "Permitir exclusao de avatares pelo dono" ON storage.objects;
CREATE POLICY "Permitir exclusao de avatares pelo dono" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE ((select auth.uid())::text || '-%')
);

DROP POLICY IF EXISTS "Allow Auth Uploads" ON storage.objects;
CREATE POLICY "Allow Auth Uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinic-assets'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin')
);
DROP POLICY IF EXISTS "Allow Auth Deletes" ON storage.objects;
CREATE POLICY "Allow Auth Deletes" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'clinic-assets'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin')
);

DROP POLICY IF EXISTS "Permitir upload no prontuario para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload no prontuario para autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'prontuarios'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
);
DROP POLICY IF EXISTS "Permitir leitura no prontuario para autenticados" ON storage.objects;
CREATE POLICY "Permitir leitura no prontuario para autenticados" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'prontuarios'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
);
DROP POLICY IF EXISTS "Permitir exclusao no prontuario para autenticados" ON storage.objects;
CREATE POLICY "Permitir exclusao no prontuario para autenticados" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'prontuarios' AND public.check_is_admin());

DROP POLICY IF EXISTS "Upload ass" ON storage.objects;
CREATE POLICY "Upload ass" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assinaturas'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
);
DROP POLICY IF EXISTS "Leitura ass" ON storage.objects;
CREATE POLICY "Leitura ass" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'assinaturas'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
);
DROP POLICY IF EXISTS "Delete ass" ON storage.objects;
CREATE POLICY "Delete ass" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'assinaturas' AND public.check_is_admin());

DROP POLICY IF EXISTS "Permitir upload no financeiro para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload no financeiro para autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financeiro' AND public.check_is_admin());
DROP POLICY IF EXISTS "Permitir leitura no financeiro para autenticados" ON storage.objects;
CREATE POLICY "Permitir leitura no financeiro para autenticados" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'financeiro' AND public.check_is_admin());
DROP POLICY IF EXISTS "Permitir exclusao no financeiro para autenticados" ON storage.objects;
CREATE POLICY "Permitir exclusao no financeiro para autenticados" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'financeiro' AND public.check_is_admin());

DROP POLICY IF EXISTS "Permitir upload no estoque para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload no estoque para autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'estoque' AND public.check_is_admin());
DROP POLICY IF EXISTS "Permitir leitura no estoque para autenticados" ON storage.objects;
CREATE POLICY "Permitir leitura no estoque para autenticados" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'estoque' AND public.check_is_admin());
DROP POLICY IF EXISTS "Permitir exclusao no estoque para autenticados" ON storage.objects;
CREATE POLICY "Permitir exclusao no estoque para autenticados" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'estoque' AND public.check_is_admin());

COMMIT;
