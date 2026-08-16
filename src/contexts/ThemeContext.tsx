import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'auto';

const getAutomaticTheme = (): Theme => {
  const brazilHour = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  const hour = Number.parseInt(brazilHour, 10);
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
};

export type ColorPreset = {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryForeground: string;
  sidebarBg: string;
  darkPrimary: string;
  darkPrimaryHover: string;
  darkPrimaryLight: string;
  darkPrimaryForeground: string;
  darkSidebarBg: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  { 
    id: 'rose-gold', name: 'Rose Gold', 
    primary: '#D4A3A3', primaryHover: '#C28E8E', primaryLight: '#F8F0F0', primaryForeground: '#FFFFFF', sidebarBg: '#FAEBEB',
    darkPrimary: '#C4AAAA', darkPrimaryHover: '#B89C9C', darkPrimaryLight: 'rgba(196, 170, 170, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#261A1A'
  },
  { 
    id: 'azul-safira', name: 'Azul Safira', 
    primary: '#2B4C7E', primaryHover: '#1C365D', primaryLight: '#EDF2F7', primaryForeground: '#FFFFFF', sidebarBg: '#E6EEF8',
    darkPrimary: '#4B74B5', darkPrimaryHover: '#3A5B8F', darkPrimaryLight: 'rgba(75, 116, 181, 0.1)', darkPrimaryForeground: '#FFFFFF', darkSidebarBg: '#162032'
  },
  { 
    id: 'verde-salvia', name: 'Verde Sálvia', 
    primary: '#7E9C88', primaryHover: '#5F7A68', primaryLight: '#F0F5F2', primaryForeground: '#FFFFFF', sidebarBg: '#EAF5ED',
    darkPrimary: '#8BA890', darkPrimaryHover: '#74947B', darkPrimaryLight: 'rgba(139, 168, 144, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#17241A'
  },
  { 
    id: 'roxo-ametista', name: 'Roxo Ametista', 
    primary: '#7B6B8D', primaryHover: '#6A5A7C', primaryLight: '#F4F0F7', primaryForeground: '#FFFFFF', sidebarBg: '#EFE8F5',
    darkPrimary: '#B0A3C2', darkPrimaryHover: '#988AAB', darkPrimaryLight: 'rgba(176, 163, 194, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#1D1726'
  },
  { 
    id: 'terracota', name: 'Terracota', 
    primary: '#C4856E', primaryHover: '#B0705A', primaryLight: '#FBF2EE', primaryForeground: '#FFFFFF', sidebarBg: '#F8EAE3',
    darkPrimary: '#D49A85', darkPrimaryHover: '#C08570', darkPrimaryLight: 'rgba(212, 154, 133, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#2A1D17'
  },
  { 
    id: 'dourado-champagne', name: 'Dourado Champagne', 
    primary: '#B8976A', primaryHover: '#A08155', primaryLight: '#FBF7F0', primaryForeground: '#FFFFFF', sidebarBg: '#F8F0E0',
    darkPrimary: '#D4BD73', darkPrimaryHover: '#B8A15B', darkPrimaryLight: 'rgba(212, 189, 115, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#2A2616'
  },
  { 
    id: 'grafite-premium', name: 'Grafite Premium', 
    primary: '#5A5A6E', primaryHover: '#484860', primaryLight: '#F0F0F3', primaryForeground: '#FFFFFF', sidebarBg: '#EAEAEF',
    darkPrimary: '#8888A0', darkPrimaryHover: '#72728A', darkPrimaryLight: 'rgba(136, 136, 160, 0.1)', darkPrimaryForeground: '#FFFFFF', darkSidebarBg: '#1A1A22'
  },
  { 
    id: 'azul-petroleo', name: 'Azul Petróleo', 
    primary: '#4A7B7D', primaryHover: '#3A6365', primaryLight: '#EDF5F5', primaryForeground: '#FFFFFF', sidebarBg: '#E4F0F1',
    darkPrimary: '#6BA0A3', darkPrimaryHover: '#558A8D', darkPrimaryLight: 'rgba(107, 160, 163, 0.1)', darkPrimaryForeground: '#1A1A1A', darkSidebarBg: '#142224'
  },
];

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  primaryColor: string;
  setPrimaryColor: (colorId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved;
    return 'auto';
  });
  const [automaticTheme, setAutomaticTheme] = useState<Theme>(getAutomaticTheme);
  const theme: Theme = themeMode === 'auto' ? automaticTheme : themeMode;

  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('primaryColor') || 'rose-gold';
  });

  useEffect(() => {
    if (themeMode !== 'auto') return;

    const updateAutomaticTheme = () => setAutomaticTheme(getAutomaticTheme());
    updateAutomaticTheme();
    const intervalId = window.setInterval(updateAutomaticTheme, 60_000);
    document.addEventListener('visibilitychange', updateAutomaticTheme);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', updateAutomaticTheme);
    };
  }, [themeMode]);

  // Fetch global theme from clinic_config (DB always wins over localStorage)
  useEffect(() => {
    const fetchGlobalTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('clinic_branding_public')
          .select('tema_cor')
          .limit(1)
          .single();
        if (!error && data?.tema_cor) {
          setPrimaryColor(data.tema_cor);
          localStorage.setItem('primaryColor', data.tema_cor);
        }
      } catch (err) {
        // Silently fail — will retry on auth state change
      }
    };

    // Try immediately (works if session is already restored from localStorage)
    fetchGlobalTheme();

    // Also retry when auth state changes (login, token refresh, etc.)
    // This guarantees the fetch works even if the initial attempt was too early
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        fetchGlobalTheme();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', themeMode);
    const root = window.document.documentElement;
    
    // Apply dark mode class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply color preset variables
    // Legacy ID migration: map old IDs to new ones
    const LEGACY_ID_MAP: Record<string, string> = {
      'lavanda': 'roxo-ametista',
      'champagne': 'dourado-champagne',
    };
    const resolvedColorId = LEGACY_ID_MAP[primaryColor] || primaryColor;
    const preset = COLOR_PRESETS.find(p => p.id === resolvedColorId) || COLOR_PRESETS[0];
    
    if (theme === 'dark') {
      root.style.setProperty('--primary', preset.darkPrimary);
      root.style.setProperty('--primary-hover', preset.darkPrimaryHover);
      root.style.setProperty('--primary-light', preset.darkPrimaryLight);
      root.style.setProperty('--primary-foreground', preset.darkPrimaryForeground);
      root.style.setProperty('--bg-sidebar', preset.darkSidebarBg);
    } else {
      root.style.setProperty('--primary', preset.primary);
      root.style.setProperty('--primary-hover', preset.primaryHover);
      root.style.setProperty('--primary-light', preset.primaryLight);
      root.style.setProperty('--primary-foreground', preset.primaryForeground);
      root.style.setProperty('--bg-sidebar', preset.sidebarBg);
    }
  }, [theme, themeMode, primaryColor]);

  const toggleTheme = () => {
    setThemeModeState(theme === 'light' ? 'dark' : 'light');
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const handleSetPrimaryColor = async (colorId: string) => {
    localStorage.setItem('primaryColor', colorId);
    setPrimaryColor(colorId);
    try {
      await supabase.from('clinic_config').update({ tema_cor: colorId }).eq('id', 1);
    } catch {
      // Falha ao persistir o tema global — cor já aplicada localmente
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme, primaryColor, setPrimaryColor: handleSetPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
