import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Envia o e-mail de redefinição. Por segurança, não revelamos se o e-mail
      // existe ou não na base (evita enumeração de contas) — a mensagem de
      // sucesso é sempre exibida quando a requisição é aceita pelo Supabase.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Instruções enviadas! Verifique sua caixa de entrada e spam.' 
      });
    } catch {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao processar sua solicitação.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-6">
      <div className="w-full max-w-md">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para o login
        </button>

        <div className="bg-bg-card border border-border-card rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold text-text-main mb-2">Recuperar Senha</h1>
            <p className="text-text-muted text-sm">
              Digite seu e-mail abaixo para receber as instruções de redefinição.
            </p>
          </div>

          <form onSubmit={handleResetRequest} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">E-mail cadastrado</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                icon={<Mail className="h-5 w-5" />}
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
              className="w-full h-11"
              isLoading={loading}
            >
              Enviar link de recuperação
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
