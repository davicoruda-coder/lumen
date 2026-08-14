-- =========================================================================
-- MASTER SCHEMA: ELLEGANCE CLÍNICA INTEGRADA
-- Versão: 3.5 (Consolidado com 27 tabelas de produção)
-- Data: Jun/2026
--
-- LGPD / Dados sensíveis (campos em leads_estetica: cpf, data_nascimento):
-- A política de exibição é aplicada no frontend (RBAC), não via views SQL.
-- Especialistas: data_nascimento visível; CPF mascarado na UI.
-- Gestores (owner/admin/superadmin/gestor): acesso ao CPF completo onde necessário.
-- Nenhuma alteração de coluna é necessária para essa regra.
--
-- CHANGELOG v3.1 (31/Mai/2026):
--   - Campo whatsapp_lead da tabela agendamentos_estetica agora é preenchido
--     desde o momento da criação do agendamento pelo modal do frontend
--     (sem mudança estrutural no banco — coluna já existia).
--   - Papel 'gestor' adicionado à lista de roles com permissão de editar
--     dados cadastrais no modal de detalhes da Agenda (RBAC frontend).
--
-- CHANGELOG v3.2 (31/Mai/2026):
--   - Nova ferramenta "Limpar Dados de Teste" adicionada em
--     Configurações > Clínica > Zona de Perigo (superadmin only).
--   - Permite deletar em massa via frontend:
--       * agendamentos_estetica (todos os registros)
--       * lead_notes (histórico CRM)
--       * leads_estetica (opcional, com dupla confirmação)
--   - Sem mudança estrutural no banco: usa DELETE nas tabelas existentes.
--   - Visibilidade restrita a role = 'superadmin' (RBAC frontend).
--
-- CHANGELOG v3.3 (Jun/2026):
--   - Restrições de segurança RBAC no Prontuário: especialistas não podem
--     editar Nome e WhatsApp de fichas clínicas já existentes (campos read-only).
--   - Proteção contra manipulação de URL em Configurações: guarda no
--     frontend valida aba ativa vs. role do usuário, redireciona se inválido.
--   - Edição de nome do agendamento (modal da Agenda) liberada para gestores
--     (owner, admin, superadmin, gestor) — RBAC frontend.
--   - Especialistas: acesso à tela de Configurações restrito às abas
--     'minha-conta' e 'personalizacao' apenas (URL guard ativo).
--
-- CHANGELOG v3.4 (Jun/2026):
--   - VIEW auth_users atualizada: passa a expor também o campo 'nome'
--     (raw_user_meta_data->>'nome') além de id e email.
--   - Frontend (TabUsuarios.tsx): lista de usuários em Configurações > Equipe
--     agora exibe o nome completo do usuário como linha principal e o e-mail
--     como subtítulo. Usuários sem nome cadastrado continuam exibindo apenas
--     o e-mail (retrocompatível).
--   - Mudança já consolidada neste MASTER_SCHEMA (migrations avulsas removidas).
--
-- CHANGELOG v3.5 (Jun/2026):
--   - Plano único de produção: clinic_config.plano DEFAULT 'GESTAO'
--     (exibição: "Plano Integrado Premium"). Valores legados (ESSENCIAL,
--     PROFISSIONAL, PREMIUM, CLINICO) mantidos no CHECK por compatibilidade.
--   - Seed inicial (seção 8.1) usa 'GESTAO' — personalização por cliente via
--     clientes/<slug>/clinic_config_personalizar.sql (gerado por npm run clonar-clinica).
--
-- CHANGELOG v4.0 (Jun/2026) — Lumen (ex-sistema-clinica02):
--   - Removidas tabelas/views legadas de automação externa (histórico IA,
--     transbordos, tokens API, view de follow-up) e colunas Chatwoot em leads_estetica.
--   - Clonagem em fase única: npm run clonar-clinica -- <slug>
--   - Migração opcional de bancos antigos: MIGRATION_n8n_legacy.sql
--
-- CHANGELOG v4.1 (Ago/2026):
--   - RLS "Admins can update user roles": WITH CHECK passa a incluir 'gestor'
--     (antes owner/superadmin não conseguiam atribuir o papel gestor).
--   - Clínicas já implantadas: rodar PATCH_rls_gestor_v41.sql.
-- =========================================================================

-- 0. EXTENSÕES DO POSTGRES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TIPOS ENUM (Regras e Domínios do Sistema)
DO $$ BEGIN
    CREATE TYPE public.dia_semana AS ENUM ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.lead_status AS ENUM ('inicio_atendimento', 'conversando', 'agendado', 'cancelamento', 'compareceu', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'nao_respondeu_follow_up', 'cancelou_agendamento', 'abandonou_conversa');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.agendamento_status AS ENUM ('agendado', 'confirmado', 'compareceu', 'faltou', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('superadmin', 'owner', 'admin', 'gestor', 'especialista', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. FUNÇÕES E SEGURANÇA AUXILIARES (SECURITY DEFINER)
-- 2.1 Verificar se o usuário atual é Administrador/Superadmin/Owner
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() 
    AND (role = 'superadmin' OR role = 'admin' OR role = 'owner' OR role = 'gestor')
  );
END;
$function$;

-- 2.2 Papel do usuário atual sem recursão nas políticas RLS de public.users
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

-- 2.3 Trigger automático para criar o usuário local ao registrar na auth do Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, role) 
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2.3 VIEW SEGURA DE AUTH (Para exibição segura de e-mails e nomes em listagens de equipe)
-- v3.4: inclui campo 'nome' extraído de raw_user_meta_data para exibição na lista de Usuários
CREATE OR REPLACE VIEW public.auth_users AS
SELECT 
    id,
    email,
    (raw_user_meta_data->>'nome')::text AS nome
