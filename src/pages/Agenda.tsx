import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Edit3, Loader2, Calendar, Clock, User as UserIcon, Copy, Check, ShieldAlert, Send, FileText } from 'lucide-react';
import { format, addWeeks, subWeeks, addDays, subDays, parseISO, startOfWeek, endOfWeek, addMinutes, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { cn, calculateAge, displayCPF, formatBirthDate } from '../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModulos } from '../contexts/ModulosContext';

interface AgendaItem {
  id: string;
  nome: string;
  cor: string;
  hours: any[];
}

export function Agenda() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const location = useLocation();
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [inactiveAgendas, setInactiveAgendas] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Global View Date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    const handlePopState = () => {
      // Force refresh on back button
      setIsMobile(window.innerWidth < 1024);
      fetchAgendas();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Refs para controlar os calendários
  const calendarRefs = useRef<{ [key: string]: FullCalendar | null }>({});

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  
  // Data for Modals
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedAgendaForEdit, setSelectedAgendaForEdit] = useState<AgendaItem | null>(null);

  const [closures, setClosures] = useState<any[]>([]);

  useEffect(() => {
    fetchAgendas();
    fetchClosures();
  }, [role, user?.id]);

  const fetchClosures = async () => {
    const { data } = await supabase.from('clinic_closures').select('*').eq('esta_fechado', true);
    if (data) setClosures(data);
  };

  const fetchAgendas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('agendas')
        .select(`
          id, nome, cor, ativo, usuario_id,
          agenda_hours(id, dia, aberto, hora_inicio, hora_fim)
        `)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      // Se for especialista, filtra apenas para a agenda vinculada ao seu ID de usuário
      if (role === 'especialista') {
        query = query.eq('usuario_id', user.id);
      }

      const { data } = await query;

      if (data) {
        setAgendas(data.map(a => ({
          ...a,
          hours: a.agenda_hours
        })));
      }

      // Fetch agendas ocultas apenas para superadmin
      if (role === 'superadmin') {
        const { data: inactiveData } = await supabase
          .from('agendas')
          .select('id, nome, cor, ativo, usuario_id')
          .eq('ativo', false)
          .order('nome', { ascending: true });
        if (inactiveData) setInactiveAgendas(inactiveData);
      }
    } catch {
      // Falha ao carregar a agenda — mantém o estado atual
    } finally {
      setLoading(false);
    }
  };


  const handlePrev = () => {
    const newDate = isMobile ? subDays(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = isMobile ? addDays(currentDate, 1) : addWeeks(currentDate, 1);
    setCurrentDate(newDate);
  };

  const openCreateAgendamento = (info: any, agendaId: string) => {
    // Apenas gestores e admins podem criar agendamentos
    if (role === 'especialista') {
      alert('Apenas gestores e administradores podem criar agendamentos.');
      return;
    }
    // Verificar se a data está bloqueada
    const isClosed = closures.some(c => c.data === info.dateStr.split('T')[0]);
    if (isClosed) {
      const closure = closures.find(c => c.data === info.dateStr.split('T')[0]);
      alert(`Esta data está bloqueada: ${closure.descricao || 'Clínica fechada'}`);
      return;
    }
    setSelectedSlot({ ...info, agendaId });
    setCreateModalOpen(true);
  };

  const openViewAgendamento = (event: any) => {
    setSelectedEvent(event);
    setViewModalOpen(true);
  };

  const refreshEvents = () => {
    fetchAgendas();
    fetchClosures();
  };

  return (
    <div key={location.key} className="min-h-full md:min-h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* Header Fixo de Navegação de Datas */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 mb-6 bg-bg-base/90 backdrop-blur-md border-b border-border-card shadow-sm">
        <div className="flex flex-col gap-4 max-w-[1600px] mx-auto px-1">
          {/* Top Row: Title and New Agenda Button */}
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl md:text-2xl font-heading font-bold text-text-main">
              {isMobile ? "Minha Agenda" : "Agenda de Atendimentos"}
            </h1>
            
            <div className="flex items-center gap-2">
              {(role === 'superadmin' || role === 'admin' || role === 'owner') && (
                <button 
                  onClick={() => navigate('/bloqueio-agenda')}
                  className="h-9 px-3 text-xs font-bold flex items-center justify-center rounded-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Gerenciar Bloqueios</span>
                </button>
              )}
              {role === 'superadmin' && (
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedAgendaForEdit(null);
                    setAgendaModalOpen(true);
                  }}
                  className="h-9 px-4 text-xs font-bold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nova agenda
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Row: Navigation */}
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center bg-bg-card rounded-xl shadow-sm border border-border-card p-1 w-full max-w-[300px]">
              <button 
                onClick={handlePrev}
                className="p-2 hover:bg-bg-base rounded-lg transition-colors text-text-muted hover:text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex-1 text-center font-bold text-text-main text-sm sm:text-base capitalize tracking-tight">
                {isMobile 
                  ? (isToday(currentDate) 
                      ? `Hoje, ${format(currentDate, "dd 'de' MMMM", { locale: ptBR })}` 
                      : format(currentDate, "dd 'de' MMMM", { locale: ptBR }))
                  : `${format(startOfWeek(currentDate), "dd/MM")} - ${format(endOfWeek(currentDate), "dd/MM/yyyy")}`
                }
              </div>

              <button 
                onClick={handleNext}
                className="p-2 hover:bg-bg-base rounded-lg transition-colors text-text-muted hover:text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : agendas.length === 0 ? (
        <div className="py-24 text-center bg-bg-card border border-border-card/50 rounded-[14px] shadow-sm flex flex-col items-center justify-center text-[var(--color-warm-grey)]">
          <Calendar className="w-16 h-16 mb-4 opacity-40" />
          <h3 className="text-xl font-heading font-semibold text-text-main">Nenhuma agenda encontrada</h3>
          <p className="max-w-xs mt-2">
            {role === 'especialista' 
              ? 'Sua agenda ainda não foi vinculada. Peça ao gestor para associar sua agenda ao seu perfil.'
              : 'Crie sua primeira agenda para começar a gerenciar horários e procedimentos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8 pb-10 pt-4">
          {agendas.map(agenda => (
            <AgendaBlock 
              key={agenda.id} 
              agenda={agenda} 
              isMobile={isMobile}
              initialDate={currentDate}
              closures={closures}
              isAdmin={role === 'superadmin' || role === 'admin' || role === 'owner'}
              role={role}
              onDateClick={(info: any) => openCreateAgendamento(info, agenda.id)}
              onEventClick={openViewAgendamento}
              onEditAgenda={() => { setSelectedAgendaForEdit(agenda); setAgendaModalOpen(true); }}
              onRefresh={refreshEvents}
            />
          ))}

          {/* Agendas Ocultas / Inativas (Só Superadmin) */}
          {role === 'superadmin' && inactiveAgendas.length > 0 && (
            <div className="mt-10 p-6 bg-bg-card rounded-xl border border-border-card border-dashed">
              <h3 className="text-lg font-heading font-bold text-text-main mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-text-muted" />
                Agendas Ocultas / Inativas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {inactiveAgendas.map(agenda => (
                  <div key={agenda.id} className="flex items-center justify-between p-3 border border-border-card rounded-lg bg-bg-base/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agenda.cor }} />
                      <span className="font-semibold text-text-main">{agenda.nome || 'Sem Nome'}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        if (!confirm(`Restaurar a agenda ${agenda.nome}?`)) return;
                        await supabase.from('agendas').update({ ativo: true }).eq('id', agenda.id);
                        alert(`✅ Agenda restaurada com sucesso!\n\nID: ${agenda.id}`);
                        refreshEvents();
                      }}
                      className="h-8 text-xs px-3"
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      <ModalCreateAgendamento 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        slotInfo={selectedSlot}
        agendas={agendas}
        onSuccess={refreshEvents}
      />

      <ModalViewAgendamento 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        event={selectedEvent}
        onSuccess={refreshEvents}
        onEventUpdated={(fresh: any) => {
          setSelectedEvent({
            id: fresh.id,
            title: `${fresh.nome_lead || 'Sem Nome'} - ${fresh.procedimento_nome || ''}`,
            start: fresh.data_hora_inicio,
            end: fresh.data_hora_fim,
            extendedProps: { ...fresh },
          });
        }}
      />

      <ModalEditAgenda 
        isOpen={agendaModalOpen} 
        onClose={() => setAgendaModalOpen(false)} 
        agenda={selectedAgendaForEdit}
        onSuccess={refreshEvents}
      />

    </div>
  );
}

function AgendaBlock({ agenda, isMobile, initialDate, closures, isAdmin, role, onDateClick, onEventClick, onEditAgenda, onRefresh }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    fetchEvents();
  }, [agenda, closures]);

  // Sincronizar o calendário quando a data global mudar
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(initialDate);
    }
  }, [initialDate]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('agendamentos_estetica')
      .select('*, leads_estetica(*)')
      .eq('agenda_id', agenda.id)
      .neq('status', 'cancelado');

    const appointmentEvents = data ? data.map(ag => ({
      id: ag.id,
      title: `${ag.nome_lead || 'Sem Nome'} - ${ag.procedimento_nome || ''}`,
      start: ag.data_hora_inicio,
      end: ag.data_hora_fim,
      extendedProps: { ...ag }
    })) : [];

    // Adicionar eventos de fundo para os bloqueios
    const closureEvents = closures.map((c: any) => ({
      id: `closure-${c.id}`,
      start: c.data,
      allDay: true,
      display: 'background',
      backgroundColor: 'rgba(239, 68, 68, 0.1)', // Um vermelho suave
      title: c.descricao || 'Bloqueado'
    }));

    setEvents([...appointmentEvents, ...closureEvents]);
  };

  const mapDay = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
  const businessHours = agenda.hours
    .filter((h: any) => h.aberto && h.hora_inicio && h.hora_fim)
    .map((h: any) => ({
      daysOfWeek: [mapDay[h.dia as keyof typeof mapDay]],
      startTime: h.hora_inicio,
      endTime: h.hora_fim
    }));

  const handleDeleteAgenda = async () => {
    if (!confirm(`Ocultar a agenda ${agenda.nome} para a clínica? Essa ação removerá todos os horários de trabalho dela.`)) return;
    try {
      // Ocultar a agenda na tabela principal
      await supabase.from('agendas').update({ ativo: false }).eq('id', agenda.id);
      
      // Limpar os dias/horas na tabela agenda_hours
      await supabase.from('agenda_hours').update({ aberto: false }).eq('agenda_id', agenda.id);
      
      alert(`Agenda "${agenda.nome}" ocultada com sucesso.`);
      
      onRefresh();
    } catch (e) {
      alert('Erro ao excluir agenda');
    }
  };

  const notas = events.map(e => e.extendedProps?.leads_estetica?.nota_nps).filter(n => n != null);
  const mediaNPS = notas.length > 0 ? (notas.reduce((a, b) => a + Number(b), 0) / notas.length).toFixed(1) : null;

  const commonProps = {
    plugins: [timeGridPlugin, interactionPlugin],
    locale: ptBrLocale,
    headerToolbar: false,
    slotMinTime: "06:00:00",
    slotMaxTime: "23:59:59",
    slotDuration: "00:60:00",
    slotEventOverlap: false,
    allDaySlot: false,
    height: "auto",
    events: events,
    dateClick: onDateClick,
    eventClick: (info: any) => onEventClick(info.event),
    businessHours: businessHours,
    eventColor: agenda.cor,
    nowIndicator: true,
    nowIndicatorContent: () => null,
    dayHeaderContent: (arg: any) => {
      const { date, isToday } = arg;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').replace(',', '').toUpperCase();
      
      return (
        <div className={cn(
          "flex flex-col items-center justify-center w-full h-[60px] transition-all duration-300 relative",
          isToday && "bg-primary/5 rounded-none border-b-[5px] border-primary"
        )}>
          <span className={cn("text-[15px] font-bold leading-[1.2] font-sans tracking-tight text-center", isToday ? "text-[#5D4037] dark:text-white" : "text-text-main dark:text-white/90")}>
            {weekday}
          </span>
          <span className={cn("text-[13px] font-medium leading-[1.2] opacity-70 font-sans text-center", isToday ? "text-[#8D6E63] dark:text-white/70" : "text-text-muted dark:text-white/50")}>
            {day}/{month}
          </span>
        </div>
      );
    },
    eventContent: (eventInfo: any) => {
      const titleParts = eventInfo.event.title.split(' - ');
      const name = titleParts[0] || 'Sem Nome';
      const proc = titleParts[1] || '';
      const status = eventInfo.event.extendedProps?.status;
      
      return (
        <div className="flex flex-col justify-center h-full px-3 py-1 overflow-hidden gap-0.5 leading-tight group">
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-[12px] text-white truncate drop-shadow-sm">
              {name}
            </span>
            {status === 'confirmado' && <Check className="w-3 h-3 text-white/90 flex-shrink-0" />}
            {status === 'compareceu' && <div className="w-2 h-2 rounded-full bg-success-500 shadow-[0_0_5px_rgba(34,197,94,0.5)] flex-shrink-0" />}
          </div>
          {proc && (
            <div className="text-[10px] text-white/80 truncate font-medium">
              {proc}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border-card overflow-hidden shadow-sm">
      <style>{`
        .fc-theme-standard .fc-col-header-cell-cushion {
          padding: 10px 4px !important;
          font-size: ${isMobile ? '13px' : '14px'} !important;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .fc-timegrid-event {
          border-radius: 10px !important;
          border: none !important;
          margin: 1px 2px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.12) !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
        }
        .fc-timegrid-event:hover {
          transform: translateY(-1px) scale(1.01) !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important;
          z-index: 10 !important;
        }
        /* COR SOLIDA ABSOLUTA SEM GRADIENTE */
        .fc-timegrid-now-indicator-line {
          border: none !important;
          background-color: #dc2626 !important;
          height: 2px !important;
          margin-top: -1px !important; /* Centraliza a linha de 2px no ponto exato */
          z-index: 100 !important;
          opacity: 1 !important;
          box-shadow: none !important;
        }
        .fc-timegrid-now-indicator-arrow {
          display: none !important;
        }
        .fc-timegrid-now-indicator-container {
          background: none !important;
          border: none !important;
          opacity: 1 !important;
          overflow: visible !important;
        }
        /* Destaque sutil na coluna de HOJE */
        .fc-day-today {
          background-color: rgba(212, 154, 137, 0.15) !important; /* Mais escuro para se sobressair */
        }
        /* CORREÇÃO CRÍTICA MODO ESCURO */
        .dark .fc-theme-standard td, 
        .dark .fc-theme-standard th {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .dark .fc-col-header-cell {
          background-color: #1a1a1a !important;
        }
        .dark .fc-col-header-cell-cushion {
          color: #ffffff !important;
          display: block !important;
          width: 100% !important;
        }
        .dark .fc-day-today {
          background-color: rgba(212, 154, 137, 0.15) !important;
        }
        .dark .fc-timegrid-slot-label-cushion {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        /* Remove fundos brancos fantasmas */
        .dark .fc-scrollgrid, .dark .fc-scrollgrid-section-header, .dark .fc-scrollgrid-section-header th {
          background-color: #1a1a1a !important;
        }
      `}</style>
      
      <div className="px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-card" style={{ borderTop: `3px solid ${agenda.cor}` }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agenda.cor }} />
            <h2 className="font-heading text-lg font-semibold text-text-main">{agenda.nome}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {mediaNPS && (
            <span className={cn(
              "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm border",
              Number(mediaNPS) >= 9 ? "bg-success/20 text-success-700 dark:text-success border-success/30" : 
              Number(mediaNPS) >= 7 ? "bg-warning/20 text-warning-700 dark:text-warning border-warning/30" : 
              "bg-error/20 text-error-700 dark:text-error border-error/30"
            )}>
              ⭐ Avaliação: {mediaNPS} / 10
            </span>
          )}
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={onEditAgenda} 
                className="p-1.5 text-text-muted hover:text-primary hover:bg-white rounded-lg transition-all border border-transparent hover:border-border-card"
                title="Editar Agenda"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              {role === 'superadmin' && (
                <button 
                  onClick={handleDeleteAgenda} 
                  className="p-1.5 text-text-muted hover:text-error hover:bg-white rounded-lg transition-all border border-transparent hover:border-border-card"
                  title="Excluir Agenda"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendário */}
      <div className="p-0 md:p-4 fc-custom-theme">
        <FullCalendar
          {...commonProps}
          ref={calendarRef}
          key={`calendar-${agenda.id}-${isMobile}`}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          initialDate={initialDate}
        />
      </div>
    </div>
  );
}

function ModalCreateAgendamento({ isOpen, onClose, slotInfo, agendas, onSuccess }: any) {
  const [nomeLead, setNomeLead] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [cpfLead, setCpfLead] = useState('');
  const [whatsappLead, setWhatsappLead] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [loading, setLoading] = useState(false);

  const [todosLeads, setTodosLeads] = useState<any[]>([]);
  const [leadSelecionado, setLeadSelecionado] = useState<any>(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNomeLead(''); setProcedimento(''); setObservacoes('');
      setCpfLead(''); setDataNascimento(''); setWhatsappLead('');
      setLeadSelecionado(null);
      setMostrarDropdown(false);
      carregarLeads();
    }
  }, [isOpen]);

  const carregarLeads = async () => {
    const { data } = await supabase.from('leads_estetica').select('id, nome_lead, whatsapp_lead, procedimento_interesse, status').order('nome_lead', { ascending: true });
    if (data) setTodosLeads(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotInfo) return;
    setLoading(true);
    try {
      const dataFim = addMinutes(slotInfo.date, 60);

      const insertData: any = {
        agenda_id: slotInfo.agendaId,
        nome_lead: nomeLead,
        procedimento_nome: procedimento,
        data_hora_inicio: slotInfo.dateStr,
        data_hora_fim: dataFim.toISOString(),
        observacoes,
        status: 'agendado',
        cpf_lead: cpfLead || null,
        whatsapp_lead: whatsappLead || null,
        data_nascimento_lead: dataNascimento || null
      };

      if (leadSelecionado) {
        insertData.lead_id = leadSelecionado.id;
      }

      const { error } = await supabase.from('agendamentos_estetica').insert(insertData);
      if (error) throw error;

      if (leadSelecionado) {
        await supabase.from('leads_estetica').update({ status: 'agendado' }).eq('id', leadSelecionado.id);
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert('Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const leadsFiltrados = nomeLead 
    ? todosLeads.filter(l => (l.nome_lead || '').toLowerCase().includes(nomeLead.toLowerCase()))
    : [];

  const handleSelecionarLead = (lead: any) => {
    setLeadSelecionado(lead);
    setNomeLead(lead.nome_lead || '');
    if (lead.procedimento_interesse && !procedimento) {
      setProcedimento(lead.procedimento_interesse);
    }
    if (lead.whatsapp_lead && !whatsappLead) {
      setWhatsappLead(lead.whatsapp_lead);
    }
    setMostrarDropdown(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Agendamento">
      {slotInfo && (
        <form onSubmit={handleSave} className="space-y-4 overflow-visible">
          <div className="flex gap-4 p-3 bg-bg-base border border-border-card rounded-lg mb-4 text-sm">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {format(slotInfo.date, "dd/MM/yyyy 'às' HH:mm")}</div>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Buscar Lead / Cliente</label>
            <Input 
              required 
              value={nomeLead} 
              onFocus={() => setMostrarDropdown(true)}
              onChange={e => {
                setNomeLead(e.target.value);
                setLeadSelecionado(null);
                setMostrarDropdown(true);
              }} 
              placeholder="Digite o nome..." 
              icon={<UserIcon className="w-4 h-4" />} 
            />
            {mostrarDropdown && leadsFiltrados.length > 0 && !leadSelecionado && (
              <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-card rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {leadsFiltrados.map(l => (
                  <div 
                    key={l.id} 
                    className="p-3 hover:bg-bg-base cursor-pointer border-b border-border-card last:border-0 flex flex-col gap-1"
                    onClick={() => handleSelecionarLead(l)}
                  >
                    <span className="font-medium text-sm text-text-main">{l.nome_lead || 'Sem Nome'}</span>
                    <span className="text-xs text-text-muted">{l.whatsapp_lead || 'Sem WhatsApp'} • {l.status?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}
            {leadSelecionado && (
              <p className="text-xs text-success mt-1.5 flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5" /> Vinculado ao CRM (Status será alterado para Agendado)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Procedimento</label>
            <Input required value={procedimento} onChange={e => setProcedimento(e.target.value)} placeholder="Ex: Limpeza de Pele" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <Input 
                value={whatsappLead} 
                onChange={e => setWhatsappLead(e.target.value)} 
                placeholder="11999999999" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CPF</label>
              <Input 
                value={cpfLead} 
                onChange={e => setCpfLead(e.target.value)} 
                placeholder="000.000.000-00" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
              <input 
                type="date" 
                value={dataNascimento} 
                onChange={e => setDataNascimento(e.target.value)}
                className="flex w-full rounded-lg border border-border-card bg-bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea 
              value={observacoes} onChange={e => setObservacoes(e.target.value)}
              className="flex w-full rounded-lg border border-border-card bg-bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-24"
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>Salvar Agendamento</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ModalViewAgendamento({ isOpen, onClose, event, onSuccess, onEventUpdated }: any) {
  const [loading, setLoading] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editNascimento, setEditNascimento] = useState('');
  const [editInteresse, setEditInteresse] = useState('');
  const { user, role } = useAuth();
  const { modulos } = useModulos();
  const navigate = useNavigate();

  const fetchNotes = async () => {
    const patientId = event.extendedProps?.leads_estetica?.id || event.extendedProps?.lead_id;
    if (!patientId) return;
    const { data } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', patientId)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  useEffect(() => {
    if (isOpen && event) {
      fetchNotes();
      setNewNote('');
      const p = event.extendedProps;
      setEditNome(p.leads_estetica?.nome_lead || p.nome_lead || '');
      setEditWhatsapp(p.leads_estetica?.whatsapp_lead || p.whatsapp_lead || '');
      setEditCpf(p.leads_estetica?.cpf || p.cpf_lead || '');
      setEditNascimento(p.leads_estetica?.data_nascimento || p.data_nascimento_lead || '');
      setEditInteresse(p.leads_estetica?.procedimento_interesse || '');
    }
  }, [isOpen, event]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const patientId = event.extendedProps?.leads_estetica?.id || event.extendedProps?.lead_id;
    if (!patientId) {
      alert('Paciente não vinculado ao CRM. Não é possível adicionar notas de histórico.');
      return;
    }
    setAddingNote(true);
    try {
      const { error } = await supabase.from('lead_notes').insert({
        lead_id: patientId,
        content: newNote.trim(),
        author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
        user_id: user?.id
      });
      if (error) throw error;
      setNewNote('');
      fetchNotes();
    } catch (e) {
      alert('Erro ao adicionar nota');
    } finally {
      setAddingNote(false);
    }
  };
  
  if (!event) return null;
  const props = event.extendedProps;

  const handleUpdateStatus = async (novoStatus: string) => {
    if (novoStatus === 'compareceu') {
      if (!confirm("Confirmar que este lead compareceu para o procedimento?")) return;
    }
    setLoading(true);
    try {
      await supabase.from('agendamentos_estetica').update({ status: novoStatus }).eq('id', props.id);
      
      if (props.lead_id) {
         let mappedCRMStatus = novoStatus;
         if (novoStatus === 'confirmado') mappedCRMStatus = 'agendado';
         else if (novoStatus === 'faltou') mappedCRMStatus = 'nao_respondeu_follow_up';
         
         await supabase.from('leads_estetica').update({ status: mappedCRMStatus }).eq('id', props.lead_id);
      }

      onSuccess();
      onClose();
    } catch (e) {
      alert('Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDadosCadastrais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!props?.id) return;
    setSavingDados(true);
    try {
      const leadId = props.lead_id || props.leads_estetica?.id;
      let novoLeadId: string | undefined;

      if (leadId) {
        const { error: leadErr } = await supabase.from('leads_estetica').update({
          nome_lead: editNome.trim() || null,
          whatsapp_lead: editWhatsapp.trim() || null,
          cpf: editCpf.trim() || null,
          data_nascimento: editNascimento || null,
          procedimento_interesse: editInteresse.trim() || null,
        }).eq('id', leadId);
        if (leadErr) throw leadErr;
      } else if (editWhatsapp.trim()) {
        const { data: novoLead, error: createErr } = await supabase
          .from('leads_estetica')
          .insert({
            nome_lead: editNome.trim() || props.nome_lead || 'Paciente',
            whatsapp_lead: editWhatsapp.trim(),
            cpf: editCpf.trim() || null,
            data_nascimento: editNascimento || null,
            procedimento_interesse: editInteresse.trim() || props.procedimento_nome || null,
            status: 'agendado',
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        novoLeadId = novoLead.id;
      }

      const { error: agErr } = await supabase
        .from('agendamentos_estetica')
        .update({
          nome_lead: editNome.trim() || null,
          whatsapp_lead: editWhatsapp.trim() || null,
          cpf_lead: editCpf.trim() || null,
          data_nascimento_lead: editNascimento || null,
          ...(novoLeadId ? { lead_id: novoLeadId } : {}),
        })
        .eq('id', props.id);
      if (agErr) throw agErr;

      const { data: fresh } = await supabase
        .from('agendamentos_estetica')
        .select('*, leads_estetica(*)')
        .eq('id', props.id)
        .single();

      if (fresh) {
        onEventUpdated?.(fresh);
        setEditNome(fresh.leads_estetica?.nome_lead || fresh.nome_lead || '');
        setEditWhatsapp(fresh.leads_estetica?.whatsapp_lead || fresh.whatsapp_lead || '');
        setEditCpf(fresh.leads_estetica?.cpf || fresh.cpf_lead || '');
        setEditNascimento(fresh.leads_estetica?.data_nascimento || fresh.data_nascimento_lead || '');
        setEditInteresse(fresh.leads_estetica?.procedimento_interesse || '');
        if (fresh.lead_id || fresh.leads_estetica?.id) fetchNotes();
      }

      onSuccess();
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar dados cadastrais');
    } finally {
      setSavingDados(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;
    setLoading(true);
    try {
      await supabase.from('agendamentos_estetica').update({ status: 'cancelado' }).eq('id', props.id);
      
      if (props.lead_id) {
         await supabase.from('leads_estetica').update({ status: 'cancelamento' }).eq('id', props.lead_id);
      }

      onSuccess();
      onClose();
    } catch (e) {
      alert('Erro ao cancelar');
    } finally {
      setLoading(false);
    }
  };

  const birthDateRaw = props.leads_estetica?.data_nascimento || props.data_nascimento_lead;
  const cpfRaw = props.leads_estetica?.cpf || props.cpf_lead;
  const leadAge = calculateAge(birthDateRaw);
  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'owner' || role === 'gestor';
  const patientId = props.leads_estetica?.id || props.lead_id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Agendamento" className="max-w-xl">
      <div className="space-y-6">
        {/* Header Principal */}
        <div className="flex items-start justify-between -mt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-2xl font-bold text-text-main">{props.nome_lead || 'Sem nome'}</h3>
              {leadAge !== null && (
                <span className="bg-bg-base px-2 py-0.5 rounded text-[10px] font-bold text-text-muted border border-border-card">
                  {leadAge} anos
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-widest">{props.procedimento_nome}</Badge>
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <Clock className="w-3.5 h-3.5" />
                {format(parseISO(props.data_hora_inicio), "HH:mm")} - {format(addMinutes(parseISO(props.data_hora_inicio), 60), "HH:mm")}
              </div>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
            props.status === 'confirmado' ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
          )}>
            {props.status}
          </div>
        </div>
        
        {isAdmin ? (
          <form onSubmit={handleSaveDadosCadastrais} className="space-y-4 p-4 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                Dados cadastrais (gestão)
              </span>
              <span className="text-[9px] text-text-muted">Somente gestores e administradores</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-text-muted mb-1">Nome do Paciente *</label>
                <Input
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  placeholder="Nome completo do paciente"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">WhatsApp</label>
                <Input
                  value={editWhatsapp}
                  onChange={e => setEditWhatsapp(e.target.value)}
                  placeholder="11999999999"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={editNascimento}
                  onChange={e => setEditNascimento(e.target.value)}
                  className="flex w-full rounded-lg border border-border-card bg-bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">CPF</label>
                <Input
                  value={editCpf}
                  onChange={e => setEditCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Interesse principal</label>
                <Input
                  value={editInteresse}
                  onChange={e => setEditInteresse(e.target.value)}
                  placeholder="Ex: Botox"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" isLoading={savingDados}>
                Salvar dados cadastrais
              </Button>
            </div>
            {!patientId && !editWhatsapp.trim() && (
              <p className="text-[10px] text-warning-700 dark:text-warning">
                Informe o WhatsApp para vincular este agendamento ao CRM e habilitar notas no histórico.
              </p>
            )}
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-bg-base/40 p-3 rounded-xl border border-border-card/60 shadow-sm">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                <UserIcon className="w-3 h-3 text-primary/60" /> WhatsApp
              </span>
              <span className="font-semibold text-sm text-text-main">{props.leads_estetica?.whatsapp_lead || props.whatsapp_lead || '-'}</span>
            </div>
            <div className="bg-white dark:bg-bg-base/40 p-3 rounded-xl border border-border-card/60 shadow-sm">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                <Calendar className="w-3 h-3 text-primary/60" /> Nascimento
              </span>
              <span className="font-semibold text-sm text-text-main">{formatBirthDate(birthDateRaw)}</span>
            </div>
            <div className="bg-white dark:bg-bg-base/40 p-3 rounded-xl border border-border-card/60 shadow-sm">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                <Check className="w-3 h-3 text-primary/60" /> Interesse Principal
              </span>
              <span className="font-semibold text-sm text-text-main truncate">{props.leads_estetica?.procedimento_interesse || '-'}</span>
            </div>
            <div className="bg-white dark:bg-bg-base/40 p-3 rounded-xl border border-border-card/60 shadow-sm">
              <span className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                <Copy className="w-3 h-3 text-primary/60" /> CPF
              </span>
              <span className="font-semibold text-sm text-text-main">{displayCPF(cpfRaw, role)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div className={cn(
            "col-span-1 sm:col-span-2 p-4 rounded-2xl border shadow-inner mt-1",
            props.leads_estetica?.resumo_conversa 
              ? "bg-primary/5 border-primary/20" 
              : "bg-bg-base/30 border-border-card/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2 h-2 rounded-full", props.leads_estetica?.resumo_conversa ? "bg-primary animate-pulse" : "bg-text-muted/30")} />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Resumo do atendimento</span>
            </div>
            <p className={cn(
              "text-sm leading-relaxed",
              props.leads_estetica?.resumo_conversa 
                ? "italic font-serif text-text-main" 
                : "text-text-muted/60 font-sans"
            )}>
              {props.leads_estetica?.resumo_conversa 
                ? `"${props.leads_estetica.resumo_conversa}"` 
                : "Nenhum resumo registrado para este paciente."}
            </p>
          </div>
        </div>

          {/* Histórico de Notas (Lead Notes) — todos os perfis */}
          <div className="pt-6 border-t border-border-card">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">
              <FileText className="w-3.5 h-3.5 text-primary" /> Histórico de Notas (CRM)
            </h4>
            <p className="text-[9px] text-text-muted mb-4">
              {isAdmin
                ? 'Registre observações da equipe. Dados pessoais (CPF, nascimento) são editados no bloco acima.'
                : 'Você pode registrar observações clínicas aqui. CPF e dados cadastrais são geridos pela recepção/gestão.'}
            </p>
            
            <form onSubmit={handleAddNote} className="mb-6">
              <div className="relative">
                <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Escreva uma nova nota no histórico deste paciente..."
                  className="w-full rounded-xl border border-border-card bg-bg-base/40 p-3 pr-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-20"
                />
                <button 
                  type="submit" 
                  disabled={addingNote || !newNote.trim()}
                  className="absolute bottom-2.5 right-2.5 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
            </form>

            {/* Lista de notas */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="bg-bg-base/30 rounded-xl p-3 border border-border-card/40 relative group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="w-2.5 h-2.5 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-text-main">{note.author_name}</span>
                      </div>
                      <span className="text-[9px] text-text-muted">
                        {format(parseISO(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 px-4 border border-dashed border-border-card rounded-xl">
                  <p className="text-[10px] text-text-muted">Nenhuma nota no histórico do CRM.</p>
                </div>
              )}
            </div>
          </div>

          {modulos.modulo_prontuario && patientId && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] uppercase font-bold px-3"
                onClick={() => navigate(`/prontuario?id=${patientId}`)}
              >
                Ver Prontuário
              </Button>
            </div>
          )}

          {/* Ações e Status - Restrito para Gestores/Admin */}
          {isAdmin && (
            <div className="pt-6 border-t border-border-card space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Atualizar Situação</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['agendado', 'confirmado', 'compareceu', 'faltou'].map(s => (
                  <button 
                    key={s}
                    onClick={() => props.status !== s && handleUpdateStatus(s)}
                    disabled={loading}
                    className={cn(
                      "py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                      props.status === s 
                        ? "bg-primary text-white border-primary shadow-primary/20 scale-[1.02]" 
                        : "bg-white dark:bg-bg-base/20 text-text-muted border-border-card hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zona de Perigo */}
          {(role === 'superadmin' || role === 'admin' || role === 'owner') && (
            <div className="flex justify-between items-center bg-error/5 p-4 rounded-2xl border border-error/10 transition-all hover:bg-error/10">
              <div className="flex flex-col">
                <span className="text-xs text-error font-bold uppercase tracking-tight">Zona de perigo</span>
                <span className="text-[10px] text-error/60">Cancelar permanentemente este horário</span>
              </div>
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={loading || props.status === 'cancelado'} className="shadow-lg shadow-error/10 h-9 font-bold px-5">
                Cancelar
              </Button>
            </div>
          )}
        </div>
    </Modal>
  );
}

function ModalEditAgenda({ isOpen, onClose, agenda, onSuccess }: any) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#C47E7E');
  const [loading, setLoading] = useState(false);
  const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
  const [hours, setHours] = useState<any[]>([]);

  useEffect(() => {
    if (agenda) {
      setNome(agenda.nome);
      setCor(agenda.cor);
      const sorted = DIAS_SEMANA.map(dia => {
        const h = agenda.hours.find((x: any) => x.dia === dia);
        return h || { dia, aberto: false, hora_inicio: '', hora_fim: '' };
      });
      setHours(sorted);
    } else {
      setNome('');
      setCor('#C47E7E');
      setHours(DIAS_SEMANA.map(dia => ({ dia, aberto: false, hora_inicio: '08:00', hora_fim: '18:00' })));
    }
  }, [agenda, isOpen]);

  const handleHourChange = (index: number, field: string, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (agenda) {
        await supabase.from('agendas').update({ nome, cor }).eq('id', agenda.id);
        for (const h of hours) {
          if (h.id) {
            await supabase.from('agenda_hours').update({ aberto: h.aberto, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim }).eq('id', h.id);
          } else {
            await supabase.from('agenda_hours').insert({ agenda_id: agenda.id, dia: h.dia, aberto: h.aberto, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim });
          }
        }
      } else {
        const { data: nova, error: errC } = await supabase.from('agendas').insert({ nome, cor, ativo: true }).select('id').single();
        if (errC) throw errC;
        if (nova) {
          const newId = nova.id;

          for (const h of hours) {
            const { error: errH } = await supabase.from('agenda_hours')
              .update({ aberto: h.aberto, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim })
              .eq('agenda_id', newId)
              .eq('dia', h.dia);
            if (errH) {
               await supabase.from('agenda_hours').insert({ agenda_id: newId, dia: h.dia, aberto: h.aberto, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim });
            }
          }
        }
      }
      onSuccess();
      onClose();
    } catch {
      alert('Erro ao salvar agenda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={agenda ? "Editar Agenda" : "Nova Agenda"} className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da agenda</label>
            <Input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Sala 2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cor identificadora</label>
            <div className="flex items-center gap-3">
              <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-border-card pt-4 space-y-3">
          <h4 className="font-heading font-semibold text-text-main">Horários de funcionamento</h4>
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {hours.map((h, i) => (
              <div key={h.dia} className="flex items-center justify-between gap-4 p-2 rounded-lg border border-border-card bg-bg-base/50">
                <div className="flex items-center gap-3 w-32">
                  <input type="checkbox" className="rounded border-border-card text-primary focus:ring-primary" checked={h.aberto} onChange={e => handleHourChange(i, 'aberto', e.target.checked)} />
                  <span className="text-sm font-medium capitalize">{h.dia}</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Input type="time" disabled={!h.aberto} value={h.hora_inicio || ''} onChange={e => handleHourChange(i, 'hora_inicio', e.target.value)} className="w-full h-8 px-2" />
                  <span className="text-text-muted text-xs">às</span>
                  <Input type="time" disabled={!h.aberto} value={h.hora_fim || ''} onChange={e => handleHourChange(i, 'hora_fim', e.target.value)} className="w-full h-8 px-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>Salvar agenda</Button>
        </div>
      </form>
    </Modal>
  );
}
