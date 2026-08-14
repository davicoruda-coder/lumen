import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Trash2, UserPlus, Loader2, KeyRound, CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isPasswordStrong, PasswordStrength } from '../ui/PasswordStrength';
import type { Role, User } from '../../types';

export function TabUsuarios() {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<Role>('especialista');
  const [userCreated, setUserCreated] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  const canManageUsers = currentRole === 'superadmin' || currentRole === 'owner';

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
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erro ao atualizar cargo');
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
      const emailMap = new Map((emailsData || []).map((entry: { id: string; email: string | null }) => [entry.id, entry.email]));
      const nomeMap = new Map((emailsData || []).map((entry: { id: string; nome: string | null }) => [
        entry.id,
        entry.nome || ''
      ]));
      
      const formatted: User[] = (usersData || []).map((entry) => ({
        id: entry.id,
        role: entry.role as Role,
        created_at: entry.created_at,
        email: emailMap.get(entry.id) || 'Sem e-mail',
        nome: nomeMap.get(entry.id) || ''
      }));
      setUsers(formatted);
    } catch {
      // Falha ao carregar usuários — mantém a lista atual
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (temporaryPassword !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    if (!isPasswordStrong(temporaryPassword)) {
      alert('A senha temporária ainda não atende a todos os requisitos.');
      return;
    }

    try {
      setCreating(true);

      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          nome: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: temporaryPassword,
          role: newRole
        },
      });
      
      if (error) throw error;
      setUserCreated(true);
      await fetchUsers();

    } catch (error: unknown) {
      const functionError = error as { message?: string; context?: unknown };
      const context = functionError.context;
      let message = functionError.message || 'Erro ao adicionar usuário';

      if (context instanceof Response) {
        const body = await context.json().catch(() => null);
        message = body?.error || message;
      }

      alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = async () => {
    await navigator.clipboard.writeText(
      `Acesso ao Lumen\nSite: ${window.location.origin}\nE-mail: ${newEmail.trim().toLowerCase()}\nSenha temporária: ${temporaryPassword}`
    );
    setCredentialsCopied(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewName('');
    setNewEmail('');
    setTemporaryPassword('');
    setConfirmPassword('');
    setNewRole('especialista');
    setUserCreated(false);
    setCredentialsCopied(false);
  };

  const handleRemove = async (id: string, email: string) => {
    if (id === currentUser?.id) {
      alert('Você não pode remover seu próprio usuário logado.');
      return;
    }
    if (!confirm(`Tem certeza que deseja remover o usuário ${email}?`)) return;

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: id },
      });
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Usuário removido.');
    } catch (error: unknown) {
      const functionError = error as { message?: string; context?: unknown };
      const context = functionError.context;
      let message = functionError.message || 'Erro ao remover usuário.';

      if (context instanceof Response) {
        const body = await context.json().catch(() => null);
        message = body?.error || message;
      }

      alert(message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Usuários do Sistema</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Lista quem tem acesso, o e-mail e desde quando. Adicione como <strong>Gestor</strong> para
            liberar o teste com as funcionalidades; superadministradores e donos gerenciam a equipe.
            Use “Remover” para bloquear.
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="shrink-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar usuário
          </Button>
        )}
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
                       {u.nome ? (
                         <div>
                           <p className="font-medium text-text-main truncate">{u.nome}</p>
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
                        disabled={
                          !canManageUsers ||
                          u.id === currentUser?.id ||
                          (currentRole !== 'superadmin' && (u.role === 'owner' || u.role === 'superadmin'))
                        }
                      >
                        <option value="especialista">Especialista</option>
                        <option value="gestor">Gestor</option>
                        {(currentRole === 'superadmin' || u.role === 'owner') && (
                          <option value="owner">Dono da Clínica</option>
                        )}
                        <option value="admin">Administrador Técnico</option>
                        {(currentRole === 'superadmin' || u.role === 'superadmin') && (
                          <option value="superadmin">Super Administrador</option>
                        )}
                      </select>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-text-muted hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canManageUsers && u.id !== currentUser?.id && u.role !== 'superadmin' && (
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

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={userCreated ? "Usuário adicionado!" : "Adicionar novo usuário"}>
          {userCreated ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-text-main">Acesso criado com sucesso!</h3>
              <p className="text-text-muted text-sm max-w-sm mx-auto">
                Envie os dados abaixo à pessoa por um canal seguro. No primeiro acesso, peça para trocar a senha em <strong className="text-text-main">Configurações → Minha Conta</strong>.
              </p>
              <div className="rounded-[14px] border border-border-card/40 bg-bg-base p-4 text-left text-sm">
                <p><span className="text-text-muted">E-mail:</span> {newEmail.trim().toLowerCase()}</p>
                <p className="mt-1"><span className="text-text-muted">Senha temporária:</span> {temporaryPassword}</p>
              </div>
              <div className="pt-4">
                <Button type="button" variant="secondary" onClick={handleCopyCredentials} className="mr-3">
                  <Copy className="w-4 h-4 mr-2" />
                  {credentialsCopied ? 'Dados copiados' : 'Copiar dados'}
                </Button>
                <Button onClick={handleCloseModal}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-[14px] p-3 flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-muted">
                  A conta será criada imediatamente, sem enviar e-mail. Informe uma senha temporária e envie os dados de acesso à pessoa.
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
                <label className="block text-sm font-medium mb-1">Senha temporária</label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={temporaryPassword}
                  onChange={e => setTemporaryPassword(e.target.value)}
                  placeholder="Crie uma senha forte"
                />
                <PasswordStrength password={temporaryPassword} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar senha temporária</label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Perfil de Acesso</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="flex h-10 w-full rounded-[14px] border border-border-card/40 bg-bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="especialista">Especialista</option>
                  <option value="gestor">Gestor</option>
                  {currentRole === 'superadmin' && (
                    <option value="owner">Dono da Clínica</option>
                  )}
                  <option value="admin">Administrador Técnico</option>
                  {currentRole === 'superadmin' && (
                    <option value="superadmin">Super Administrador (TI)</option>
                  )}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={creating}
                  disabled={!newName || !newEmail || !isPasswordStrong(temporaryPassword) || temporaryPassword !== confirmPassword}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar usuário
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </CardContent>
    </Card>
  );
}
