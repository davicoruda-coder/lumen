import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';

interface CleanResult {
  label: string;
  count: number;
}

export function TabLimpezaDados() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CleanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [step, setStep] = useState<'idle' | 'confirm1' | 'confirm2'>('idle');
  const [incluirAgendamentos, setIncluirAgendamentos] = useState(true);
  const [incluirLeads, setIncluirLeads] = useState(false);
  const [incluirNotas, setIncluirNotas] = useState(true);
  const [incluirAgendasInativas, setIncluirAgendasInativas] = useState(true);

  const nadaSelecionado = !incluirAgendamentos && !incluirNotas && !incluirLeads && !incluirAgendasInativas;

  const handleLimpar = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('limpar_dados_teste', {
        p_incluir_agendamentos: incluirAgendamentos,
        p_incluir_notas: incluirNotas,
        p_incluir_leads: incluirLeads,
        p_incluir_agendas_inativas: incluirAgendasInativas,
      });

      if (rpcError) throw rpcError;

      const payload = (data || {}) as Record<string, number>;
      const res: CleanResult[] = [];
      if (incluirAgendamentos) {
        res.push({ label: 'Agendamentos deletados', count: payload.agendamentos ?? 0 });
      }
      if (incluirNotas) {
        res.push({ label: 'Notas de histórico (CRM) deletadas', count: payload.notas ?? 0 });
      }
      if (incluirLeads) {
        res.push({ label: 'Leads / Cadastros deletados', count: payload.leads ?? 0 });
      }
      if (incluirAgendasInativas) {
        res.push({ label: 'Agendas inativas deletadas', count: payload.agendas_inativas ?? 0 });
      }

      setResults(res);
      setStep('idle');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar dados. Verifique se o patch v4.5 foi aplicado.');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-error/30 bg-error/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-error/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-error shrink-0" />
          <div>
            <p className="text-sm font-semibold text-error">Limpar Dados de Teste</p>
            <p className="text-xs text-text-muted">Exclusivo superadmin — executado no servidor com auditoria</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-error/20">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirAgendamentos} onChange={(e) => setIncluirAgendamentos(e.target.checked)} />
              Agendamentos
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirNotas} onChange={(e) => setIncluirNotas(e.target.checked)} />
              Notas do CRM
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirLeads} onChange={(e) => setIncluirLeads(e.target.checked)} />
              Leads / Cadastros
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirAgendasInativas} onChange={(e) => setIncluirAgendasInativas(e.target.checked)} />
              Agendas inativas
            </label>
          </div>

          {error && (
            <div className="text-sm text-error bg-error/10 rounded-lg p-3">{error}</div>
          )}

          {results && (
            <div className="rounded-lg bg-success/10 border border-success/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Limpeza concluída
              </div>
              {results.map((r) => (
                <p key={r.label} className="text-xs text-text-muted">{r.label}: {r.count}</p>
              ))}
            </div>
          )}

          {step === 'idle' && (
            <Button
              variant="danger"
              disabled={loading || nadaSelecionado}
              onClick={() => setStep('confirm1')}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Iniciar limpeza
            </Button>
          )}

          {step === 'confirm1' && (
            <div className="space-y-2">
              <p className="text-sm text-error font-medium">Tem certeza? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep('idle')} className="flex-1">Cancelar</Button>
                <Button variant="danger" onClick={() => setStep('confirm2')} className="flex-1">Continuar</Button>
              </div>
            </div>
          )}

          {step === 'confirm2' && (
            <div className="space-y-2">
              <p className="text-sm text-error font-medium">Confirmação final: apagar os dados selecionados agora?</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep('idle')} disabled={loading} className="flex-1">Cancelar</Button>
                <Button variant="danger" onClick={() => void handleLimpar()} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Confirmar exclusão
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
