-- =========================================================================
-- MIGRATION: Remover artefatos do ecossistema n8n (sistema-clinica01 → 02)
-- Use SOMENTE se o banco foi criado com o schema antigo (com n8n/Chatwoot).
-- Instalações novas com MASTER_SCHEMA.sql do Lumen NÃO precisam.
-- =========================================================================

DROP VIEW IF EXISTS public.vw_leads_com_tempo;
DROP FUNCTION IF EXISTS public.clean_old_n8n_chat_histories(integer);
DROP FUNCTION IF EXISTS public.minutos_ultima_mensagem(public.leads_estetica);

DROP TABLE IF EXISTS public.transbordos_atendimento;
DROP TABLE IF EXISTS public.n8n_chat_histories;
DROP TABLE IF EXISTS public.api_tokens;

ALTER TABLE public.leads_estetica
  DROP COLUMN IF EXISTS id_conta_chatwoot,
  DROP COLUMN IF EXISTS id_conversa_chatwoot,
  DROP COLUMN IF EXISTS id_lead_chatwoot,
  DROP COLUMN IF EXISTS inbox_id_chatwoot;

-- Recriar get_or_create_lead sem parâmetros Chatwoot (copie de MASTER_SCHEMA.sql seção 5.6)
-- ou rode o MASTER_SCHEMA.sql completo em banco de teste antes de produção.
