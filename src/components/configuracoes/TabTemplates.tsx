import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { Plus, FileText, FileSignature, Pill, Trash2, Edit2, X, PlusCircle } from 'lucide-react';

interface CampoAnamnese {
  id: string;
  label: string;
  tipo: 'texto' | 'sim_nao' | 'multipla';
  opcoes?: string; // Vírgula separada para múltipla escolha
}

interface TemplateClinico {
  id: string;
  titulo: string;
  tipo: 'anamnese' | 'termo' | 'receituario';
  conteudo_schema: any;
  ativo: boolean;
}

export function TabTemplates() {
  const [templates, setTemplates] = useState<TemplateClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<TemplateClinico | null>(null);

  // Form State
  const [formTipo, setFormTipo] = useState<'anamnese' | 'termo' | 'receituario'>('anamnese');
  const [formTitulo, setFormTitulo] = useState('');
  const [formTexto, setFormTexto] = useState(''); // Para termo/receita
  const [formCampos, setFormCampos] = useState<CampoAnamnese[]>([]); // Para anamnese

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('templates_clinicos').select('*').order('criado_em', { ascending: false });
    if (data) setTemplates(data as TemplateClinico[]);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormTipo('anamnese');
    setFormTitulo('');
    setFormTexto('');
    setFormCampos([{ id: crypto.randomUUID(), label: '', tipo: 'texto' }]);
    setShowModal(true);
  };

  const abrirEditar = (t: TemplateClinico) => {
    setEditando(t);
    setFormTipo(t.tipo);
    setFormTitulo(t.titulo);
    if (t.tipo === 'anamnese') {
      setFormCampos(t.conteudo_schema?.campos || []);
    } else {
      setFormTexto(t.conteudo_schema?.texto || '');
    }
    setShowModal(true);
  };

  const salvar = async () => {
    let schema = {};
    if (formTipo === 'anamnese') {
      schema = { campos: formCampos };
    } else {
      schema = { texto: formTexto };
    }

    const payload = {
      titulo: formTitulo,
      tipo: formTipo,
      conteudo_schema: schema,
      ativo: true
    };

    if (editando) {
      await supabase.from('templates_clinicos').update(payload).eq('id', editando.id);
    } else {
      await supabase.from('templates_clinicos').insert(payload);
    }

    setShowModal(false);
    fetchData();
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir este modelo? Ele não poderá mais ser usado em novos prontuários.')) return;
    await supabase.from('templates_clinicos').delete().eq('id', id);
    fetchData();
  };

  const addCampo = () => setFormCampos([...formCampos, { id: crypto.randomUUID(), label: '', tipo: 'texto' }]);
  const rmCampo = (id: string) => setFormCampos(formCampos.filter(c => c.id !== id));
  const updateCampo = (id: string, field: keyof CampoAnamnese, value: string) => {
    setFormCampos(formCampos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const btnPrimary = "px-4 py-2.5 rounded-[14px] bg-gradient-to-r from-[var(--color-rose-gold)] to-[var(--color-primary)] text-white font-bold text-sm hover:brightness-110 transition-all shadow-md active:scale-[0.98]";
  const inputCls = "w-full rounded-[14px] border border-border-card/40 bg-bg-card h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-main";

  return (
    <div className="space-y-6 animate-in fade-in duration-300 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold text-text-main">Modelos Clínicos</h2>
          <p className="text-sm text-text-muted mt-1">Crie questionários, termos de consentimento e modelos de receitas.</p>
        </div>
        <button onClick={abrirNovo} className={cn(btnPrimary, "flex items-center gap-2")}><Plus className="w-4 h-4" /> Novo Modelo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="relative overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[14px] bg-bg-base">
                    {t.tipo === 'anamnese' && <FileText className="w-5 h-5 text-blue-500" />}
                    {t.tipo === 'termo' && <FileSignature className="w-5 h-5 text-purple-500" />}
                    {t.tipo === 'receituario' && <Pill className="w-5 h-5 text-green-500" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-main">{t.titulo}</h3>
                    <p className="text-xs text-text-muted capitalize">{t.tipo}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirEditar(t)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => excluir(t.id)} className="p-1.5 rounded-[14px] hover:bg-error/10 text-text-muted hover:text-error"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border-card/40 rounded-[14px] flex flex-col items-center justify-center text-[var(--color-warm-grey)]">
            <PlusCircle className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-base font-medium">Nenhum modelo cadastrado.</p>
            <p className="text-sm opacity-80 mt-1">Crie questionários ou termos para começar.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-bg-card rounded-[14px] shadow-2xl border border-border-card/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-card sticky top-0 bg-bg-card z-10">
              <h3 className="font-heading font-semibold text-lg text-text-main">{editando ? 'Editar Modelo' : 'Novo Modelo'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-[14px] hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título do Modelo *</label>
                  <input value={formTitulo} onChange={e => setFormTitulo(e.target.value)} className={inputCls} placeholder="Ex: Anamnese Facial" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Documento</label>
                  <select value={formTipo} onChange={e => setFormTipo(e.target.value as any)} className={inputCls} disabled={!!editando}>
                    <option value="anamnese">Anamnese / Questionário</option>
                    <option value="termo">Termo de Consentimento</option>
                    <option value="receituario">Receituário / Atestado</option>
                  </select>
                </div>
              </div>

              {formTipo === 'anamnese' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-text-main">Perguntas do Questionário</h4>
                    <button onClick={addCampo} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><PlusCircle className="w-3 h-3" /> Adicionar Pergunta</button>
                  </div>
                  
                  <div className="space-y-3">
                    {formCampos.map((c, i) => (
                      <div key={c.id} className="p-4 rounded-[14px] bg-bg-base border border-border-card/40 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <input value={c.label} onChange={e => updateCampo(c.id, 'label', e.target.value)} className={inputCls} placeholder={`Pergunta ${i + 1}`} />
                            <div className="flex gap-3">
                              <select value={c.tipo} onChange={e => updateCampo(c.id, 'tipo', e.target.value as any)} className={cn(inputCls, "w-48")}>
                                <option value="texto">Texto Livre</option>
                                <option value="sim_nao">Sim ou Não</option>
                                <option value="multipla">Múltipla Escolha</option>
                              </select>
                              {c.tipo === 'multipla' && (
                                <input value={c.opcoes || ''} onChange={e => updateCampo(c.id, 'opcoes', e.target.value)} className={inputCls} placeholder="Opções separadas por vírgula (Ex: A, B, C)" />
                              )}
                            </div>
                          </div>
                          <button onClick={() => rmCampo(c.id)} className="p-2 rounded-[14px] text-text-muted hover:bg-error/10 hover:text-error transition-colors mt-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    {formCampos.length === 0 && <p className="text-sm text-text-muted text-center py-4">Nenhuma pergunta adicionada.</p>}
                  </div>
                </div>
              )}

              {(formTipo === 'termo' || formTipo === 'receituario') && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Conteúdo do Documento</label>
                  <p className="text-xs text-text-muted mb-2">Você pode usar variáveis que serão substituídas automaticamente: {'{{NOME_PACIENTE}}'}, {'{{CPF_PACIENTE}}'}, {'{{DATA_HOJE}}'}.</p>
                  <textarea 
                    value={formTexto} 
                    onChange={e => setFormTexto(e.target.value)} 
                    className={cn(inputCls, "h-64 py-3 resize-y font-mono")} 
                    placeholder="Digite o texto do termo ou modelo de receita..."
                  />
                </div>
              )}

            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t border-border-card">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-[14px] text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
              <button onClick={salvar} disabled={!formTitulo || (formTipo === 'anamnese' && formCampos.length === 0) || (formTipo !== 'anamnese' && !formTexto)} className={cn(btnPrimary, "disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed")}>Salvar Modelo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