FROM auth.users;
GRANT SELECT ON public.auth_users TO authenticated;

-- =========================================================================
-- 3. DEFINIÇÃO DAS 27 TABELAS DO SISTEMA
-- =========================================================================

-- Tabela 1: CONFIGURAÇÃO DE USUÁRIOS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now()
);

-- (Tabela profiles removida — legado não utilizado pelo código. Manter apenas public.users)

-- Tabela 3: CONFIGURAÇÕES DA CLÍNICA
CREATE TABLE IF NOT EXISTS public.clinic_config (
    id integer PRIMARY KEY DEFAULT 1,
    nome text DEFAULT 'Minha Clínica'::text,
    cnpj text,
    logo_url text,
    updated_at timestamp with time zone DEFAULT now(),
    -- Plano único: GESTAO = "Plano Integrado Premium" (valores legados mantidos no CHECK por compatibilidade)
    plano text DEFAULT 'GESTAO'::text CHECK (plano = ANY (ARRAY['ESSENCIAL'::text, 'PROFISSIONAL'::text, 'PREMIUM'::text, 'CLINICO'::text, 'GESTAO'::text])),
    tema text DEFAULT 'rose-gold'::text,
    tema_cor text DEFAULT 'rose-gold'::text,
    whatsapp_suporte text,
    aniversario_cupom_ativo boolean DEFAULT true,
    aniversario_cupom_desconto integer DEFAULT 15,
    reativacao_ativa boolean DEFAULT true,
    reativacao_dias_ausencia integer DEFAULT 90,
    reativacao_oferta text DEFAULT 'uma avaliação gratuita'::text,
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Tabela 4: HORÁRIOS DE ATENDIMENTO DA CLÍNICA
CREATE TABLE IF NOT EXISTS public.clinic_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dia public.dia_semana UNIQUE NOT NULL,
    aberto boolean DEFAULT false,
    hora_inicio time without time zone,
    hora_fim time without time zone
);

-- Tabela 5: AGENDAS E PROFISSIONAIS (Arquitetura SaaS Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.agendas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    cor text DEFAULT '#C47E7E'::text,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    usuario_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    especialidades text
);

-- Tabela 6: HORÁRIOS INDIVIDUAIS DE CADA AGENDA/PROFISSIONAL
CREATE TABLE IF NOT EXISTS public.agenda_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agenda_id uuid NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
    dia public.dia_semana NOT NULL,
    aberto boolean DEFAULT false,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    UNIQUE(agenda_id, dia)
);

-- Tabela 7: PIPELINE DO CRM E LEADS
CREATE TABLE IF NOT EXISTS public.leads_estetica (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_lead text,
    inicio_atendimento timestamp with time zone DEFAULT now(),
    nome_lead text,
    motivo_contato text,
    procedimento_interesse text,
    resumo_conversa text,
    status public.lead_status DEFAULT 'inicio_atendimento'::public.lead_status,
    ultima_mensagem timestamp with time zone,
    follow_up_1 timestamp with time zone,
    follow_up_2 timestamp with time zone,
    follow_up_3 timestamp with time zone,
    data_agendamento timestamp with time zone,
    agendamento_criado_em timestamp with time zone,
    id_agendamento text,
    observacoes text,
    data_nascimento date,
    genero text,
    valor_pago numeric,
    data_primeira_visita date,
    cpf text,
    nota_nps numeric CHECK (nota_nps >= 0::numeric AND nota_nps <= 10::numeric)
);

-- Tabela 8: AGENDAMENTOS DE ESTÉTICA
CREATE TABLE IF NOT EXISTS public.agendamentos_estetica (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agenda_id uuid NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads_estetica(id) ON DELETE SET NULL,
    procedimento_nome text,
    nome_lead text,
    whatsapp_lead text,
    data_hora_inicio timestamp with time zone NOT NULL,
    data_hora_fim timestamp with time zone,
    status public.agendamento_status DEFAULT 'agendado'::public.agendamento_status,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    cpf_lead text,
    data_nascimento_lead date
);

-- Tabela 9: BLOQUEIOS DE CLÍNICA (Feriados ou Ausências)
CREATE TABLE IF NOT EXISTS public.clinic_closures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data date UNIQUE NOT NULL,
    descricao text,
    is_feriado boolean DEFAULT false,
    esta_fechado boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.clinic_closures IS 'Tabela que armazena datas em que a clínica está fechada (feriados ou bloqueios manuais).';

-- Tabela 12: FEATURE FLAGS DO SISTEMA (Ativação de módulos - Linha Única)
CREATE TABLE IF NOT EXISTS public.modulos_clinica (
    id integer PRIMARY KEY DEFAULT 1,
    modulo_financeiro boolean DEFAULT false,
    modulo_prontuario boolean DEFAULT false,
    modulo_estoque boolean DEFAULT false,
    modulo_crm boolean DEFAULT true,
    modulo_agenda boolean DEFAULT true,
    modulo_leads boolean DEFAULT true,
    atualizado_em timestamp with time zone DEFAULT now(),
    atualizado_por uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT modulos_one_row_only CHECK (id = 1)
);

