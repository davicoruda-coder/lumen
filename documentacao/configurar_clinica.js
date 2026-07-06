/**
 * Clonagem de clínica — sistema (Supabase + Vercel + app).
 * Uso: npm run clonar-clinica
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ask, closePrompt } from './prompt_lib.js';
import {
  CLIENTES_ROOT,
  PLANO_PADRAO,
  PLANO_LABEL,
  COMPANY_NAME,
  REQUIRED_FIELDS_SISTEMA,
  slugify,
  ensureUrl,
  supabaseRef,
  validateFields,
  writeSystemPackage,
} from './clonar_clinica_lib.js';

export async function collectSystemAnswers(existing = {}) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   IMPLANTAÇÃO DO SISTEMA (APP + BANCO)               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Pacote gerado em clientes/<nome>/');
  console.log(`Plano: ${PLANO_LABEL} (automático).`);
  console.log('');

  console.log('── 1. Identidade da clínica ──');
  const clinicName = await ask('Nome comercial da clínica', {
    defaultValue: existing.clinicName || '',
  });
  const assistantName = await ask('Nome da assistente virtual (referência interna)', {
    defaultValue: existing.assistantName || '',
  });
  const clinicAddress = await ask('Endereço completo da clínica', {
    defaultValue: existing.clinicAddress || '',
  });

  const supportWhatsapp = (
    await ask(`Qual o WhatsApp de suporte técnico ${COMPANY_NAME}? (DDI+número, só dígitos)`)
  ).replace(/\D/g, '');

  console.log('\n── 2. Supabase (banco de dados + autenticação) ──');
  const supabaseUrl = ensureUrl(
    await ask('URL do projeto Supabase', {
      defaultValue: existing.supabaseUrl || 'https://SUA_REF.supabase.co',
    })
  );
  const projectRef =
    (await ask('Project ref (Supabase → Settings → General)', {
      defaultValue: existing.supabaseRef || supabaseRef(supabaseUrl) || 'sua_ref',
    })) || supabaseRef(supabaseUrl);
  const anonKey = await ask('Anon Key (Supabase → Settings → API → anon public)', {
    defaultValue: existing.anonKey || '',
  });
  const serviceKey = await ask('Service Role Key (Supabase → Settings → API → service_role)', {
    defaultValue: existing.serviceKey || '',
  });

  console.log('\n── 3. App web — painel da clínica (Vercel) ──');
  const vercelDomain = await ask(
    'Domínio do painel (ex: app.clinicaviva.com.br ou nome.vercel.app)',
    { defaultValue: existing.vercelDomain || '' }
  );

  console.log('\n── 4. Usuários do painel (Supabase Auth) ──');
  const superadminEmail = (
    await ask(
      `E-mail do Super Administrador (${COMPANY_NAME} — acesso total e limpeza de testes)`,
      { defaultValue: existing.superadminEmail || '' }
    )
  ).trim().toLowerCase();
  console.log(
    '  → Na implantação: crie este usuário no Supabase Auth (Create new user + Auto Confirm).'
  );
  console.log('  → Gestor/equipe da clínica: convide depois pelo app (PENDENCIAS item 8).');

  return {
    clinicName,
    assistantName,
    clinicAddress,
    plano: PLANO_PADRAO,
    supportWhatsapp,
    supabaseUrl,
    supabaseRef: projectRef,
    anonKey,
    serviceKey,
    vercelDomain,
    superadminEmail,
  };
}

async function confirmOverwrite(slug) {
  if (!fs.existsSync(path.join(CLIENTES_ROOT, slug))) return true;

  const overwrite = await ask(`\nPasta clientes/${slug} já existe. Sobrescrever? (s/N)`, {
    defaultValue: 'n',
  });
  return /^s/i.test(overwrite);
}

export async function main() {
  const systemData = await collectSystemAnswers();

  if (!validateFields(systemData, REQUIRED_FIELDS_SISTEMA)) {
    closePrompt();
    process.exit(1);
  }

  const slug = slugify(systemData.clinicName);
  const clientDir = path.join(CLIENTES_ROOT, slug);

  if (!(await confirmOverwrite(slug))) {
    console.log('\nCancelado.');
    closePrompt();
    return;
  }

  console.log('\n── Gerando pacote do sistema ──\n');
  const systemResult = writeSystemPackage(clientDir, systemData);

  if (!systemResult.ok) {
    console.error('\n❌ Falha ao gerar pacote do sistema.');
    closePrompt();
    process.exit(systemResult.status || 1);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ✅ Pacote do sistema gerado!');
  console.log('══════════════════════════════════════════════════════');
  console.log(`\n  📁 Pasta:\n     ${clientDir}`);
  console.log(`\n  📋 COMECE POR:\n     ${path.join(clientDir, 'PENDENCIAS.txt')}`);
  console.log(`\n  📖 Resumo:\n     ${path.join(clientDir, 'LEIA-ME.txt')}`);
  console.log('\n  ⚠️  Itens manuais estão em PENDENCIAS.txt — não pule!\n');
  closePrompt();
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    closePrompt();
    process.exit(1);
  });
}
