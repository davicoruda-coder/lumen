/**
 * Valida o repositório antes de rodar npm run clonar-clinica.
 * Uso: npm run validar-clonagem
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MASTER_SCHEMA, PROJECT_ROOT } from './clonar_clinica_lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.log(`  ❌ ${msg}`);
  errors++;
}

function warn(msg) {
  console.log(`  ⚠️  ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

console.log('');
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   VALIDAÇÃO PRÉ-CLONAGEM — SISTEMA-CLINICA02         ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');

console.log('── 1. Scripts e schema ──');
for (const f of [
  path.join(__dirname, 'configurar_clinica.js'),
  path.join(__dirname, 'clonar_clinica_lib.js'),
  MASTER_SCHEMA,
]) {
  if (fs.existsSync(f)) ok(path.relative(PROJECT_ROOT, f));
  else fail(`Arquivo ausente: ${path.relative(PROJECT_ROOT, f)}`);
}

console.log('\n── 2. Modelo de plano ──');
const libSrc = fs.readFileSync(path.join(__dirname, 'clonar_clinica_lib.js'), 'utf8');
const cfgSrc = fs.readFileSync(path.join(__dirname, 'configurar_clinica.js'), 'utf8');

if (libSrc.includes("export const PLANO_PADRAO = 'GESTAO'")) {
  ok('PLANO_PADRAO = GESTAO');
} else {
  fail('PLANO_PADRAO não definido');
}

if (cfgSrc.includes('IMPLANTAÇÃO DO SISTEMA')) {
  ok('configurar_clinica.js — fluxo único');
} else {
  fail('configurar_clinica.js incompleto');
}

if (!libSrc.includes('writeN8nPackage')) {
  ok('Sem dependência de n8n na clonagem');
} else {
  fail('clonar_clinica_lib.js ainda referencia n8n');
}

const schema = fs.readFileSync(MASTER_SCHEMA, 'utf8');
if (schema.includes("DEFAULT 'GESTAO'")) {
  ok('MASTER_SCHEMA.sql — plano GESTAO');
} else {
  warn('Conferir default do campo plano no schema');
}

if (schema.includes('n8n_chat_histories')) {
  fail('MASTER_SCHEMA.sql ainda contém n8n_chat_histories');
} else {
  ok('Schema sem tabelas n8n');
}

console.log('\n── 3. App (src/) ──');
const srcDir = path.join(PROJECT_ROOT, 'src');
if (fs.existsSync(srcDir)) ok('Pasta src/');
else fail('Pasta src/ ausente');

console.log('');
if (errors === 0) {
  console.log(`✅ Validação OK (${warnings} aviso(s)). Pode rodar: npm run clonar-clinica`);
} else {
  console.log(`❌ ${errors} erro(s), ${warnings} aviso(s). Corrija antes de clonar.`);
  process.exit(1);
}
