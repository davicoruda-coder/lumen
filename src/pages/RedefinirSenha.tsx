import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordStrength, isPasswordStrong } from '../components/ui/PasswordStrength';

export function RedefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  // O Supabase lida com o token automaticamente se estivermos na URL de retorno
  
  const handleReset = async (e: React.FormEvent) => {
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
        text: 'Senha redefinida com sucesso! Você será redirecionado para o login.' 
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao redefinir senha. O link pode ter expirado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
      <div className="w-full max-w-md">
        <div className="bg-bg-card border border-border-card rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold text-text-main mb-2">Redefinir Senha</h1>
            <p className="text-text-muted text-sm">
              Crie uma nova senha para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
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
              className="w-full h-11 shadow-lg"
              isLoading={loading}
              disabled={!isPasswordStrong(password)}
            >
              Confirmar Nova Senha
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
