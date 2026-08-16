import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { cn, calculateAge, displayCPF, formatBirthDate, canViewFullCPF } from '../lib/utils';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, X, Phone, Clock, FileText, Loader2, Calendar, Edit2, Check, Send, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HScrollArea } from '../components/ui/HScrollArea';
import { leadCreateSchema, leadUpdateSchema, formatZodError } from '../lib/validation';

/** Colunas do funil clínico. Status legados de automação são agrupados aqui. */
const COLUMNS = [
  { id: 'inicio_atendimento', statuses: ['inicio_atendimento'], title: 'Novo contato', dotClass: 'bg-white shadow-sm', headerBg: 'bg-primary border-primary text-[color:var(--primary-foreground)] shadow-inner opacity-90' },
  { id: 'conversando', statuses: ['conversando'], title: 'Em contato', dotClass: 'bg-white shadow-sm', headerBg: 'bg-primary border-primary text-[color:var(--primary-foreground)] shadow-inner opacity-95' },
  { id: 'agendado', statuses: ['agendado'], title: 'Agendado', dotClass: 'bg-white shadow-sm', headerBg: 'bg-primary border-primary text-[color:var(--primary-foreground)] shadow-inner opacity-100' },
  { id: 'compareceu', statuses: ['compareceu'], title: 'Compareceu', dotClass: 'bg-white shadow-sm', headerBg: 'bg-success border-success text-white shadow-inner opacity-90' },
  { id: 'follow_up_1', statuses: ['follow_up_1', 'follow_up_2', 'follow_up_3'], title: 'Acompanhar', dotClass: 'bg-white shadow-sm', headerBg: 'bg-primary border-primary text-[color:var(--primary-foreground)] shadow-inner opacity-85' },
  { id: 'nao_respondeu_follow_up', statuses: ['nao_respondeu_follow_up', 'abandonou_conversa'], title: 'Sem retorno', dotClass: 'bg-white/50', headerBg: 'bg-bg-base border-border-card text-text-muted opacity-90' },
  { id: 'cancelamento', statuses: ['cancelamento', 'cancelou_agendamento'], title: 'Cancelado', dotClass: 'bg-white/50', headerBg: 'bg-error border-error text-white opacity-90' },
] as const;

const CRM_LEAD_FIELDS =
  'id, nome_lead, whatsapp_lead, cpf, data_nascimento, procedimento_interesse, motivo_contato, status, data_agendamento, data_primeira_visita, nota_nps, resumo_conversa, ultima_mensagem, inicio_atendimento';
const COLUMN_PAGE_SIZE = 40;


