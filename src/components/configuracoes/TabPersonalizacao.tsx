import React from 'react';
import { useTheme, COLOR_PRESETS } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Check, Moon, Sun, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TabPersonalizacao() {
  const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();
  const { role } = useAuth();
  
  const canChangeColor = role === 'superadmin' || role === 'owner' || role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Light/Dark Mode */}
      <section className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-heading font-bold text-text-main mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-primary" />
          Aparência
        </h3>
        <p className="text-sm text-text-muted mb-6">
          Escolha entre o modo claro ou escuro para a interface do sistema.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
              theme === 'light' 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border-card bg-bg-base text-text-muted hover:border-text-muted"
            )}
          >
            <Sun className="w-8 h-8" />
            <span className="font-semibold">Claro</span>
          </button>

          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={cn(
              "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all",
              theme === 'dark' 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border-card bg-bg-base text-text-muted hover:border-text-muted"
            )}
          >
            <Moon className="w-8 h-8" />
            <span className="font-semibold">Escuro</span>
          </button>
        </div>
      </section>

      {/* Primary Color Selection - Only for admins/owners */}
      {canChangeColor && (
        <section className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-heading font-bold text-text-main mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Cor Principal do Sistema
          </h3>
          <p className="text-sm text-text-muted mb-6">
            Selecione a cor de destaque que será usada em botões, menus e gráficos para combinar com a identidade da sua clínica.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {COLOR_PRESETS.map((preset) => {
              const isActive = primaryColor === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setPrimaryColor(preset.id)}
                  className={cn(
                    "group flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300",
                    isActive 
                      ? "border-primary bg-bg-base shadow-md scale-[1.02]" 
                      : "border-transparent bg-bg-base hover:border-border-card hover:bg-bg-sidebar hover:scale-[1.02]"
                  )}
                >
                  <div 
                    className="w-12 h-12 rounded-full shadow-inner flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: theme === 'dark' ? preset.darkPrimary : preset.primary }}
                  >
                    {isActive && <Check className="w-6 h-6 text-white absolute z-10" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-text-main"
                  )}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
