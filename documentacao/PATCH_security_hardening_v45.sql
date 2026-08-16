-- =========================================================================
-- PATCH v4.5 — Hardening de segurança (IDOR, CPF, limpeza, storage, NPS)
-- Pré-requisitos: PATCH_security_users_v42, clinical_storage_v43, agenda_crm_v44.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.
--
-- Regras:
--   - Gestores (superadmin/owner/admin/gestor): acesso clínico amplo.
--   - Especialista: somente agendas com agendas.usuario_id = auth.uid()
--     e leads/fichas/arquivos vinculados a esses agendamentos.
--   - CPF mascarado no servidor para especialista (views *_safe).
--   - Limpeza de dados: RPC exclusiva de superadmin.
--   - clinic_config: anon só vê branding público.
--   - auth_users: listagem via RPC (owner/superadmin).
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. HELPERS
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_view_full_cpf()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor');
$$;

CREATE OR REPLACE FUNCTION public.is_clinical_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista');
$$;

CREATE OR REPLACE FUNCTION public.owns_agenda(p_agenda_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agendas a
    WHERE a.id = p_agenda_id
      AND a.usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.especialista_has_lead_access(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agendamentos_estetica ae
    JOIN public.agendas a ON a.id = ae.agenda_id
    WHERE ae.lead_id = p_lead_id
      AND a.usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.especialista_has_ficha_access(p_ficha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fichas_clinicas f
    WHERE f.id = p_ficha_id
      AND public.especialista_has_lead_access(f.paciente_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.mask_cpf(p_cpf text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_cpf IS NULL OR btrim(p_cpf) = '' THEN NULL
    ELSE '***.***.***-**'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_full_cpf() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_clinical_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_agenda(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.especialista_has_lead_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.especialista_has_ficha_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_full_cpf() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinical_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_agenda(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.especialista_has_lead_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.especialista_has_ficha_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_cpf(text) TO authenticated, anon;

-- -------------------------------------------------------------------------
-- 2. VIEWS SEGURAS (CPF mascarado + branding público)
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.clinic_branding_public
AS
SELECT
  id,
  nome,
  logo_url,
  tema,
  tema_cor,
  plano
FROM public.clinic_config
WHERE id = 1;

REVOKE ALL ON public.clinic_branding_public FROM PUBLIC;
GRANT SELECT ON public.clinic_branding_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.leads_estetica_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  whatsapp_lead,
  inicio_atendimento,
  nome_lead,
  motivo_contato,
  procedimento_interesse,
  resumo_conversa,
  status,
  ultima_mensagem,
  follow_up_1,
  follow_up_2,
  follow_up_3,
  data_agendamento,
  agendamento_criado_em,
  id_agendamento,
  observacoes,
  data_nascimento,
  genero,
  valor_pago,
  data_primeira_visita,
  CASE
    WHEN public.can_view_full_cpf() THEN cpf
    ELSE public.mask_cpf(cpf)
  END AS cpf,
  nota_nps
FROM public.leads_estetica;

REVOKE ALL ON public.leads_estetica_safe FROM PUBLIC;
GRANT SELECT ON public.leads_estetica_safe TO authenticated;

CREATE OR REPLACE VIEW public.agendamentos_estetica_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  agenda_id,
  lead_id,
  procedimento_nome,
  nome_lead,
  whatsapp_lead,
  data_hora_inicio,
  data_hora_fim,
  status,
  observacoes,
  created_at,
  CASE
    WHEN public.can_view_full_cpf() THEN cpf_lead
    ELSE public.mask_cpf(cpf_lead)
  END AS cpf_lead,
  data_nascimento_lead
FROM public.agendamentos_estetica;

REVOKE ALL ON public.agendamentos_estetica_safe FROM PUBLIC;
GRANT SELECT ON public.agendamentos_estetica_safe TO authenticated;

-- auth_users: revogar acesso amplo; listagem via RPC
REVOKE ALL ON public.auth_users FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_team_auth_users()
RETURNS TABLE (id uuid, email text, nome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF public.current_user_role() NOT IN ('superadmin', 'owner', 'admin', 'gestor') THEN
    RAISE EXCEPTION 'Sem permissão para listar usuários da equipe.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'nome')::text AS nome
  FROM auth.users u
  INNER JOIN public.users pu ON pu.id = u.id
  ORDER BY u.created_at DESC NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_team_auth_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_team_auth_users() TO authenticated;

-- -------------------------------------------------------------------------
-- 3. clinic_config — sem SELECT anon na tabela base
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "clinic_config_select_all_authenticated" ON public.clinic_config;
DROP POLICY IF EXISTS "clinic_config_select_authenticated" ON public.clinic_config;
CREATE POLICY "clinic_config_select_authenticated" ON public.clinic_config
FOR SELECT TO authenticated
USING (public.is_clinical_staff() OR public.check_is_admin());

-- -------------------------------------------------------------------------
-- 4. AGENDAS / HORÁRIOS / AGENDAMENTOS / LEADS — IDOR por agenda própria
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Equipe clinica le agendas" ON public.agendas;
DROP POLICY IF EXISTS "Admins gerenciam agendas" ON public.agendas;
DROP POLICY IF EXISTS "Especialista le propria agenda" ON public.agendas;
CREATE POLICY "Admins gerenciam agendas" ON public.agendas FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Especialista le propria agenda" ON public.agendas FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'especialista'
  AND usuario_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Equipe clinica le horarios" ON public.agenda_hours;
DROP POLICY IF EXISTS "Admins gerenciam horarios" ON public.agenda_hours;
DROP POLICY IF EXISTS "Especialista le horarios propria agenda" ON public.agenda_hours;
CREATE POLICY "Admins gerenciam horarios" ON public.agenda_hours FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Especialista le horarios propria agenda" ON public.agenda_hours FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'especialista'
  AND public.owns_agenda(agenda_id)
);

DROP POLICY IF EXISTS "Equipe clinica le agendamentos" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "Admins gerenciam agendamentos" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "Especialista le agendamentos propria agenda" ON public.agendamentos_estetica;
CREATE POLICY "Admins gerenciam agendamentos" ON public.agendamentos_estetica FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Especialista le agendamentos propria agenda" ON public.agendamentos_estetica FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'especialista'
  AND public.owns_agenda(agenda_id)
);

DROP POLICY IF EXISTS "Equipe clinica le leads" ON public.leads_estetica;
DROP POLICY IF EXISTS "Admins gerenciam leads" ON public.leads_estetica;
DROP POLICY IF EXISTS "Especialista le leads da propria agenda" ON public.leads_estetica;
CREATE POLICY "Admins gerenciam leads" ON public.leads_estetica FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Especialista le leads da propria agenda" ON public.leads_estetica FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'especialista'
  AND public.especialista_has_lead_access(id)
);

DROP POLICY IF EXISTS "Equipe clinica le notas" ON public.lead_notes;
DROP POLICY IF EXISTS "Equipe clinica cria notas" ON public.lead_notes;
DROP POLICY IF EXISTS "Criador edita nota" ON public.lead_notes;
DROP POLICY IF EXISTS "Criador ou admin exclui nota" ON public.lead_notes;
CREATE POLICY "Equipe clinica le notas" ON public.lead_notes FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_lead_access(lead_id)
  )
);
CREATE POLICY "Equipe clinica cria notas" ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    public.check_is_admin()
    OR (
      public.current_user_role() = 'especialista'
      AND public.especialista_has_lead_access(lead_id)
    )
  )
);
CREATE POLICY "Criador edita nota" ON public.lead_notes FOR UPDATE TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND (
    public.check_is_admin()
    OR (
      public.current_user_role() = 'especialista'
      AND public.especialista_has_lead_access(lead_id)
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
);
CREATE POLICY "Criador ou admin exclui nota" ON public.lead_notes FOR DELETE TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND (SELECT auth.uid()) = user_id
  )
);

