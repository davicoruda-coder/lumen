import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Search, Filter, Download, Edit2, Trash2, X, ArrowUpCircle, ArrowDownCircle, Paperclip, Users, ClipboardList } from 'lucide-react';
import { FileUpload } from '../components/ui/FileUpload';
import { HScrollArea } from '../components/ui/HScrollArea';

type TabFin = 'resumo' | 'receitas' | 'despesas' | 'comissoes';

interface Lancamento {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  forma_pagamento: string | null;
  categoria_nome?: string;
  observacoes: string | null;
  comprovante_url?: string | null;
  criado_em: string;
}

interface Comissao {
  id: string;
  profissional_nome: string;
  percentual_padrao: number;
  ativo: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pago: 'bg-success/10 text-success',
  pendente: 'bg-warning/10 text-warning',
  atrasado: 'bg-error/10 text-error',
  cancelado: 'bg-gray-100 text-gray-500',
};

export function Financeiro() {
  const [tab, setTab] = useState<TabFin>('resumo');
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<'receita' | 'despesa'>('receita');
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState<Lancamento | null>(null);

  // Form state
  const [formDesc, setFormDesc] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formVencimento, setFormVencimento] = useState('');
  const [formPagamento, setFormPagamento] = useState('');
  const [formForma, setFormForma] = useState('');
  const [formStatus, setFormStatus] = useState<string>('pendente');
  const [formObs, setFormObs] = useState('');
  const [formComprovante, setFormComprovante] = useState<string | null>(null);
  // Comissão form
  const [showComModal, setShowComModal] = useState(false);
  const [comNome, setComNome] = useState('');
  const [comPerc, setComPerc] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: lData } = await supabase.from('lancamentos_financeiros').select('*').order('data_vencimento', { ascending: false });
      if (lData) setLancamentos(lData as Lancamento[]);
      const { data: cData } = await supabase.from('comissoes').select('*').order('profissional_nome');
      if (cData) setComissoes(cData as Comissao[]);
    } catch (_) {}
    setLoading(false);
  };

  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;
  const pendentes = lancamentos.filter(l => l.status === 'pendente').reduce((s, l) => s + l.valor, 0);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openNew = (tipo: 'receita' | 'despesa') => {
    setEditando(null); setModalTipo(tipo);
    setFormDesc(''); setFormValor(''); setFormVencimento(''); setFormPagamento(''); setFormForma(''); setFormStatus('pendente'); setFormObs(''); setFormComprovante(null);
    setShowModal(true);
  };

  const openEdit = (l: Lancamento) => {
    setEditando(l); setModalTipo(l.tipo);
    setFormDesc(l.descricao); setFormValor(String(l.valor)); setFormVencimento(l.data_vencimento);
    setFormPagamento(l.data_pagamento || ''); setFormForma(l.forma_pagamento || ''); setFormStatus(l.status); setFormObs(l.observacoes || ''); setFormComprovante(l.comprovante_url || null);
    setShowModal(true);
  };

  const salvar = async () => {
    const payload = {
      tipo: modalTipo, descricao: formDesc, valor: parseFloat(formValor),
      data_vencimento: formVencimento, data_pagamento: formPagamento || null,
      forma_pagamento: formForma || null, status: formStatus, observacoes: formObs || null, comprovante_url: formComprovante
    };
    if (editando) {
      await supabase.from('lancamentos_financeiros').update(payload).eq('id', editando.id);
    } else {
      await supabase.from('lancamentos_financeiros').insert(payload);
    }
    setShowModal(false); fetchData();
  };

  const excluir = async (id: string) => {
    if (!confirm('Deseja excluir este lançamento?')) return;
    
    const lancamento = lancamentos.find(l => l.id === id);
    if (lancamento?.comprovante_url) {
      await supabase.storage.from('financeiro').remove([lancamento.comprovante_url]);
    }
    
    await supabase.from('lancamentos_financeiros').delete().eq('id', id);
    fetchData();
  };

  const abrirAnexo = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('financeiro').createSignedUrl(path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch {
      alert('Não foi possível abrir o anexo.');
    }
  };

  const salvarComissao = async () => {
    await supabase.from('comissoes').insert({ profissional_nome: comNome, percentual_padrao: parseFloat(comPerc), ativo: true });
    setShowComModal(false); setComNome(''); setComPerc(''); fetchData();
  };

  const excluirComissao = async (id: string) => {
    if (!confirm('Excluir comissão?')) return;
    await supabase.from('comissoes').delete().eq('id', id);
    fetchData();
  };

  const receitas = lancamentos.filter(l => l.tipo === 'receita' && l.descricao.toLowerCase().includes(filtro.toLowerCase()));
  const despesas = lancamentos.filter(l => l.tipo === 'despesa' && l.descricao.toLowerCase().includes(filtro.toLowerCase()));

  const tabs = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'receitas', label: 'Receitas' },
    { id: 'despesas', label: 'Despesas' },
    { id: 'comissoes', label: 'Comissões' },
  ];

  const inputCls = "w-full rounded-[14px] border border-border-card/40 bg-bg-card h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-main";
  const btnPrimary = "px-4 py-2.5 rounded-[14px] bg-primary text-white font-semibold text-sm hover:brightness-105 transition-all shadow-md active:scale-[0.98]";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <h1 className="text-2xl font-heading font-bold text-text-main">Financeiro</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => openNew('receita')} className="flex-1 sm:flex-none py-2 text-xs sm:text-sm">
            <ArrowUpCircle className="w-4 h-4 mr-1 sm:mr-2" /> Nova Receita
          </Button>
          <Button variant="primary" onClick={() => openNew('despesa')} className="flex-1 sm:flex-none py-2 text-xs sm:text-sm">
            <ArrowDownCircle className="w-4 h-4 mr-1 sm:mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <HScrollArea className="w-full">
        <div className="flex border-b border-border-card min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as TabFin)} className={cn(
              "px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-main"
            )}>{t.label}</button>
          ))}
        </div>
      </HScrollArea>

      {/* TAB RESUMO */}
      {tab === 'resumo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#2D5A27] to-[#1E3D1A] text-white border-none shadow-md"><CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-[14px] bg-white/20"><TrendingUp className="w-6 h-6 text-white" /></div>
              <div><p className="text-xs text-white/80">Receitas (Pagas)</p><p className="text-xl font-bold text-white">{fmt(totalReceitas)}</p></div>
            </CardContent></Card>
            <Card className="bg-gradient-to-br from-[#A34E50] to-[#823A3C] text-white border-none shadow-md"><CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-[14px] bg-white/20"><TrendingDown className="w-6 h-6 text-white" /></div>
              <div><p className="text-xs text-white/80">Despesas (Pagas)</p><p className="text-xl font-bold text-white">{fmt(totalDespesas)}</p></div>
            </CardContent></Card>
            <Card className="bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-none shadow-md"><CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-[14px] bg-white/20"><PiggyBank className="w-6 h-6 text-white" /></div>
              <div><p className="text-xs text-white/80">Saldo</p><p className="text-xl font-bold text-white">{fmt(saldo)}</p></div>
            </CardContent></Card>
            <Card className="bg-gradient-to-br from-[#D4AF37] to-[#C5A028] text-white border-none opacity-80 shadow-md"><CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-[14px] bg-white/20"><DollarSign className="w-6 h-6 text-white" /></div>
              <div><p className="text-xs text-white/80">Pendentes</p><p className="text-xl font-bold text-white">{fmt(pendentes)}</p></div>
            </CardContent></Card>
          </div>

          {/* Últimos lançamentos */}
          <Card><CardContent className="p-0">
            <div className="p-4 border-b border-border-card"><h3 className="font-heading font-semibold text-text-main">Últimos Lançamentos</h3></div>
            <HScrollArea className="w-full">
              <table className="w-full text-sm">
                <thead className="bg-primary border-b border-primary-hover text-[color:var(--primary-foreground)] shadow-inner">
                  <tr><th className="px-4 py-3 text-left font-medium">Data</th><th className="px-4 py-3 text-left font-medium">Descrição</th><th className="px-4 py-3 text-left font-medium">Tipo</th><th className="px-4 py-3 text-right font-medium">Valor</th><th className="px-4 py-3 text-center font-medium">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-border-card">
                  {lancamentos.slice(0, 10).map(l => (
                    <tr key={l.id} className="hover:bg-bg-base/50 transition-colors">
                      <td className="px-4 py-3 text-text-muted">{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-text-main font-medium">{l.descricao}</td>
                      <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-[14px] text-xs font-medium", l.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>{l.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}</span></td>
                      <td className={cn("px-4 py-3 text-right font-semibold", l.tipo === 'receita' ? 'text-success' : 'text-error')}>{fmt(l.valor)}</td>
                      <td className="px-4 py-3 text-center"><span className={cn("px-2 py-0.5 rounded-[14px] text-xs font-medium capitalize", STATUS_COLORS[l.status])}>{l.status}</span></td>
                    </tr>
                  ))}
                  {lancamentos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)] bg-bg-card/30 rounded-[14px] border-2 border-dashed border-border-card/40 mx-4">
                          <DollarSign className="w-16 h-16 mb-4 opacity-40" />
                          <p className="text-base font-bold text-text-main">Nenhum lançamento cadastrado</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </HScrollArea>
          </CardContent></Card>
        </div>
      )}

      {/* TAB RECEITAS / DESPESAS */}
      {(tab === 'receitas' || tab === 'despesas') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar..." value={filtro} onChange={e => setFiltro(e.target.value)} className={cn(inputCls, "pl-9")} />
            </div>
            <Button variant="primary" onClick={() => openNew(tab === 'receitas' ? 'receita' : 'despesa')} className="sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Novo
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <HScrollArea className="w-full" contentClassName="min-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="bg-primary border-b border-primary-hover text-[color:var(--primary-foreground)] shadow-inner">
                  <tr><th className="px-4 py-3 text-left font-medium">Data Venc.</th><th className="px-4 py-3 text-left font-medium">Descrição</th><th className="px-4 py-3 text-right font-medium">Valor</th><th className="px-4 py-3 text-center font-medium">Status</th><th className="px-4 py-3 text-center font-medium">Forma</th><th className="px-4 py-3 text-center font-medium">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-border-card">
                  {(tab === 'receitas' ? receitas : despesas).map(l => (
                    <tr key={l.id} className="hover:bg-bg-base/50 transition-colors">
                      <td className="px-4 py-3 text-text-muted">{new Date(l.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-text-main font-medium">{l.descricao}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold", l.tipo === 'receita' ? 'text-success' : 'text-error')}>{fmt(l.valor)}</td>
                      <td className="px-4 py-3 text-center"><span className={cn("px-2 py-0.5 rounded-[14px] text-xs font-medium capitalize", STATUS_COLORS[l.status])}>{l.status}</span></td>
                      <td className="px-4 py-3 text-center text-text-muted text-xs">{l.forma_pagamento || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {l.comprovante_url && (
                            <button onClick={() => abrirAnexo(l.comprovante_url!)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted hover:text-primary transition-colors" title="Ver anexo">
                              <Paperclip className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(l)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => excluir(l.id)} className="p-1.5 rounded-[14px] hover:bg-error/10 text-text-muted hover:text-error transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(tab === 'receitas' ? receitas : despesas).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)] bg-bg-card/30 rounded-[14px] border-2 border-dashed border-border-card/40 mx-4">
                          <ClipboardList className="w-16 h-16 mb-4 opacity-40" />
                          <p className="text-base font-bold text-text-main">Nenhum registro encontrado</p>
                          <p className="text-sm opacity-80 mt-1">Crie um novo lançamento para ver os dados aqui.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </HScrollArea>
          </CardContent></Card>
        </div>
      )}

      {/* TAB COMISSÕES */}
      {tab === 'comissoes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowComModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo Profissional
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comissoes.map(c => (
              <Card key={c.id}><CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-text-main">{c.profissional_nome}</h4>
                  <button onClick={() => excluirComissao(c.id)} className="p-1 rounded-[14px] hover:bg-error/10 text-text-muted hover:text-error transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-2xl font-bold text-primary">{c.percentual_padrao}%</p>
                <p className="text-xs text-text-muted mt-1">Comissão padrão sobre procedimentos</p>
              </CardContent></Card>
            ))}
            {comissoes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--color-warm-grey)]">
                <Users className="w-12 h-12 mb-3 opacity-60" />
                <p className="text-base font-medium">Nenhum profissional cadastrado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL LANÇAMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">{editando ? 'Editar' : 'Nova'} {modalTipo === 'receita' ? 'Receita' : 'Despesa'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Descrição *</label><input value={formDesc} onChange={e => setFormDesc(e.target.value)} className={inputCls} placeholder="Ex: Consulta Maria Silva" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Valor (R$) *</label><input type="number" step="0.01" value={formValor} onChange={e => setFormValor(e.target.value)} className={inputCls} placeholder="0,00" /></div>
                <div><label className="block text-sm font-medium mb-1">Status</label><select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Data Vencimento *</label><input type="date" value={formVencimento} onChange={e => setFormVencimento(e.target.value)} className={inputCls} /></div>
                <div><label className="block text-sm font-medium mb-1">Data Pagamento</label><input type="date" value={formPagamento} onChange={e => setFormPagamento(e.target.value)} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Forma de Pagamento</label><select value={formForma} onChange={e => setFormForma(e.target.value)} className={inputCls}><option value="">Selecione</option><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="credito">Cartão Crédito</option><option value="debito">Cartão Débito</option><option value="transferencia">Transferência</option></select></div>
              <div><label className="block text-sm font-medium mb-1">Observações</label><textarea value={formObs} onChange={e => setFormObs(e.target.value)} className={cn(inputCls, "h-20 py-2")} /></div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Comprovante (Opcional)</label>
                {formComprovante ? (
                  <div className="flex items-center justify-between p-3 border border-border-card/40 rounded-[14px] bg-bg-base">
                    <div className="flex items-center gap-2 text-sm text-text-main">
                      <Paperclip className="w-4 h-4 text-text-muted" />
                      Anexo carregado
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirAnexo(formComprovante)} className="text-xs text-primary hover:underline">Ver</button>
                      <button onClick={() => setFormComprovante(null)} className="text-xs text-error hover:underline">Remover</button>
                    </div>
                  </div>
                ) : (
                  <FileUpload 
                    bucket="financeiro" 
                    onUploadSuccess={(path) => setFormComprovante(path)} 
                    label="Anexar Comprovante (PDF, JPG, PNG)" 
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={!formDesc || !formValor || !formVencimento} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMISSÃO */}
      {showComModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowComModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">Novo Profissional</h3>
              <button onClick={() => setShowComModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nome do Profissional *</label><input value={comNome} onChange={e => setComNome(e.target.value)} className={inputCls} placeholder="Ex: Dra. Maria" /></div>
              <div><label className="block text-sm font-medium mb-1">Comissão Padrão (%) *</label><input type="number" step="0.5" value={comPerc} onChange={e => setComPerc(e.target.value)} className={inputCls} placeholder="30" /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowComModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base transition-colors">Cancelar</button>
              <button onClick={salvarComissao} disabled={!comNome || !comPerc} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
