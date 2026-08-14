import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Kanban, 
  Users, 
  Calendar, 
  Settings,
  DollarSign,
  ClipboardList,
  Package,
  Sun,
  Moon,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useModulos } from '../../contexts/ModulosContext';
import { Avatar } from '../ui/Avatar';

export function BottomNav() {
  const { role, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { modulos } = useModulos();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hasClinicalAccess =
    role === 'superadmin' ||
    role === 'owner' ||
    role === 'admin' ||
    role === 'gestor' ||
    role === 'especialista';

  // Close drawer on route change
  React.useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  const mainNavItems = [
    ...(role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor' 
      ? [{ to: '/visao-geral', label: 'Visão Geral', icon: LayoutDashboard }] 
      : []),
    ...(role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor'
      ? [
          ...(modulos.modulo_crm ? [{ to: '/crm', label: 'CRM', icon: Kanban }] : []),
          ...(modulos.modulo_leads ? [{ to: '/cadastro', label: 'Cadastro', icon: Users }] : []),
        ]
      : []),
    { to: '/agenda', label: 'Agenda', icon: Calendar },
  ];

  const moreNavItems = [
    ...(modulos.modulo_prontuario && hasClinicalAccess
      ? [{ to: '/prontuario', label: 'Prontuário', icon: ClipboardList }]
      : []),
    ...(modulos.modulo_prontuario && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/templates-clinicos', label: 'Modelos Clínicos', icon: FileText }]
      : []),
    ...(modulos.modulo_financeiro && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/financeiro', label: 'Financeiro', icon: DollarSign }] : []),
    ...(modulos.modulo_estoque && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/estoque', label: 'Estoque', icon: Package }] : []),
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  // Check if any "more" item is active
  const isMoreActive = moreNavItems.some(item => location.pathname === item.to);

  const navContent = (
    <>
      {/* Overlay do Menu Mais */}
      <div 
        className={`lg:hidden fixed inset-0 bg-black/40 z-[99999998] transition-opacity duration-300 ${isMoreOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMoreOpen(false)}
      />

      {/* Menu Mais (Drawer) */}
      <div 
        className={`lg:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] left-4 right-4 bg-bg-card border border-border-card/40 rounded-[14px] z-[99999998] shadow-2xl transition-all duration-300 transform origin-bottom ${isMoreOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-card/40">
          <Link 
            to="/configuracoes?tab=minha-conta"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -m-2 rounded-lg transition-colors group"
          >
            <div className="relative">
              <Avatar 
                name={user?.user_metadata?.nome || user?.email || '?'} 
                src={user?.user_metadata?.avatar_url}
                size="sm" 
              />
              <div className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col truncate pr-2">
              <span className="text-[14px] font-bold text-text-main truncate group-hover:text-primary transition-colors">
                {user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'}
              </span>
              <span className="text-[11px] text-text-muted truncate">
                Acessar meu perfil
              </span>
            </div>
          </Link>
          <button onClick={() => setIsMoreOpen(false)} className="p-2 -mr-2 text-text-muted hover:text-text-main bg-bg-base rounded-full flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {moreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 p-3 rounded-[14px] transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--color-rose-gold)]/20 to-[var(--color-primary)]/20 text-primary font-bold border border-[var(--color-rose-gold)]/30'
                    : 'text-text-muted hover:bg-bg-base hover:text-text-main'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          
        </div>
      </div>

      {/* Barra Inferior */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-[100vw] bg-bg-card border-t border-border-card/40 z-[99999999] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center px-1 py-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-2 rounded-[14px] transition-all duration-300 ${
                    isActive
                      ? 'text-primary scale-110 font-bold'
                      : 'text-text-muted hover:text-text-main'
                  }`
                }
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">{item.label}</span>
              </NavLink>
            );
          })}
          
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-2 rounded-[14px] transition-all duration-300 ${
              isMoreOpen || isMoreActive
                ? 'text-primary scale-105'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Menu className="h-6 w-6" />
            <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );

  return createPortal(navContent, document.body);
}

