import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn, calculateAge, displayCPF, formatBirthDate } from '../lib/utils';
import { Search, Plus, ClipboardList, User, AlertTriangle, Calendar, FileText, Image, X, ChevronDown, ChevronUp, Edit2, Trash2, Camera } from 'lucide-react';
import { FileUpload } from '../components/ui/FileUpload';
import { ModalDocumento } from '../components/prontuario/ModalDocumento';

interface FichaClinica {
  id: string;
  paciente_id: string;
  tipo_paciente: 'lead' | 'cliente';
  alergias: string | null;
  medicamentos_uso: string | null;
  historico_medico: string | null;
  observacoes_gerais: string | null;
  nome_paciente?: string;
  whatsapp_paciente?: string;
  criado_em: string;
}

interface Evolucao {
  id: string;
  ficha_id: string;
  profissional_nome: string;
  procedimento_realizado: string;
  descricao: string;
  proximo_retorno: string | null;
  criado_em: string;
}

interface FotoGaleria {
  id: string;
  ficha_id: string;
  url_foto: string;
  tipo: 'antes' | 'depois' | 'outro';
  descricao: string | null;
  criado_em: string;
}

interface DocumentoPaciente {
  id: string;
  ficha_id: string;
  template_id: string;
  dados_preenchidos: any;
  assinatura_url: string | null;
  criado_em: string;
  template_titulo?: string;
  template_tipo?: string;
}

