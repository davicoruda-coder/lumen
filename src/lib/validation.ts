import { z } from 'zod';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCpf(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = digitsOnly(value);
  if (!digits) return null;
  return digits;
}

export function normalizeWhatsapp(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = digitsOnly(value);
  if (!digits) return null;
  return digits;
}

const optionalCpf = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => normalizeCpf(v || null))
  .refine((v) => v === null || v.length === 11, { message: 'CPF deve ter 11 dígitos.' });

const whatsappSchema = z
  .string()
  .trim()
  .min(1, 'WhatsApp é obrigatório.')
  .transform((v) => digitsOnly(v))
  .refine((v) => v.length >= 8 && v.length <= 20, {
    message: 'WhatsApp inválido (8 a 20 dígitos).',
  });

export const leadCreateSchema = z.object({
  whatsapp_lead: whatsappSchema,
  nome_lead: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  cpf: optionalCpf,
  data_nascimento: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  procedimento_interesse: z.string().trim().max(200).optional().nullable(),
  motivo_contato: z.string().trim().max(500).optional().nullable(),
  status: z.string().optional(),
});

export const leadUpdateSchema = z.object({
  nome_lead: z.string().trim().min(1).max(120).optional(),
  whatsapp_lead: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined ? undefined : digitsOnly(v)))
    .refine((v) => v === undefined || (v.length >= 8 && v.length <= 20), {
      message: 'WhatsApp inválido.',
    }),
  cpf: optionalCpf.optional(),
  data_nascimento: z.string().trim().nullable().optional(),
  procedimento_interesse: z.string().trim().max(200).nullable().optional(),
  motivo_contato: z.string().trim().max(500).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
  valor_pago: z.number().nonnegative().nullable().optional(),
  status: z.string().optional(),
});

export const npsSchema = z.object({
  cliente_nome: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  nota: z.number().int().min(0).max(10),
  procedimento: z.string().trim().max(200).nullable().optional(),
  comentario: z.string().trim().max(2000).nullable().optional(),
  whatsapp_lead: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => normalizeWhatsapp(v || null))
    .refine((v) => v === null || (v.length >= 8 && v.length <= 20), {
      message: 'WhatsApp inválido.',
    }),
});

export const fichaClinicaSchema = z.object({
  nome_paciente: z.string().trim().min(1).max(120),
  whatsapp_paciente: z
    .string()
    .trim()
    .min(1)
    .transform((v) => digitsOnly(v))
    .refine((v) => v.length >= 8 && v.length <= 20, { message: 'WhatsApp inválido.' }),
  alergias: z.string().trim().max(2000).optional().nullable(),
  medicamentos_uso: z.string().trim().max(2000).optional().nullable(),
  historico_medico: z.string().trim().max(5000).optional().nullable(),
  observacoes_gerais: z.string().trim().max(5000).optional().nullable(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(' ');
}
