import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ModulosConfig {
  modulo_financeiro: boolean;
  modulo_prontuario: boolean;
  modulo_estoque: boolean;
  modulo_crm: boolean;
  modulo_agenda: boolean;
  modulo_leads: boolean;
  modulo_campanhas: boolean;
}

const DEFAULT_MODULOS: ModulosConfig = {
  modulo_financeiro: false,
  modulo_prontuario: false,
  modulo_estoque: false,
  modulo_crm: true,
  modulo_agenda: true,
  modulo_leads: true,
  modulo_campanhas: false,
};

interface ModulosContextType {
  modulos: ModulosConfig;
  loading: boolean;
  refreshModulos: () => Promise<void>;
  updateModulo: (key: keyof ModulosConfig, value: boolean) => Promise<void>;
}

const ModulosContext = createContext<ModulosContextType | undefined>(undefined);

export function ModulosProvider({ children }: { children: React.ReactNode }) {
  const [modulos, setModulos] = useState<ModulosConfig>(DEFAULT_MODULOS);
  const [loading, setLoading] = useState(true);

  const refreshModulos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('modulos_clinica')
        .select('*')
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        setModulos({
          modulo_financeiro: row.modulo_financeiro ?? false,
          modulo_prontuario: row.modulo_prontuario ?? false,
          modulo_estoque: row.modulo_estoque ?? false,
          modulo_crm: row.modulo_crm ?? true,
          modulo_agenda: row.modulo_agenda ?? true,
          modulo_leads: row.modulo_leads ?? true,
          modulo_campanhas: row.modulo_campanhas ?? false,
        });
      }
      // Se não existe a tabela ou a linha, usa os defaults (base: CRM+Agenda+Leads)
    } catch {
      // Sem tabela/linha de módulos: mantém os defaults
    } finally {
      setLoading(false);
    }
  }, []);

  const updateModulo = useCallback(async (key: keyof ModulosConfig, value: boolean) => {
    try {
      // Tenta atualizar — se não existe, faz upsert
      const { data: existing } = await supabase
        .from('modulos_clinica')
        .select('id')
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('modulos_clinica')
          .update({ [key]: value, atualizado_em: new Date().toISOString() })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('modulos_clinica')
          .insert({ [key]: value });
      }

      setModulos(prev => ({ ...prev, [key]: value }));
    } catch {
      // Falha ao atualizar módulo — ignorada silenciosamente
    }
  }, []);

  useEffect(() => {
    refreshModulos();
  }, [refreshModulos]);

  return (
    <ModulosContext.Provider value={{ modulos, loading, refreshModulos, updateModulo }}>
      {children}
    </ModulosContext.Provider>
  );
}

export const useModulos = () => {
  const context = useContext(ModulosContext);
  if (context === undefined) {
    throw new Error('useModulos must be used within a ModulosProvider');
  }
  return context;
};
