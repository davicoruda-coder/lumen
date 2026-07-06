import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { applyClinicBranding, DEFAULT_CLINIC_NAME } from '../lib/clinicBranding';

interface ClinicContextType {
  clinicName: string;
  clinicLogo: string | null;
  plano: 'CLINICO' | 'GESTAO' | 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM';
  refreshClinic: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicName, setClinicName] = useState<string>(DEFAULT_CLINIC_NAME);
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [plano, setPlano] = useState<'CLINICO' | 'GESTAO' | 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM'>('GESTAO');

  const refreshClinic = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_config')
        .select('nome, logo_url, plano')
        .limit(1);

      if (!error && data && data.length > 0) {
        const config = data[0];
        if (config.nome) setClinicName(config.nome);
        if (config.logo_url) setClinicLogo(config.logo_url);
        if (config.plano) setPlano(config.plano);
      }
    } catch {
      // Busca tolerante a falhas — mantém valores padrão
    }
  };

  useEffect(() => {
    refreshClinic();
  }, []);

  useEffect(() => {
    applyClinicBranding(clinicName);
  }, [clinicName]);

  return (
    <ClinicContext.Provider value={{ clinicName, clinicLogo, plano, refreshClinic }}>
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
