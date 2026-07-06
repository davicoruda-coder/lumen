import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Loader2, Copy, Check, Calendar, Plus, X, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Agenda {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  usuario_id: string | null;
  especialidades?: string | null;
}

const CORES_AGENDA = [
  '#D4AF37', '#E8927C', '#7CB9E8', '#6BCB77', '#A66CFF',
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#C084FC', '#F472B6'
];

export function TabAgendas() {
  const { role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin' || role === 'owner' || isSuperAdmin;
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [inactiveAgendas, setInactiveAgendas] = useState<Agenda[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgendaNome, setNewAgendaNome] = useState('');
  const [newAgendaCor, setNewAgendaCor] = useState(CORES_AGENDA[0]);
  const [newAgendaEspecialidades, setNewAgendaEspecialidades] = useState('');
  const [creating, setCreating] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agendasRes, usersRes, emailsRes, inactiveRes] = await Promise.all([
        supabase.from('agendas').select('*').eq('ativo', true).order('nome', { ascending: true }),
        supabase.from('users').select('id, role'),
        supabase.from('auth_users').select('id, email'),
        isAdmin ? supabase.from('agendas').select('*').eq('ativo', false).order('nome', { ascending: true }) : Promise.resolve({ data: [] })
      ]);
        
      if (agendasRes.error) throw agendasRes.error;
      setAgendas(agendasRes.data || []);
      
      const emailMap = new Map((emailsRes.data || []).map((e: any) => [e.id, e.email]));
      const formattedUsers = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        email: emailMap.get(u.id) || 'Sem e-mail'
      }));
      setUsers(formattedUsers);
      
      if (isAdmin && inactiveRes.data) {
        setInactiveAgendas(inactiveRes.data);
      }
    } catch {
      // Falha ao carregar dados — mantém o estado atual
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAssignUser = async (agendaId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('agendas')
        .update({ usuario_id: userId === "" ? null : userId })
        .eq('id', agendaId);

      if (error) throw error;
      
      setAgendas(prev => prev.map(a => 
        a.id === agendaId ? { ...a, usuario_id: userId === "" ? null : userId } : a
      ));
    } catch (err: any) {
      alert('Erro ao vincular usuário');
    }
  };

  const handleUpdateEspecialidades = async (agendaId: string, especialidades: string) => {
    try {
      const val = especialidades.trim() === "" ? null : especialidades;
      const { error } = await supabase
        .from('agendas')
        .update({ especialidades: val })
        .eq('id', agendaId);

      if (error) throw error;
      
      setAgendas(prev => prev.map(a => 
        a.id === agendaId ? { ...a, especialidades: val } : a
      ));
    } catch (err: any) {
      alert('Erro ao atualizar especialidades');
    }
  };

  const handleDeactivateAgenda = async (agendaId: string, nome: string) => {
    if (!confirm(`Desativar a agenda "${nome}"?\n\nA IA deixará de direcionar pacientes para essa profissional automaticamente. Os horários também serão zerados.`)) return;
    try {
      await supabase.from('agendas').update({ ativo: false }).eq('id', agendaId);
      await supabase.from('agenda_hours').update({ aberto: false }).eq('agenda_id', agendaId);
      alert(`✅ Agenda "${nome}" desativada!\n\nA IA já parou de direcionar pacientes para essa profissional automaticamente.`);
      fetchData();
    } catch (err) {
      alert('Erro ao desativar agenda');
    }
  };

  const handleReactivateAgenda = async (agendaId: string, nome: string) => {
    if (agendas.length >= 3) {
      setShowLimitWarning(true);
      return;
    }
    if (!confirm(`Reativar a agenda "${nome}"?`)) return;
    try {
      await supabase.from('agendas').update({ ativo: true }).eq('id', agendaId);
      alert(`✅ Agenda "${nome}" reativada!\n\nA IA já voltou a incluir essa profissional nos agendamentos automaticamente.`);
      fetchData();
    } catch (err) {
      alert('Erro ao reativar agenda');
    }
  };

  const handleCreateAgenda = async () => {
    if (agendas.length >= 3) {
      setShowLimitWarning(true);
      return;
    }
    if (!newAgendaNome.trim()) {
      alert('Digite o nome da profissional.');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('agendas').insert({
        nome: newAgendaNome.trim(),
        cor: newAgendaCor,
        ativo: true,
        especialidades: newAgendaEspecialidades.trim() || null
      });
      if (error) throw error;
      
      alert(`✅ Agenda "${newAgendaNome.trim()}" criada com sucesso!\n\nA IA já começará a incluir essa profissional nos agendamentos.`);
      setNewAgendaNome('');
      setNewAgendaCor(CORES_AGENDA[0]);
      setNewAgendaEspecialidades('');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert('Erro ao criar agenda');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border-card/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-[14px]">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Agendas e especialistas</CardTitle>
            <p className="text-xs text-text-muted mt-1">
              {isAdmin
                ? 'Gerencie profissionais, especialidades e vincule especialistas. A IA se adapta automaticamente.'
                : 'Vincule cada agenda ao especialista responsável.'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (agendas.length >= 3) {
                setShowLimitWarning(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="gap-2 h-10"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Agenda</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {/* Aviso de Limite de Agendas Excedido */}
        {showLimitWarning && (
          <div className="mb-6 p-6 rounded-[14px] border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 animate-in fade-in relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-[14px] shrink-0 border border-amber-500/20">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-text-main text-base flex items-center gap-2">
                    🌟 Expansão de Profissionais
                  </h3>
                  <p className="text-sm text-text-muted mt-2 max-w-2xl leading-relaxed">
                    Você atingiu o limite de <strong>3 agendas de especialistas ativas</strong> inclusas no seu plano base. 
                    Deseja adicionar mais profissionais ao seu sistema para expandir a sua clínica?
                  </p>
                  <p className="text-xs text-text-muted mt-1.5 font-medium">
                    Fale com o suporte para habilitar agendas adicionais sob demanda de forma rápida e segura!
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <a
                      href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '5571985084522'}?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20adi%C3%A7%C3%A3o%20de%20uma%20nova%20agenda%20no%20meu%20sistema%20de%20est%C3%A9tica.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md hover:scale-[1.02]"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      Falar com o Suporte no WhatsApp
                    </a>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setShowLimitWarning(false)}
                      className="rounded-[12px] h-[42px]"
                    >
                      Depois
                    </Button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowLimitWarning(false)} 
                className="text-text-muted hover:text-text-main transition-colors p-1 hover:bg-bg-base rounded-full shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal de Criar Nova Agenda */}
        {showCreateModal && (
          <div className="mb-6 p-5 rounded-[14px] border-2 border-primary/30 bg-primary/5 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-text-main text-sm">Nova Profissional</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-main transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-text-muted px-1">Nome da Profissional *</label>
                <input
                  type="text"
                  value={newAgendaNome}
                  onChange={(e) => setNewAgendaNome(e.target.value)}
                  className="text-sm bg-bg-base border border-border-card/40 rounded-[14px] px-3 py-2 outline-none focus:border-primary transition-all"
                  placeholder="Ex: Dra. Maria Silva"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-text-muted px-1">Especialidades (Opcional)</label>
                <input
                  type="text"
                  value={newAgendaEspecialidades}
                  onChange={(e) => setNewAgendaEspecialidades(e.target.value)}
                  className="text-sm bg-bg-base border border-border-card/40 rounded-[14px] px-3 py-2 outline-none focus:border-primary transition-all"
                  placeholder="Ex: Botox, Peeling Facial"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] uppercase font-bold text-text-muted px-1">Cor da Agenda</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES_AGENDA.map(cor => (
                    <button
                      key={cor}
                      onClick={() => setNewAgendaCor(cor)}
                      className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                      style={{ 
                        backgroundColor: cor, 
                        borderColor: newAgendaCor === cor ? 'var(--color-text-main)' : 'transparent',
                        transform: newAgendaCor === cor ? 'scale(1.15)' : undefined
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateAgenda} disabled={creating} className="gap-2">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar Agenda
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4">
              {agendas.map((agenda) => (
                <div 
                  key={agenda.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[14px] border border-border-card/40 bg-bg-base/30 hover:bg-bg-base/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: agenda.cor }}
                    >
                      {agenda.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-text-main truncate">{agenda.nome}</h4>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] font-mono bg-bg-card px-2 py-0.5 rounded-[14px] border border-border-card/40 text-text-muted break-all">
                            {agenda.id}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                    <div className="flex flex-col gap-1 flex-1 sm:min-w-[200px]">
                      <label className="text-[10px] uppercase font-bold text-text-muted px-1">especialista Vinculado</label>
                      <select
                        value={agenda.usuario_id || ""}
                        onChange={(e) => handleAssignUser(agenda.id, e.target.value)}
                        className="text-sm bg-bg-base border border-border-card/40 rounded-[14px] px-3 py-2 outline-none focus:border-primary transition-all w-full"
                      >
                        <option value="">Nenhum (Visível para todos)</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.email}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 flex-1 sm:min-w-[200px]">
                      <label className="text-[10px] uppercase font-bold text-text-muted px-1" title="Se vazio, a IA vai assumir que a pessoa faz tudo">
                        Especialidades (Opcional)
                      </label>
                      <input
                        type="text"
                        defaultValue={agenda.especialidades || ""}
                        onBlur={(e) => handleUpdateEspecialidades(agenda.id, e.target.value)}
                        className="text-sm bg-bg-base border border-border-card/40 rounded-[14px] px-3 py-2 outline-none focus:border-primary transition-all w-full placeholder:text-text-muted/30"
                        placeholder="Ex: Botox, Peeling Facial"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="ativo" className="hidden sm:inline-flex">Ativa</Badge>
                      {isAdmin && (
                        <>
                          {isSuperAdmin && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => handleCopyId(agenda.id)}
                              className="gap-2 h-10 flex-1 sm:flex-none justify-center"
                            >
                              {copiedId === agenda.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-success" />
                                  <span className="text-xs">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-xs">Copiar ID</span>
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeactivateAgenda(agenda.id, agenda.nome)}
                            className="h-10 px-3"
                            title="Desativar Agenda"
                          >
                            Desativar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {agendas.length === 0 && (
                 <div className="py-12 text-center text-text-muted bg-bg-base/20 rounded-[14px] border border-dashed border-border-card/40">
                   Nenhuma agenda encontrada. Clique em "Nova Agenda" para criar a primeira.
                 </div>
              )}
            </div>

          {isAdmin && inactiveAgendas.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border-card border-dashed">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Agendas Desativadas</h3>
              <div className="grid gap-4">
                {inactiveAgendas.map((agenda) => (
                  <div key={agenda.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[14px] border border-border-card/40 bg-bg-base/20 opacity-70">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm grayscale" style={{ backgroundColor: agenda.cor }}>
                        {agenda.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-text-main line-through">{agenda.nome}</h4>
                        {isSuperAdmin && (
                          <code className="text-[10px] font-mono text-text-muted mt-1 block">{agenda.id}</code>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleReactivateAgenda(agenda.id, agenda.nome)} 
                      className="h-10 px-4"
                    >
                      Reativar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
