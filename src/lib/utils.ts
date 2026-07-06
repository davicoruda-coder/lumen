import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Role } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCPF(cpf: string) {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** Gestores veem CPF completo; especialistas só o necessário para atendimento (LGPD). */
export function canViewFullCPF(role: Role | null | undefined): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'owner' || role === 'gestor';
}

export const CPF_MASKED = '***.***.***-**';

export function displayCPF(cpf: string | null | undefined, role: Role | null | undefined): string {
  if (!cpf) return '-';
  return canViewFullCPF(role) ? formatCPF(cpf) : CPF_MASKED;
}

export function formatBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return '-';
  return new Date(birthDate + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function calculateAge(birthDate: string) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
