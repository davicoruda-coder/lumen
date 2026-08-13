import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useClinic } from '../../contexts/ClinicContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useModulos } from '../../contexts/ModulosContext';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  Kanban, 
  Users, 
  Calendar, 
  Settings,
  LogOut,
  Sun,
  Moon,
  DollarSign,
  ClipboardList,
  Package,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { clinicName, clinicLogo } = useClinic();
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { modulos } = useModulos();

  const navItems = [
    // Visão Geral: Only for superadmin and owner
    ...(role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor'
      ? [{ to: '/visao-geral', label: 'Visão Geral', icon: LayoutDashboard }] 
      : []),
    
    ...(role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor'
      ? [
          ...(modulos.modulo_crm ? [{ to: '/crm', label: 'CRM', icon: Kanban }] : []),
          ...(modulos.modulo_leads ? [{ to: '/cadastro', label: 'Cadastro', icon: Users }] : []),
        ]
      : []),
    
    // Agenda: For everyone
    { to: '/agenda', label: 'Agenda', icon: Calendar },
 
    // Módulos condicionais (Feature Flags)
    // Prontuário: gestores e especialistas (módulo ativo)
    ...(modulos.modulo_prontuario
      ? [{ to: '/prontuario', label: 'Prontuário', icon: ClipboardList }]
      : []),
    
    // Modelos Clínicos: Disponível para todos (superadmin, owner, admin)
    ...(modulos.modulo_prontuario && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/templates-clinicos', label: 'Modelos Clínicos', icon: FileText }]
      : []),
    
    // Financeiro e Estoque: Disponível para todos (superadmin, owner, admin)
    ...(modulos.modulo_financeiro && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/financeiro', label: 'Financeiro', icon: DollarSign }]
      : []),
    ...(modulos.modulo_estoque && (role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor')
      ? [{ to: '/estoque', label: 'Estoque', icon: Package }]
      : []),

    // Configurações: For everyone (especialistas see limited tabs)
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={cn(
      "hidden lg:flex fixed left-0 top-0 h-screen bg-bg-sidebar border-r border-border-card/40 flex-col z-40 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[64px]" : "w-[240px]"
    )}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-bg-card border border-border-card/40 rounded-full p-1 shadow-md hover:text-primary transition-all z-50 group"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Clinic Header */}
      <div className={cn(
        "p-6 flex flex-col items-center justify-center border-b border-border-card/40 transition-all duration-300",
        isCollapsed ? "p-2 h-[120px]" : "p-8 min-h-[180px]"
      )}>
        {clinicLogo ? (
          <img 
            src={clinicLogo} 
            alt={clinicName} 
            className={cn(
              "object-contain transition-all duration-300",
              isCollapsed ? "max-h-10 w-10" : "max-h-[100px] w-auto mb-4"
            )} 
          />
        ) : (
          <div className={cn(
            "rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-lg border-4 border-white/10 transition-all duration-300",
            isCollapsed ? "h-10 w-10 text-xl mb-0" : "h-24 w-24 text-4xl mb-4"
          )}>
            {clinicName ? clinicName.charAt(0).toUpperCase() : 'C'}
          </div>
        )}
        {!isCollapsed && (
          <h2 className="font-heading text-xl font-bold text-text-main text-center tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
            {clinicName}
          </h2>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="group relative">
                <NavLink
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center transition-all duration-300 text-[15px] font-medium relative overflow-hidden",
                      isCollapsed ? "justify-center p-3" : "gap-4 px-4 py-3",
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-rose-gold)]/20 to-transparent text-primary shadow-sm border-l-[3px] border-primary rounded-r-[14px] rounded-l-none -ml-[3px] font-bold'
                        : 'text-text-muted hover:bg-bg-base hover:text-text-main rounded-[14px]'
                    )
                  }
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300", !isCollapsed && "group-hover:scale-110")} />
                  {!isCollapsed && <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-border-card/40 bg-bg-sidebar mt-auto flex flex-col gap-3 transition-all duration-300",
        isCollapsed ? "items-center" : ""
      )}>
        <Link 
          to="/configuracoes?tab=minha-conta"
          className={cn(
            "flex items-center gap-3 w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -m-2 rounded-lg transition-colors group", 
            isCollapsed && "justify-center"
          )}
          title="Acessar Meu Perfil"
        >
          <div className="relative">
            <Avatar 
              name={user?.user_metadata?.nome || user?.email || '?'} 
              src={user?.user_metadata?.avatar_url}
              size={isCollapsed ? "xs" : "sm"} 
            />
            <div className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 pr-2">
              <span className="text-[14px] font-bold text-text-main truncate group-hover:text-primary transition-colors">
                {user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'}
              </span>
              <span className="text-[11px] text-text-muted truncate">
                Acessar meu perfil
              </span>
            </div>
          )}
        </Link>
        
        <div className={cn("flex flex-col gap-4 mt-2 w-full", isCollapsed && "items-center")}>
          <button
            onClick={signOut}
            className={cn(
              "flex items-center gap-3 text-[15px] text-text-muted hover:text-error transition-colors group relative",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>}
            {isCollapsed && (
              <div className="absolute left-[50px] top-1/2 -translate-y-1/2 px-3 py-2 bg-error text-white text-xs font-bold rounded-[8px] opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[60] shadow-xl translate-x-[-10px] group-hover:translate-x-0">
                Sair
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-error" />
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
