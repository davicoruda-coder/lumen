import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useClinic } from '../contexts/ClinicContext';

const SUPPORT_WHATSAPP =
  import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '5571985084522';
const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL?.trim() || '';

const demoWhatsAppHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  'Olá! Gostaria de solicitar acesso para testar o Lumen. Meu nome é '
)}`;

const demoEmailHref = SUPPORT_EMAIL
  ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Solicitar acesso para testar o Lumen')}&body=${encodeURIComponent(
      'Olá! Gostaria de solicitar acesso para testar o Lumen.\n\nNome:\nE-mail para o convite:\n'
    )}`
  : null;

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { clinicName, clinicLogo } = useClinic();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/visao-geral');
    } catch {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-primary flex-col justify-center items-center p-12 text-center shadow-2xl z-10">
        {clinicLogo ? (
          <img
            src={clinicLogo}
            alt={clinicName}
            className="h-24 w-24 rounded-full object-cover mb-6 border-4 border-white/20 bg-white/10"
          />
        ) : null}
        <h1 className="text-white font-heading text-5xl font-semibold">
          {clinicName}
        </h1>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10 lg:hidden">
            {clinicLogo ? (
              <img
                src={clinicLogo}
                alt={clinicName}
                className="h-16 w-16 rounded-full object-cover mx-auto mb-4 border border-primary/20"
              />
            ) : null}
            <h1 className="text-primary font-heading text-4xl font-semibold">
              {clinicName}
            </h1>
          </div>

          <h2 className="text-3xl font-heading font-bold text-text-main mb-8 text-center">
            Acesse sua conta
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">E-mail</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                icon={<Mail className="h-5 w-5" />}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-text-main">Senha</label>
                <button
                  type="button"
                  onClick={() => navigate('/recuperar-senha')}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
              />
            </div>

            {error && (
              <div className="text-error text-sm text-center bg-error/10 p-3 rounded-lg border border-error/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg shadow-xl"
              isLoading={loading}
            >
              Entrar na conta
            </Button>
          </form>

          <div className="mt-8 rounded-2xl border border-border-card/60 bg-bg-card px-5 py-4 text-center">
            <p className="text-sm font-medium text-text-main">
              Quer testar o sistema?
            </p>
            <p className="mt-2 mx-auto max-w-[16rem] text-xs text-text-muted leading-relaxed text-balance">
              Solicite acesso ao administrador.
              <br />
              O convite chega no seu e-mail.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={demoWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20ba59] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              {demoEmailHref && (
                <a
                  href={demoEmailHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-card bg-bg-base px-4 py-2.5 text-sm font-semibold text-text-main hover:border-primary/40 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  E-mail
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
