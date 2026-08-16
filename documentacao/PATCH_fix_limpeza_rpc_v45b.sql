-- Hotfix: garante RPC limpar_dados_teste + bypass de RLS + reload do PostgREST
-- Rodar no SQL Editor do projeto lumen. Idempotente.

BEGIN;

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
    DELETE FROM public.agendamentos_estetica;
    GET DIAGNOSTICS v_ag_count = ROW_COUNT;
  END IF;

  IF p_incluir_notas THEN
    DELETE FROM public.lead_notes;
    GET DIAGNOSTICS v_notas_count = ROW_COUNT;
  END IF;

  IF p_incluir_leads THEN
    -- remove dependências clínicas antes dos leads
    DELETE FROM public.documentos_pacientes
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.galeria_paciente
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.evolucoes
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.anamneses
    WHERE ficha_id IN (SELECT id FROM public.fichas_clinicas);
    DELETE FROM public.fichas_clinicas;
    DELETE FROM public.leads_estetica;
    GET DIAGNOSTICS v_leads_count = ROW_COUNT;
  END IF;

  IF p_incluir_agendas_inativas THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_ids
    FROM public.agendas
    WHERE ativo = false;

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) IS NOT NULL THEN
      -- garante que não restam agendamentos nas agendas inativas
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

COMMIT;

-- Força o PostgREST a reconhecer a função
NOTIFY pgrst, 'reload schema';

-- Diagnóstico rápido (rode separado se quiser):
-- SELECT proname FROM pg_proc WHERE proname = 'limpar_dados_teste';
-- SELECT id, role FROM public.users WHERE id = auth.uid();
