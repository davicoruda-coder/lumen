import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { TabBloqueios } from '../components/configuracoes/TabBloqueios';

export function Bloqueios() {
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-4 flex items-center">
        <button 
          onClick={() => navigate('/agenda')}
          className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-medium bg-bg-card px-3 py-1.5 rounded-lg border border-border-card shadow-sm hover:border-primary/30"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para Agenda
        </button>
      </div>
      <TabBloqueios />
    </div>
  );
}
