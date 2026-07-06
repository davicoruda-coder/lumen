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

  // Confirmação em 2 etapas
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
    const res: CleanResult[] = [];

    try {
      // 1. Deletar agendamentos (opcional)
      if (incluirAgendamentos) {
        const { count: agCount, error: agErr } = await supabase
          .from('agendamentos_estetica')
          .delete({ count: 'exact' })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (agErr) throw agErr;
        res.push({ label: 'Agendamentos deletados', count: agCount ?? 0 });
      }

      // 2. Deletar notas do histórico (lead_notes)
      if (incluirNotas) {
        const { count: notasCount, error: notasErr } = await supabase
          .from('lead_notes')
          .delete({ count: 'exact' })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (notasErr) throw notasErr;
        res.push({ label: 'Notas de histórico (CRM) deletadas', count: notasCount ?? 0 });
      }

      // 3. Deletar leads de teste (opcional)
      if (incluirLeads) {
        const { count: leadCount, error: leadErr } = await supabase
          .from('leads_estetica')
          .delete({ count: 'exact' })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (leadErr) throw leadErr;
        res.push({ label: 'Leads / Cadastros deletados', count: leadCount ?? 0 });
      }

      // 4. Deletar agendas inativas (ativo = false)
      if (incluirAgendasInativas) {
        // Buscar IDs das agendas inativas primeiro
        const { data: inativas } = await supabase
          .from('agendas')
          .select('id')
          .eq('ativo', false);

        if (inativas && inativas.length > 0) {
          const ids = inativas.map((a: any) => a.id);
          // Apagar agenda_hours vinculados
          await supabase.from('agenda_hours').delete().in('agenda_id', ids);
          // Apagar as agendas inativas
          const { count: agInCount, error: agInErr } = await supabase
            .from('agendas')
            .delete({ count: 'exact' })
            .eq('ativo', false);
          if (agInErr) throw agInErr;
          res.push({ label: 'Agendas inativas deletadas', count: agInCount ?? 0 });
        } else {
          res.push({ label: 'Agendas inativas deletadas', count: 0 });
        }
      }

      setResults(res);
      setStep('idle');
    } catch (err: any) {
      setError(err?.message || 'Erro ao limpar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-error/40 bg-error/5 overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-error/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-error" />
          </div>
          <div>
            <p className="font-bold text-sm text-error">Limpar Dados de Teste</p>
            <p className="text-xs text-text-muted mt-0.5">Exclusivo superadmin — apaga agendamentos, histórico e leads de teste</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-error/20">
          
          {/* Resultado da limpeza */}
          {results && (
            <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-success font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Limpeza concluída com sucesso!
              </div>
              {results.map((r, i) => (
                <div key={i} className="text-xs text-text-muted flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="font-medium text-text-main">{r.count}</span> {r.label}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-error font-medium">
              ❌ {error}
            </div>
          )}

          {/* Opções de limpeza */}
          {step === 'idle' && !results && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">O que deseja apagar?</p>
              
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border-card bg-bg-card cursor-pointer hover:bg-bg-base transition-colors">
                <input
                  type="checkbox"
                  checked={incluirAgendamentos}
                  onChange={e => setIncluirAgendamentos(e.target.checked)}
                  className="accent-error w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-semibold text-text-main">Agendamentos</p>
                  <p className="text-xs text-text-muted">Todos os agendamentos da agenda</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-border-card bg-bg-card cursor-pointer hover:bg-bg-base transition-colors">
                <input
                  type="checkbox"
                  checked={incluirNotas}
                  onChange={e => setIncluirNotas(e.target.checked)}
                  className="accent-error w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-semibold text-text-main">Notas do Histórico (CRM)</p>
                  <p className="text-xs text-text-muted">Todas as anotações manuais adicionadas aos leads</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-error/30 bg-error/5 cursor-pointer hover:bg-error/10 transition-colors">
                <input
                  type="checkbox"
                  checked={incluirAgendasInativas}
                  onChange={e => setIncluirAgendasInativas(e.target.checked)}
                  className="accent-error w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-semibold text-text-main">Agendas Inativas / Ocultas</p>
                  <p className="text-xs text-text-muted">Remove agendas desativadas e seus horários (ex: "Kelly")</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-error/30 bg-error/5 cursor-pointer hover:bg-error/10 transition-colors">
                <input
                  type="checkbox"
                  checked={incluirLeads}
                  onChange={e => setIncluirLeads(e.target.checked)}
                  className="accent-error w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-semibold text-error">⚠️ Leads / Cadastros</p>
                  <p className="text-xs text-text-muted">Apaga TODOS os leads do CRM. Use com cautela!</p>
                </div>
              </label>

              <button
                onClick={() => setStep('confirm1')}
                disabled={nadaSelecionado}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-error/10 text-error font-bold text-sm border border-error/30 hover:bg-error/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {nadaSelecionado ? 'Selecione ao menos um item' : 'Limpar dados selecionados'}
              </button>
            </div>
          )}

          {/* Confirmação 1 */}
          {step === 'confirm1' && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/40 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-text-main">Tem certeza?</p>
                  <p className="text-xs text-text-muted mt-1">
                    Esta ação <strong>não pode ser desfeita</strong>. Os dados serão permanentemente deletados do banco de dados.
                    {incluirLeads && <span className="block mt-1 text-error font-semibold">⚠️ Você optou por apagar TODOS os leads também.</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep('idle')} className="flex-1">
                  Cancelar
                </Button>
                <button
                  onClick={() => setStep('confirm2')}
                  className="flex-1 py-2 px-4 rounded-lg bg-warning text-white font-bold text-sm hover:bg-warning/90 transition-colors"
                >
                  Sim, continuar
                </button>
              </div>
            </div>
          )}

          {/* Confirmação 2 — final */}
          {step === 'confirm2' && (
            <div className="mt-4 p-4 bg-error/10 border border-error/40 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-error">Confirmação final</p>
                  <p className="text-xs text-text-muted mt-1">
                    Você está prestes a apagar dados permanentemente. Clique em <strong>"Apagar agora"</strong> para executar.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep('idle')} className="flex-1">
                  Cancelar
                </Button>
                <button
                  onClick={handleLimpar}
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded-lg bg-error text-white font-bold text-sm hover:bg-error/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {loading ? 'Apagando...' : 'Apagar agora'}
                </button>
              </div>
            </div>
          )}

          {/* Reset após limpeza */}
          {results && (
            <button
              onClick={() => { setResults(null); setStep('idle'); }}
              className="w-full py-2 text-xs text-text-muted hover:text-text-main transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
