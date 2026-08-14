import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Trash2, UserPlus, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../types';

export function TabUsuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<string>('especialista');
  const [inviteSent, setInviteSent] = useState(false);

  const roleLabels: Record<string, string> = {
    especialista: 'Especialista',
    gestor: 'Gestor',
    owner: 'Dono da Clínica',
    admin: 'Administrador Técnico',
    superadmin: 'Super Administrador'
  };

  const handleUpdateRole = async (userId: string, newRole: string, currentRole: string) => {
    const confirmed = confirm(
      `Deseja realmente alterar o perfil de "${roleLabels[currentRole] || currentRole}" para "${roleLabels[newRole] || newRole}"?\n\nIsso alterará as permissões de acesso deste usuário.`
    );
    
    if (!confirmed) {
      // Reverter o select para o valor anterior
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      const { data: updated, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .select();
      if (error) throw error;
      // RLS pode bloquear silenciosamente: data retorna [] sem erro
      if (!updated || updated.length === 0) {
        throw new Error('Sem permissão para alterar o perfil deste usuário. Verifique as políticas de segurança no Supabase.');
      }
      alert('Cargo atualizado com sucesso!');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar cargo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Buscar usuários e emails separadamente (a view auth_users não tem FK para join)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, role, created_at')
        .order('created_at', { ascending: false });
        
      if (usersError) throw usersError;

      const { data: emailsData } = await supabase
        .from('auth_users')
        .select('id, email, nome');
      
      // Criar mapa de emails e nomes por id
      const emailMap = new Map((emailsData || []).map((e: any) => [e.id, e.email]));
      const nomeMap = new Map((emailsData || []).map((e: any) => [
        e.id,
        e.nome || ''
      ]));
      
      const formatted = (usersData || []).map((u: any) => ({
        id: u.id,
        role: u.role,
        created_at: u.created_at,
        email: emailMap.get(u.id) || 'Sem e-mail',
        nome: nomeMap.get(u.id) || ''
      }));
      setUsers(formatted);
    } catch {
      // Falha ao carregar usuários — mantém a lista atual
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      
      // Gerar uma senha aleatória forte (o usuário nunca verá essa senha)
      const randomPassword = crypto.randomUUID() + '!Aa1';

      // 1. Tentar criar o usuário com senha aleatória
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: randomPassword,
        options: {
          data: {
            nome: newName
          }
        }
      });

      // Se o usuário já existe, apenas reenviar o e-mail de redefinição
      if (error && error.message?.includes('already registered')) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(newEmail, {
          redirectTo: `${window.location.origin}/redefinir-senha`
        });
        if (resetError) throw resetError;
        
        setInviteSent(true);
        return;
      }
      
      if (error) throw error;

      // 2. Garantir que o registro na tabela public.users seja criado com o cargo correto
      if (data.user) {
        await supabase.from('users').upsert({ id: data.user.id, role: newRole });
      }

      // 3. Enviar e-mail de redefinição de senha para que o convidado crie sua própria senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(newEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`
      });

      if (resetError) {
        alert('Usuário criado, mas houve um problema ao enviar o e-mail. Você pode reenviar o convite depois.');
      }

      setInviteSent(true);
      fetchUsers();
      
    } catch (err: any) {
      alert(err.message || 'Erro ao convidar usuário');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewRole('especialista');
    setInviteSent(false);
  };

  const handleRemove = async (id: string, email: string) => {
    if (id === currentUser?.id) {
      alert('Você não pode remover seu próprio usuário logado.');
      return;
    }
    if (!confirm(`Tem certeza que deseja remover o usuário ${email}?`)) return;

    try {
      // Removing user from users table. Trigger/Foreign key cascades or Admin API needed to remove from auth.users.
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Usuário removido.');
    } catch (err: any) {
      alert('Erro ao remover usuário.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Usuários do Sistema</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Lista quem tem acesso, o e-mail e desde quando. Use “Convidar” para liberar um teste
            e “Remover” para bloquear.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="shrink-0">
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar usuário
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-[14px] border border-border-card/40 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-primary text-white shadow-inner">
                <tr>
                   <th className="px-4 sm:px-6 py-3 font-medium">Usuário</th>
                   <th className="px-4 sm:px-6 py-3 font-medium">Perfil</th>
                   <th className="px-4 sm:px-6 py-3 font-medium hidden sm:table-cell">Acesso desde</th>
                   <th className="px-4 sm:px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card bg-bg-card">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-base/50 transition-colors">
                     <td className="px-4 sm:px-6 py-4 max-w-[160px] sm:max-w-none">
                       {(u as any).nome ? (
                         <div>
                           <p className="font-medium text-text-main truncate">{(u as any).nome}</p>
                           <p className="text-xs text-text-muted truncate">{u.email}</p>
                         </div>
                       ) : (
                         <p className="font-medium text-text-main truncate">{u.email}</p>
                       )}
                       <p className="mt-1 text-[11px] text-text-muted sm:hidden">
                         Acesso desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                       </p>
                     </td>
                    <td className="px-4 sm:px-6 py-4">
                      <select 
                        value={u.role} 
                        onChange={(e) => handleUpdateRole(u.id, e.target.value, u.role)}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer hover:text-primary transition-colors p-0 sm:p-2"
                        disabled={u.id === currentUser?.id || (currentUser?.role !== 'superadmin' && u.role === 'superadmin')}
                      >
                        <option value="especialista">Especialista</option>
                        <option value="gestor">Gestor</option>
                        <option value="owner">Dono da Clínica</option>
                        <option value="admin">Administrador Técnico</option>
                        {(currentUser?.role === 'superadmin' || u.role === 'superadmin') && (
                          <option value="superadmin">Super Administrador</option>
                        )}
                      </select>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-text-muted hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {u.id !== currentUser?.id && u.role !== 'superadmin' && (
                          <button
                            onClick={() => handleRemove(u.id, u.email)}
                            className="text-text-muted hover:text-error transition-colors p-1"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 sm:px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-[var(--color-warm-grey)]">
                        <UserPlus className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-base font-medium">Nenhum usuário encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={inviteSent ? "Convite Enviado!" : "Convidar novo usuário"}>
          {inviteSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-text-main">Convite enviado com sucesso!</h3>
              <p className="text-text-muted text-sm max-w-sm mx-auto">
                Um e-mail foi enviado para <strong className="text-text-main">{newEmail}</strong> com um link para criar a senha de acesso ao sistema.
              </p>
              <p className="text-text-muted text-xs">
                O link expira em 24 horas. Caso expire, você poderá reenviar o convite.
              </p>
              <div className="pt-4">
                <Button onClick={handleCloseModal}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-[14px] p-3 flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-muted">
                  O usuário receberá um <strong>e-mail automático</strong> com um link para criar sua própria senha. Você não precisa definir uma senha para ele.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome completo</label>
                <Input 
                  type="text" 
                  required 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="Ex: Ana Silva" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mail do usuário</label>
                <Input 
                  type="email" 
                  required 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  placeholder="email@exemplo.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Perfil de Acesso</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="flex h-10 w-full rounded-[14px] border border-border-card/40 bg-bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="especialista">Especialista</option>
                  <option value="gestor">Gestor</option>
                  <option value="owner">Dono da Clínica</option>
                  <option value="admin">Administrador Técnico</option>
                  {currentUser?.role === 'superadmin' && (
                    <option value="superadmin">Super Administrador (TI)</option>
                  )}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={creating} disabled={!newName || !newEmail}>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar convite
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </CardContent>
    </Card>
  );
}