export function Prontuario() {
  const [fichas, setFichas] = useState<FichaClinica[]>([]);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [fotos, setFotos] = useState<FotoGaleria[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [fichaAberta, setFichaAberta] = useState<string | null>(null);
  const [showNovaFicha, setShowNovaFicha] = useState(false);
  const [showNovaEvolucao, setShowNovaEvolucao] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fichaParaEvolucao, setFichaParaEvolucao] = useState<string>('');
  const [fichaParaUpload, setFichaParaUpload] = useState<string>('');
  const [editandoFicha, setEditandoFicha] = useState<FichaClinica | null>(null);
  const [leadsByPacienteId, setLeadsByPacienteId] = useState<Record<string, { cpf: string | null; data_nascimento: string | null }>>({});
  const [vincularLeadId, setVincularLeadId] = useState<string | null>(null);
  const offeredCreateForLeadRef = useRef<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');
  const { user, role } = useAuth();
  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'owner' || role === 'gestor';

  // Modal Doc
  const [showModalDoc, setShowModalDoc] = useState(false);
  const [docFichaId, setDocFichaId] = useState('');
  const [docNomePaciente, setDocNomePaciente] = useState('');

  // Form ficha
  const [fNome, setFNome] = useState('');
  const [fWhats, setFWhats] = useState('');
  const [fAlergias, setFAlergias] = useState('');
  const [fMedicamentos, setFMedicamentos] = useState('');
  const [fHistorico, setFHistorico] = useState('');
  const [fObs, setFObs] = useState('');

  // Form evolução
  const [eProfissional, setEProfissional] = useState('');
  const [eProcedimento, setEProcedimento] = useState('');
  const [eDescricao, setEDescricao] = useState('');
  const [eRetorno, setERetorno] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: fData } = await supabase.from('fichas_clinicas').select('*').order('criado_em', { ascending: false });
      if (fData) {
        setFichas(fData as FichaClinica[]);
        const leadIds = (fData as FichaClinica[])
          .filter(f => f.tipo_paciente === 'lead')
          .map(f => f.paciente_id);
        if (leadIds.length > 0) {
          const { data: leadsData } = await supabase
            .from('leads_estetica')
            .select('id, cpf, data_nascimento')
            .in('id', leadIds);
          const map: Record<string, { cpf: string | null; data_nascimento: string | null }> = {};
          (leadsData || []).forEach(l => {
            map[l.id] = { cpf: l.cpf, data_nascimento: l.data_nascimento };
          });
          setLeadsByPacienteId(map);
        } else {
          setLeadsByPacienteId({});
        }
      }
      const { data: eData } = await supabase.from('evolucoes').select('*').order('criado_em', { ascending: false });
      if (eData) setEvolucoes(eData as Evolucao[]);
      const { data: pData } = await supabase.from('galeria_paciente').select('*').order('criado_em', { ascending: false });
      if (pData) setFotos(pData as FotoGaleria[]);

      const { data: dData } = await supabase.from('documentos_pacientes').select(`
        *,
        templates_clinicos (titulo, tipo)
      `).order('criado_em', { ascending: false });
      
      if (dData) {
        setDocumentos(dData.map(d => ({
          ...d,
          template_titulo: d.templates_clinicos?.titulo,
          template_tipo: d.templates_clinicos?.tipo
        })));
      }
    } catch (_) {}
    setLoading(false);
  };

  // Abrir ficha vinda da agenda
  useEffect(() => {
    if (!targetId || loading) return;
    const ficha = fichas.find(f => f.paciente_id === targetId);
    if (!ficha) return;
    setFichaAberta(ficha.id);
    setTimeout(() => {
      document.getElementById(`ficha-${ficha.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }, [targetId, fichas, loading]);

  // Sem ficha: oferecer criar vinculada ao lead do CRM (uma vez por navegação)
  useEffect(() => {
    if (!targetId || loading) return;
    if (fichas.some(f => f.paciente_id === targetId)) {
      offeredCreateForLeadRef.current = null;
      return;
    }
    if (offeredCreateForLeadRef.current === targetId) return;

    const abrirNovaFichaDoLead = async () => {
      const { data: lead } = await supabase
        .from('leads_estetica')
        .select('nome_lead, whatsapp_lead')
        .eq('id', targetId)
        .maybeSingle();
      if (!lead) return;
      offeredCreateForLeadRef.current = targetId;
      setVincularLeadId(targetId);
      setEditandoFicha(null);
      setFNome(lead.nome_lead || '');
      setFWhats(lead.whatsapp_lead || '');
      setFAlergias('');
      setFMedicamentos('');
      setFHistorico('');
      setFObs('');
      setShowNovaFicha(true);
    };

    abrirNovaFichaDoLead();
  }, [targetId, fichas, loading]);

  const salvarFicha = async () => {
    const payload = {
      nome_paciente: fNome, whatsapp_paciente: fWhats,
      alergias: fAlergias || null, medicamentos_uso: fMedicamentos || null,
      historico_medico: fHistorico || null, observacoes_gerais: fObs || null,
    };

    if (editandoFicha) {
      await supabase.from('fichas_clinicas').update(payload).eq('id', editandoFicha.id);
    } else {
      await supabase.from('fichas_clinicas').insert({
        paciente_id: vincularLeadId || crypto.randomUUID(),
        tipo_paciente: 'lead',
        ...payload
      });
    }

    setShowNovaFicha(false);
    setEditandoFicha(null);
    setVincularLeadId(null);
    setFNome(''); setFWhats(''); setFAlergias(''); setFMedicamentos(''); setFHistorico(''); setFObs('');
    fetchData();
  };

  const openEditFicha = (f: FichaClinica) => {
    setEditandoFicha(f);
    setFNome(f.nome_paciente || '');
    setFWhats(f.whatsapp_paciente || '');
    setFAlergias(f.alergias || '');
    setFMedicamentos(f.medicamentos_uso || '');
    setFHistorico(f.historico_medico || '');
    setFObs(f.observacoes_gerais || '');
    setShowNovaFicha(true);
  };

  const salvarEvolucao = async () => {
    const profissionalNome = eProfissional || user?.user_metadata?.nome || user?.email || 'Profissional';
    await supabase.from('evolucoes').insert({
      ficha_id: fichaParaEvolucao,
      profissional_nome: profissionalNome, 
      procedimento_realizado: eProcedimento,
      descricao: eDescricao, 
      proximo_retorno: eRetorno || null,
    });
    setShowNovaEvolucao(false);
    setEProfissional(''); setEProcedimento(''); setEDescricao(''); setERetorno('');
    fetchData();
  };

  const excluirFicha = async (id: string) => {
    if (!confirm('Excluir ficha e todas as evoluções?')) return;
    await supabase.from('evolucoes').delete().eq('ficha_id', id);
    await supabase.from('fichas_clinicas').delete().eq('id', id);
    fetchData();
  };

  const excluirEvolucao = async (id: string) => {
    if (!confirm('Excluir evolução?')) return;
    await supabase.from('evolucoes').delete().eq('id', id);
    fetchData();
  };

  const salvarFoto = async (path: string, tipo: string = 'outro') => {
    await supabase.from('galeria_paciente').insert({
      ficha_id: fichaParaUpload,
      url_foto: path,
      tipo
    });
    setShowUploadModal(false);
    fetchData();
  };

  const excluirFoto = async (id: string, path: string) => {
    if (!confirm('Excluir foto?')) return;
    await supabase.storage.from('prontuarios').remove([path]);
    await supabase.from('galeria_paciente').delete().eq('id', id);
    fetchData();
  };

  const abrirFoto = async (path: string, bucket: string = 'prontuarios') => {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Não foi possível abrir o arquivo.');
    }
  };

  const excluirDocumento = async (id: string, assinatura_url: string | null) => {
    if (!confirm('Excluir este documento/anamnese?')) return;
    if (assinatura_url) {
      await supabase.storage.from('assinaturas').remove([assinatura_url]);
    }
    await supabase.from('documentos_pacientes').delete().eq('id', id);
    fetchData();
  };

  const fichasFiltradas = fichas.filter(f =>
    (f.nome_paciente || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (f.whatsapp_paciente || '').includes(filtro)
  );

  const inputCls = "w-full rounded-[14px] border border-border-card/40 bg-bg-card h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-main";
  const btnPrimary = "px-4 py-2.5 rounded-[14px] bg-primary text-white font-semibold text-sm hover:brightness-105 transition-all shadow-md active:scale-[0.98]";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-2xl font-heading font-bold text-text-main">Prontuário Eletrônico</h1>
        <Button variant="primary" onClick={() => {
          setEditandoFicha(null);
          setVincularLeadId(null);
          setFNome(''); setFWhats(''); setFAlergias(''); setFMedicamentos(''); setFHistorico(''); setFObs('');
          setShowNovaFicha(true);
        }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Ficha
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input type="text" placeholder="Buscar paciente por nome ou WhatsApp..." value={filtro} onChange={e => setFiltro(e.target.value)} className={cn(inputCls, "pl-9")} />
      </div>

      {/* Lista de fichas */}
      <div className="space-y-4">
        {fichasFiltradas.map(f => {
          const aberta = fichaAberta === f.id;
          const evos = evolucoes.filter(e => e.ficha_id === f.id);
          const fotosFicha = fotos.filter(p => p.ficha_id === f.id);
          const docsFicha = documentos.filter(d => d.ficha_id === f.id);
          const leadCadastro = f.tipo_paciente === 'lead' ? leadsByPacienteId[f.paciente_id] : undefined;
          return (
            <Card key={f.id} id={`ficha-${f.id}`} className={cn("overflow-hidden transition-all", aberta && "ring-2 ring-primary/20 shadow-lg")}>
              <CardContent className="p-0">
                {/* Header da ficha */}
                <button onClick={() => setFichaAberta(aberta ? null : f.id)} className="w-full p-5 flex items-center justify-between hover:bg-bg-base/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-[14px] bg-primary-light/50"><User className="w-5 h-5 text-primary" /></div>
                    <div className="text-left">
                      <h3 className="font-semibold text-text-main">{f.nome_paciente || 'Paciente sem nome'}</h3>
                      <p className="text-xs text-text-muted">{f.whatsapp_paciente || 'Sem WhatsApp'} • {evos.length} evolução(ões)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.alergias && <span className="flex items-center gap-1 text-xs text-error bg-error/10 px-2 py-1 rounded-[14px]"><AlertTriangle className="w-3 h-3" />Alergia</span>}
                    {aberta ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                  </div>
                </button>

                {/* Detalhes */}
                {aberta && (
                  <div className="border-t border-border-card p-5 space-y-6 animate-in fade-in duration-200">
                    {leadCadastro && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-[14px] bg-bg-base border border-border-card/40">
                          <p className="text-xs font-medium text-text-muted mb-1">Data de nascimento</p>
                          <p className="text-sm font-semibold text-text-main">{formatBirthDate(leadCadastro.data_nascimento)}</p>
                          {leadCadastro.data_nascimento && (
                            <p className="text-xs text-text-muted mt-0.5">{calculateAge(leadCadastro.data_nascimento)} anos</p>
                          )}
                        </div>
                        <div className="p-3 rounded-[14px] bg-bg-base border border-border-card/40">
                          <p className="text-xs font-medium text-text-muted mb-1">CPF</p>
                          <p className="text-sm font-semibold text-text-main font-mono">{displayCPF(leadCadastro.cpf, role)}</p>
                        </div>
                      </div>
                    )}
                    {/* Info da ficha */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {f.alergias && <div className="p-3 rounded-[14px] bg-error/5 border border-error/10"><p className="text-xs font-medium text-error mb-1">⚠️ Alergias</p><p className="text-sm text-text-main">{f.alergias}</p></div>}
                      {f.medicamentos_uso && <div className="p-3 rounded-[14px] bg-blue-50 border border-blue-100"><p className="text-xs font-medium text-blue-600 mb-1">💊 Medicamentos em uso</p><p className="text-sm text-text-main">{f.medicamentos_uso}</p></div>}
                      {f.historico_medico && <div className="p-3 rounded-[14px] bg-bg-base border border-border-card/40"><p className="text-xs font-medium text-text-muted mb-1">📋 Histórico Médico</p><p className="text-sm text-text-main">{f.historico_medico}</p></div>}
                      {f.observacoes_gerais && <div className="p-3 rounded-[14px] bg-bg-base border border-border-card/40"><p className="text-xs font-medium text-text-muted mb-1">📝 Observações</p><p className="text-sm text-text-main">{f.observacoes_gerais}</p></div>}
                    </div>

                    {/* Timeline de Evoluções */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-heading font-semibold text-text-main flex items-center gap-2"><FileText className="w-4 h-4" /> Evoluções</h4>
                        <button onClick={() => { setFichaParaEvolucao(f.id); setShowNovaEvolucao(true); }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                      </div>
                      {evos.length > 0 ? (
                        <div className="space-y-3 border-l-2 border-primary/20 ml-2 pl-4">
                          {evos.map(ev => (
                            <div key={ev.id} className="relative p-4 rounded-[14px] bg-bg-base border border-border-card/40">
                              <div className="absolute -left-[22px] top-5 w-3 h-3 rounded-full bg-primary border-2 border-bg-card" />
                              <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-text-main">{ev.procedimento_realizado}</p>
                                    <p className="text-xs text-text-muted mt-0.5">Por <span className="font-bold text-primary">{ev.profissional_nome}</span> • {new Date(ev.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                  {isAdmin && (
                                    <button onClick={() => excluirEvolucao(ev.id)} className="p-1 rounded-[14px] hover:bg-error/10 text-text-muted hover:text-error" title="Apenas administradores podem excluir registros clínicos">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-text-main mt-2 bg-white/50 p-3 rounded-lg border border-border-card/20 italic">"{ev.descricao}"</p>
                                {ev.proximo_retorno && <p className="text-xs text-primary mt-2 flex items-center gap-1 font-semibold"><Calendar className="w-3 h-3" /> Sugestão de Retorno: {new Date(ev.proximo_retorno).toLocaleDateString('pt-BR')}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-warm-grey)]">
                          <FileText className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm font-medium">Nenhuma evolução registrada.</p>
                        </div>
                      )}
                    </div>

                    {/* Galeria */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-heading font-semibold text-text-main flex items-center gap-2"><Image className="w-4 h-4" /> Arquivos, Exames e Galeria</h4>
                        <button onClick={() => { setFichaParaUpload(f.id); setShowUploadModal(true); }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Anexar</button>
                      </div>
                      {fotosFicha.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {fotosFicha.map(foto => (
                            <div key={foto.id} className="group relative aspect-square rounded-[14px] bg-bg-base border border-border-card/40 overflow-hidden flex items-center justify-center">
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                                <button onClick={() => abrirFoto(foto.url_foto)} className="p-2 bg-white rounded-full text-text-main hover:text-primary"><Image className="w-4 h-4" /></button>
                                {isAdmin && (
                                  <button onClick={() => excluirFoto(foto.id, foto.url_foto)} className="p-2 bg-white rounded-full text-text-main hover:text-error"><Trash2 className="w-4 h-4" /></button>
                                )}
                              </div>
                              <Image className="w-8 h-8 text-text-muted/30" />
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-[10px] text-white text-center capitalize">{foto.tipo}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-warm-grey)]">
                          <Image className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm font-medium">Nenhum anexo encontrado.</p>
                        </div>
                      )}
                    </div>

                    {/* Documentos e Anamneses */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-heading font-semibold text-text-main flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Anamneses / Documentos</h4>
                        <button onClick={() => { setDocFichaId(f.id); setDocNomePaciente(f.nome_paciente || ''); setShowModalDoc(true); }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                      </div>
                      
                      {docsFicha.length > 0 ? (
                        <div className="space-y-2">
                          {docsFicha.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-[14px] bg-bg-base border border-border-card/40">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-[14px] bg-white border border-border-card/40">
                                  {doc.template_tipo === 'anamnese' && <FileText className="w-4 h-4 text-blue-500" />}
                                  {doc.template_tipo === 'termo' && <FileText className="w-4 h-4 text-purple-500" />}
                                  {doc.template_tipo === 'receituario' && <FileText className="w-4 h-4 text-green-500" />}
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-text-main">{doc.template_titulo}</p>
                                  <p className="text-xs text-text-muted">{new Date(doc.criado_em).toLocaleDateString('pt-BR')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.assinatura_url && (
                                  <button onClick={() => abrirFoto(doc.assinatura_url!, 'assinaturas')} className="text-xs font-medium text-primary hover:underline">Ver Assinatura</button>
                                )}
                                {isAdmin && (
                                  <button onClick={() => excluirDocumento(doc.id, doc.assinatura_url)} className="p-1.5 rounded-[14px] text-text-muted hover:text-error hover:bg-error/10"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-[var(--color-warm-grey)]">
                          <ClipboardList className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm font-medium">Nenhum documento preenchido.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-4 border-t border-border-card pt-4 mt-6">
                      <button onClick={() => openEditFicha(f)} className="text-xs text-text-muted hover:text-primary flex items-center gap-1"><Edit2 className="w-3 h-3" /> Editar Informações</button>
                      {isAdmin && (
                        <button onClick={() => excluirFicha(f.id)} className="text-xs text-error hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" /> Excluir ficha</button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {fichasFiltradas.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-warm-grey)] bg-bg-card/30 rounded-[14px] border-2 border-dashed border-border-card/40">
            <User className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-base font-bold">Nenhuma ficha clínica encontrada.</p>
            <p className="text-sm opacity-80 mt-1">Busque por outro nome ou crie uma nova ficha.</p>
          </div>
        )}
      </div>

      {/* MODAL NOVA FICHA */}
      {showNovaFicha && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNovaFicha(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card sticky top-0 bg-bg-card z-10">
              <h3 className="font-heading font-semibold text-lg text-text-main">{editandoFicha ? 'Editar Ficha Clínica' : 'Nova Ficha Clínica'}</h3>
              <button onClick={() => setShowNovaFicha(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Paciente *</label>
                  <input 
                    value={fNome} 
                    onChange={e => setFNome(e.target.value)} 
                    className={cn(inputCls, (!isAdmin && editandoFicha !== null) && "opacity-60 cursor-not-allowed")} 
                    disabled={!isAdmin && editandoFicha !== null} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <input 
                    value={fWhats} 
                    onChange={e => setFWhats(e.target.value)} 
                    className={cn(inputCls, (!isAdmin && editandoFicha !== null) && "opacity-60 cursor-not-allowed")} 
                    disabled={!isAdmin && editandoFicha !== null} 
                  />
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Alergias</label><input value={fAlergias} onChange={e => setFAlergias(e.target.value)} className={inputCls} placeholder="Ex: Dipirona, Latex" /></div>
              <div><label className="block text-sm font-medium mb-1">Medicamentos em uso</label><input value={fMedicamentos} onChange={e => setFMedicamentos(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Histórico Médico</label><textarea value={fHistorico} onChange={e => setFHistorico(e.target.value)} className={cn(inputCls, "h-20 py-2")} /></div>
              <div><label className="block text-sm font-medium mb-1">Observações Gerais</label><textarea value={fObs} onChange={e => setFObs(e.target.value)} className={cn(inputCls, "h-20 py-2")} /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowNovaFicha(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvarFicha} disabled={!fNome} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar Ficha</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA EVOLUÇÃO */}
      {showNovaEvolucao && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNovaEvolucao(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">Nova Evolução</h3>
              <button onClick={() => setShowNovaEvolucao(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Profissional *</label><input value={eProfissional} onChange={e => setEProfissional(e.target.value)} className={inputCls} placeholder="Ex: Dra. Maria" /></div>
              <div><label className="block text-sm font-medium mb-1">Procedimento Realizado *</label><input value={eProcedimento} onChange={e => setEProcedimento(e.target.value)} className={inputCls} placeholder="Ex: Limpeza de Pele" /></div>
              <div><label className="block text-sm font-medium mb-1">Descrição / Observações *</label><textarea value={eDescricao} onChange={e => setEDescricao(e.target.value)} className={cn(inputCls, "h-24 py-2")} placeholder="Detalhe o que foi feito..." /></div>
              <div><label className="block text-sm font-medium mb-1">Próximo Retorno</label><input type="date" value={eRetorno} onChange={e => setERetorno(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowNovaEvolucao(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvarEvolucao} disabled={!eProfissional || !eProcedimento || !eDescricao} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD FOTO/EXAME */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">Novo Anexo</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <FileUpload 
                bucket="prontuarios"
                folderPath={fichaParaUpload}
                onUploadSuccess={(path) => salvarFoto(path, 'outro')}
                label="Arraste um Arquivo, Foto ou PDF"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DOCUMENTOS E ANAMNESES */}
      {showModalDoc && (
        <ModalDocumento
          fichaId={docFichaId}
          nomePaciente={docNomePaciente}
          onClose={() => setShowModalDoc(false)}
          onSuccess={() => {
            setShowModalDoc(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
