/**
 * Utilitários — clonagem de clínica (Supabase + Vercel + app).
 * Lumen — sem n8n / Chatwoot / Edge Functions de IA.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, '..');
export const CLIENTES_ROOT = path.join(PROJECT_ROOT, 'clientes');
export const MASTER_SCHEMA = path.join(__dirname, 'MASTER_SCHEMA.sql');
export const MANIFEST_FILENAME = 'dados-clinica.json';

export const PLANO_PADRAO = 'GESTAO';
export const PLANO_LABEL = 'Plano Integrado Premium';
export const COMPANY_NAME = 'DavicoSystems';
export const EXAMPLE_SUPPORT_WHATSAPP = '5571985084522';

export const REQUIRED_FIELDS_SISTEMA = [
  ['clinicName', 'Nome comercial da clínica'],
  ['assistantName', 'Nome da assistente virtual'],
  ['clinicAddress', 'Endereço completo da clínica'],
  ['supportWhatsapp', `WhatsApp de suporte técnico ${COMPANY_NAME}`],
  ['supabaseUrl', 'URL do Supabase'],
  ['anonKey', 'Anon Key do Supabase'],
  ['serviceKey', 'Service Role Key do Supabase'],
  ['superadminEmail', `E-mail do Super Administrador (${COMPANY_NAME})`],
];

export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'clinica';
}

export function ensureUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url.replace(/\/$/, '');
  return `https://${url.replace(/\/$/, '')}`;
}

export function supabaseRef(url) {
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return m ? m[1] : '';
}

export function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

export function validateFields(data, fields, { commandHint = 'npm run clonar-clinica' } = {}) {
  const missing = fields.filter(([key]) => !String(data[key] ?? '').trim());
  if (missing.length === 0) return true;

  console.log('\n❌ Campos obrigatórios não preenchidos:');
  missing.forEach(([, label]) => console.log(`   • ${label}`));
  console.log(`\nRode ${commandHint} novamente e preencha todos os itens.\n`);
  return false;
}

export function buildEnv(data) {
  return [
    `VITE_SUPABASE_URL=${data.supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${data.anonKey}`,
    `VITE_SUPPORT_WHATSAPP_NUMBER=${data.supportWhatsapp}`,
    '',
  ].join('\n');
}

export function buildVercelEnv(data) {
  return [
    '# Cole estas variáveis em Vercel → Settings → Environment Variables',
    '# Framework: Vite | Branch: Production (e Preview se quiser)',
    '',
    `VITE_SUPABASE_URL=${data.supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${data.anonKey}`,
    `VITE_SUPPORT_WHATSAPP_NUMBER=${data.supportWhatsapp}`,
    '',
    '# URL sugerida do app após deploy:',
    data.vercelDomain ? `https://${data.vercelDomain.replace(/^https?:\/\//, '')}` : '(configure o domínio na Vercel)',
    '',
  ].join('\n');
}

export function buildClinicConfigSql(data) {
  const nome = sqlEscape(data.clinicName);
  const plano = PLANO_PADRAO;
  const whatsapp = sqlEscape(data.supportWhatsapp);

  return [
    '-- PERSONALIZAÇÃO DA CLÍNICA — rode no SQL Editor do Supabase',
    '-- Execute DEPOIS de documentacao/MASTER_SCHEMA.sql',
    '',
    `UPDATE public.clinic_config`,
    `SET nome = '${nome}',`,
    `    plano = '${plano}',`,
    `    whatsapp_suporte = '${whatsapp}',`,
    '    updated_at = now()',
    'WHERE id = 1;',
    '',
  ].join('\n');
}

export function buildPromoverSuperadminSql(data) {
  const email = sqlEscape(String(data.superadminEmail || '').trim().toLowerCase());

  return [
    '-- SUPER ADMINISTRADOR — rode após criar usuário no Supabase Auth',
    '',
    'UPDATE public.users',
    "SET role = 'superadmin'",
    'WHERE id = (',
    '  SELECT id FROM auth.users',
    `  WHERE lower(email) = lower('${email}')`,
    ');',
    '',
  ].join('\n');
}

const EQUIPE_PENDENCIA_LINES = [
  '[ ] 8. (Depois do item 11 — app no ar) Convidar gestor/equipe pelo app:',
  '        Configurações → Equipe & Agendas → Convidar usuário',
  '        → escolher perfil (Owner, Gestor, Especialista, etc.)',
  '        Não convide pelo painel Supabase Auth.',
];

export function buildLeiaMe(data) {
  return [
    '═══════════════════════════════════════════════════════',
    '  PACOTE SISTEMA — APP + SUPABASE + VERCEL',
    '  (Lumen — sem n8n)',
    '═══════════════════════════════════════════════════════',
    '',
    `Clínica:        ${data.clinicName}`,
    `Assistente:     ${data.assistantName}`,
    `Plano:          ${PLANO_LABEL} (${PLANO_PADRAO})`,
    `Supabase:       ${data.supabaseUrl}`,
    `App (Vercel):   ${data.vercelDomain || '(definir na Vercel)'}`,
    `Superadmin:     ${data.superadminEmail}`,
    '',
    '── ARQUIVOS NESTA PASTA ──',
    '',
    '  dados-clinica.json',
    '  .env',
    '  vercel-env.txt',
    '  clinic_config_personalizar.sql',
    '  promover_superadmin.sql',
    '  PENDENCIAS.txt',
    '',
    '── ORDEM RECOMENDADA ──',
    '',
    '  1. Supabase: MASTER_SCHEMA.sql + clinic_config_personalizar.sql',
    '  2. Auth: criar superadmin + promover_superadmin.sql',
    '  3. Vercel: vercel-env.txt + deploy + URLs do Auth',
    '  4. Convidar equipe pelo app',
    '  5. Configurar agendas, logo e tema no painel',
    '',
    '── Documentação ──',
    '  documentacao/CLONAGEM_CLINICA.md',
    '  documentacao/VISAO_PRODUTO.md (roadmap IA interna + Meta)',
    '',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
  ].join('\n');
}

export function buildPendencias(data) {
  const ref = data.supabaseRef || 'SEU_PROJECT_REF';
  const appDomain = String(data.vercelDomain || 'sua-clinica.vercel.app').replace(/^https?:\/\//, '');

  return [
    '═══════════════════════════════════════════════════════',
    '  ⚠️  PENDÊNCIAS MANUAIS — NÃO ESQUEÇA',
    '═══════════════════════════════════════════════════════',
    '',
    'Marque cada item ao concluir:',
    '',
    '── A) SUPABASE ──',
    '',
    '[ ] 1. Criar projeto Supabase (região sa-east-1)',
    '[ ] 2. SQL Editor → rodar documentacao/MASTER_SCHEMA.sql',
    '[ ] 3. SQL Editor → rodar clinic_config_personalizar.sql (esta pasta)',
    '[ ] 4. Storage → confirmar buckets (avatars, clinic-assets, prontuarios…)',
    `[ ] 5. Auth → criar superadmin: ${data.superadminEmail}`,
    '        Create new user → Auto Confirm User: LIGADO',
    '[ ] 6. SQL Editor → promover_superadmin.sql',
    '[ ] 7. (Opcional) Rodar MIGRATION_n8n_legacy.sql se migrar banco antigo',
    ...EQUIPE_PENDENCIA_LINES,
    '',
    '── B) VERCEL ──',
    '',
    '[ ] 9. Importar repositório lumen na Vercel',
    '[ ] 10. Colar variáveis de vercel-env.txt',
    `[ ] 11. Deploy + Auth URLs + testar login`,
    `        Site URL: https://${appDomain}`,
    `        Redirect: https://${appDomain}/** e http://localhost:5173/**`,
    '[ ] 12. (Opcional) Domínio customizado',
    '',
    '── C) CONTEÚDO DA CLÍNICA ──',
    '',
    '[ ] 13. Configurações → Clínica: logo, tema, dados',
    '[ ] 14. Configurações → Equipe & Agendas: profissionais (máx. 3 ativas)',
    '[ ] 15. Testar agenda, CRM e dashboard',
    '',
    '── D) TESTES ──',
    '',
    '[ ] 16. Criar agendamento manual na Agenda',
    '[ ] 17. Mover lead no CRM',
    '[ ] 18. Login como especialista e ver agenda vinculada',
    '',
    `Project ref: ${ref}`,
    '',
  ].join('\n');
}

export function saveClientManifest(clientDir, data) {
  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    slug: slugify(data.clinicName),
    product: 'lumen',
    ...data,
  };
  fs.writeFileSync(
    path.join(clientDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

export function loadClientManifest(clientDir) {
  const manifestPath = path.join(clientDir, MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeCoreFiles(clientDir, data) {
  fs.writeFileSync(path.join(clientDir, '.env'), buildEnv(data), 'utf8');
  fs.writeFileSync(path.join(clientDir, 'vercel-env.txt'), buildVercelEnv(data), 'utf8');
  fs.writeFileSync(
    path.join(clientDir, 'clinic_config_personalizar.sql'),
    buildClinicConfigSql(data),
    'utf8'
  );
  fs.writeFileSync(
    path.join(clientDir, 'promover_superadmin.sql'),
    buildPromoverSuperadminSql(data),
    'utf8'
  );
  fs.writeFileSync(path.join(clientDir, 'LEIA-ME.txt'), buildLeiaMe(data), 'utf8');
  fs.writeFileSync(path.join(clientDir, 'PENDENCIAS.txt'), buildPendencias(data), 'utf8');
  saveClientManifest(clientDir, data);
}

/** Gera pacote completo em clientes/<slug>/ */
export function writeSystemPackage(clientDir, data) {
  fs.mkdirSync(clientDir, { recursive: true });
  writeCoreFiles(clientDir, data);
  return { ok: true, paths: { clientDir } };
}