-- -------------------------------------------------------------------------
-- 5. PRONTUÁRIO — IDOR por agenda própria
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clinicos leem fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos criam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos atualizam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Admins excluem fichas" ON public.fichas_clinicas;
CREATE POLICY "Clinicos leem fichas" ON public.fichas_clinicas FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_lead_access(paciente_id)
  )
);
CREATE POLICY "Clinicos criam fichas" ON public.fichas_clinicas FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_lead_access(paciente_id)
  )
);
CREATE POLICY "Clinicos atualizam fichas" ON public.fichas_clinicas FOR UPDATE TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_lead_access(paciente_id)
  )
)
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_lead_access(paciente_id)
  )
);
CREATE POLICY "Admins excluem fichas" ON public.fichas_clinicas FOR DELETE TO authenticated
USING (public.check_is_admin());

-- Impedir especialista de alterar nome/whatsapp de ficha existente
CREATE OR REPLACE FUNCTION public.guard_ficha_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.current_user_role() = 'especialista'
     AND TG_OP = 'UPDATE'
     AND OLD.id IS NOT NULL THEN
    IF NEW.nome_paciente IS DISTINCT FROM OLD.nome_paciente
       OR NEW.whatsapp_paciente IS DISTINCT FROM OLD.whatsapp_paciente
       OR NEW.paciente_id IS DISTINCT FROM OLD.paciente_id THEN
      RAISE EXCEPTION 'Especialista não pode alterar identificação da ficha.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ficha_identity ON public.fichas_clinicas;
