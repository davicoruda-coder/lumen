import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useClinic } from '../contexts/ClinicContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { clinicName } = useClinic();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/visao-geral');
    } catch (err: any) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] bg-primary flex-col justify-center items-center p-12 text-center shadow-2xl z-10">
        <h1 className="text-white font-heading text-5xl mb-4 font-semibold">
          {clinicName}
        </h1>
        <p className="text-primary-light font-heading text-xl opacity-90 tracking-wide">
          Gestão integrada para sua clínica
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10 lg:hidden">
            <h1 className="text-primary font-heading text-4xl mb-2 font-semibold">
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
        </div>
      </div>
    </div>
  );
}
