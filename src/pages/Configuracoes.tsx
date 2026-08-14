import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { TabGeral } from '../components/configuracoes/TabGeral';
import { TabUsuarios } from '../components/configuracoes/TabUsuarios';
import { TabAgendas } from '../components/configuracoes/TabAgendas';
import { TabModulos } from '../components/configuracoes/TabModulos';
import { TabPersonalizacao } from '../components/configuracoes/TabPersonalizacao';
import { TabSeguranca } from '../components/configuracoes/TabSeguranca';
import { TabPerfil } from '../components/configuracoes/TabPerfil';
import { TabSuporte } from '../components/configuracoes/TabSuporte';
import { TabLimpezaDados } from '../components/configuracoes/TabLimpezaDados';
import { TabBloqueios } from '../components/configuracoes/TabBloqueios';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { HScrollArea } from '../components/ui/HScrollArea';
import { User, Building2, Users, ToggleLeft, Palette, HelpCircle, CalendarOff } from 'lucide-react';

type Tab = 'minha-conta' | 'personalizacao' | 'clinica' | 'equipe-agendas' | 'bloqueios' | 'modulos' | 'suporte';

export function Configuracoes() {
  const { role, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabQuery = searchParams.get('tab') as Tab | null;

  const isAdmin = role === 'superadmin' || role === 'admin' || role === 'owner';
  const isGestor = role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'gestor';

  const [activeTab, setActiveTab] = useState<Tab>(tabQuery || 'minha-conta');

  useEffect(() => {
    if (tabQuery) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  useEffect(() => {
    if (tabQuery) return;

    if (role === 'owner') {
      setActiveTab('equipe-agendas');
    } else if (isAdmin) {
      setActiveTab('clinica');
    } else {
      setActiveTab('minha-conta');
    }
  }, [role, tabQuery, isAdmin]);

  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'minha-conta', label: 'Minha Conta', icon: User },
    { id: 'personalizacao', label: 'Personalização', icon: Palette },
    ...(isAdmin ? [{ id: 'clinica' as Tab, label: 'Clínica', icon: Building2 }] : []),
    ...(isGestor ? [{ id: 'equipe-agendas' as Tab, label: 'Equipe & Agendas', icon: Users }] : []),
    ...(isGestor ? [{ id: 'bloqueios' as Tab, label: 'Bloqueios', icon: CalendarOff }] : []),
    ...(isGestor ? [{ id: 'modulos' as Tab, label: 'Módulos', icon: ToggleLeft }] : []),
    ...(isGestor ? [{ id: 'suporte' as Tab, label: 'Suporte', icon: HelpCircle }] : []),
  ];

  useEffect(() => {
    if (loading || role === null) return;
    const isAllowed = tabs.some(t => t.id === activeTab);
    if (!isAllowed && tabs.length > 0) {
      setActiveTab('minha-conta');
      setSearchParams({ tab: 'minha-conta' });
    }
  }, [activeTab, role, loading, tabs, setSearchParams]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <HScrollArea className="w-full">
        <div className="flex border-b border-border-card min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main hover:border-border-card"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </HScrollArea>

      <div className="pt-2">
        {activeTab === 'minha-conta' && (
          <div className="space-y-10">
            <TabPerfil />
            <div className="border-t border-border-card/40" />
            <TabSeguranca />
          </div>
        )}

        {activeTab === 'personalizacao' && <TabPersonalizacao />}

        {activeTab === 'clinica' && (
          <div className="space-y-10">
            {isAdmin && <TabGeral />}
            {role === 'superadmin' && (
              <>
                <div className="border-t border-border-card/40" />
                <div>
                  <h2 className="text-base font-heading font-bold text-text-main mb-1">Zona de Perigo</h2>
                  <p className="text-xs text-text-muted mb-4">Ações destrutivas — exclusivo para superadmin. Use apenas para limpar dados de testes.</p>
                  <TabLimpezaDados />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'equipe-agendas' && (
          <div className="space-y-10">
            <TabUsuarios />
            <div className="border-t border-border-card/40" />
            <TabAgendas />
          </div>
        )}

        {activeTab === 'bloqueios' && <TabBloqueios />}

        {activeTab === 'modulos' && <TabModulos />}

        {activeTab === 'suporte' && <TabSuporte />}
      </div>
    </div>
  );
}