export function CRM() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [columnsData, setColumnsData] = useState<Record<string, any[]>>({});
  const [columnCounts, setColumnCounts] = useState<Record<string, number>>({});
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [loadingMoreColumn, setLoadingMoreColumn] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  // O AdminRoute no App.tsx já cuida da proteção de acesso.
  // Remover verificação interna para evitar conflitos de carregamento.

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        COLUMNS.map(async (column) => {
          const { data, count, error } = await supabase
            .from('leads_estetica_safe')
            .select(CRM_LEAD_FIELDS, { count: 'exact' })
            .in('status', [...column.statuses])
            .order('inicio_atendimento', { ascending: false, nullsFirst: false })
            .range(0, COLUMN_PAGE_SIZE - 1);

          if (error) throw error;
          return { columnId: column.id, rows: data || [], count: count || 0 };
        })
      );

      const grouped: Record<string, any[]> = {};
      const counts: Record<string, number> = {};
      const pages: Record<string, number> = {};
      results.forEach(({ columnId, rows, count }) => {
        grouped[columnId] = rows;
        counts[columnId] = count;
        pages[columnId] = 1;
      });

      setColumnsData(grouped);
      setColumnCounts(counts);
      setColumnPages(pages);
    } catch {
      // Falha ao carregar leads — mantém o estado atual
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (columnId: string) => {
    const column = COLUMNS.find((item) => item.id === columnId);
    if (!column || loadingMoreColumn) return;

    const nextPage = (columnPages[columnId] || 1) + 1;
    const from = (nextPage - 1) * COLUMN_PAGE_SIZE;

    try {
      setLoadingMoreColumn(columnId);
      const { data, count, error } = await supabase
        .from('leads_estetica_safe')
        .select(CRM_LEAD_FIELDS, { count: 'exact' })
        .in('status', [...column.statuses])
        .order('inicio_atendimento', { ascending: false, nullsFirst: false })
        .range(from, from + COLUMN_PAGE_SIZE - 1);

      if (error) throw error;
      setColumnsData((current) => ({
        ...current,
        [columnId]: [...(current[columnId] || []), ...(data || [])],
      }));
      setColumnCounts((current) => ({ ...current, [columnId]: count || 0 }));
      setColumnPages((current) => ({ ...current, [columnId]: nextPage }));
    } catch {
      alert('Não foi possível carregar mais registros.');
    } finally {
      setLoadingMoreColumn(null);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    const leadId = draggableId;

    // Optimistic Update
    const sourceClone = Array.from(columnsData[sourceColId] || []);
    const destClone = Array.from(columnsData[destColId] || []);
    const [movedLead] = sourceClone.splice(source.index, 1);
    
    // Atualiza status local
    movedLead.status = destColId;
    destClone.splice(destination.index, 0, movedLead);

    setColumnsData({
      ...columnsData,
      [sourceColId]: sourceClone,
      [destColId]: destClone
    });
    setColumnCounts((current) => ({
      ...current,
      [sourceColId]: Math.max(0, (current[sourceColId] || 0) - 1),
      [destColId]: (current[destColId] || 0) + 1,
    }));

    try {
      const updateData: any = { status: destColId };
      if (destColId === 'compareceu') {
        updateData.data_primeira_visita = new Date().toISOString().split('T')[0];
      }
      const { error } = await supabase.from('leads_estetica').update(updateData).eq('id', leadId);
      if (error) throw error;
    } catch (e) {
      alert('Erro ao mover lead, revertendo...');
      fetchLeads(); // rollback fetch
    }
  };

  const handleOpenDrawer = (lead: any) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  if (loading) {
    return <div className="h-64 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-[calc(100vh-110px)] lg:h-[calc(100vh-115px)] flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center pb-4">
        <h1 className="text-2xl font-heading font-bold text-text-main">CRM — Pipeline da clínica</h1>
        <Button variant="primary" onClick={() => setNewLeadModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo lead
        </Button>
      </div>

      <HScrollArea className="flex-1 h-full w-screen -ml-4 lg:w-[calc(100%+4rem)] lg:-ml-8">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-4 pb-4 px-4 lg:px-8 min-w-max">
            {COLUMNS.map(col => {
              const cards = columnsData[col.id] || [];
              return (
                <div key={col.id} className="w-[calc(100vw-2rem)] md:w-[280px] bg-bg-card/50 dark:bg-bg-base/20 rounded-2xl border border-border-card/60 flex flex-col flex-shrink-0 shadow-sm">
                  <div className={cn("px-4 py-3 border-b flex items-center justify-between rounded-t-[12px]", col.headerBg)}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", col.dotClass)} />
                      <h3 className="font-bold text-[11px] uppercase tracking-wider drop-shadow-sm">{col.title}</h3>
                    </div>
                    <span className="text-xs bg-white text-[#3D3935] px-2 py-0.5 rounded-full font-bold shadow-sm ring-1 ring-black/5">
                      {columnCounts[col.id] ?? cards.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "flex-1 p-2 overflow-y-auto space-y-2 pb-10 transition-colors",
                          snapshot.isDraggingOver ? "bg-bg-base" : "bg-transparent"
                        )}
                      >
                        {cards.map((lead, index) => (
                          <KanbanCard 
                            key={lead.id} 
                            lead={lead} 
                            index={index} 
                            onClick={() => handleOpenDrawer(lead)} 
                          />
                        ))}
                        {provided.placeholder}
                        {cards.length < (columnCounts[col.id] || 0) && (
                          <button
                            type="button"
                            onClick={() => loadMore(col.id)}
                            disabled={loadingMoreColumn !== null}
                            className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg disabled:opacity-50"
                          >
                            {loadingMoreColumn === col.id ? 'Carregando...' : 'Carregar mais'}
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </HScrollArea>

      <ModalNewLead 
        isOpen={newLeadModalOpen} 
        onClose={() => setNewLeadModalOpen(false)} 
        onSuccess={fetchLeads} 
      />

      <DrawerLead
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lead={selectedLead}
        onRefresh={fetchLeads}
        navigate={navigate}
      />
    </div>
  );
}

// -------------------------------------------------------------
// KANBAN CARD
// -------------------------------------------------------------
function KanbanCard({ lead, index, onClick }: { lead: any, index: number, onClick: () => void }) {
  const referenceDate = lead.ultima_mensagem || lead.inicio_atendimento;
  const tempoStr = referenceDate
    ? formatDistanceToNow(parseISO(referenceDate), { locale: ptBR, addSuffix: true })
    : 'Sem data';

  const statusColors: Record<string, string> = {
    'inicio_atendimento': 'border-l-primary',
    'conversando': 'border-l-primary',
    'agendado': 'border-l-warning',
    'cancelamento': 'border-l-error',
    'cancelou_agendamento': 'border-l-error',
    'compareceu': 'border-l-success',
    'follow_up_1': 'border-l-neutral-taupe',
    'follow_up_2': 'border-l-neutral-taupe',
    'follow_up_3': 'border-l-neutral-taupe',
    'nao_respondeu_follow_up': 'border-l-neutral-taupe',
    'abandonou_conversa': 'border-l-neutral-taupe',
  };
  const accentClass = statusColors[lead.status] || 'border-l-transparent';

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "bg-bg-card border border-border-card/50 border-l-[3px] p-4 rounded-[12px] cursor-pointer text-sm group relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1",
            accentClass,
            snapshot.isDragging 
              ? "shadow-2xl ring-2 ring-primary/30 opacity-95 cursor-grabbing scale-105" 
              : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <div className="font-semibold text-text-main mb-2 line-clamp-1">{lead.nome_lead || 'Lead sem nome'}</div>
          
          <div className="flex items-center gap-3 mb-3 text-text-muted">
            <div className="flex items-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-primary/70" />
              <span>{lead.whatsapp_lead}</span>
            </div>
            {lead.data_nascimento && (
              <>
                <span className="w-1 h-1 rounded-full bg-border-card"></span>
                <span className="text-xs">{calculateAge(lead.data_nascimento)} anos</span>
              </>
            )}
          </div>
          
          {lead.procedimento_interesse && (
            <div className="mb-4 flex items-center justify-between">
               <span className="text-[10px] font-medium text-text-main bg-primary/20 px-2 py-0.5 rounded-full line-clamp-1 border border-primary/30 inline-block">
                 {lead.procedimento_interesse}
               </span>
               {lead.nota_nps != null && (
                 <span className={cn(
                   "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                   lead.nota_nps >= 9 ? "bg-success/20 text-success-700 dark:text-success" : 
                   lead.nota_nps >= 7 ? "bg-warning/20 text-warning-700 dark:text-warning" : 
                   "bg-error/20 text-error-700 dark:text-error"
                 )}>
                    ⭐ {lead.nota_nps} / 10
                  </span>
               )}
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-card/50">
            <div className="flex flex-col gap-1.5 items-start">

              {lead.status === 'agendado' && lead.data_agendamento && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-warning-700 dark:text-warning-400 bg-warning/10 px-2 py-1 rounded-lg mt-2 border border-warning/20">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(lead.data_agendamento), "dd/MM 'às' HH:mm")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-text-muted font-medium whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" />
              {tempoStr.replace('cerca de ', '')}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// -------------------------------------------------------------
// NEW LEAD MODAL
// -------------------------------------------------------------
function ModalNewLead({ isOpen, onClose, onSuccess }: any) {
  const [whatsapp, setWhatsapp] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = leadCreateSchema.safeParse({
        whatsapp_lead: whatsapp,
        nome_lead: nome,
        cpf: cpf || null,
        data_nascimento: dataNascimento || null,
        procedimento_interesse: procedimento || null,
        motivo_contato: motivo || null,
        status: 'inicio_atendimento',
      });
      if (!parsed.success) {
        alert(formatZodError(parsed.error));
        return;
      }
      const { error } = await supabase.from('leads_estetica').insert(parsed.data);
      if (error) throw error;
      onSuccess();
      onClose();
      // reset
      setWhatsapp(''); setNome(''); setCpf(''); setDataNascimento(''); setProcedimento(''); setMotivo('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Lead">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp <span className="text-error">*</span></label>
          <Input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 11999999999" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ana Silva" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">CPF</label>
            <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
            <Input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Procedimento de interesse</label>
          <Input value={procedimento} onChange={e => setProcedimento(e.target.value)} placeholder="Ex: Botox" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Motivo do contato</label>
          <textarea 
            value={motivo} onChange={e => setMotivo(e.target.value)}
            className="flex w-full rounded-lg border border-border-card bg-bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-24"
            placeholder="Dúvidas sobre valores, agendamento..."
          />
        </div>
        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={loading}>Salvar lead</Button>
        </div>
      </form>
    </Modal>
  );
}

// -------------------------------------------------------------
// DRAWER LEAD (Detalhes)
// -------------------------------------------------------------
function DrawerLead({ isOpen, onClose, lead, onRefresh, navigate }: any) {
  if (!lead) return null;

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_lead: '', 
    whatsapp_lead: '', 
    cpf: '',
    data_nascimento: '',
    procedimento_interesse: '', 
    motivo_contato: '', 
    observacoes: ''
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        nome_lead: lead.nome_lead || '',
        whatsapp_lead: lead.whatsapp_lead || '',
        cpf: lead.cpf || '',
        data_nascimento: lead.data_nascimento || '',
        procedimento_interesse: lead.procedimento_interesse || '',
        motivo_contato: lead.motivo_contato || '',
        observacoes: lead.observacoes || ''
      });
      setEditMode(false);
    }
  }, [lead, isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const parsed = leadUpdateSchema.safeParse({
        nome_lead: formData.nome_lead,
        whatsapp_lead: formData.whatsapp_lead,
        cpf: formData.cpf || null,
        data_nascimento: formData.data_nascimento || null,
        procedimento_interesse: formData.procedimento_interesse || null,
        motivo_contato: formData.motivo_contato || null,
      });
      if (!parsed.success) {
        alert(formatZodError(parsed.error));
        return;
      }
      await supabase.from('leads_estetica').update(parsed.data).eq('id', lead.id);
      onRefresh();
      setEditMode(false);
    } catch (e) {
      alert('Erro ao salvar edições');
    } finally {
      setLoading(false);
    }
  };

  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const { user, role } = useAuth();

  const fetchNotes = async () => {
    if (!lead?.id) return;
    const { data } = await supabase
      .from('lead_notes')
      .select('id, author_name, created_at, content')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchNotes();
    }
  }, [isOpen, lead]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const { error } = await supabase.from('lead_notes').insert({
        lead_id: lead.id,
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

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/40 z-50 transition-opacity", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} />
      
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-card border-l border-border-card shadow-xl transition-transform duration-300 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Drawer Header */}
        <div className="p-6 border-b border-border-card flex items-center justify-between bg-bg-base/50">
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-heading font-semibold text-text-main mb-1">Detalhes do Lead</h2>
              <div className="flex items-center gap-2">
                <Badge variant={lead.status as any} />
                {lead.status === 'agendado' && lead.data_agendamento && (
                  <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded">
                    {new Date(lead.data_agendamento).toLocaleDateString('pt-BR')} às {new Date(lead.data_agendamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-card rounded-md text-text-muted hover:text-text-main"><X className="w-5 h-5" /></button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-text-main text-lg">{lead.nome_lead || 'Lead Sem Nome'}</h3>
            <Button variant="secondary" size="sm" onClick={() => editMode ? handleSave() : setEditMode(true)} isLoading={loading}>
              {editMode ? <><Check className="w-4 h-4 mr-2" /> Salvar</> : <><Edit2 className="w-4 h-4 mr-2" /> Editar</>}
            </Button>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div><label className="text-xs font-medium text-text-muted block mb-1">Nome</label><Input value={formData.nome_lead} onChange={e => setFormData({...formData, nome_lead: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-text-muted block mb-1">WhatsApp</label><Input value={formData.whatsapp_lead} onChange={e => setFormData({...formData, whatsapp_lead: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-text-muted block mb-1">CPF</label><Input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} disabled={!canViewFullCPF(role)} /></div>
                <div><label className="text-xs font-medium text-text-muted block mb-1">Nascimento</label><Input type="date" value={formData.data_nascimento} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} /></div>
              </div>
              <div><label className="text-xs font-medium text-text-muted block mb-1">Interesse</label><Input value={formData.procedimento_interesse} onChange={e => setFormData({...formData, procedimento_interesse: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-text-muted block mb-1">Motivo</label><Input value={formData.motivo_contato} onChange={e => setFormData({...formData, motivo_contato: e.target.value})} /></div>
            </div>
          ) : (
            <>
              {/* Infos básicas */}
              <div className="grid grid-cols-2 gap-4 text-sm text-text-main">
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">WhatsApp</span>
                  {lead.whatsapp_lead}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">Idade</span>
                  {lead.data_nascimento ? `${calculateAge(lead.data_nascimento)} anos` : '-'}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">Nascimento</span>
                  {formatBirthDate(lead.data_nascimento)}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">CPF</span>
                  {displayCPF(lead.cpf, role)}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">Última atualização</span>
                  {(lead.ultima_mensagem || lead.inicio_atendimento)
                    ? new Date(lead.ultima_mensagem || lead.inicio_atendimento).toLocaleDateString('pt-BR')
                    : '-'}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">Início</span>
                  {new Date(lead.inicio_atendimento).toLocaleDateString('pt-BR')}
                </div>
                <div className="col-span-2 bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">Interesse</span>
                  {lead.procedimento_interesse || '-'}
                </div>
                {lead.nota_nps != null && (
                  <div className="col-span-2 bg-bg-base p-3 rounded-lg border border-border-card flex items-center justify-between">
                    <span className="block text-xs text-text-muted font-semibold">Avaliação</span>
                    <span className={cn(
                      "text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5",
                      lead.nota_nps >= 9 ? "bg-success/20 text-success-700 dark:text-success border border-success/30" : 
                      lead.nota_nps >= 7 ? "bg-warning/20 text-warning-700 dark:text-warning border border-warning/30" : 
                      "bg-error/20 text-error-700 dark:text-error border border-error/30"
                    )}>
                      ⭐ {lead.nota_nps} / 10
                    </span>
                  </div>
                )}
              </div>

              {/* Resumo Conversa */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-text-main mb-2">
                  <FileText className="w-4 h-4 text-primary" /> Resumo do atendimento
                </h4>
                <div className="text-sm p-4 rounded-lg bg-primary-light/50 border border-primary/20 whitespace-pre-wrap leading-relaxed">
                  {lead.resumo_conversa || <span className="text-text-muted italic">Nenhum resumo registrado.</span>}
                </div>
              </div>


              {/* Histórico de Notas */}
              <div className="pt-6 border-t border-border-card">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-text-main mb-4">
                  <FileText className="w-4 h-4 text-primary" /> Histórico de Notas
                </h4>
                
                {/* Form para nova nota */}
                <form onSubmit={handleAddNote} className="mb-6">
                  <div className="relative">
                    <textarea 
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Escreva uma nova nota interna..."
                      className="w-full rounded-xl border border-border-card bg-bg-base p-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
                    />
                    <button 
                      type="submit" 
                      disabled={addingNote || !newNote.trim()}
                      className="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </form>

                {/* Lista de notas */}
                <div className="space-y-4">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="bg-bg-base/50 rounded-xl p-4 border border-border-card/50 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-text-main">{note.author_name}</span>
                          </div>
                          <span className="text-[10px] text-text-muted">
                            {format(parseISO(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-border-card rounded-2xl">
                      <p className="text-xs text-text-muted">Nenhuma nota registrada ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border-card bg-bg-base mt-auto">
          {lead.id_agendamento && (
            <Button className="w-full" onClick={() => navigate('/agenda')}>
              <Calendar className="w-4 h-4 mr-2" />
              Ver na Agenda
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
