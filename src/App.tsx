import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClinicProvider } from './contexts/ClinicContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModulosProvider, useModulos } from './contexts/ModulosContext';
import type { ModulosConfig } from './contexts/ModulosContext';
import { Layout } from './components/layout/Layout';

// Lazy loading: cada página só carrega quando o usuário acessa
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const CRM = React.lazy(() => import('./pages/CRM').then(m => ({ default: m.CRM })));
const LeadsClientes = React.lazy(() => import('./pages/LeadsClientes').then(m => ({ default: m.LeadsClientes })));
const Agenda = React.lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));
const Configuracoes = React.lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })));
const Bloqueios = React.lazy(() => import('./pages/Bloqueios').then(m => ({ default: m.Bloqueios })));
const RecuperarSenha = React.lazy(() => import('./pages/RecuperarSenha').then(m => ({ default: m.RecuperarSenha })));
const RedefinirSenha = React.lazy(() => import('./pages/RedefinirSenha').then(m => ({ default: m.RedefinirSenha })));
const Financeiro = React.lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })));
const Prontuario = React.lazy(() => import('./pages/Prontuario').then(m => ({ default: m.Prontuario })));
const Estoque = React.lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const TemplatesClinicos = React.lazy(() => import('./pages/TemplatesClinicos').then(m => ({ default: m.TemplatesClinicos })));

/** Mini loading spinner for lazy-loaded pages */
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Catch-all error UI to prevent white screens */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-error/20 max-w-md w-full">
            <h1 className="text-2xl font-bold text-error mb-4">Erro de Carregamento</h1>
            <p className="text-text-muted mb-6">
              Ocorreu um problema ao exibir esta página. Clique em "Tentar Novamente". Caso o erro persista, entre em contato com o suporte técnico informando o código abaixo.
            </p>
            <div className="bg-error/5 p-4 rounded-lg overflow-auto max-h-48 text-xs font-mono text-error border border-error/10">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full mt-6 bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Blocks unauthenticated users from accessing protected pages */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading || (user && role === null)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-base gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted font-medium animate-pulse">Carregando sistema...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Blocks non-admin users from accessing admin-only pages (Dashboard, Configs) */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  
  if (loading || role === null) return null;
  
  const hasAccess = role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor';
  
  if (!hasAccess) {
    return <Navigate to="/agenda" replace />;
  }
  return <>{children}</>;
}

/** Bloqueia rota se o feature flag estiver desligado. */
function ModuleRoute({
  flag,
  children,
}: {
  flag: keyof ModulosConfig;
  children: React.ReactNode;
}) {
  const { modulos, loading } = useModulos();

  if (loading) return <PageLoader />;

  if (!modulos[flag]) {
    return <Navigate to="/agenda" replace />;
  }

  return <>{children}</>;
}

/** Prontuário: todos autenticados com módulo ativo (especialistas incluídos). */
function ProntuarioRoute({ children }: { children: React.ReactNode }) {
  return <ModuleRoute flag="modulo_prontuario">{children}</ModuleRoute>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ClinicProvider>
          <AuthProvider>
              <ModulosProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Route */}
                  <Route path="/login" element={<Login />} />
  
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/visao-geral" replace />} />
                    <Route 
                      path="visao-geral" 
                      element={
                        <AdminRoute>
                          <Dashboard />
                        </AdminRoute>
                      } 
                    />
                    <Route 
                      path="crm" 
                      element={
                        <AdminRoute>
                          <ModuleRoute flag="modulo_crm">
                            <CRM />
                          </ModuleRoute>
                        </AdminRoute>
                      } 
                    />
                    <Route 
                      path="cadastro" 
                      element={
                        <AdminRoute>
                          <ModuleRoute flag="modulo_leads">
                            <LeadsClientes />
                          </ModuleRoute>
                        </AdminRoute>
                      } 
                    />
                    <Route path="agenda" element={<Agenda />} />
                    <Route 
                      path="bloqueio-agenda" 
                      element={
                        <AdminRoute>
                          <Bloqueios />
                        </AdminRoute>
                      } 
                    />
                    <Route path="configuracoes" element={<Configuracoes />} />
                    <Route path="financeiro" element={<AdminRoute><ModuleRoute flag="modulo_financeiro"><Financeiro /></ModuleRoute></AdminRoute>} />
                    <Route path="prontuario" element={<ProntuarioRoute><Prontuario /></ProntuarioRoute>} />
                    <Route path="templates-clinicos" element={<AdminRoute><ProntuarioRoute><TemplatesClinicos /></ProntuarioRoute></AdminRoute>} />
                    <Route path="estoque" element={<AdminRoute><ModuleRoute flag="modulo_estoque"><Estoque /></ModuleRoute></AdminRoute>} />
                  </Route>
  
                  {/* Public Password Recovery Routes */}
                  <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
  
                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/visao-geral" replace />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
              </ModulosProvider>
          </AuthProvider>
        </ClinicProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
