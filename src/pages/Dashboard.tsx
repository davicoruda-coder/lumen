import React, { useState, useEffect } from 'react';
import { 
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, subWeeks, format, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/utils';
import { 
  Calendar, Users, Target, UserCheck, Loader2,
  Smile, Meh, Frown, MessageSquare, Award, ChevronRight, Play, ExternalLink,
  Check, X, Clock, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type FilterType = 'hoje' | 'ontem' | '7dias' | '14semanas' | 'mes' | 'ano' | 'custom';
type TabType = 'geral' | 'nps';



export function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState<FilterType>('7dias');
  const [activeTab, setActiveTab] = useState<TabType>('geral');

  // Redirecionar especialistas que tentarem acessar via URL direta
  useEffect(() => {
    if (role === 'especialista') {
      navigate('/agenda', { replace: true });
    }
  }, [role, navigate]);

  const [dateRange, setDateRange] = useState({ 
    start: startOfDay(subDays(new Date(), 6)), 
    end: endOfDay(new Date()) 
  });
  const [loading, setLoading] = useState(true);

  // States for Metrics
  const [agendamentosTotal, setAgendamentosTotal] = useState(0);
  const [novosLeads, setNovosLeads] = useState(0);
  const [taxaConversao, setTaxaConversao] = useState(0);

  // States for Charts
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [barChartWeekData, setBarChartWeekData] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  
  const [leadsForaHorario, setLeadsForaHorario] = useState(0);
  const [npsForm, setNpsForm] = useState({
    cliente_nome: '',
    nota: 10,
    procedimento: '',
    comentario: '',
    whatsapp_lead: '',
  });
  const [savingNps, setSavingNps] = useState(false);
  const [npsFormMsg, setNpsFormMsg] = useState<string | null>(null);

  // Clinic Hours context (for calculation)
  const [horarios, setHorarios] = useState<any[]>([]);
  const [horariosLabel, setHorariosLabel] = useState('');

  // Proximos Agendamentos
  const [proximosAgendamentos, setProximosAgendamentos] = useState<any[]>([]);

  // NPS States
  const [npsFeedbacks, setNpsFeedbacks] = useState<any[]>([]);

  // Confirmações Pendentes
  const [pendentesConfirmacao, setPendentesConfirmacao] = useState<any[]>([]);

  useEffect(() => {
    fetchHorarios();
  }, []);

  useEffect(() => {
    applyFilter(filter);
  }, [filter]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, horarios]);

  const fetchHorarios = async () => {
    const { data } = await supabase
      .from('clinic_hours')
      .select('dia, aberto, hora_inicio, hora_fim');
    if (data) {
      setHorarios(data);
      setHorariosLabel('Horário considerado: configuração da clínica em Configurações → Clínica.');
    }
  };

  const applyFilter = (type: FilterType) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (type) {
      case 'hoje':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'ontem':
        const yesterday = subDays(today, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case '7dias':
        start = startOfDay(subDays(today, 6));
        end = endOfDay(today);
        break;
      case '14semanas':
        start = startOfDay(subWeeks(today, 14));
        end = endOfDay(today);
        break;
      case 'mes':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'ano':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'custom':
        return; // handle manually
    }
    setDateRange({ start, end });
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const startStr = dateRange.start.toISOString();
    const endStr = dateRange.end.toISOString();
    const now = new Date();
    const nowStr = now.toISOString();
    const pendentesDesde = startOfDay(subDays(now, 60)).toISOString();

    try {
      const [agendamentosRes, leadsRes, proxRes, pendentesRes, npsRes] = await Promise.all([
        supabase
          .from('agendamentos_estetica')
          .select('id', { count: 'exact', head: true })
          .gte('data_hora_inicio', startStr)
          .lte('data_hora_inicio', endStr),
        supabase
          .from('leads_estetica')
          .select('status, inicio_atendimento')
          .gte('inicio_atendimento', startStr)
          .lte('inicio_atendimento', endStr),
        supabase
          .from('agendamentos_estetica')
          .select(`
            id, procedimento_nome, nome_lead, data_hora_inicio, status,
            agendas(nome, cor)
          `)
          .gte('data_hora_inicio', nowStr)
          .order('data_hora_inicio', { ascending: true })
          .limit(5),
        supabase
          .from('agendamentos_estetica')
          .select(`
            id, procedimento_nome, nome_lead, data_hora_inicio, status, lead_id, whatsapp_lead,
            agendas(nome, cor)
          `)
          .gte('data_hora_inicio', pendentesDesde)
          .lte('data_hora_inicio', nowStr)
          .in('status', ['agendado', 'confirmado'])
          .order('data_hora_inicio', { ascending: false })
          .limit(30),
        supabase
          .from('nps_feedbacks')
          .select('id, cliente_nome, nota, procedimento, comentario, whatsapp_lead, criado_em')
          .gte('criado_em', startStr)
          .lte('criado_em', endStr)
          .order('criado_em', { ascending: false })
          .limit(500),
      ]);

      setAgendamentosTotal(agendamentosRes.count || 0);

      const lds = leadsRes.data || [];
      setNovosLeads(lds.length);
      setProximosAgendamentos(proxRes.data || []);
      setPendentesConfirmacao(pendentesRes.data || []);
      setNpsFeedbacks(npsRes.data || []);

      const leadsConvertidos = lds.filter((l: any) => l.status === 'agendado' || l.status === 'compareceu').length;
      const taxa = lds.length > 0 ? (leadsConvertidos / lds.length) * 100 : 0;
      setTaxaConversao(taxa);

      const lineDataMap = lds.reduce((acc: any, curr: any) => {
        const d = format(parseISO(curr.inicio_atendimento), 'dd/MM', { locale: ptBR });
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});
      setLineChartData(Object.entries(lineDataMap).map(([date, count]) => ({ date, count })));

      const daysMap = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0, 'Dom': 0 };
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      lds.forEach((l: any) => {
        const dayIdx = parseISO(l.inicio_atendimento).getDay();
        daysMap[dayNames[dayIdx] as keyof typeof daysMap] += 1;
      });
      setBarChartWeekData(dayNames.map(d => ({ day: d, count: daysMap[d as keyof typeof daysMap] })));

      let dentro = 0, fora = 0;
      const hoursMap = horarios.reduce((acc, curr) => {
        const mapDay = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
        acc[mapDay[curr.dia as keyof typeof mapDay]] = curr;
        return acc;
      }, {} as Record<number, any>);

      lds.forEach((l: any) => {
        const dt = parseISO(l.inicio_atendimento);
        const config = hoursMap[dt.getDay()];
        if (!config || !config.aberto || !config.hora_inicio || !config.hora_fim) {
          fora++;
        } else {
          const timeStr = format(dt, 'HH:mm:ss');
          if (timeStr >= config.hora_inicio && timeStr <= config.hora_fim) {
            dentro++;
          } else {
            fora++;
          }
        }
      });
      setPieChartData([
        { name: 'Dentro do horário', value: dentro, fill: 'var(--success)' },
        { name: 'Fora do horário', value: fora, fill: 'var(--warning)' }
      ]);
      setLeadsForaHorario(fora);
    } catch {
      // Falha ao carregar o dashboard — mantém o estado atual
    } finally {
      setLoading(false);
    }
  };

  const fetchNpsData = async () => {
    try {
      const { data, error } = await supabase
        .from('nps_feedbacks')
        .select('id, cliente_nome, nota, procedimento, comentario, whatsapp_lead, criado_em')
        .gte('criado_em', dateRange.start.toISOString())
        .lte('criado_em', dateRange.end.toISOString())
        .order('criado_em', { ascending: false })
        .limit(500);

      if (error) throw error;
      setNpsFeedbacks(data || []);
    } catch {
      setNpsFeedbacks([]);
    }
  };

  const handleSaveNps = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = npsForm.cliente_nome.trim();
    if (!nome) {
      setNpsFormMsg('Informe o nome do paciente.');
      return;
    }
    const nota = Number(npsForm.nota);
    if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
      setNpsFormMsg('A nota deve ser um número de 0 a 10.');
      return;
    }

    setSavingNps(true);
    setNpsFormMsg(null);
    try {
      const whatsapp = npsForm.whatsapp_lead.replace(/\D/g, '') || null;
      const { error } = await supabase.from('nps_feedbacks').insert({
        cliente_nome: nome,
        nota,
        procedimento: npsForm.procedimento.trim() || null,
        comentario: npsForm.comentario.trim() || null,
        whatsapp_lead: whatsapp,
      });
      if (error) throw error;
      setNpsForm({ cliente_nome: '', nota: 10, procedimento: '', comentario: '', whatsapp_lead: '' });
      setNpsFormMsg('Avaliação registrada.');
      await fetchNpsData();
    } catch {
      setNpsFormMsg('Não foi possível salvar. Tente novamente.');
    } finally {
      setSavingNps(false);
    }
  };

  const handleConfirmStatus = async (appointmentId: string, leadId: string | null, novoStatus: 'compareceu' | 'faltou') => {
    try {
      const { error } = await supabase
        .from('agendamentos_estetica')
        .update({ status: novoStatus })
        .eq('id', appointmentId);
      
      if (error) throw error;

      if (leadId) {
        const mappedCRMStatus = novoStatus === 'compareceu' ? 'compareceu' : 'nao_respondeu_follow_up';
        const updateLeadData: any = { status: mappedCRMStatus };
        if (novoStatus === 'compareceu') {
          updateLeadData.data_primeira_visita = new Date().toISOString().split('T')[0];
        }
        await supabase
          .from('leads_estetica')
          .update(updateLeadData)
          .eq('id', leadId);
      }

      // Remove localmente com efeito imediato
      setPendentesConfirmacao(prev => prev.filter(item => item.id !== appointmentId));
    } catch {
      alert('Erro ao atualizar situação do agendamento.');
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border-card p-2 rounded shadow-sm text-sm">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">{`${payload[0].value} contatos`}</p>
        </div>
      );
    }
    return null;
  };

  // NPS já vem filtrado pelo período na query
  const filteredNps = npsFeedbacks;

  const totalNpsCount = filteredNps.length;
  const npsSum = filteredNps.reduce((acc, curr) => acc + curr.nota, 0);
  const npsAverage = totalNpsCount > 0 ? (npsSum / totalNpsCount) : 0;
  
  const promotoresCount = filteredNps.filter(f => f.nota >= 9).length;
  const neutrosCount = filteredNps.filter(f => f.nota >= 7 && f.nota <= 8).length;
  const detratoresCount = filteredNps.filter(f => f.nota <= 6).length;

  const promotoresPercent = totalNpsCount > 0 ? Math.round((promotoresCount / totalNpsCount) * 100) : 0;
  const neutrosPercent = totalNpsCount > 0 ? Math.round((neutrosCount / totalNpsCount) * 100) : 0;
  const detratoresPercent = totalNpsCount > 0 ? Math.round((detratoresCount / totalNpsCount) * 100) : 0;

  const npsScore = totalNpsCount > 0 ? Math.round(((promotoresCount - detratoresCount) / totalNpsCount) * 100) : 0;

  // NPS Zone evaluation
  const getNpsZone = (score: number) => {
    if (score >= 75) return { label: 'Zona de Excelência', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 50) return { label: 'Zona de Qualidade', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    if (score >= 0) return { label: 'Zona de Aperfeiçoamento', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Zona Crítica', color: 'text-error bg-error/10 border-error/20' };
  };

  const npsZone = getNpsZone(npsScore);

  const npsPieData = [
    { name: 'Promotores', value: promotoresCount, percent: promotoresPercent, fill: '#10B981' },
    { name: 'Neutros', value: neutrosCount, percent: neutrosPercent, fill: '#F59E0B' },
    { name: 'Detratores', value: detratoresCount, percent: detratoresPercent, fill: '#EF4444' }
  ].filter(i => i.value > 0);

  // NPS Trend line data (grouped by date)
  const npsTrendMap = filteredNps.reduce((acc: any, curr: any) => {
    const d = format(parseISO(curr.criado_em), 'dd/MM', { locale: ptBR });
    if (!acc[d]) acc[d] = { soma: 0, count: 0 };
    acc[d].soma += curr.nota;
    acc[d].count += 1;
    return acc;
  }, {});

  const npsTrendData = Object.entries(npsTrendMap).map(([date, val]: any) => ({
    date,
    media: Number((val.soma / val.count).toFixed(1))
  })).sort((a, b) => {
    const [dayA, monthA] = a.date.split('/').map(Number);
    const [dayB, monthB] = b.date.split('/').map(Number);
    return monthA !== monthB ? monthA - monthB : dayA - dayB;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pt-0">
      
      {/* Cabeçalho superior com filtros e seletor de data */}
      <div className="flex flex-wrap flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap bg-bg-card border border-border-card/40 rounded-[14px] overflow-hidden p-1 shadow-sm">
          {['hoje', 'ontem', '7dias', '14semanas', 'mes', 'ano'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f as FilterType);
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-[14px] transition-colors",
                filter === f ? "bg-primary text-[color:var(--primary-foreground)]" : "text-text-muted hover:bg-bg-base hover:text-text-main"
              )}
            >
              {f === 'hoje' ? 'Hoje' : f === 'ontem' ? 'Ontem' : f === '7dias' ? '7 dias' : f === '14semanas' ? '14 semanas' : f === 'mes' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Input 
            type="date"
            value={format(dateRange.start, 'yyyy-MM-dd')}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => {
              setFilter('custom');
              setDateRange(prev => ({ ...prev, start: startOfDay(parseISO(e.target.value)) }));
            }}
            className="w-36 h-9"
          />
          <span className="text-text-muted">até</span>
          <Input 
            type="date"
            value={format(dateRange.end, 'yyyy-MM-dd')}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => {
              setFilter('custom');
              setDateRange(prev => ({ ...prev, end: endOfDay(parseISO(e.target.value)) }));
            }}
            className="w-36 h-9"
          />
        </div>
      </div>

      {/* Tabs Menu Lateral/Superior estilo Premium */}
      <div className="flex gap-4 border-b border-border-card/40 pb-px">
        <button 
          onClick={() => setActiveTab('geral')}
          className={cn(
            "pb-3 pt-1 px-4 text-base font-semibold transition-all border-b-2 -mb-0.5", 
            activeTab === 'geral' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          Desempenho Geral
        </button>
        <button 
          onClick={() => setActiveTab('nps')}
          className={cn(
            "pb-3 pt-1 px-4 text-base font-semibold transition-all border-b-2 -mb-0.5 flex items-center gap-2", 
            activeTab === 'nps' 
              ? "border-primary text-primary" 
              : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          Satisfação & NPS
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'geral' ? (
        <>
          {/* Confirmações Pendentes de Atendimento */}
          {pendentesConfirmacao.length > 0 && (
            <Card className="border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 rounded-[14px] shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 mb-6">
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-text-main">
                    📢 Confirmações Pendentes de Atendimento
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-0.5">
                    Estes agendamentos já passaram do horário. Confirme quem compareceu para atualizar o CRM e os relatórios.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 pb-4">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {pendentesConfirmacao.map((ag) => (
                    <div 
                      key={ag.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-bg-card hover:bg-bg-base rounded-xl border border-border-card/45 gap-3 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={ag.nome_lead || '?'} size="sm" />
                        <div>
                          <p className="font-semibold text-sm text-text-main leading-tight">{ag.nome_lead || 'Sem nome'}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-[11px] font-medium text-text-main bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                              {ag.procedimento_nome || 'Sem procedimento'}
                            </span>
                            <div className="text-[11px] text-text-muted flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {format(parseISO(ag.data_hora_inicio), "dd/MM 'às' HH:mm")}
                            </div>
                            {ag.agendas && (
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ backgroundColor: `${ag.agendas.cor}15`, color: ag.agendas.cor }}
                              >
                                👤 {ag.agendas.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Botões Rápidos */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleConfirmStatus(ag.id, ag.lead_id, 'compareceu')}
                          className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm shadow-emerald-500/10 hover:shadow-md hover:-translate-y-0.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Compareceu
                        </button>
                        <button
                          onClick={() => handleConfirmStatus(ag.id, ag.lead_id, 'faltou')}
                          className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm shadow-amber-500/10 hover:shadow-md hover:-translate-y-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Faltou
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary border-none text-white transition-transform hover:-translate-y-1 shadow-sm rounded-[14px]">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl"><Target className="w-6 h-6 text-white stroke-[1.5]" /></div>
                <div>
                  <p className="font-heading text-3xl font-semibold text-white">{novosLeads}</p>
                  <p className="text-sm text-white/80 font-medium">Leads</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--color-rose-gold)] border-none text-white transition-transform hover:-translate-y-1 shadow-sm rounded-[14px]">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl"><Calendar className="w-6 h-6 text-white stroke-[1.5]" /></div>
                <div>
                  <p className="font-heading text-3xl font-semibold text-white">{agendamentosTotal}</p>
                  <p className="text-sm text-white/80 font-medium">Agendamentos</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-[var(--color-emerald-from)] to-[var(--color-emerald-to)] border-none text-white transition-transform hover:-translate-y-1 shadow-sm rounded-[14px]">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl"><UserCheck className="w-6 h-6 text-white stroke-[1.5]" /></div>
                <div>
                  <p className="font-heading text-3xl font-semibold text-white">
                    {taxaConversao.toFixed(1)}%
                  </p>
                  <p className="text-sm text-white/80 font-medium">Taxa de conversão</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico 1 - Novos leads */}
          <Card className="rounded-[14px] shadow-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-base font-semibold">Novos leads</CardTitle>
              <p className="text-xs text-text-muted">Leads cadastrados por dia no período</p>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráficos Movimento e Horários */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mt-6">
            <Card className="lg:col-span-6 rounded-[14px] shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-base font-semibold">Dias com mais movimento</CardTitle>
                <p className="text-xs text-text-muted">Veja em quais dias da semana sua clínica recebe mais contatos</p>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-card)', opacity: 0.5 }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 flex flex-col rounded-[14px] shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-base font-semibold">Horário dos contatos</CardTitle>
                <p className="text-xs text-text-muted">Quantos leads chegaram dentro e fora do horário comercial</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center p-0">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ value }) => value}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 pb-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success" /> <span className="text-sm text-text-main">Dentro</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-warning" /> <span className="text-sm text-text-main">Fora</span></div>
                </div>
              </CardContent>
              <div className="p-3 border-t border-border-card/40 bg-bg-base/50 text-xs text-text-muted text-center rounded-b-[14px]">
                {horariosLabel}
              </div>
            </Card>
          </div>

          {leadsForaHorario > 0 && (
            <div className="bg-primary-light border-l-4 border-primary p-4 rounded-r-[14px] shadow-sm flex items-start gap-4">
              <Clock className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-heading font-semibold text-lg text-text-main mb-1">Oportunidades fora do horário</h4>
                <p className="text-text-main text-sm">
                  <strong>{leadsForaHorario} leads</strong> chegaram fora do horário de atendimento.
                  Vale retornar esses contatos no CRM ou revisar os horários da clínica.
                </p>
              </div>
            </div>
          )}

          {/* Próximos Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos agendamentos</CardTitle>
              <p className="text-sm text-text-muted">A partir de agora</p>
            </CardHeader>
            <CardContent>
              {proximosAgendamentos.length > 0 ? (
                <div className="space-y-3">
                  {proximosAgendamentos.map((ag) => (
                    <div key={ag.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-bg-base/50 rounded-[14px] border border-border-card/40 gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar name={ag.nome_lead || '?'} />
                        <div>
                          <p className="font-medium text-text-main">{ag.nome_lead || 'Sem nome'}</p>
                          <p className="text-sm text-text-muted">{ag.procedimento_nome || 'Sem procedimento'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-8 flex-wrap">
                        <div className="text-sm text-text-main flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-text-muted" />
                          {format(parseISO(ag.data_hora_inicio), "dd/MM 'às' HH:mm")}
                        </div>
                        {ag.agendas && (
                          <div className="text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${ag.agendas.cor}20`, color: ag.agendas.cor }}>
                            {ag.agendas.nome}
                          </div>
                        )}
                        <Badge variant={ag.status as any}>{ag.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-muted">
                  <p>Nenhum agendamento futuro encontrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        // ABA NPS - SATISFAÇÃO & NPS DO CLIENTE
        <div className="space-y-6">

          <Card className="rounded-[14px] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Registrar avaliação</CardTitle>
              <p className="text-xs text-text-muted">Lance o NPS após o atendimento. Não há envio automático.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNps} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-text-muted mb-1">Paciente *</label>
                  <Input
                    value={npsForm.cliente_nome}
                    onChange={e => setNpsForm(f => ({ ...f, cliente_nome: e.target.value }))}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-muted mb-1">Nota (0–10) *</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={npsForm.nota}
                    onChange={e => setNpsForm(f => ({ ...f, nota: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-text-muted mb-1">WhatsApp</label>
                  <Input
                    value={npsForm.whatsapp_lead}
                    onChange={e => setNpsForm(f => ({ ...f, whatsapp_lead: e.target.value }))}
                    placeholder="11987654321"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-text-muted mb-1">Procedimento</label>
                  <Input
                    value={npsForm.procedimento}
                    onChange={e => setNpsForm(f => ({ ...f, procedimento: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="md:col-span-10">
                  <label className="block text-xs font-medium text-text-muted mb-1">Comentário</label>
                  <Input
                    value={npsForm.comentario}
                    onChange={e => setNpsForm(f => ({ ...f, comentario: e.target.value }))}
                    placeholder="Como foi a experiência?"
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button type="submit" disabled={savingNps} className="w-full">
                    {savingNps ? 'Salvando…' : 'Salvar'}
                  </Button>
                </div>
              </form>
              {npsFormMsg && (
                <p className="text-xs text-text-muted mt-3">{npsFormMsg}</p>
              )}
            </CardContent>
          </Card>

          {/* Cards de Métricas de NPS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-[14px] shadow-sm overflow-hidden relative">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Award className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="font-heading text-4xl font-bold text-text-main">{totalNpsCount > 0 ? npsScore : '-'}</p>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-[14px] border", npsZone.color)}>
                      {npsZone.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted font-medium mt-1">Score NPS Geral</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-success/10 text-success rounded-xl">
                  <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="font-heading text-4xl font-bold text-text-main">{totalNpsCount}</p>
                  <p className="text-sm text-text-muted font-medium mt-1">Total de Avaliações</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-warning/10 text-warning rounded-xl">
                  <Smile className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="font-heading text-4xl font-bold text-text-main">
                      {npsAverage > 0 ? npsAverage.toFixed(1) : '-'}
                    </p>
                    <span className="text-xs text-text-muted">/ 10</span>
                  </div>
                  <p className="text-sm text-text-muted font-medium mt-1">Nota Média da Clínica</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de NPS */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Gráfico 1 - Donut de Distribuição */}
            <Card className="lg:col-span-4 flex flex-col rounded-[14px] shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Classificação dos Clientes</CardTitle>
                <p className="text-xs text-text-muted">Distribuição entre promotores, neutros e detratores no período</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center p-0 pb-4">
                {totalNpsCount > 0 ? (
                  <>
                    <div className="h-44 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={npsPieData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {npsPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [`${value} clientes (${props.payload.percent}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legenda de Distribuição */}
                    <div className="w-full px-6 space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-text-main">Promotores (9-10)</span>
                        </div>
                        <span className="text-emerald-500 font-bold">{promotoresCount} ({promotoresPercent}%)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-text-main">Neutros (7-8)</span>
                        </div>
                        <span className="text-amber-500 font-bold">{neutrosCount} ({neutrosPercent}%)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-error" />
                          <span className="text-text-main">Detratores (0-6)</span>
                        </div>
                        <span className="text-error font-bold">{detratoresCount} ({detratoresPercent}%)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-44 flex items-center justify-center text-text-muted text-sm italic">
                    As avaliações lançadas nesta aba aparecem aqui
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2 - Evolução do NPS no Período */}
            <Card className="lg:col-span-6 rounded-[14px] shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-base font-semibold">Evolução da Nota Média</CardTitle>
                <p className="text-xs text-text-muted">Acompanhe a evolução diária da satisfação dos pacientes</p>
              </CardHeader>
              <CardContent className="h-60">
                {npsTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={npsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-card)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 10]} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(value) => [`Nota Média: ${value}`, 'Avaliações']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="media" 
                        stroke="var(--primary)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: 'var(--primary)' }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-text-muted text-sm italic">
                    O gráfico será gerado automaticamente com as avaliações dos pacientes
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Avaliações Detalhadas dos Clientes */}
          <Card className="rounded-[14px] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Feedbacks dos Pacientes</CardTitle>
              <p className="text-xs text-text-muted">Opiniões por extenso, notas e contato direto em tempo real</p>
            </CardHeader>
            <CardContent>
              {filteredNps.length > 0 ? (
                <div className="space-y-4">
                  {filteredNps.map((fb) => {
                    const isPromoter = fb.nota >= 9;
                    const isNeutral = fb.nota >= 7 && fb.nota <= 8;
                    
                    return (
                      <div 
                        key={fb.id} 
                        className="flex flex-col md:flex-row md:items-start justify-between p-4 bg-bg-base/40 hover:bg-bg-base/70 rounded-[14px] border border-border-card/40 gap-4 transition-all"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Avatar Iniciais */}
                          <div className="relative">
                            <Avatar name={fb.cliente_nome} size="md" />
                            {/* Ícone de Expressão com cor temática */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 rounded-full p-0.5 border border-white dark:border-zinc-800 text-white",
                              isPromoter ? "bg-emerald-500" : isNeutral ? "bg-amber-500" : "bg-error"
                            )}>
                              {isPromoter ? <Smile className="w-3.5 h-3.5" /> : isNeutral ? <Meh className="w-3.5 h-3.5" /> : <Frown className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-text-main">{fb.cliente_nome}</h4>
                              {fb.procedimento && (
                                <Badge variant="secondary" className="text-[10px] py-0.5">
                                  {fb.procedimento}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Comentário por extenso */}
                            <p className="text-text-main text-sm leading-relaxed italic bg-white/30 dark:bg-zinc-800/10 p-3 rounded-lg border border-border-card/20">
                              "{fb.comentario || 'Paciente não enviou comentário, apenas a nota.'}"
                            </p>
                            
                            <p className="text-xs text-text-muted">
                              Avaliado em {format(parseISO(fb.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                        </div>

                        {/* Coluna da Direita: Nota e Botão de Ação */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 flex-wrap shrink-0">
                          {/* Círculo Nota Estilizado */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-medium">Nota</span>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-lg border-2 shadow-sm",
                              isPromoter 
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500" 
                                : isNeutral 
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-500" 
                                : "bg-error/10 border-error/40 text-error"
                            )}>
                              {fb.nota}
                            </div>
                          </div>

                          {/* Botão de WhatsApp dinâmico */}
                          {fb.whatsapp_lead && (
                            <a 
                              href={`https://wa.me/${fb.whatsapp_lead}?text=${encodeURIComponent(
                                isPromoter 
                                  ? `Olá ${fb.cliente_nome}! Vi aqui o seu feedback nota ${fb.nota} com elogio sobre a clínica. Muito obrigado pelo carinho! Ficamos extremamente felizes. 💖`
                                  : `Olá ${fb.cliente_nome}! Vi aqui o seu feedback sobre a sua experiência na clínica. Gostaria muito de entender como podemos melhorar para te atender melhor na próxima vez! 🙏`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-bold hover:underline py-1.5 px-3 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20 bg-bg-card shadow-sm"
                            >
                              Falar no WhatsApp
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-heading font-semibold text-lg text-text-main">Nenhuma avaliação neste período</h4>
                    <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
                      Use o formulário acima para registrar a nota após o atendimento.
                      Os gráficos atualizam assim que a avaliação é salva.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
}
