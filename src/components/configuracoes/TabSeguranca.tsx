import React, { useState } from 'react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PasswordStrength, isPasswordStrong } from '../ui/PasswordStrength';

export function TabSeguranca() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Senha alterada com sucesso!' 
      });
      
      setPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm max-w-2xl">
        <h3 className="text-lg font-heading font-bold text-text-main mb-2">Alterar Senha</h3>
        <p className="text-sm text-text-muted mb-6">
          Escolha uma nova senha segura para proteger sua conta.
        </p>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="max-w-md space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Nova Senha</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
              />
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Confirmar Nova Senha</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                minLength={6}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl flex gap-3 text-sm border ${
                message.type === 'success' 
                  ? 'bg-success/10 border-success/20 text-success-dark' 
                  : 'bg-error/10 border-error/20 text-error'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p>{message.text}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              disabled={!isPasswordStrong(password)}
            >
              Salvar Nova Senha
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