-- Garantir que a coluna modulo_campanhas exista antes do INSERT
ALTER TABLE public.modulos_clinica ADD COLUMN IF NOT EXISTS modulo_campanhas boolean DEFAULT false;

-- Tabela 13: CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.categorias_financeiras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    tipo text CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text])),
    cor text,
    ativo boolean DEFAULT true
);

-- Tabela 14: LANÇAMENTOS FINANCEIROS
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo text CHECK (tipo = ANY (ARRAY['receita'::text, 'despesa'::text])),
    descricao text NOT NULL,
    valor numeric NOT NULL,
    data_vencimento date NOT NULL,
    data_pagamento date,
    status text DEFAULT 'pendente'::text CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text, 'cancelado'::text])),
    forma_pagamento text,
    parcela_atual integer,
    parcela_total integer,
    recorrente boolean DEFAULT false,
    agendamento_id uuid,
    profissional_id uuid,
    lead_id uuid REFERENCES public.leads_estetica(id) ON DELETE SET NULL,
    cliente_id uuid,
    observacoes text,
    criado_em timestamp with time zone DEFAULT now(),
    comprovante_url text
);

-- Tabela 15: COMISSÕES DE PROFISSIONAIS
CREATE TABLE IF NOT EXISTS public.comissoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_nome text NOT NULL,
    profissional_id uuid,
    percentual_padrao numeric DEFAULT 0,
    ativo boolean DEFAULT true
);

-- Tabela 16: COMISSÕES POR PROCEDIMENTO ESPECÍFICO
CREATE TABLE IF NOT EXISTS public.comissoes_procedimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comissao_id uuid REFERENCES public.comissoes(id) ON DELETE CASCADE,
    procedimento_nome text NOT NULL,
    percentual numeric NOT NULL
);

-- Tabela 17: FICHAS CLÍNICAS DOS PACIENTES (Prontuário)
CREATE TABLE IF NOT EXISTS public.fichas_clinicas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id uuid NOT NULL REFERENCES public.leads_estetica(id) ON DELETE CASCADE,
    tipo_paciente text DEFAULT 'lead'::text CHECK (tipo_paciente = ANY (ARRAY['lead'::text, 'cliente'::text])),
    nome_paciente text,
    whatsapp_paciente text,
    alergias text,
    medicamentos_uso text,
    historico_medico text,
    observacoes_gerais text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);

-- Tabela 18: ANAMNESES PREENCHIDAS
CREATE TABLE IF NOT EXISTS public.anamneses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id uuid REFERENCES public.fichas_clinicas(id) ON DELETE CASCADE,
    template_nome text,
    respostas jsonb NOT NULL,
    preenchido_por text,
    criado_em timestamp with time zone DEFAULT now()
);

-- Tabela 19: EVOLUÇÕES CLÍNICAS (Imutabilidade)
CREATE TABLE IF NOT EXISTS public.evolucoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id uuid REFERENCES public.fichas_clinicas(id) ON DELETE CASCADE,
    agendamento_id uuid REFERENCES public.agendamentos_estetica(id) ON DELETE SET NULL,
    profissional_nome text,
    procedimento_realizado text,
    descricao text,
    medicamentos_aplicados text,
    proximo_retorno date,
    criado_em timestamp with time zone DEFAULT now()
);

-- Tabela 20: FOTOS DE EVOLUÇÃO DO PACIENTE (Antes & Depois)
CREATE TABLE IF NOT EXISTS public.galeria_paciente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id uuid REFERENCES public.fichas_clinicas(id) ON DELETE CASCADE,
    evolucao_id uuid REFERENCES public.evolucoes(id) ON DELETE SET NULL,
    url_foto text NOT NULL,
    tipo text CHECK (tipo = ANY (ARRAY['antes'::text, 'depois'::text, 'outro'::text])),
    descricao text,
    criado_em timestamp with time zone DEFAULT now()
);

-- Tabela 21: PRODUTOS EM ESTOQUE
CREATE TABLE IF NOT EXISTS public.produtos_estoque (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    categoria text,
    unidade_medida text DEFAULT 'unidade'::text,
    quantidade_atual numeric DEFAULT 0,
    estoque_minimo numeric DEFAULT 0,
    custo_unitario numeric,
    fornecedor text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now()
);

-- Tabela 22: MOVIMENTAÇÕES DE ESTOQUE (Entradas/Saídas)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid REFERENCES public.produtos_estoque(id) ON DELETE CASCADE,
    tipo text CHECK (tipo = ANY (ARRAY['entrada'::text, 'saida'::text])),
    quantidade numeric NOT NULL,
    motivo text,
    agendamento_id uuid,
    observacoes text,
    criado_em timestamp with time zone DEFAULT now(),
    anexo_url text
);

-- Tabela 23: KITS DE PROCEDIMENTO (Baixa Automática)
CREATE TABLE IF NOT EXISTS public.kits_procedimento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    procedimento_nome text NOT NULL,
    produto_id uuid REFERENCES public.produtos_estoque(id) ON DELETE CASCADE,
    quantidade numeric NOT NULL
);

