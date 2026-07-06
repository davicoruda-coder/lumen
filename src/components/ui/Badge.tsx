import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'agendado'
  | 'confirmado'
  | 'compareceu'
  | 'faltou'
  | 'cancelado'
  | 'follow_up'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'nao_respondeu_follow_up'
  | 'inicio_atendimento'
  | 'conversando'
  | 'cancelamento'
  | 'cancelou_agendamento'
  | 'abandonou_conversa'
  | 'admin'
  | 'user'
  | 'ativo'
  | 'desabilitado';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  agendado: "bg-primary/20 text-primary border-primary/30",
  confirmado: "bg-success/20 text-success-700 dark:text-success border-success/30",
  compareceu: "bg-success/20 text-success-700 dark:text-success border-success/30",
  faltou: "bg-warning/20 text-warning-700 dark:text-warning border-warning/30",
  cancelado: "bg-error/10 text-error border-error/20",
  cancelamento: "bg-error/10 text-error border-error/20",
  follow_up: "bg-primary/10 text-primary border-primary/20",
  follow_up_1: "bg-primary/10 text-primary border-primary/20",
  follow_up_2: "bg-primary/10 text-primary border-primary/20",
  follow_up_3: "bg-primary/10 text-primary border-primary/20",
  nao_respondeu_follow_up: "bg-neutral-200 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  inicio_atendimento: "bg-primary/10 text-primary border-primary/20",
  conversando: "bg-primary/15 text-primary border-primary/30",
  cancelou_agendamento: "bg-error/10 text-error border-error/20",
  abandonou_conversa: "bg-neutral-200 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
  admin: "bg-primary text-[color:var(--primary-foreground)] font-bold",
  user: "bg-bg-base text-text-muted border-border-card",
  ativo: "bg-success/20 text-success-700 dark:text-success border-success/30",
  desabilitado: "bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
};

const variantLabels: Record<BadgeVariant, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  compareceu: "Compareceu",
  faltou: "Faltou",
  cancelado: "Cancelado",
  cancelamento: "Cancelado",
  follow_up: "Follow Up",
  follow_up_1: "Follow Up 1",
  follow_up_2: "Follow Up 2",
  follow_up_3: "Follow Up 3",
  nao_respondeu_follow_up: "Não Respondeu",
  inicio_atendimento: "Início Atendimento",
  conversando: "Conversando",
  cancelou_agendamento: "Cancelou Agendamento",
  abandonou_conversa: "Abandonou Conversa",
  admin: "Admin",
  user: "Usuário",
  ativo: "Ativo",
  desabilitado: "Desabilitado"
};

export function Badge({ variant, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-[14px] text-[11px] font-bold uppercase tracking-wider border",
        variantStyles[variant] || "bg-gray-100 text-gray-600",
        className
      )}
      {...props}
    >
      {children || variantLabels[variant]}
    </span>
  );
}
