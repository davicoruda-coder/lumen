import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Eraser, FileSignature, FileText, Pill } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import { decode } from 'base64-arraybuffer';

interface TemplateClinico {
  id: string;
  titulo: string;
  tipo: 'anamnese' | 'termo' | 'receituario';
  conteudo_schema: any;
}

interface ModalDocumentoProps {
  fichaId: string;
  nomePaciente: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalDocumento({ fichaId, nomePaciente, onClose, onSuccess }: ModalDocumentoProps) {
  const [templates, setTemplates] = useState<TemplateClinico[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Respostas da Anamnese
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  
  // Ref para o Canvas de Assinatura
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('templates_clinicos').select('*').eq('ativo', true).order('titulo');
    if (data) setTemplates(data as TemplateClinico[]);
    setLoading(false);
  };

  const template = templates.find(t => t.id === selectedTemplateId);

  // Substitui variáveis no texto (Ex: {{NOME_PACIENTE}})
  const replaceVars = (texto: string) => {
    if (!texto) return '';
    const hoje = new Date().toLocaleDateString('pt-BR');
    return texto
      .replace(/\{\{NOME_PACIENTE\}\}/g, nomePaciente)
      .replace(/\{\{DATA_HOJE\}\}/g, hoje);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);

    let dados_preenchidos = {};
    let assinatura_url = null;

    if (template.tipo === 'anamnese') {
      dados_preenchidos = { respostas };
    } else {
      const textoFinal = replaceVars(template.conteudo_schema.texto);
      dados_preenchidos = { textoFinal };

      if (template.tipo === 'termo') {
        if (sigPad.current?.isEmpty()) {
          alert('A assinatura do paciente é obrigatória para este termo.');
          setSaving(false);
          return;
        }

        try {
          const dataUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png') || '';
          const base64 = dataUrl.split(',')[1];
          const binary = decode(base64);
          const blob = new Blob([binary], { type: 'image/png' });

          const { secureUpload } = await import('../../lib/secureUpload');
          const uploaded = await secureUpload('assinaturas', blob, fichaId, 'assinatura.png');
          assinatura_url = uploaded.path;
        } catch {
          alert('Erro ao salvar assinatura.');
          setSaving(false);
          return;
        }
      }
    }

    const { error } = await supabase.from('documentos_pacientes').insert({
      ficha_id: fichaId,
      template_id: template.id,
      dados_preenchidos,
      assinatura_url
    });

    setSaving(false);
    if (!error) {
      onSuccess();
    } else {
      alert('Erro ao salvar documento.');
    }
  };

  const clearSignature = () => sigPad.current?.clear();

  const inputCls = "w-full rounded-lg border border-border-card bg-bg-card h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-text-main";
  const btnPrimary = "px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-105 transition-all shadow-md active:scale-[0.98]";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card rounded-2xl shadow-2xl border border-border-card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-card flex-shrink-0">
          <h3 className="font-heading font-semibold text-lg text-text-main">Novo Documento / Anamnese</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-base text-text-muted"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {!template && (
            <div>
              <label className="block text-sm font-medium mb-2">Selecione o Modelo</label>
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.titulo} ({t.tipo})</option>
                ))}
              </select>
            </div>
          )}

          {template && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-border-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-bg-base">
                    {template.tipo === 'anamnese' && <FileText className="w-4 h-4 text-blue-500" />}
                    {template.tipo === 'termo' && <FileSignature className="w-4 h-4 text-purple-500" />}
                    {template.tipo === 'receituario' && <Pill className="w-4 h-4 text-green-500" />}
                  </div>
                  <h4 className="font-semibold text-text-main">{template.titulo}</h4>
                </div>
                <button onClick={() => setSelectedTemplateId('')} className="text-xs text-text-muted hover:underline">Trocar modelo</button>
              </div>

              {/* Formulário de Anamnese */}
              {template.tipo === 'anamnese' && template.conteudo_schema?.campos?.map((campo: any) => (
                <div key={campo.id} className="space-y-2">
                  <label className="block text-sm font-medium text-text-main">{campo.label}</label>
                  
                  {campo.tipo === 'texto' && (
                    <input 
                      value={respostas[campo.id] || ''} 
                      onChange={e => setRespostas({...respostas, [campo.id]: e.target.value})} 
                      className={inputCls} 
                    />
                  )}
                  
                  {campo.tipo === 'sim_nao' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                        <input type="radio" name={campo.id} value="Sim" onChange={e => setRespostas({...respostas, [campo.id]: e.target.value})} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                        <input type="radio" name={campo.id} value="Não" onChange={e => setRespostas({...respostas, [campo.id]: e.target.value})} /> Não
                      </label>
                    </div>
                  )}

                  {campo.tipo === 'multipla' && (
                    <select 
                      value={respostas[campo.id] || ''} 
                      onChange={e => setRespostas({...respostas, [campo.id]: e.target.value})} 
                      className={inputCls}
                    >
                      <option value="">Selecione...</option>
                      {campo.opcoes?.split(',').map((op: string) => (
                        <option key={op.trim()} value={op.trim()}>{op.trim()}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {/* Termo de Consentimento ou Receita */}
              {(template.tipo === 'termo' || template.tipo === 'receituario') && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-bg-base border border-border-card text-sm text-text-main whitespace-pre-wrap font-mono">
                    {replaceVars(template.conteudo_schema.texto)}
                  </div>

                  {template.tipo === 'termo' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium">Assinatura do Paciente *</label>
                        <button onClick={clearSignature} className="text-xs text-text-muted hover:text-error flex items-center gap-1"><Eraser className="w-3 h-3" /> Limpar</button>
                      </div>
                      <div className="border border-border-card rounded-xl bg-white overflow-hidden shadow-inner">
                        <SignatureCanvas 
                          ref={sigPad}
                          penColor="black"
                          canvasProps={{ className: "w-full h-40" }} 
                        />
                      </div>
                      <p className="text-xs text-text-muted text-center mt-2">Peça para o paciente assinar no quadro acima com o dedo ou mouse.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-border-card flex-shrink-0 bg-bg-card rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-base">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={!template || saving} 
            className={cn(btnPrimary, "flex items-center gap-2 disabled:bg-border-card disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed")}
          >
            {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Documento</>}
          </button>
        </div>
      </div>
    </div>
  );
}
