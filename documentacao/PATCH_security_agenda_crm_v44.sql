-- PATCH v4.4 — segurança de agenda, CRM e notas
-- Bloqueia contas sem cargo clínico, mantendo especialistas em modo leitura
-- na agenda/CRM e com permissão para registrar as próprias notas.
-- Pré-requisito: PATCH_security_users_v42.sql.
-- Rodar no SQL Editor do Supabase da clínica. Idempotente.

BEGIN;

-- Horário geral: usado apenas pela gestão.
DROP POLICY IF EXISTS "somente_admin_clinic_hours" ON public.clinic_hours;
CREATE POLICY "somente_admin_clinic_hours" ON public.clinic_hours FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
DROP POLICY IF EXISTS "Leitura clinic_hours para autenticados" ON public.clinic_hours;

-- Fechamentos/bloqueios: equipe clínica lê; gestão altera.
DROP POLICY IF EXISTS "Admin gerencia closures" ON public.clinic_closures;
CREATE POLICY "Admin gerencia closures" ON public.clinic_closures FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
DROP POLICY IF EXISTS "Leitura closures autenticados" ON public.clinic_closures;
DROP POLICY IF EXISTS "Leitura closures equipe clinica" ON public.clinic_closures;
CREATE POLICY "Leitura closures equipe clinica" ON public.clinic_closures FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));

-- Agendas.
DROP POLICY IF EXISTS "autenticado_insert" ON public.agendas;
DROP POLICY IF EXISTS "autenticado_select" ON public.agendas;
DROP POLICY IF EXISTS "autenticado_update" ON public.agendas;
DROP POLICY IF EXISTS "somente_admin_delete_agendas" ON public.agendas;
DROP POLICY IF EXISTS "Equipe clinica le agendas" ON public.agendas;
DROP POLICY IF EXISTS "Admins gerenciam agendas" ON public.agendas;
CREATE POLICY "Equipe clinica le agendas" ON public.agendas FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins gerenciam agendas" ON public.agendas FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- Horários de cada agenda. Mantém acesso do service_role para integrações
-- internas do Supabase, mas não para contas comuns.
DROP POLICY IF EXISTS "autenticado_insert" ON public.agenda_hours;
DROP POLICY IF EXISTS "autenticado_select" ON public.agenda_hours;
DROP POLICY IF EXISTS "autenticado_update" ON public.agenda_hours;
DROP POLICY IF EXISTS "somente_admin_delete_agenda_hours" ON public.agenda_hours;
DROP POLICY IF EXISTS "Equipe clinica le horarios" ON public.agenda_hours;
DROP POLICY IF EXISTS "Admins gerenciam horarios" ON public.agenda_hours;
CREATE POLICY "Equipe clinica le horarios" ON public.agenda_hours FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins gerenciam horarios" ON public.agenda_hours FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- Agendamentos: especialistas consultam a agenda; gestão cria e altera.
DROP POLICY IF EXISTS "autenticado_insert" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "autenticado_select" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "autenticado_update" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "somente_admin_delete_agendamentos" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "Equipe clinica le agendamentos" ON public.agendamentos_estetica;
DROP POLICY IF EXISTS "Admins gerenciam agendamentos" ON public.agendamentos_estetica;
CREATE POLICY "Equipe clinica le agendamentos" ON public.agendamentos_estetica FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins gerenciam agendamentos" ON public.agendamentos_estetica FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- Leads: especialistas consultam dados necessários à Agenda/Prontuário;
-- alterações continuam exclusivas da gestão.
DROP POLICY IF EXISTS "autenticado_insert" ON public.leads_estetica;
DROP POLICY IF EXISTS "autenticado_select" ON public.leads_estetica;
DROP POLICY IF EXISTS "autenticado_update" ON public.leads_estetica;
DROP POLICY IF EXISTS "somente_admin_delete_leads" ON public.leads_estetica;
DROP POLICY IF EXISTS "Equipe clinica le leads" ON public.leads_estetica;
DROP POLICY IF EXISTS "Admins gerenciam leads" ON public.leads_estetica;
CREATE POLICY "Equipe clinica le leads" ON public.leads_estetica FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Admins gerenciam leads" ON public.leads_estetica FOR ALL TO authenticated
USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- Notas: equipe clínica lê; cada usuário cria/edita sua própria nota.
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.lead_notes;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.lead_notes;
DROP POLICY IF EXISTS "Apenas criador edita anotações" ON public.lead_notes;
DROP POLICY IF EXISTS "Apenas criador ou admin deleta anotações" ON public.lead_notes;
DROP POLICY IF EXISTS "Equipe clinica le notas" ON public.lead_notes;
DROP POLICY IF EXISTS "Equipe clinica cria notas" ON public.lead_notes;
DROP POLICY IF EXISTS "Criador edita nota" ON public.lead_notes;
DROP POLICY IF EXISTS "Criador ou admin exclui nota" ON public.lead_notes;
CREATE POLICY "Equipe clinica le notas" ON public.lead_notes FOR SELECT TO authenticated
USING (public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista'));
CREATE POLICY "Equipe clinica cria notas" ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
  AND user_id = (select auth.uid())
);
CREATE POLICY "Criador edita nota" ON public.lead_notes FOR UPDATE TO authenticated
USING (
  public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
  AND (select auth.uid()) = user_id
)
WITH CHECK (
  public.current_user_role() IN ('superadmin', 'owner', 'admin', 'gestor', 'especialista')
  AND (select auth.uid()) = user_id
);
CREATE POLICY "Criador ou admin exclui nota" ON public.lead_notes FOR DELETE TO authenticated
USING (
  public.check_is_admin()
  OR (
    public.current_user_role() = 'especialista'
    AND (select auth.uid()) = user_id
  )
);

COMMIT;
