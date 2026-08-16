-- Hotfix v45c: DELETE com WHERE (PostgREST safeupdate / código 21000)
-- Rodar no SQL Editor se a CLI não aplicar. Idempotente.

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
    DELETE FROM public.documentos_pacientes WHERE id IS NOT NULL;
    DELETE FROM public.galeria_paciente WHERE id IS NOT NULL;
    DELETE FROM public.evolucoes WHERE id IS NOT NULL;
    DELETE FROM public.anamneses WHERE id IS NOT NULL;
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

NOTIFY pgrst, 'reload schema';
