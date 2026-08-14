import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  applyClinicBranding,
  DEFAULT_CLINIC_NAME,
  resolveClinicDisplayLogo,
  resolveClinicDisplayName,
} from '../lib/clinicBranding';

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
        setClinicName(resolveClinicDisplayName(config.nome));
        setClinicLogo(resolveClinicDisplayLogo(config.nome, config.logo_url));
        if (config.plano) setPlano(config.plano);
      } else {
        setClinicName(DEFAULT_CLINIC_NAME);
        setClinicLogo(null);
      }
    } catch {
      // Busca tolerante a falhas — mantém valores padrão
    }
  };

  useEffect(() => {
    refreshClinic();
  }, []);

  useEffect(() => {
    applyClinicBranding(clinicName, clinicLogo);
  }, [clinicName, clinicLogo]);

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
