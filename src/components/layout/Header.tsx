import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const routeTitles: Record<string, string> = {
  '/visao-geral': 'Visão Geral',
  '/crm': 'CRM',
  '/cadastro': 'Cadastro',
  '/agenda': 'Agenda',
  '/configuracoes': 'Configurações',
  '/financeiro': 'Financeiro',
  '/prontuario': 'Prontuário Eletrônico',
  '/templates-clinicos': 'Modelos Clínicos',
  '/estoque': 'Controle de Estoque',
};

export function Header() {
  const location = useLocation();
  useAuth();

  const currentTitle = routeTitles[location.pathname] || 'Visão Geral';

  return (
    <header className="hidden lg:flex h-16 bg-bg-base border-b border-border-card items-center justify-between px-8 sticky top-0 z-50 transition-colors">
      <h1 className="font-heading text-2xl text-text-main font-semibold">
        {currentTitle}
      </h1>
    </header>
  );
}
