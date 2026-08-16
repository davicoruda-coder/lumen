import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { HScrollArea } from '../components/ui/HScrollArea';
import { UserSearch, UserCheck, Loader2, Calendar, Search, Users, Phone, X, Edit2, Check, ExternalLink, FileDown } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCPF, calculateAge, canViewFullCPF, displayCPF, formatBirthDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leadUpdateSchema, formatZodError } from '../lib/validation';

type TabType = 'leads' | 'clientes';
type FilterType = 'hoje' | 'ontem' | '7dias' | '14semanas' | 'mes' | 'ano' | 'custom';
const ITEMS_PER_PAGE = 20;
const EXPORT_BATCH_SIZE = 500;
const LEAD_LIST_FIELDS =
  'id, nome_lead, whatsapp_lead, cpf, data_nascimento, procedimento_interesse, motivo_contato, observacoes, valor_pago, status, data_agendamento, data_primeira_visita, ultima_mensagem, inicio_atendimento';

export function LeadsClientes() {
  const { role } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [filter, setFilter] = useState<FilterType>('7dias');
  const [dateRange, setDateRange] = useState({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tabCounts, setTabCounts] = useState({ leads: 0, clientes: 0 });
  
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Drawer
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (role && role !== 'superadmin' && role !== 'admin' && role !== 'owner' && role !== 'gestor') {
      navigate('/agenda');
    }
  }, [role, navigate]);

  useEffect(() => {
    applyFilter(filter);
  }, [filter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [dateRange, activeTab, page, debouncedSearch]);

  if (!role || (role !== 'superadmin' && role !== 'admin' && role !== 'owner' && role !== 'gestor')) {
    return null;
  }

  const applyFilter = (type: FilterType) => {
    const today = new Date();
    let start = today; let end = today;
    switch (type) {
      case 'hoje': start = startOfDay(today); end = endOfDay(today); break;
      case 'ontem': const yesterday = subDays(today, 1); start = startOfDay(yesterday); end = endOfDay(yesterday); break;
      case '7dias': start = startOfDay(subDays(today, 6)); end = endOfDay(today); break;
      case '14semanas': start = startOfDay(subWeeks(today, 14)); end = endOfDay(today); break;
      case 'mes': start = startOfMonth(today); end = endOfMonth(today); break;
      case 'ano': start = startOfYear(today); end = endOfYear(today); break;
      case 'custom': return;
    }
    setDateRange({ start, end });
    setPage(1);
  };

  const fetchData = async () => {
    setLoading(true);

    const startStr = dateRange.start.toISOString();
    const endStr = dateRange.end.toISOString();
    const from = (page - 1) * ITEMS_PER_PAGE;
    const safeSearch = debouncedSearch.replace(/[(),.%]/g, '');

    try {
      let activeQuery = supabase
        .from('leads_estetica_safe')
        .select(LEAD_LIST_FIELDS, { count: 'exact' })
        .gte('inicio_atendimento', startStr)
        .lte('inicio_atendimento', endStr)
        .order(activeTab === 'clientes' ? 'data_primeira_visita' : 'inicio_atendimento', {
          ascending: false,
          nullsFirst: false,
        })
        .range(from, from + ITEMS_PER_PAGE - 1);

      activeQuery = activeTab === 'clientes'
        ? activeQuery.eq('status', 'compareceu')
        : activeQuery.neq('status', 'compareceu');

      let otherCountQuery = supabase
        .from('leads_estetica_safe')
        .select('id', { count: 'exact', head: true })
        .gte('inicio_atendimento', startStr)
        .lte('inicio_atendimento', endStr);

      otherCountQuery = activeTab === 'clientes'
        ? otherCountQuery.neq('status', 'compareceu')
        : otherCountQuery.eq('status', 'compareceu');

      if (safeSearch) {
        const searchFilter = `nome_lead.ilike.%${safeSearch}%,whatsapp_lead.ilike.%${safeSearch}%`;
        activeQuery = activeQuery.or(searchFilter);
        otherCountQuery = otherCountQuery.or(searchFilter);
      }

      const [{ data, count, error }, { count: otherCount, error: countError }] =
        await Promise.all([activeQuery, otherCountQuery]);
      if (error) throw error;
      if (countError) throw countError;

      const rows = data || [];
      setTabCounts(activeTab === 'clientes'
        ? { leads: otherCount || 0, clientes: count || 0 }
        : { leads: count || 0, clientes: otherCount || 0 });

      if (activeTab === 'leads') {
        setLeads(rows);
      } else if (rows.length === 0) {
        setClientes([]);
      } else {
        const leadIds = rows.map((item) => item.id);
        const { data: agData, error: agError } = await supabase
          .from('agendamentos_estetica')
          .select('lead_id, status, data_hora_inicio')
          .in('lead_id', leadIds)
          .order('data_hora_inicio', { ascending: true });
        if (agError) throw agError;

        const appointmentsByLead = new Map<string, any[]>();
        (agData || []).forEach((appointment: any) => {
          const appointments = appointmentsByLead.get(appointment.lead_id) || [];
          appointments.push(appointment);
          appointmentsByLead.set(appointment.lead_id, appointments);
        });
        const nowStr = new Date().toISOString();
        setClientes(rows.map((lead: any) => {
          const appointments = appointmentsByLead.get(lead.id) || [];
          const nextAppointment = appointments.find(
            (appointment) => appointment.data_hora_inicio >= nowStr && appointment.status !== 'cancelado'
          );
          return {
            ...lead,
            leadData: lead,
            procedimentosQtd: appointments.filter((appointment) => appointment.status === 'compareceu').length,
            proximoAgendamento: nextAppointment?.data_hora_inicio || null,
            todosAgendamentos: appointments,
          };
        }));
      }
    } catch {
      // Falha ao carregar — mantém o estado atual
    } finally {
      setLoading(false);
    }
  };

  const fetchExportData = async () => {
    const startStr = dateRange.start.toISOString();
    const endStr = dateRange.end.toISOString();
    const safeSearch = debouncedSearch.replace(/[(),.%]/g, '');
    const allRows: any[] = [];

    for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
      let query = supabase
        .from('leads_estetica_safe')
        .select(LEAD_LIST_FIELDS)
        .gte('inicio_atendimento', startStr)
        .lte('inicio_atendimento', endStr)
        .order(activeTab === 'clientes' ? 'data_primeira_visita' : 'inicio_atendimento', {
          ascending: false,
          nullsFirst: false,
        })
        .range(from, from + EXPORT_BATCH_SIZE - 1);

      query = activeTab === 'clientes'
        ? query.eq('status', 'compareceu')
        : query.neq('status', 'compareceu');
      if (safeSearch) {
        query = query.or(`nome_lead.ilike.%${safeSearch}%,whatsapp_lead.ilike.%${safeSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      allRows.push(...batch);
      if (batch.length < EXPORT_BATCH_SIZE) break;
    }

    if (activeTab === 'leads' || allRows.length === 0) return allRows;

    const appointments: any[] = [];
    for (let index = 0; index < allRows.length; index += 100) {
      const leadIds = allRows.slice(index, index + 100).map((item) => item.id);
      const { data, error } = await supabase
        .from('agendamentos_estetica')
        .select('lead_id, status, data_hora_inicio')
        .in('lead_id', leadIds)
        .order('data_hora_inicio', { ascending: true });
      if (error) throw error;
      appointments.push(...(data || []));
    }

    const appointmentsByLead = new Map<string, any[]>();
    appointments.forEach((appointment) => {
      const rows = appointmentsByLead.get(appointment.lead_id) || [];
      rows.push(appointment);
      appointmentsByLead.set(appointment.lead_id, rows);
    });

    return allRows.map((lead) => {
      const leadAppointments = appointmentsByLead.get(lead.id) || [];
      return {
        ...lead,
        leadData: lead,
        procedimentosQtd: leadAppointments.filter((appointment) => appointment.status === 'compareceu').length,
      };
    });
  };

  const exportToCSV = async () => {
    try {
      const dataToExport = await fetchExportData();
      if (dataToExport.length === 0) return alert('Nenhum dado para exportar.');

      const headers = activeTab === 'leads'
        ? ['Nome', 'WhatsApp', 'CPF', 'Idade', 'Procedimento', 'Status', 'Iniciou em']
        : ['Nome', 'WhatsApp', 'CPF', 'Idade', 'Procedimentos Realizados', 'Cliente Desde'];

      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => {
          if (activeTab === 'leads') {
            return [
              `"${row.nome_lead || ''}"`,
              `"${row.whatsapp_lead || ''}"`,
              `"${row.cpf || ''}"`,
              `"${row.data_nascimento ? calculateAge(row.data_nascimento) : ''}"`,
              `"${row.procedimento_interesse || ''}"`,
              `"${row.status || ''}"`,
              `"${row.inicio_atendimento ? format(parseISO(row.inicio_atendimento), 'dd/MM/yyyy HH:mm') : ''}"`
            ].join(',');
          } else {
            const l = row.leadData || row;
            return [
              `"${l.nome_lead || ''}"`,
              `"${l.whatsapp_lead || ''}"`,
              `"${l.cpf || ''}"`,
              `"${l.data_nascimento ? calculateAge(l.data_nascimento) : ''}"`,
              `"${row.procedimentosQtd || 0}"`,
              `"${l.inicio_atendimento ? format(parseISO(l.inicio_atendimento), 'dd/MM/yyyy') : ''}"`
            ].join(',');
          }
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `exportacao_${activeTab}_${format(new Date(), 'ddMMyyyy')}.csv`;
      link.click();
    } catch {
      alert('Ocorreu um erro ao gerar o arquivo CSV. Verifique se os dados estão completos.');
    }
  };

  const exportToPDF = async () => {
    try {
      const dataToExport = await fetchExportData();
      if (dataToExport.length === 0) return alert('Nenhum dado para exportar.');
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF();
      const title = activeTab === 'leads' ? 'Relatório de Leads' : 'Relatório de Clientes';
      doc.text(title, 14, 15);
    
      const headers = activeTab === 'leads'
        ? [['Nome', 'WhatsApp', 'CPF', 'Idade', 'Procedimento', 'Status', 'Iniciou em']]
        : [['Nome', 'WhatsApp', 'CPF', 'Idade', 'Proc. Realizados', 'Cliente Desde']];

      const body = dataToExport.map(row => {
        if (activeTab === 'leads') {
          return [
            row.nome_lead || '',
            row.whatsapp_lead || '',
            row.cpf ? formatCPF(row.cpf) : '',
            row.data_nascimento ? `${calculateAge(row.data_nascimento)}a` : '',
            row.procedimento_interesse || '',
            row.status || '',
            format(parseISO(row.inicio_atendimento), 'dd/MM/yy')
          ];
        }
        return [
          row.leadData?.nome_lead || '',
          row.leadData?.whatsapp_lead || '',
          row.leadData?.cpf ? formatCPF(row.leadData.cpf) : '',
          row.leadData?.data_nascimento ? `${calculateAge(row.leadData.data_nascimento)}a` : '',
          row.procedimentosQtd || 0,
          row.inicio_atendimento ? format(parseISO(row.inicio_atendimento), 'dd/MM/yy') : '-'
        ];
      });

      autoTable(doc, {
        head: headers,
        body,
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [196, 126, 126] }
      });

      doc.save(`relatorio_${activeTab}_${format(new Date(), 'ddMMyyyy')}.pdf`);
    } catch {
      alert('Ocorreu um erro ao gerar o arquivo PDF.');
    }
  };

  const filteredData = activeTab === 'leads' ? leads : clientes;
  const paginatedData = filteredData;
  const activeCount = tabCounts[activeTab];
  const totalPages = Math.ceil(activeCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pt-0">

      {/* Explicação Cima */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-primary-light/50 border border-primary/20 p-4 rounded-[14px] flex items-center gap-4 border-l-4 border-l-primary">
          <div className="p-3 bg-white rounded-full"><UserSearch className="w-6 h-6 text-primary" /></div>
          <div>
            <h4 className="font-heading font-semibold text-lg text-primary">LEAD</h4>
            <p className="text-sm text-text-muted">Pessoa que entrou em contato, mas ainda não compareceu à clínica.</p>
          </div>
        </div>
        <div className="bg-success/10 border border-success/20 p-4 rounded-[14px] flex items-center gap-4 border-l-4 border-l-success">
          <div className="p-3 bg-white rounded-full"><UserCheck className="w-6 h-6 text-success" /></div>
          <div>
            <h4 className="font-heading font-semibold text-lg text-success">CLIENTE</h4>
            <p className="text-sm text-text-muted">Pessoa que já agendou e compareceu à clínica pelo menos uma vez.</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-bg-card p-4 rounded-[14px] shadow-sm border border-border-card/40">
        <div className="flex flex-wrap bg-bg-base border border-border-card/40 rounded-[14px] overflow-hidden p-1">
          {['hoje', 'ontem', '7dias', '14semanas', 'mes', 'ano'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterType)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-[14px] transition-colors",
                filter === f ? "bg-primary text-white" : "text-text-muted hover:bg-bg-card hover:text-text-main"
              )}
            >
              {f === 'hoje' ? 'Hoje' : f === 'ontem' ? 'Ontem' : f === '7dias' ? '7 dias' : f === '14semanas' ? '14 sem' : f === 'mes' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={format(dateRange.start, 'yyyy-MM-dd')} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => { setFilter('custom'); setPage(1); setDateRange(p => ({ ...p, start: startOfDay(parseISO(e.target.value)) })); }} className="w-36 h-9" />
          <span className="text-text-muted">até</span>
          <Input type="date" value={format(dateRange.end, 'yyyy-MM-dd')} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => { setFilter('custom'); setPage(1); setDateRange(p => ({ ...p, end: endOfDay(parseISO(e.target.value)) })); }} className="w-36 h-9" />
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-border-card pb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => { setActiveTab('leads'); setPage(1); }}
            className={cn("px-4 py-2 font-heading text-lg font-medium transition-colors border-b-2 -mb-[17px]", activeTab === 'leads' ? "border-primary text-primary" : "border-transparent text-text-muted")}
          >
            Leads 
            <span className={cn("ml-2 text-xs py-0.5 px-2 rounded-full", activeTab === 'leads' ? "bg-primary-light text-primary" : "bg-bg-base text-text-muted")}>{tabCounts.leads}</span>
          </button>
          <button 
            onClick={() => { setActiveTab('clientes'); setPage(1); }}
            className={cn("px-4 py-2 font-heading text-lg font-medium transition-colors border-b-2 -mb-[17px]", activeTab === 'clientes' ? "border-success text-success" : "border-transparent text-text-muted")}
          >
            Clientes
            <span className={cn("ml-2 text-xs py-0.5 px-2 rounded-[14px]", activeTab === 'clientes' ? "bg-success/20 text-success" : "bg-bg-base text-text-muted")}>{tabCounts.clientes}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportToCSV} className="h-9">
              <FileDown className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportToPDF} className="h-9">
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
          <div className="w-64">
            <Input 
              placeholder="Buscar nome ou whatsapp" 
              icon={<Search className="w-4 h-4" />} 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <HScrollArea className="w-full" contentClassName="min-h-[50vh]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gradient-to-b from-primary to-primary-hover border-b border-primary-hover text-[color:var(--primary-foreground)] shadow-inner">
              <tr>
                {activeTab === 'leads' ? (
                  <>
                    <th className="px-8 py-5 font-medium text-left">Nome</th>
                    <th className="px-8 py-5 font-medium text-left">WhatsApp</th>
                    <th className="px-8 py-5 font-medium text-left">CPF</th>
                    <th className="px-8 py-5 font-medium text-left">Idade</th>
                    <th className="px-8 py-5 font-medium text-left">Procedimento</th>
                    <th className="px-8 py-5 font-medium text-left">Status</th>
                    <th className="px-8 py-5 font-medium text-left">Última atualização</th>
                    <th className="px-8 py-5 font-medium text-left">Iniciou em</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-5 font-medium text-left">Nome do Cliente</th>
                    <th className="px-8 py-5 font-medium text-left">WhatsApp</th>
                    <th className="px-8 py-5 font-medium text-left">CPF</th>
                    <th className="px-8 py-5 font-medium text-left">Idade</th>
                    <th className="px-8 py-5 font-medium text-left">Procedimentos realizados</th>
                    <th className="px-8 py-5 font-medium text-left">Próximo Agendamento</th>
                    <th className="px-8 py-5 font-medium text-left">Cliente desde</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)] bg-bg-card/30 rounded-[14px] border-2 border-dashed border-border-card/40 mx-4">
                      <Users className="w-16 h-16 mb-4 opacity-40" />
                      <p className="text-base font-bold text-text-main">Nenhum registro encontrado</p>
                      <p className="text-sm opacity-80 mt-1">Experimente mudar o filtro ou buscar por outro nome.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row: any) => (
                  <tr 
                    key={row.id} 
                    className="border-b border-border-card hover:bg-bg-base/30 transition-colors"
                  >
                    {activeTab === 'leads' ? (
                      <>
                        <td className="px-8 py-5 text-left">
                          <button 
                            onClick={() => { setSelectedItem(row); setDrawerOpen(true); }}
                            className="font-medium text-text-main hover:text-primary transition-all active:scale-95 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                          >
                            {row.nome_lead || 'Sem Nome'}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-text-muted text-left">{row.whatsapp_lead}</td>
                        <td className="px-8 py-5 text-left font-mono text-xs whitespace-nowrap">{row.cpf ? formatCPF(row.cpf) : '-'}</td>
                        <td className="px-8 py-5 text-left whitespace-nowrap">
                          <span className="font-medium mr-2">{row.data_nascimento ? `${calculateAge(row.data_nascimento)} anos` : '-'}</span>
                          {row.data_nascimento && <span className="text-xs text-text-muted">({new Date(row.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')})</span>}
                        </td>
                        <td className="px-8 py-5 text-left">{row.procedimento_interesse || '-'}</td>
                        <td className="px-8 py-5 text-left">
                          <div className="flex flex-col gap-1.5 items-start">
                            <Badge variant={row.status as any} />

                            {row.status === 'agendado' && row.data_agendamento && (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-warning-700 dark:text-warning-400 bg-warning/10 px-2 py-1 rounded-[14px] mt-2 border border-warning/20">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(parseISO(row.data_agendamento), "dd/MM 'às' HH:mm")}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-text-muted text-left">{row.ultima_mensagem || row.inicio_atendimento ? formatDistanceToNow(parseISO(row.ultima_mensagem || row.inicio_atendimento), { locale: ptBR, addSuffix: true }) : '-'}</td>
                        <td className="px-8 py-5 text-text-muted text-left">{row.inicio_atendimento ? format(parseISO(row.inicio_atendimento), 'dd/MM/yy HH:mm') : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-5 text-left">
                          <button 
                            onClick={() => { setSelectedItem(row); setDrawerOpen(true); }}
                            className="flex items-center gap-3 font-medium text-text-main hover:text-success transition-all active:scale-95 text-left outline-none group focus-visible:ring-2 focus-visible:ring-success rounded-sm"
                          >
                            <div className="w-8 h-8 rounded-full bg-success/20 text-success flex justify-center items-center font-bold text-xs pt-1 group-hover:bg-success group-hover:text-white transition-colors">
                              {row.leadData?.nome_lead?.charAt(0) || '?'}
                            </div>
                            {row.leadData?.nome_lead || 'Sem Nome'}
                          </button>
                        </td>
                        <td className="px-8 py-5 text-text-muted text-left">{row.leadData?.whatsapp_lead}</td>
                        <td className="px-8 py-5 text-left font-mono text-xs whitespace-nowrap">{row.leadData?.cpf ? formatCPF(row.leadData.cpf) : '-'}</td>
                        <td className="px-8 py-5 text-left whitespace-nowrap">
                          <span className="font-medium mr-2">{row.leadData?.data_nascimento ? `${calculateAge(row.leadData.data_nascimento)} anos` : '-'}</span>
                          {row.leadData?.data_nascimento && <span className="text-xs text-text-muted">({new Date(row.leadData.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')})</span>}
                        </td>
                        <td className="px-8 py-5 text-left">
                          <span className="bg-bg-base px-2 py-1 rounded text-text-main font-medium border border-border-card">{row.procedimentosQtd}</span>
                        </td>
                        <td className="px-8 py-5 text-text-muted w-48 text-left">
                          {row.proximoAgendamento ? (
                            <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 flex-wrap rounded-[14px] border border-primary/20 text-primary w-fit text-xs font-medium">
                              <Calendar className="w-3.5 h-3.5" /> 
                              {format(parseISO(row.proximoAgendamento), 'dd/MM/yy HH:mm')}
                            </div>
                          ) : <span className="text-text-muted text-xs">Nenhum</span>}
                        </td>
                        <td className="px-8 py-5 text-text-muted text-left">{row.inicio_atendimento ? format(parseISO(row.inicio_atendimento), 'dd/MM/yyyy') : '-'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border-card">
              <span className="text-sm text-text-muted">
                Página {page} de {totalPages} · {activeCount} registros
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage(page - 1)} disabled={page === 1}>Anterior</Button>
                <Button size="sm" variant="secondary" onClick={() => setPage(page + 1)} disabled={page === totalPages}>Próxima</Button>
              </div>
            </div>
          )}
        </HScrollArea>
      </Card>

      <DrawerDetail
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        type={activeTab}
        data={selectedItem}
        navigate={navigate}
        onRefresh={fetchData}
      />
    </div>
  );
}

function DrawerDetail({ isOpen, onClose, type, data, navigate, onRefresh }: any) {
  if (!data) return null;
  
  const lead = type === 'leads' ? data : data.leadData;
  const isCliente = type === 'clientes';

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_lead: '',
    whatsapp_lead: '',
    cpf: '',
    data_nascimento: '',
    observacoes: ''
  });
  const { role } = useAuth();

  useEffect(() => {
    if (lead) {
      setFormData({
        nome_lead: lead.nome_lead || '',
        whatsapp_lead: lead.whatsapp_lead || '',
        cpf: lead.cpf || '',
        data_nascimento: lead.data_nascimento || '',
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
        observacoes: formData.observacoes || null,
      });
      if (!parsed.success) {
        alert(formatZodError(parsed.error));
        return;
      }
      const { error } = await supabase.from('leads_estetica').update(parsed.data).eq('id', lead.id);
      
      if (error) throw error;
      onRefresh();
      setEditMode(false);
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar edições');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={cn("fixed inset-0 bg-black/40 z-50 transition-opacity", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} />
      
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-card border-l border-border-card shadow-xl transition-transform duration-300 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className={`p-6 border-b border-border-card border-t-4 ${isCliente ? 'border-t-success' : 'border-t-primary'} flex items-center justify-between bg-bg-base/50`}>
          <div className="flex items-center gap-3">
            {isCliente ? <UserCheck className="w-5 h-5 text-success" /> : <UserSearch className="w-5 h-5 text-primary" />}
            <h2 className="text-xl font-heading font-semibold text-text-main">{isCliente ? 'Detalhes do Cliente' : 'Detalhes do Lead'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-card rounded-md text-text-muted hover:text-text-main"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-text-main text-lg">{lead.nome_lead || 'Sem Nome'}</h3>
              <p className="flex items-center gap-2 text-text-muted text-xs mt-1"><Phone className="w-3 h-3" /> {lead.whatsapp_lead}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => editMode ? handleSave() : setEditMode(true)} isLoading={loading}>
                {editMode ? <><Check className="w-4 h-4 mr-2" /> Salvar</> : <><Edit2 className="w-4 h-4 mr-2" /> Editar</>}
              </Button>
            </div>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">Nome</label>
                <Input value={formData.nome_lead} onChange={e => setFormData({...formData, nome_lead: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">WhatsApp</label>
                <Input value={formData.whatsapp_lead} onChange={e => setFormData({...formData, whatsapp_lead: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1">CPF</label>
                  <Input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} disabled={!canViewFullCPF(role)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-1">Nascimento</label>
                  <Input type="date" value={formData.data_nascimento} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={e => setFormData({...formData, observacoes: e.target.value})}
                  className="flex w-full rounded-lg border border-border-card bg-bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary h-24"
                  placeholder="Anotações sobre o paciente..."
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {isCliente && data.data_primeira_visita && (
                  <div className="col-span-2 bg-success/10 p-3 rounded-lg border border-success/20">
                    <span className="block text-xs text-text-muted mb-1">Cliente Desde</span>
                    {new Date(data.data_primeira_visita).toLocaleDateString('pt-BR')}
                  </div>
                )}
                
                <div className="bg-bg-base p-3 rounded-lg border border-border-card">
                  <span className="block text-xs text-text-muted mb-1">CPF</span>
                  {displayCPF(lead.cpf, role)}
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
                  <span className="block text-xs text-text-muted mb-1">Última atualização</span>
                  {lead.ultima_mensagem || lead.inicio_atendimento
                    ? new Date(lead.ultima_mensagem || lead.inicio_atendimento).toLocaleDateString('pt-BR')
                    : '-'}
                </div>
                <div className="bg-bg-base p-3 rounded-lg border border-border-card col-span-2">
                  <span className="block text-xs text-text-muted mb-1">Valor Total Inv.</span>
                  <span className="font-semibold text-success">
                     {lead.valor_pago ? `R$ ${Number(lead.valor_pago).toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                  </span>
                </div>
                {lead.observacoes && (
                   <div className="col-span-2 bg-bg-base p-3 rounded-lg border border-border-card">
                     <span className="block text-xs text-text-muted mb-1">Observações</span>
                     {lead.observacoes}
                   </div>
                )}
              </div>

              {/* Histórico Clientes */}
              {isCliente && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-text-main mb-3 border-b border-border-card pb-2">
                    Histórico de Procedimentos (<span className="text-success">{data.procedimentosQtd} comparecimentos</span>)
                  </h4>
                  <div className="space-y-2">
                    {data.todosAgendamentos && data.todosAgendamentos.filter((a: any) => a.status === 'compareceu').length > 0 ? (
                      data.todosAgendamentos.filter((a: any) => a.status === 'compareceu').map((a: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-bg-base rounded-[14px] border border-border-card/40">
                          <span className="text-text-main font-medium">{a.procedimento_nome || 'N/A'}</span>
                          <span className="text-text-muted">{format(parseISO(a.data_hora_inicio), 'dd/MM/yyyy')}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-muted italic">Nenhum comparecimento registrado.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-border-card bg-bg-base mt-auto">
          {isCliente && (
            <Button className="w-full hover:bg-success" onClick={() => navigate('/agenda')}>
              <Calendar className="w-4 h-4 mr-2" />
              Ver Próx. Agendamentos na Agenda
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
