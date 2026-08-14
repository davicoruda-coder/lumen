export type Role = 'superadmin' | 'owner' | 'especialista' | 'admin' | 'user' | 'gestor';

export interface User {
  id: string;
  role: Role;
  created_at: string;
  // email e nome NÃO existem em public.users — são obtidos via view public.auth_users
  // (join por id) e mesclados ao montar a lista de usuários da equipe.
  email?: string;
  nome?: string;
}

export interface ClinicConfig {
  id: number;
  nome: string;
  cnpj?: string | null;
  logo_url: string | null;
  plano: 'CLINICO' | 'GESTAO' | 'ESSENCIAL' | 'PROFISSIONAL' | 'PREMIUM';
  tema?: string;
  tema_cor?: string;
  whatsapp_suporte?: string | null;
  updated_at?: string;
}

export interface ClinicHours {
  id: string;
  dia: 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';
  aberto: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
}