CREATE TRIGGER trg_guard_ficha_identity
BEFORE UPDATE ON public.fichas_clinicas
FOR EACH ROW EXECUTE FUNCTION public.guard_ficha_identity_fields();

DROP POLICY IF EXISTS "Clinicos leem anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos criam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos atualizam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Admins excluem anamneses" ON public.anamneses;
CREATE POLICY "Clinicos leem anamneses" ON public.anamneses FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Clinicos criam anamneses" ON public.anamneses FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Clinicos atualizam anamneses" ON public.anamneses FOR UPDATE TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
)
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Admins excluem anamneses" ON public.anamneses FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Clinicos leem evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Clinicos criam evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Admins excluem evolucoes" ON public.evolucoes;
CREATE POLICY "Clinicos leem evolucoes" ON public.evolucoes FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Clinicos criam evolucoes" ON public.evolucoes FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Admins excluem evolucoes" ON public.evolucoes FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Clinicos leem galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Clinicos criam galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Admins excluem galeria" ON public.galeria_paciente;
CREATE POLICY "Clinicos leem galeria" ON public.galeria_paciente FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Clinicos criam galeria" ON public.galeria_paciente FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Admins excluem galeria" ON public.galeria_paciente FOR DELETE TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Clinicos leem documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Clinicos criam documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Admins excluem documentos" ON public.documentos_pacientes;
CREATE POLICY "Clinicos leem documentos" ON public.documentos_pacientes FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Clinicos criam documentos" ON public.documentos_pacientes FOR INSERT TO authenticated
WITH CHECK (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND public.especialista_has_ficha_access(ficha_id)
  )
);
CREATE POLICY "Admins excluem documentos" ON public.documentos_pacientes FOR DELETE TO authenticated
USING (public.check_is_admin());

-- Templates: leitura clínica ampla (sem PHI), escrita admin
DROP POLICY IF EXISTS "Clinicos leem templates" ON public.templates_clinicos;
CREATE POLICY "Clinicos leem templates" ON public.templates_clinicos FOR SELECT TO authenticated
USING (public.is_clinical_staff());

-- -------------------------------------------------------------------------
-- 6. NPS
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Acesso total nps" ON public.nps_feedbacks;
DROP POLICY IF EXISTS "Insercao nps anonima" ON public.nps_feedbacks;
DROP POLICY IF EXISTS "Admins gerenciam nps" ON public.nps_feedbacks;
DROP POLICY IF EXISTS "Equipe clinica cria nps" ON public.nps_feedbacks;
CREATE POLICY "Admins gerenciam nps" ON public.nps_feedbacks FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
CREATE POLICY "Equipe clinica cria nps" ON public.nps_feedbacks FOR INSERT TO authenticated
WITH CHECK (public.is_clinical_staff());

-- -------------------------------------------------------------------------
-- 7. STORAGE — path ficha_id/... + sem INSERT direto (Edge Function service_role)
-- -------------------------------------------------------------------------

-- Helper: primeiro segmento do path = ficha uuid?
CREATE OR REPLACE FUNCTION public.storage_ficha_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  segment text;
BEGIN
  segment := split_part(object_name, '/', 1);
  IF segment ~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN segment::uuid;
  END IF;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.storage_ficha_id(text) TO authenticated, anon;

