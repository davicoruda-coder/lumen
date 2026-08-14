# Playbook Técnico — Lumen

> Deploy white-label sem n8n. Ver também `CLONAGEM_CLINICA.md`.

```bash
npm run validar-clonagem
npm run clonar-clinica
```

## Checklist

- [ ] Criar projeto Supabase (sa-east-1)
- [ ] Rodar `MASTER_SCHEMA.sql` + `clinic_config_personalizar.sql`
- [ ] Auth: superadmin + `promover_superadmin.sql`
- [ ] Publicar a Edge Function `admin-create-user`
- [ ] Vercel: `vercel-env.txt` + URLs Auth
- [ ] Adicionar equipe pelo app com senha temporária
- [ ] Agendas + testes

## Variáveis Vercel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPPORT_WHATSAPP_NUMBER`

## Clonar repositório

```bash
git clone https://github.com/davicoruda-coder/lumen.git
cd lumen
npm install
```

## Notas

- A Edge Function `admin-create-user` usa a service role somente no servidor,
  valida o cargo de quem fez a solicitação e cria a conta sem enviar e-mail.
- Para publicar em cada clínica:

```bash
supabase login
supabase functions deploy admin-create-user --project-ref SUA_REF
```

- Sem importação n8n
- Migração de banco antigo: `MIGRATION_n8n_legacy.sql`
