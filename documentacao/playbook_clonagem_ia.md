# Playbook de Clonagem com IA — Lumen

> Guia para assistentes de IA guiarem o deploy de uma nova clínica. **Uma fase só** — sem n8n.

## Comandos

```bash
npm run validar-clonagem
npm run clonar-clinica -- <slug>
```

## Fluxo

1. Preencher `documentacao/ficha_pre_clonagem.txt` com o cliente
2. Rodar `clonar-clinica` — gera `clientes/<slug>/` com SQL, env Vercel e checklist
3. Supabase: criar projeto, rodar `MASTER_SCHEMA.sql` + `clinic_config_personalizar.sql`
4. Auth: superadmin + `promover_superadmin.sql`
5. Vercel: variáveis de `vercel-env.txt`, deploy, URLs de redirect no Supabase Auth
6. Login, convites, agendas, smoke test (agenda + CRM)

## Variáveis Vercel

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/public |
| `VITE_SUPPORT_WHATSAPP_NUMBER` | WhatsApp de suporte (opcional) |

## O que NÃO existe neste repo

- Pasta `n8n-fluxos/`
- Edge Functions Supabase
- Tokens de API / Chatwoot / UAZAPI
- Fase 2 de clonagem

## Migração de banco antigo

Se o Supabase foi criado com schema do `sistema-clinica01`, rodar opcionalmente:

`documentacao/MIGRATION_n8n_legacy.sql`

## Estrutura gerada

```
clientes/<slug>/
├── clinic_config_personalizar.sql
├── promover_superadmin.sql
├── vercel-env.txt
├── PENDENCIAS.txt
└── LEIA-ME.txt
```

## Checklist final

- [ ] Login superadmin OK
- [ ] Branding (logo, cores) aplicado
- [ ] Agendas criadas e vinculadas a especialistas
- [ ] Agendamento de teste criado e visível
- [ ] CRM/Kanban acessível

## Referências

- `CLONAGEM_CLINICA.md` — guia humano
- `playbook_tecnico_clonagem.md` — checklist técnico
- `VISAO_PRODUTO.md` — roadmap (IA interna, Meta, Google Calendar)