DROP POLICY IF EXISTS "Permitir upload no prontuario para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura no prontuario para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao no prontuario para autenticados" ON storage.objects;
CREATE POLICY "Leitura prontuario por ficha" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'prontuarios'
  AND (
    public.check_is_admin()
    OR (
      public.current_user_role() = 'especialista'
      AND public.especialista_has_ficha_access(public.storage_ficha_id(name))
    )
  )
);
CREATE POLICY "Exclusao prontuario admin" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'prontuarios' AND public.check_is_admin());

DROP POLICY IF EXISTS "Upload ass" ON storage.objects;
DROP POLICY IF EXISTS "Leitura ass" ON storage.objects;
DROP POLICY IF EXISTS "Delete ass" ON storage.objects;
CREATE POLICY "Leitura assinaturas por ficha" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'assinaturas'
  AND (
    public.check_is_admin()
    OR (
      public.current_user_role() = 'especialista'
      AND public.especialista_has_ficha_access(public.storage_ficha_id(name))
    )
  )
);
CREATE POLICY "Exclusao assinaturas admin" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'assinaturas' AND public.check_is_admin());

DROP POLICY IF EXISTS "Permitir upload no financeiro para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura no financeiro para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao no financeiro para autenticados" ON storage.objects;
CREATE POLICY "Leitura financeiro admin" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'financeiro' AND public.check_is_admin());
CREATE POLICY "Exclusao financeiro admin" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'financeiro' AND public.check_is_admin());

DROP POLICY IF EXISTS "Permitir upload no estoque para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura no estoque para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao no estoque para autenticados" ON storage.objects;
CREATE POLICY "Leitura estoque admin" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'estoque' AND public.check_is_admin());
CREATE POLICY "Exclusao estoque admin" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'estoque' AND public.check_is_admin());

-- Avatars / clinic-assets: leitura pública permanece; upload via Edge Function (service_role)
DROP POLICY IF EXISTS "Permitir upload de avatares para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Allow Auth Uploads" ON storage.objects;

-- Limites de MIME/tamanho nos buckets privados
UPDATE storage.buckets
SET
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id IN ('prontuarios', 'assinaturas', 'financeiro', 'estoque');

UPDATE storage.buckets
SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'clinic-assets');

-- -------------------------------------------------------------------------
-- 8. RPC limpeza (somente superadmin)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_data_cleanup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_data_cleanup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin le audit cleanup" ON public.audit_data_cleanup;
CREATE POLICY "Superadmin le audit cleanup" ON public.audit_data_cleanup
FOR SELECT TO authenticated
USING (public.current_user_role() = 'superadmin');

