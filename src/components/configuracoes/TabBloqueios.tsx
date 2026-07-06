import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Calendar, Trash2, ShieldAlert, Check, X, Plus, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Holiday {
  date: string;
  name: string;
  type: string;
}

interface Closure {
  id: string;
  data: string;
  descricao: string;
  is_feriado: boolean;
  esta_fechado: boolean;
}

export function TabBloqueios() {
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  
  // State para novo bloqueio manual
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  useEffect(() => {
// ... existing fetchData logic ...
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchClosures(), fetchNationalHolidays()]);
    setLoading(false);
  };

  const fetchClosures = async () => {
    const { data } = await supabase
      .from('clinic_closures')
      .select('*')
      .order('data', { ascending: true });
    if (data) setClosures(data);
  };

  const fetchNationalHolidays = async () => {
    setLoadingHolidays(true);
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setHolidays(data);
      }
    } catch {
      // Falha ao buscar feriados — segue sem a lista externa
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleToggleHoliday = async (holiday: Holiday, currentlyClosed: boolean) => {
    try {
      if (currentlyClosed) {
        // Remover bloqueio
        await supabase
          .from('clinic_closures')
          .delete()
          .eq('data', holiday.date);
      } else {
        // Adicionar bloqueio
        await supabase
          .from('clinic_closures')
          .insert({
            data: holiday.date,
            descricao: holiday.name,
            is_feriado: true,
            esta_fechado: true
          });
      }
      fetchClosures();
    } catch (error) {
      alert('Erro ao atualizar feriado');
    }
  };

  const handleToggleAllHolidays = async (shouldCloseAll: boolean) => {
    try {
      setIsUpdatingAll(true);
      if (shouldCloseAll) {
        // Adicionar todos que não estão fechados
        const toAdd = holidays
          .filter(h => !isDateClosed(h.date))
          .map(h => ({
            data: h.date,
            descricao: h.name,
            is_feriado: true,
            esta_fechado: true
          }));
        
        if (toAdd.length > 0) {
          await supabase.from('clinic_closures').insert(toAdd);
        }
      } else {
        // Remover todos os feriados desta lista
        const dates = holidays.map(h => h.date);
        await supabase
          .from('clinic_closures')
          .delete()
          .in('data', dates)
          .eq('is_feriado', true);
      }
      fetchClosures();
    } catch (error) {
      alert('Erro ao atualizar feriados');
    } finally {
      setIsUpdatingAll(false);
    }
  };

  const handleAddManualClosure = async () => {
    if (!newDate || !newDesc) return;
    try {
      setIsAdding(true);
      const { error } = await supabase
        .from('clinic_closures')
        .insert({
          data: newDate,
          descricao: newDesc,
          is_feriado: false,
          esta_fechado: true
        });
      
      if (error) {
        if (error.code === '23505') alert('Esta data já possui um bloqueio.');
        else throw error;
      } else {
        setNewDate('');
        setNewDesc('');
        fetchClosures();
      }
    } catch (error) {
      alert('Erro ao adicionar bloqueio');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm('Deseja remover este bloqueio?')) return;
    try {
      await supabase.from('clinic_closures').delete().eq('id', id);
      fetchClosures();
    } catch (error) {
      alert('Erro ao remover bloqueio');
    }
  };

  const isDateClosed = (date: string) => {
    return closures.some(c => c.data === date && c.esta_fechado);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-text-muted animate-pulse">Carregando configurações de agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Aviso de IA */}
      <div className="bg-primary/90 border border-primary/20 rounded-2xl p-4 flex items-start gap-4 shadow-md">
        <div className="bg-white/20 p-2 rounded-lg text-white">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">Informação Importante</h4>
          <p className="text-xs text-white/90 mt-1 leading-relaxed font-medium">
            As datas marcadas como "Fechado" impedem que a IA de agendamento ofereça horários aos clientes. 
            Isso garante que feriados e folgas da equipe sejam respeitados automaticamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Coluna 1: Feriados Nacionais */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border-card bg-bg-card/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Feriados Nacionais</CardTitle>
                  <CardDescription>Ative para fechar a clínica nestas datas</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 px-2 font-bold border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => handleToggleAllHolidays(true)}
                    disabled={isUpdatingAll}
                  >
                    Bloquear Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-7 px-2 font-bold text-text-muted hover:text-error hover:bg-error/5"
                    onClick={() => handleToggleAllHolidays(false)}
                    disabled={isUpdatingAll}
                  >
                    Limpar Todos
                  </Button>
                  <div className="bg-bg-base px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-text-muted border border-border-card">
                    {new Date().getFullYear()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHolidays ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="divide-y divide-border-card">
                  {holidays.map((h) => {
                    const closed = isDateClosed(h.date);
                    const dateParts = h.date.split('-');
                    const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;

                    return (
                      <div key={h.date} className={cn(
                        "flex items-center justify-between p-4 transition-colors group",
                        closed ? "bg-error/5" : "hover:bg-bg-base/40"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex flex-col items-center justify-center border transition-all",
                            closed 
                              ? "bg-error/10 border-error/20 text-error shadow-sm" 
                              : "bg-bg-base border-border-card text-text-muted group-hover:border-primary/30"
                          )}>
                            <span className="text-[10px] uppercase font-bold">{dateParts[1] === '01' ? 'Jan' : dateParts[1] === '02' ? 'Fev' : dateParts[1] === '03' ? 'Mar' : dateParts[1] === '04' ? 'Abr' : dateParts[1] === '05' ? 'Mai' : dateParts[1] === '06' ? 'Jun' : dateParts[1] === '07' ? 'Jul' : dateParts[1] === '08' ? 'Ago' : dateParts[1] === '09' ? 'Set' : dateParts[1] === '10' ? 'Out' : dateParts[1] === '11' ? 'Nov' : 'Dez'}</span>
                            <span className="text-lg font-bold leading-none">{dateParts[2]}</span>
                          </div>
                          <div>
                            <p className={cn("text-sm font-semibold transition-colors", closed ? "text-error" : "text-text-main")}>
                              {h.name}
                            </p>
                            <p className="text-xs text-text-muted">Feriado Nacional</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleHoliday(h, closed)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none",
                            closed ? "bg-error" : "bg-border-card"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            closed ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Bloqueios Manuais */}
        <div className="space-y-6">
          
          {/* Formulário Novo Bloqueio */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Novo Bloqueio Manual
              </CardTitle>
              <CardDescription>Bloqueie uma data específica para folgas ou reformas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted ml-1">Data</label>
                  <Input 
                    type="date" 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    className="bg-bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted ml-1">Descrição</label>
                  <Input 
                    placeholder="Ex: Reforma da Clínica" 
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="bg-bg-card"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddManualClosure} 
                className="w-full shadow-md"
                disabled={!newDate || !newDesc}
                isLoading={isAdding}
              >
                Bloquear Data
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Bloqueios Customizados */}
          <Card className="border-none shadow-sm bg-bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border-card">
              <CardTitle className="text-lg">Bloqueios Customizados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {closures.filter(c => !c.is_feriado).length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center text-[var(--color-warm-grey)]">
                  <Calendar className="w-16 h-16 mb-4 opacity-40" />
                  <p className="text-base font-medium">Nenhum bloqueio manual ativo.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-card">
                  {closures.filter(c => !c.is_feriado).map((c) => {
                    const parts = c.data.split('-');
                    return (
                      <div key={c.id} className="flex items-center justify-between p-4 hover:bg-bg-base/40 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-bold text-text-main bg-bg-base border border-border-card w-10 h-10 rounded-lg flex items-center justify-center">
                            {parts[2]}/{parts[1]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-main">{c.descricao}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">{c.data}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-text-muted hover:text-error hover:bg-error/10 h-8 w-8 p-0"
                          onClick={() => handleDeleteClosure(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
