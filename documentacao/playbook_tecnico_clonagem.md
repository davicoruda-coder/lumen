# Playbook Técnico — sistema-clinica02

> Deploy white-label sem n8n. Ver também `CLONAGEM_CLINICA.md`.

```bash
npm run validar-clonagem
npm run clonar-clinica
```

## Checklist

- [ ] Criar projeto Supabase (sa-east-1)
- [ ] Rodar `MASTER_SCHEMA.sql` + `clinic_config_personalizar.sql`
- [ ] Auth: superadmin + `promover_superadmin.sql`
- [ ] Vercel: `vercel-env.txt` + URLs Auth
- [ ] Convidar equipe pelo app
- [ ] Agendas + testes

## Variáveis Vercel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPPORT_WHATSAPP_NUMBER`

## Clonar repositório

```bash
git clone https://github.com/davicoruda-coder/sistema-clinica02.git
cd sistema-clinica02
npm install
```

## Notas

- Sem Edge Functions neste repo
- Sem importação n8n
- Migração de banco antigo: `MIGRATION_n8n_legacy.sql`