CREATE OR REPLACE FUNCTION public.limpar_dados_teste(
  p_incluir_agendamentos boolean DEFAULT true,
  p_incluir_notas boolean DEFAULT true,
  p_incluir_leads boolean DEFAULT false,
  p_incluir_agendas_inativas boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO off
AS $$
DECLARE
  v_role text;
  v_ag_count integer := 0;
  v_notas_count integer := 0;
  v_leads_count integer := 0;
  v_agendas_count integer := 0;
  v_ids uuid[];
  v_result jsonb;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Apenas superadmin pode limpar dados de teste. Seu papel atual: %', COALESCE(v_role, 'null');
  END IF;

  IF p_incluir_agendamentos THEN
    DELETE FROM public.agendamentos_estetica WHERE id IS NOT NULL;
    GET DIAGNOSTICS v_ag_count = ROW_COUNT;
  END IF;

  IF p_incluir_notas THEN
    DELETE FROM public.lead_notes WHERE id IS NOT NULL;
    GET DIAGNOSTICS v_notas_count = ROW_COUNT;
  END IF;

  IF p_incluir_leads THEN
    DELETE FROM public.documentos_pacientes
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.galeria_paciente
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.evolucoes
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.anamneses
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.fichas_clinicas WHERE id IS NOT NULL;
    DELETE FROM public.leads_estetica WHERE id IS NOT NULL;
    GET DIAGNOSTICS v_leads_count = ROW_COUNT;
  END IF;

  IF p_incluir_agendas_inativas THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_ids
    FROM public.agendas
    WHERE ativo = false;

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) IS NOT NULL THEN
      DELETE FROM public.agendamentos_estetica WHERE agenda_id = ANY(v_ids);
      DELETE FROM public.agenda_hours WHERE agenda_id = ANY(v_ids);
      DELETE FROM public.agendas WHERE id = ANY(v_ids);
      GET DIAGNOSTICS v_agendas_count = ROW_COUNT;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'agendamentos', v_ag_count,
    'notas', v_notas_count,
    'leads', v_leads_count,
    'agendas_inativas', v_agendas_count
  );

  INSERT INTO public.audit_data_cleanup (performed_by, payload, result)
  VALUES (
    auth.uid(),
    jsonb_build_object(
      'incluir_agendamentos', p_incluir_agendamentos,
      'incluir_notas', p_incluir_notas,
      'incluir_leads', p_incluir_leads,
      'incluir_agendas_inativas', p_incluir_agendas_inativas
    ),
    v_result
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.limpar_dados_teste(boolean, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.limpar_dados_teste(boolean, boolean, boolean, boolean) TO authenticated;

-- -------------------------------------------------------------------------
-- 9. CONSTRAINTS de validação (NOT VALID — não quebra legado)
-- -------------------------------------------------------------------------

ALTER TABLE public.leads_estetica
  DROP CONSTRAINT IF EXISTS leads_cpf_format_chk;
ALTER TABLE public.leads_estetica
  ADD CONSTRAINT leads_cpf_format_chk
  CHECK (cpf IS NULL OR cpf = '' OR length(regexp_replace(cpf, '\D', '', 'g')) = 11)
  NOT VALID;

ALTER TABLE public.leads_estetica
  DROP CONSTRAINT IF EXISTS leads_whatsapp_len_chk;
ALTER TABLE public.leads_estetica
  ADD CONSTRAINT leads_whatsapp_len_chk
  CHECK (whatsapp_lead IS NULL OR char_length(whatsapp_lead) BETWEEN 8 AND 20)
  NOT VALID;

ALTER TABLE public.leads_estetica
  DROP CONSTRAINT IF EXISTS leads_nome_len_chk;
ALTER TABLE public.leads_estetica
  ADD CONSTRAINT leads_nome_len_chk
  CHECK (nome_lead IS NULL OR char_length(nome_lead) <= 120)
  NOT VALID;

ALTER TABLE public.nps_feedbacks
  DROP CONSTRAINT IF EXISTS nps_cliente_nome_len_chk;
ALTER TABLE public.nps_feedbacks
  ADD CONSTRAINT nps_cliente_nome_len_chk
  CHECK (char_length(cliente_nome) BETWEEN 1 AND 120)
  NOT VALID;

ALTER TABLE public.nps_feedbacks
  DROP CONSTRAINT IF EXISTS nps_comentario_len_chk;
ALTER TABLE public.nps_feedbacks
  ADD CONSTRAINT nps_comentario_len_chk
  CHECK (comentario IS NULL OR char_length(comentario) <= 2000)
  NOT VALID;

-- Localizar legado inválido (rodar manualmente antes de VALIDATE CONSTRAINT):
-- SELECT id, cpf, whatsapp_lead FROM public.leads_estetica
-- WHERE cpf IS NOT NULL AND cpf <> '' AND length(regexp_replace(cpf, '\D', '', 'g')) <> 11;
-- Depois: ALTER TABLE ... VALIDATE CONSTRAINT ...;

COMMIT;

-- =========================================================================
-- VERIFICAÇÃO PÓS-DEPLOY (rodar fora da transação, com sessões de teste)
-- =========================================================================
-- 1) anon: SELECT * FROM clinic_config;           -- deve falhar / 0 rows
-- 2) anon: SELECT * FROM clinic_branding_public;  -- ok
-- 3) especialista: SELECT * FROM agendas;         -- só suas agendas
-- 4) especialista: SELECT cpf FROM leads_estetica_safe; -- mascarado
-- 5) gestor: SELECT cpf FROM leads_estetica_safe; -- completo
-- 6) superadmin: SELECT limpar_dados_teste(false,false,false,false);
-- 7) gestor: SELECT limpar_dados_teste(...);      -- deve falhar
-- 8) authenticated: SELECT * FROM auth_users;     -- deve falhar
-- 9) owner: SELECT * FROM list_team_auth_users(); -- ok