-- Tabela 24: MODELOS / TEMPLATES CLÍNICOS
CREATE TABLE IF NOT EXISTS public.templates_clinicos (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tipo text NOT NULL CHECK (tipo = ANY (ARRAY['anamnese'::text, 'termo'::text, 'receituario'::text])),
    titulo text NOT NULL,
    conteudo_schema jsonb NOT NULL,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabela 25: DOCUMENTOS DOS PACIENTES ASSINADOS
CREATE TABLE IF NOT EXISTS public.documentos_pacientes (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    ficha_id uuid REFERENCES public.fichas_clinicas(id) ON DELETE CASCADE,
    template_id uuid REFERENCES public.templates_clinicos(id) ON DELETE RESTRICT,
    dados_preenchidos jsonb NOT NULL,
    assinatura_url text,
    criado_em timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabela de Suporte Especializado: ANOTAÇÕES DE LEADS (CRM)
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.leads_estetica(id) ON DELETE CASCADE,
    content text NOT NULL,
    author_name text,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela 26: FEEDBACKS E PESQUISAS DE SATISFAÇÃO (NPS)
CREATE TABLE IF NOT EXISTS public.nps_feedbacks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.leads_estetica(id) ON DELETE SET NULL,
    cliente_nome text NOT NULL,
    procedimento text,
    nota integer CHECK (nota >= 0 AND nota <= 10) NOT NULL,
    comentario text,
    whatsapp_lead text,
    criado_em timestamp with time zone DEFAULT now()
);

-- =========================================================================
-- 4. ÍNDICES DE PERFORMANCE DO BANCO DE DADOS
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_anamneses_ficha_id ON public.anamneses(ficha_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_proc_comissao_id ON public.comissoes_procedimentos(comissao_id);
CREATE INDEX IF NOT EXISTS idx_documentos_ficha_id ON public.documentos_pacientes(ficha_id);
CREATE INDEX IF NOT EXISTS idx_documentos_template_id ON public.documentos_pacientes(template_id);
CREATE INDEX IF NOT EXISTS idx_evolucoes_ficha_id ON public.evolucoes(ficha_id);
CREATE INDEX IF NOT EXISTS idx_galeria_evolucao_id ON public.galeria_paciente(evolucao_id);
CREATE INDEX IF NOT EXISTS idx_galeria_ficha_id ON public.galeria_paciente(ficha_id);
CREATE INDEX IF NOT EXISTS idx_kits_produto_id ON public.kits_procedimento(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON public.movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_modulos_atualizado_por ON public.modulos_clinica(atualizado_por);
CREATE INDEX IF NOT EXISTS idx_leads_estetica_whatsapp ON public.leads_estetica(whatsapp_lead);
CREATE INDEX IF NOT EXISTS idx_agendamentos_agenda_id_inicio ON public.agendamentos_estetica(agenda_id, data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lead_id ON public.agendamentos_estetica(lead_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_lead_id ON public.lancamentos_financeiros(lead_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financeiros_profissional_id ON public.lancamentos_financeiros(profissional_id);

-- =========================================================================
-- 5. FUNÇÕES E TRIGGERS OPERACIONAIS DO SISTEMA
-- =========================================================================

-- 5.1 Criar automaticamente os horários livre padrão ao registrar uma nova Agenda
CREATE OR REPLACE FUNCTION public.criar_agenda_hours()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO agenda_hours (agenda_id, dia, aberto, hora_inicio, hora_fim) VALUES
    (NEW.id, 'domingo',  false, '08:00', '18:00'),
    (NEW.id, 'segunda',  true,  '08:00', '18:00'),
    (NEW.id, 'terca',    true,  '08:00', '18:00'),
    (NEW.id, 'quarta',   true,  '08:00', '18:00'),
    (NEW.id, 'quinta',   true,  '08:00', '18:00'),
    (NEW.id, 'sexta',    true,  '08:00', '18:00'),
    (NEW.id, 'sabado',   false, '08:00', '18:00');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER on_agenda_created
AFTER INSERT ON public.agendas
FOR EACH ROW EXECUTE FUNCTION public.criar_agenda_hours();

-- 5.2 Calcular o fim do agendamento (duração padrão de 60 minutos)
CREATE OR REPLACE FUNCTION public.calc_agendamento_fim()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.data_hora_fim = NEW.data_hora_inicio + interval '60 minutes';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER on_agendamento_agendado
BEFORE INSERT OR UPDATE ON public.agendamentos_estetica
FOR EACH ROW EXECUTE FUNCTION public.calc_agendamento_fim();

-- 5.3 Evitar retrocesso automático do status de leads agendados ou concluídos
CREATE OR REPLACE FUNCTION public.proteger_status_agendado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('agendado', 'compareceu') 
     AND NEW.status IN ('conversando', 'inicio_atendimento') THEN
    NEW.status = OLD.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER trg_proteger_status
BEFORE UPDATE ON public.leads_estetica
FOR EACH ROW EXECUTE FUNCTION public.proteger_status_agendado();

-- 5.5 Sincronizar o status de agendamentos no CRM/leads_estetica
CREATE OR REPLACE FUNCTION public.sinalizar_agendamento_no_crm()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'agendado' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads_estetica 
      SET 
        status = 'agendado',
        cpf = COALESCE(NEW.cpf_lead, cpf),
        data_nascimento = COALESCE(NEW.data_nascimento_lead, data_nascimento),
        data_agendamento = NEW.data_hora_inicio,
        agendamento_criado_em = NOW()
      WHERE id = NEW.lead_id;
    ELSIF NEW.whatsapp_lead IS NOT NULL THEN
      UPDATE leads_estetica 
      SET 
        status = 'agendado',
        cpf = COALESCE(NEW.cpf_lead, cpf),
        data_nascimento = COALESCE(NEW.data_nascimento_lead, data_nascimento),
        data_agendamento = NEW.data_hora_inicio,
        agendamento_criado_em = NOW()
      WHERE whatsapp_lead = NEW.whatsapp_lead 
        AND (nome_lead = NEW.nome_lead OR nome_lead IS NULL OR nome_lead = '');
    END IF;

  ELSIF NEW.status = 'cancelado' THEN
    IF NEW.lead_id IS NOT NULL THEN
      UPDATE leads_estetica SET status = 'cancelamento' WHERE id = NEW.lead_id;
    ELSIF NEW.whatsapp_lead IS NOT NULL THEN
      UPDATE leads_estetica SET status = 'cancelamento' WHERE whatsapp_lead = NEW.whatsapp_lead AND (nome_lead = NEW.nome_lead OR nome_lead IS NULL OR nome_lead = '');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER trg_sinalizar_agendamento
AFTER INSERT OR UPDATE ON public.agendamentos_estetica
FOR EACH ROW EXECUTE FUNCTION public.sinalizar_agendamento_no_crm();

-- 5.6 Obter ou Criar Lead (normalização de WhatsApp e nome)
CREATE OR REPLACE FUNCTION public.get_or_create_lead(
  p_whatsapp text, 
  p_nome text DEFAULT NULL::text, 
  p_cpf text DEFAULT NULL::text, 
  p_nascimento text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, nome_lead text, cpf text, data_nascimento text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_wp text;
  v_nascimento_date DATE;
  v_existing_nome text;
BEGIN
  v_wp := regexp_replace(p_whatsapp, '[^0-9]', '', 'g');
  
  IF p_nascimento IS NOT NULL AND p_nascimento != '' THEN
    BEGIN
      v_nascimento_date := p_nascimento::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_nascimento_date := NULL;
    END;
  END IF;

  IF p_nome IS NULL OR p_nome = '' THEN
    RETURN QUERY 
    SELECT l.id, l.nome_lead, l.cpf, l.data_nascimento::TEXT
    FROM public.leads_estetica l 
    WHERE l.whatsapp_lead = v_wp 
    ORDER BY l.inicio_atendimento ASC;
    RETURN;
  END IF;

  SELECT l.id, l.nome_lead INTO v_id, v_existing_nome
  FROM public.leads_estetica l 
  WHERE l.whatsapp_lead = v_wp 
    AND LOWER(l.nome_lead) = LOWER(p_nome) 
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT l.id, l.nome_lead INTO v_id, v_existing_nome
    FROM public.leads_estetica l 
    WHERE l.whatsapp_lead = v_wp 
      AND (
        LOWER(p_nome) LIKE LOWER(l.nome_lead) || '%'
        OR 
        LOWER(l.nome_lead) LIKE LOWER(p_nome) || '%'
        OR
        split_part(LOWER(l.nome_lead), ' ', 1) = split_part(LOWER(p_nome), ' ', 1)
      )
    ORDER BY LENGTH(l.nome_lead) DESC
    LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE public.leads_estetica 
    SET 
      nome_lead = CASE 
        WHEN LENGTH(p_nome) > LENGTH(COALESCE(public.leads_estetica.nome_lead, '')) THEN p_nome 
        ELSE public.leads_estetica.nome_lead 
      END,
      cpf = COALESCE(NULLIF(p_cpf, ''), public.leads_estetica.cpf), 
      data_nascimento = COALESCE(v_nascimento_date, public.leads_estetica.data_nascimento),
      ultima_mensagem = now()
    WHERE public.leads_estetica.id = v_id;
  ELSE
    INSERT INTO public.leads_estetica (
      whatsapp_lead, nome_lead, cpf, data_nascimento, 
      inicio_atendimento, status
    )
    VALUES (
      v_wp, p_nome, NULLIF(p_cpf, ''), v_nascimento_date, 
      now(), 'inicio_atendimento'
    )
    RETURNING public.leads_estetica.id INTO v_id;
  END IF;

  RETURN QUERY 
  SELECT l.id, l.nome_lead, l.cpf, l.data_nascimento::TEXT
  FROM public.leads_estetica l 
  WHERE l.id = v_id;
END;
$function$;

-- Trigger de criação automática do usuário local linkado à auth do Supabase
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Revogar permissões públicas expostas em funções críticas
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- =========================================================================
-- 6. CRIAR BUCKETS DE STORAGE (Supabase Storage)
-- =========================================================================

INSERT INTO storage.buckets (id, name, public) VALUES 
('avatars', 'avatars', true),
('clinic-assets', 'clinic-assets', true),
('prontuarios', 'prontuarios', false),
('assinaturas', 'assinaturas', false),
('financeiro', 'financeiro', false),
('estoque', 'estoque', false)
ON CONFLICT (id) DO NOTHING;

-- 6.1 POLÍTICAS DE RLS PARA OS BUCKETS
-- BUCKET: avatars
DROP POLICY IF EXISTS "Permitir upload de avatares para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload de avatares para autenticados" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE ((select auth.uid())::text || '-%')
);
DROP POLICY IF EXISTS "Permitir leitura de avatares publica" ON storage.objects;
CREATE POLICY "Permitir leitura de avatares publica" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Permitir exclusao de avatares pelo dono" ON storage.objects;
CREATE POLICY "Permitir exclusao de avatares pelo dono" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE ((select auth.uid())::text || '-%')
);

-- BUCKET: clinic-assets
DROP POLICY IF EXISTS "Allow Auth Uploads" ON storage.objects;
CREATE POLICY "Allow Auth Uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinic-assets'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin')
);
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'clinic-assets');
DROP POLICY IF EXISTS "Allow Auth Deletes" ON storage.objects;
CREATE POLICY "Allow Auth Deletes" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'clinic-assets'
  AND public.current_user_role() IN ('superadmin', 'owner', 'admin')
);

-- BUCKET: prontuarios
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

-- BUCKET: assinaturas
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

-- BUCKET: financeiro
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

-- BUCKET: estoque
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

-- =========================================================================
-- 7. POLÍTICAS DE RLS GRANULARES PARA TODAS AS 27 TABELAS
-- =========================================================================

-- Habilitar RLS globalmente
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- (profiles removida — legado)
ALTER TABLE public.clinic_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_estetica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_estetica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kits_procedimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_feedbacks ENABLE ROW LEVEL SECURITY;

-- 7.1 Políticas: users & profiles
DROP POLICY IF EXISTS "Leitura usuarios" ON public.users;
-- O perfil editável fica em auth.users.user_metadata. Não permita UPDATE da
-- própria linha public.users: ela contém o papel de autorização (role).
DROP POLICY IF EXISTS "Edicao proprio perfil" ON public.users;

-- Permite que cada usuário veja APENAS seu próprio registro para garantir o AuthContext
DROP POLICY IF EXISTS "Leitura usuarios" ON public.users;
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record" ON public.users
FOR SELECT TO authenticated
USING (id = (select auth.uid()));

-- Permite que gestores administrativos vejam a equipe.
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT TO authenticated
USING (check_is_admin());

-- Superadmin gerencia todos os cargos. Owner só gerencia membros abaixo de
-- owner, não pode editar a própria role nem criar outro owner/superadmin.
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

-- (Políticas de profiles removidas — tabela legada deletada)

-- 7.2 Políticas: clinic_config & clinic_hours & clinic_closures
DROP POLICY IF EXISTS "clinic_config_select_all_authenticated" ON public.clinic_config;
CREATE POLICY "clinic_config_select_all_authenticated" ON public.clinic_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "clinic_config_insert_admin_only" ON public.clinic_config;
CREATE POLICY "clinic_config_insert_admin_only" ON public.clinic_config FOR INSERT TO authenticated WITH CHECK (check_is_admin());
DROP POLICY IF EXISTS "clinic_config_update_admin_only" ON public.clinic_config;
CREATE POLICY "clinic_config_update_admin_only" ON public.clinic_config FOR UPDATE TO authenticated USING (check_is_admin()) WITH CHECK (check_is_admin());
DROP POLICY IF EXISTS "clinic_config_delete_admin_only" ON public.clinic_config;
CREATE POLICY "clinic_config_delete_admin_only" ON public.clinic_config FOR DELETE TO authenticated USING (check_is_admin());

DROP POLICY IF EXISTS "somente_admin_clinic_hours" ON public.clinic_hours;
CREATE POLICY "somente_admin_clinic_hours" ON public.clinic_hours FOR ALL TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Leitura clinic_hours para autenticados" ON public.clinic_hours;
CREATE POLICY "Leitura clinic_hours para autenticados" ON public.clinic_hours FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gerencia closures" ON public.clinic_closures;
CREATE POLICY "Admin gerencia closures" ON public.clinic_closures FOR ALL TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Leitura closures autenticados" ON public.clinic_closures;
CREATE POLICY "Leitura closures autenticados" ON public.clinic_closures FOR SELECT TO authenticated USING (true);

-- 7.3 Políticas: agendas & agenda_hours & agendamentos_estetica
DROP POLICY IF EXISTS "autenticado_insert" ON public.agendas;
CREATE POLICY "autenticado_insert" ON public.agendas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "autenticado_select" ON public.agendas;
CREATE POLICY "autenticado_select" ON public.agendas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "autenticado_update" ON public.agendas;
CREATE POLICY "autenticado_update" ON public.agendas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "somente_admin_delete_agendas" ON public.agendas;
CREATE POLICY "somente_admin_delete_agendas" ON public.agendas FOR DELETE TO authenticated USING (check_is_admin());

DROP POLICY IF EXISTS "autenticado_insert" ON public.agenda_hours;
CREATE POLICY "autenticado_insert" ON public.agenda_hours FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "autenticado_select" ON public.agenda_hours;
CREATE POLICY "autenticado_select" ON public.agenda_hours FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "autenticado_update" ON public.agenda_hours;
CREATE POLICY "autenticado_update" ON public.agenda_hours FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_select_agenda_hours" ON public.agenda_hours;
CREATE POLICY "service_role_select_agenda_hours" ON public.agenda_hours FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "somente_admin_delete_agenda_hours" ON public.agenda_hours;
CREATE POLICY "somente_admin_delete_agenda_hours" ON public.agenda_hours FOR DELETE TO authenticated USING (check_is_admin());

DROP POLICY IF EXISTS "autenticado_insert" ON public.agendamentos_estetica;
CREATE POLICY "autenticado_insert" ON public.agendamentos_estetica FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "autenticado_select" ON public.agendamentos_estetica;
CREATE POLICY "autenticado_select" ON public.agendamentos_estetica FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "autenticado_update" ON public.agendamentos_estetica;
CREATE POLICY "autenticado_update" ON public.agendamentos_estetica FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "somente_admin_delete_agendamentos" ON public.agendamentos_estetica;
CREATE POLICY "somente_admin_delete_agendamentos" ON public.agendamentos_estetica FOR DELETE TO authenticated USING (check_is_admin());

-- 7.4 Políticas: leads_estetica & lead_notes
DROP POLICY IF EXISTS "autenticado_insert" ON public.leads_estetica;
CREATE POLICY "autenticado_insert" ON public.leads_estetica FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "autenticado_select" ON public.leads_estetica;
CREATE POLICY "autenticado_select" ON public.leads_estetica FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "autenticado_update" ON public.leads_estetica;
CREATE POLICY "autenticado_update" ON public.leads_estetica FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "somente_admin_delete_leads" ON public.leads_estetica;
CREATE POLICY "somente_admin_delete_leads" ON public.leads_estetica FOR DELETE TO authenticated USING (check_is_admin());

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.lead_notes;
CREATE POLICY "Permitir inserção para usuários autenticados" ON public.lead_notes FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated'::text);
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.lead_notes;
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.lead_notes FOR SELECT TO public USING (auth.role() = 'authenticated'::text);
DROP POLICY IF EXISTS "Apenas criador edita anotações" ON public.lead_notes;
CREATE POLICY "Apenas criador edita anotações" ON public.lead_notes FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Apenas criador ou admin deleta anotações" ON public.lead_notes;
CREATE POLICY "Apenas criador ou admin deleta anotações" ON public.lead_notes FOR DELETE TO authenticated USING (((select auth.uid()) = user_id) OR check_is_admin());

-- 7.6 Políticas: modulos_clinica
DROP POLICY IF EXISTS "Leitura modulos para todos" ON public.modulos_clinica;
CREATE POLICY "Leitura modulos para todos" ON public.modulos_clinica FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Insert modulos para autenticados" ON public.modulos_clinica;
CREATE POLICY "Insert modulos para autenticados" ON public.modulos_clinica FOR INSERT TO authenticated WITH CHECK (((select auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "Edicao modulos para autenticados" ON public.modulos_clinica;
CREATE POLICY "Edicao modulos para autenticados" ON public.modulos_clinica FOR UPDATE TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Delete modulos para autenticados" ON public.modulos_clinica;
CREATE POLICY "Delete modulos para autenticados" ON public.modulos_clinica FOR DELETE TO authenticated USING (check_is_admin());

-- 7.7 Políticas: categorias_financeiras & lancamentos_financeiros & comissoes & comissoes_procedimentos
-- SEGURANÇA: Tabelas financeiras restritas a superadmin, owner e admin (check_is_admin)
DROP POLICY IF EXISTS "Acesso total categorias" ON public.categorias_financeiras;
CREATE POLICY "Acesso total categorias" ON public.categorias_financeiras FOR ALL TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Acesso total lancamentos" ON public.lancamentos_financeiros;
CREATE POLICY "Acesso total lancamentos" ON public.lancamentos_financeiros FOR ALL TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Acesso total comissoes" ON public.comissoes;
CREATE POLICY "Acesso total comissoes" ON public.comissoes FOR ALL TO authenticated USING (check_is_admin());
DROP POLICY IF EXISTS "Acesso total comissoes_proc" ON public.comissoes_procedimentos;
CREATE POLICY "Acesso total comissoes_proc" ON public.comissoes_procedimentos FOR ALL TO authenticated USING (check_is_admin());

-- 7.8 Políticas: fichas_clinicas & anamneses & evolucoes & galeria_paciente & templates_clinicos & documentos_pacientes
DROP POLICY IF EXISTS "Acesso total fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos leem fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos criam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Clinicos atualizam fichas" ON public.fichas_clinicas;
DROP POLICY IF EXISTS "Admins excluem fichas" ON public.fichas_clinicas;
CREATE POLICY "Clinicos leem fichas" ON public.fichas_clinicas FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam fichas" ON public.fichas_clinicas FOR INSERT TO authenticated
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos atualizam fichas" ON public.fichas_clinicas FOR UPDATE TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'))
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem fichas" ON public.fichas_clinicas FOR DELETE TO authenticated
USING (check_is_admin());

DROP POLICY IF EXISTS "Acesso total anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos leem anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos criam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Clinicos atualizam anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Admins excluem anamneses" ON public.anamneses;
CREATE POLICY "Clinicos leem anamneses" ON public.anamneses FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam anamneses" ON public.anamneses FOR INSERT TO authenticated
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos atualizam anamneses" ON public.anamneses FOR UPDATE TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'))
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem anamneses" ON public.anamneses FOR DELETE TO authenticated
USING (check_is_admin());

DROP POLICY IF EXISTS "Acesso total evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Clinicos leem evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Clinicos criam evolucoes" ON public.evolucoes;
DROP POLICY IF EXISTS "Admins excluem evolucoes" ON public.evolucoes;
CREATE POLICY "Clinicos leem evolucoes" ON public.evolucoes FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam evolucoes" ON public.evolucoes FOR INSERT TO authenticated
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem evolucoes" ON public.evolucoes FOR DELETE TO authenticated
USING (check_is_admin());

DROP POLICY IF EXISTS "Acesso total galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Clinicos leem galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Clinicos criam galeria" ON public.galeria_paciente;
DROP POLICY IF EXISTS "Admins excluem galeria" ON public.galeria_paciente;
CREATE POLICY "Clinicos leem galeria" ON public.galeria_paciente FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam galeria" ON public.galeria_paciente FOR INSERT TO authenticated
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem galeria" ON public.galeria_paciente FOR DELETE TO authenticated
USING (check_is_admin());

DROP POLICY IF EXISTS "Acesso total templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Clinicos leem templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins criam templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins atualizam templates" ON public.templates_clinicos;
DROP POLICY IF EXISTS "Admins excluem templates" ON public.templates_clinicos;
CREATE POLICY "Clinicos leem templates" ON public.templates_clinicos FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins criam templates" ON public.templates_clinicos FOR INSERT TO authenticated
WITH CHECK (check_is_admin());
CREATE POLICY "Admins atualizam templates" ON public.templates_clinicos FOR UPDATE TO authenticated
USING (check_is_admin()) WITH CHECK (check_is_admin());
CREATE POLICY "Admins excluem templates" ON public.templates_clinicos FOR DELETE TO authenticated
USING (check_is_admin());

DROP POLICY IF EXISTS "Acesso total doc_pacientes" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Clinicos leem documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Clinicos criam documentos" ON public.documentos_pacientes;
DROP POLICY IF EXISTS "Admins excluem documentos" ON public.documentos_pacientes;
CREATE POLICY "Clinicos leem documentos" ON public.documentos_pacientes FOR SELECT TO authenticated
USING (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Clinicos criam documentos" ON public.documentos_pacientes FOR INSERT TO authenticated
WITH CHECK (current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins excluem documentos" ON public.documentos_pacientes FOR DELETE TO authenticated
USING (check_is_admin());

-- 7.9 Políticas: produtos_estoque & movimentacoes_estoque & kits_procedimento
DROP POLICY IF EXISTS "Acesso total produtos" ON public.produtos_estoque;
DROP POLICY IF EXISTS "Admins gerenciam produtos" ON public.produtos_estoque;
CREATE POLICY "Admins gerenciam produtos" ON public.produtos_estoque FOR ALL TO authenticated
USING (check_is_admin()) WITH CHECK (check_is_admin());
DROP POLICY IF EXISTS "Acesso total movimentacoes" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Admins gerenciam movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Admins gerenciam movimentacoes" ON public.movimentacoes_estoque FOR ALL TO authenticated
USING (check_is_admin()) WITH CHECK (check_is_admin());
DROP POLICY IF EXISTS "Acesso total kits" ON public.kits_procedimento;
DROP POLICY IF EXISTS "Admins gerenciam kits" ON public.kits_procedimento;
CREATE POLICY "Admins gerenciam kits" ON public.kits_procedimento FOR ALL TO authenticated
USING (check_is_admin()) WITH CHECK (check_is_admin());

-- 7.10 Políticas: nps_feedbacks
DROP POLICY IF EXISTS "Acesso total nps" ON public.nps_feedbacks;
CREATE POLICY "Acesso total nps" ON public.nps_feedbacks FOR ALL TO authenticated USING (((select auth.uid()) IS NOT NULL));
DROP POLICY IF EXISTS "Insercao nps anonima" ON public.nps_feedbacks;
CREATE POLICY "Insercao nps anonima" ON public.nps_feedbacks FOR INSERT TO anon WITH CHECK (true);

-- =========================================================================
-- 8. DADOS INICIAIS (Primeiro Setup da Clínica)
-- =========================================================================

-- 8.1 Setup de Identidade
INSERT INTO public.clinic_config (id, nome, plano, tema, tema_cor, aniversario_cupom_ativo, aniversario_cupom_desconto, reativacao_ativa, reativacao_dias_ausencia, reativacao_oferta) 
VALUES (1, 'Minha Clínica', 'GESTAO', 'rose-gold', 'rose-gold', true, 15, true, 90, 'uma avaliação gratuita') 
ON CONFLICT (id) DO NOTHING;

-- 8.2 Horários Funcionamento Padrão da Clínica
INSERT INTO public.clinic_hours (dia, aberto, hora_inicio, hora_fim)
VALUES 
('segunda', true, '08:00', '18:00'),
('terca', true, '08:00', '18:00'),
('quarta', true, '08:00', '18:00'),
('quinta', true, '08:00', '18:00'),
('sexta', true, '08:00', '18:00'),
('sabado', true, '08:00', '12:00'),
('domingo', false, null, null)
ON CONFLICT (dia) DO NOTHING;

-- 8.3 Feature Flags Iniciais
INSERT INTO public.modulos_clinica (id, modulo_crm, modulo_agenda, modulo_leads, modulo_financeiro, modulo_prontuario, modulo_estoque, modulo_campanhas)
VALUES (1, true, true, true, true, true, true, false)
ON CONFLICT (id) DO NOTHING;

-- 9. CONFIGURAÇÃO EXTRA (Realtime e Publicações)
-- =========================================================================
-- Adicionar tabelas à publicação de realtime de forma segura (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'nps_feedbacks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nps_feedbacks;
    END IF;
END $$;

