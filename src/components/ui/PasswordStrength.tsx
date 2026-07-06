import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Um número', test: (p) => /[0-9]/.test(p) },
  { label: 'Um caractere especial (!@#$%&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

/** Returns true if the password meets all strength requirements */
export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const passedCount = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const total = PASSWORD_RULES.length;
  const percentage = (passedCount / total) * 100;

  const barColor =
    percentage <= 20
      ? 'bg-error'
      : percentage <= 60
      ? 'bg-warning'
      : percentage < 100
      ? 'bg-yellow-400'
      : 'bg-success';

  const strengthLabel =
    percentage <= 20
      ? 'Muito fraca'
      : percentage <= 60
      ? 'Fraca'
      : percentage < 100
      ? 'Quase lá'
      : 'Forte ✓';

  return (
    <div className="mt-3 space-y-3">
      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-text-muted">Força da senha</span>
          <span className={cn(
            "text-xs font-bold",
            percentage === 100 ? "text-success" : percentage > 60 ? "text-yellow-500" : "text-error"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-border-card">
          <div
            className={cn("h-full rounded-full transition-all duration-500 ease-out", barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Lista de critérios */}
      <div className="grid grid-cols-1 gap-1.5">
        {PASSWORD_RULES.map((rule, i) => {
          const passed = rule.test(password);
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors duration-200",
                passed ? "text-success" : "text-text-muted"
              )}
            >
              {passed ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
              )}
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
