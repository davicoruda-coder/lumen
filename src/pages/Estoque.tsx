import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { Package, Search, Plus, AlertTriangle, ArrowUp, ArrowDown, Edit2, Trash2, X, Settings, Paperclip, Archive } from 'lucide-react';
import { FileUpload } from '../components/ui/FileUpload';
import { HScrollArea } from '../components/ui/HScrollArea';

type TabEst = 'produtos' | 'movimentacoes' | 'kits';

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  unidade_medida: string;
  quantidade_atual: number;
  estoque_minimo: number;
  custo_unitario: number | null;
  fornecedor: string | null;
  ativo: boolean;
}

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  observacoes: string | null;
  anexo_url?: string | null;
  criado_em: string;
  produto_nome?: string;
}

interface Kit {
  id: string;
  procedimento_nome: string;
  produto_id: string;
  quantidade: number;
  produto_nome?: string;
}

export function Estoque() {
  const [tab, setTab] = useState<TabEst>('produtos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [showProdModal, setShowProdModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [editProd, setEditProd] = useState<Produto | null>(null);

  // Form produto
  const [pNome, setPNome] = useState('');
  const [pCat, setPCat] = useState('');
  const [pUn, setPUn] = useState('unidade');
  const [pMin, setPMin] = useState('0');
  const [pCusto, setPCusto] = useState('');
  const [pFornecedor, setPFornecedor] = useState('');

  // Form movimentação
  const [mProdId, setMProdId] = useState('');
  const [mTipo, setMTipo] = useState<'entrada' | 'saida'>('entrada');
  const [mQtd, setMQtd] = useState('');
  const [mMotivo, setMMotivo] = useState('');
  const [mObs, setMObs] = useState('');
  const [mAnexo, setMAnexo] = useState<string | null>(null);

  // Form kit
  const [kProc, setKProc] = useState('');
  const [kProdId, setKProdId] = useState('');
  const [kQtd, setKQtd] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('produtos_estoque').select('*').order('nome');
      if (pData) setProdutos(pData as Produto[]);

      const { data: mData } = await supabase.from('movimentacoes_estoque').select('*').order('criado_em', { ascending: false });
      if (mData) setMovs(mData as Movimentacao[]);

      const { data: kData } = await supabase.from('kits_procedimento').select('*').order('procedimento_nome');
      if (kData) setKits(kData as Kit[]);
    } catch (_) {}
    setLoading(false);
  };

  const getProdNome = (id: string) => produtos.find(p => p.id === id)?.nome || id;
  const alertas = produtos.filter(p => p.ativo && p.quantidade_atual <= p.estoque_minimo);

  const abrirNovoProd = () => {
    setEditProd(null); setPNome(''); setPCat(''); setPUn('unidade'); setPMin('0'); setPCusto(''); setPFornecedor('');
    setShowProdModal(true);
  };
  const abrirEditProd = (p: Produto) => {
    setEditProd(p); setPNome(p.nome); setPCat(p.categoria || ''); setPUn(p.unidade_medida); setPMin(String(p.estoque_minimo)); setPCusto(p.custo_unitario ? String(p.custo_unitario) : ''); setPFornecedor(p.fornecedor || '');
    setShowProdModal(true);
  };

  const salvarProd = async () => {
    const payload = { nome: pNome, categoria: pCat || null, unidade_medida: pUn, estoque_minimo: parseFloat(pMin), custo_unitario: pCusto ? parseFloat(pCusto) : null, fornecedor: pFornecedor || null, ativo: true };
    if (editProd) {
      await supabase.from('produtos_estoque').update(payload).eq('id', editProd.id);
    } else {
      await supabase.from('produtos_estoque').insert({ ...payload, quantidade_atual: 0 });
    }
    setShowProdModal(false); fetchData();
  };

  const excluirProd = async (id: string) => {
    if (!confirm('Excluir produto?')) return;
    await supabase.from('produtos_estoque').delete().eq('id', id);
    fetchData();
  };

  const salvarMov = async () => {
    const qtd = parseFloat(mQtd);
    await supabase.from('movimentacoes_estoque').insert({ produto_id: mProdId, tipo: mTipo, quantidade: qtd, motivo: mMotivo || null, observacoes: mObs || null, anexo_url: mAnexo });
    // Atualizar estoque
    const prod = produtos.find(p => p.id === mProdId);
    if (prod) {
      const novaQtd = mTipo === 'entrada' ? prod.quantidade_atual + qtd : Math.max(0, prod.quantidade_atual - qtd);
      await supabase.from('produtos_estoque').update({ quantidade_atual: novaQtd }).eq('id', mProdId);
    }
    setShowMovModal(false); setMProdId(''); setMQtd(''); setMMotivo(''); setMObs(''); setMAnexo(null); fetchData();
  };

  const abrirAnexo = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('estoque').createSignedUrl(path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err) {
      alert('Não foi possível abrir o anexo.');
    }
  };

  const salvarKit = async () => {
    await supabase.from('kits_procedimento').insert({ procedimento_nome: kProc, produto_id: kProdId, quantidade: parseFloat(kQtd) });
    setShowKitModal(false); setKProc(''); setKProdId(''); setKQtd(''); fetchData();
  };

  const excluirKit = async (id: string) => {
    await supabase.from('kits_procedimento').delete().eq('id', id);
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const prodsFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()));

  const tabs = [{ id: 'produtos', label: 'Produtos' }, { id: 'movimentacoes', label: 'Movimentações' }, { id: 'kits', label: 'Kits por Procedimento' }];
  const inputCls = "w-full rounded-[14px] border border-border-card/40 bg-bg-card h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-main";
  const btnPrimary = "px-4 py-2.5 rounded-[14px] bg-primary text-white font-semibold text-sm hover:brightness-105 transition-all shadow-md active:scale-[0.98]";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <h1 className="text-2xl font-heading font-bold text-text-main">Controle de Estoque</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => { setMTipo('entrada'); setMAnexo(null); setShowMovModal(true); }} className="flex-1 sm:flex-none py-2 text-xs sm:text-sm">
            <ArrowDown className="w-4 h-4 mr-1 sm:mr-2" /> Entrada
          </Button>
          <Button variant="danger" onClick={() => { setMTipo('saida'); setMAnexo(null); setShowMovModal(true); }} className="flex-1 sm:flex-none py-2 text-xs sm:text-sm">
            <ArrowUp className="w-4 h-4 mr-1 sm:mr-2" /> Saída
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="p-4 rounded-[14px] bg-error/5 border border-error/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-error text-sm">{alertas.length} produto(s) abaixo do estoque mínimo:</p>
            <p className="text-xs text-text-muted mt-1">{alertas.map(a => `${a.nome} (${a.quantidade_atual}/${a.estoque_minimo})`).join(' • ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <HScrollArea className="w-full">
        <div className="flex border-b border-border-card min-w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as TabEst)} className={cn(
              "px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-main"
            )}>{t.label}</button>
          ))}
        </div>
      </HScrollArea>

      {/* TAB PRODUTOS */}
      {tab === 'produtos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar produto..." value={filtro} onChange={e => setFiltro(e.target.value)} className={cn(inputCls, "pl-9")} />
            </div>
            <Button variant="primary" onClick={abrirNovoProd} className="sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Button>
          </div>
          <Card><CardContent className="p-0"><HScrollArea className="w-full" contentClassName="min-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="bg-primary border-b border-primary-hover text-[color:var(--primary-foreground)] shadow-inner">
                <tr><th className="px-4 py-3 text-left font-medium">Produto</th><th className="px-4 py-3 text-left font-medium">Categoria</th><th className="px-4 py-3 text-center font-medium">Estoque</th><th className="px-4 py-3 text-center font-medium">Mínimo</th><th className="px-4 py-3 text-right font-medium">Custo Un.</th><th className="px-4 py-3 text-center font-medium">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-border-card">
                {prodsFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-bg-base/50 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Package className="w-4 h-4 text-text-muted" /><span className="font-medium text-text-main">{p.nome}</span></div></td>
                    <td className="px-4 py-3 text-text-muted">{p.categoria || '—'}</td>
                    <td className="px-4 py-3 text-center"><span className={cn("font-semibold", p.quantidade_atual <= p.estoque_minimo ? 'text-error' : 'text-text-main')}>{p.quantidade_atual} {p.unidade_medida}</span></td>
                    <td className="px-4 py-3 text-center text-text-muted">{p.estoque_minimo}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{p.custo_unitario ? fmt(p.custo_unitario) : '—'}</td>
                    <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirEditProd(p)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => excluirProd(p.id)} className="p-1.5 rounded-[14px] hover:bg-error/10 text-text-muted hover:text-error"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                ))}
                {prodsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)] bg-bg-card/30 rounded-2xl border-2 border-dashed border-border-card/50 mx-4">
                        <Package className="w-16 h-16 mb-4 opacity-40" />
                        <p className="text-base font-bold text-text-main">Nenhum produto cadastrado</p>
                        <p className="text-sm opacity-80 mt-1">Clique em 'Novo Produto' para começar o controle.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </HScrollArea></CardContent></Card>
        </div>
      )}

      {/* TAB MOVIMENTAÇÕES */}
      {tab === 'movimentacoes' && (
        <Card><CardContent className="p-0"><HScrollArea className="w-full" contentClassName="min-h-[50vh]">
          <table className="w-full text-sm">
            <thead className="bg-primary border-b border-primary-hover text-[color:var(--primary-foreground)] shadow-inner">
              <tr><th className="px-4 py-3 text-left font-medium">Data</th><th className="px-4 py-3 text-left font-medium">Produto</th><th className="px-4 py-3 text-center font-medium">Tipo</th><th className="px-4 py-3 text-center font-medium">Qtd</th><th className="px-4 py-3 text-left font-medium">Motivo/Obs</th><th className="px-4 py-3 text-center font-medium">Anexo</th></tr>
            </thead>
            <tbody className="divide-y divide-border-card">
              {movs.map(m => (
                <tr key={m.id} className="hover:bg-bg-base/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted">{new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 font-medium text-text-main">{getProdNome(m.produto_id)}</td>
                  <td className="px-4 py-3 text-center"><span className={cn("px-2 py-0.5 rounded-[14px] text-xs font-medium", m.tipo === 'entrada' ? 'bg-success/10 text-success' : 'bg-error/10 text-error')}>{m.tipo === 'entrada' ? '↓ Entrada' : '↑ Saída'}</span></td>
                  <td className="px-4 py-3 text-center font-semibold">{m.quantidade}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[200px] truncate" title={m.observacoes || m.motivo || ''}>{m.motivo || m.observacoes || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {m.anexo_url ? (
                      <button onClick={() => abrirAnexo(m.anexo_url!)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted hover:text-primary transition-colors" title="Ver anexo">
                        <Paperclip className="w-4 h-4 mx-auto" />
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {movs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)] bg-bg-card/30 rounded-[14px] border-2 border-dashed border-border-card/40 mx-4">
                      <Archive className="w-16 h-16 mb-4 opacity-40" />
                      <p className="text-base font-bold text-text-main">Nenhuma movimentação registrada</p>
                      <p className="text-sm opacity-80 mt-1">Registre entradas ou saídas para ver o histórico.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </HScrollArea></CardContent></Card>
      )}

      {/* TAB KITS */}
      {tab === 'kits' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowKitModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo Kit
            </Button>
          </div>
          {(() => {
            const grupos: Record<string, Kit[]> = {};
            kits.forEach(k => { if (!grupos[k.procedimento_nome]) grupos[k.procedimento_nome] = []; grupos[k.procedimento_nome].push(k); });
            return Object.entries(grupos).map(([proc, items]) => (
              <Card key={proc}><CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3"><Settings className="w-4 h-4 text-primary" /><h4 className="font-semibold text-text-main">{proc}</h4></div>
                <div className="space-y-2">
                  {items.map(k => (
                    <div key={k.id} className="flex items-center justify-between p-2 rounded-[14px] bg-bg-base">
                      <span className="text-sm text-text-main">{getProdNome(k.produto_id)} — <strong>{k.quantidade}</strong> un.</span>
                      <button onClick={() => excluirKit(k.id)} className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            ));
          })()}
          {kits.length === 0 && <div className="text-center py-12 text-text-muted">Nenhum kit cadastrado. Kits permitem baixa automática de estoque por procedimento.</div>}
        </div>
      )}

      {/* MODAL PRODUTO */}
      {showProdModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProdModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">{editProd ? 'Editar' : 'Novo'} Produto</h3>
              <button onClick={() => setShowProdModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nome *</label><input value={pNome} onChange={e => setPNome(e.target.value)} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Categoria</label><input value={pCat} onChange={e => setPCat(e.target.value)} className={inputCls} placeholder="Ex: Insumos" /></div>
                <div><label className="block text-sm font-medium mb-1">Unidade</label><select value={pUn} onChange={e => setPUn(e.target.value)} className={inputCls}><option value="unidade">Unidade</option><option value="ml">mL</option><option value="g">Gramas</option><option value="caixa">Caixa</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Estoque Mínimo</label><input type="number" value={pMin} onChange={e => setPMin(e.target.value)} className={inputCls} /></div>
                <div><label className="block text-sm font-medium mb-1">Custo Unitário (R$)</label><input type="number" step="0.01" value={pCusto} onChange={e => setPCusto(e.target.value)} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Fornecedor</label><input value={pFornecedor} onChange={e => setPFornecedor(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowProdModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvarProd} disabled={!pNome} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {showMovModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMovModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">Nova {mTipo === 'entrada' ? 'Entrada' : 'Saída'}</h3>
              <button onClick={() => setShowMovModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Produto *</label><select value={mProdId} onChange={e => setMProdId(e.target.value)} className={inputCls}><option value="">Selecione</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (atual: {p.quantidade_atual})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Quantidade *</label><input type="number" value={mQtd} onChange={e => setMQtd(e.target.value)} className={inputCls} /></div>
                <div><label className="block text-sm font-medium mb-1">Motivo</label><input value={mMotivo} onChange={e => setMMotivo(e.target.value)} className={inputCls} placeholder="Ex: Compra fornecedor" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Observações</label><input value={mObs} onChange={e => setMObs(e.target.value)} className={inputCls} /></div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Anexo (Opcional - Ex: Foto de Avaria ou Nota Fiscal)</label>
                {mAnexo ? (
                  <div className="flex items-center justify-between p-3 border border-border-card/40 rounded-[14px] bg-bg-base">
                    <div className="flex items-center gap-2 text-sm text-text-main">
                      <Paperclip className="w-4 h-4 text-text-muted" />
                      Anexo carregado
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirAnexo(mAnexo)} className="text-xs text-primary hover:underline">Ver</button>
                      <button onClick={() => setMAnexo(null)} className="text-xs text-error hover:underline">Remover</button>
                    </div>
                  </div>
                ) : (
                  <FileUpload 
                    bucket="estoque" 
                    onUploadSuccess={(path) => setMAnexo(path)} 
                    label="Arraste a foto do produto/nota aqui" 
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowMovModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvarMov} disabled={!mProdId || !mQtd} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KIT */}
      {showKitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowKitModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card">
              <h3 className="font-heading font-semibold text-lg text-text-main">Novo Item do Kit</h3>
              <button onClick={() => setShowKitModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nome do Procedimento *</label><input value={kProc} onChange={e => setKProc(e.target.value)} className={inputCls} placeholder="Ex: Limpeza de Pele" /></div>
              <div><label className="block text-sm font-medium mb-1">Produto *</label><select value={kProdId} onChange={e => setKProdId(e.target.value)} className={inputCls}><option value="">Selecione</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Quantidade usada *</label><input type="number" value={kQtd} onChange={e => setKQtd(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowKitModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvarKit} disabled={!kProc || !kProdId || !kQtd} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none")}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
