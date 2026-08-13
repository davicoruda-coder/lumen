# Clonagem de clínica — Lumen

Fluxo **único**: app + Supabase + Vercel. Sem fase 2 n8n.

## Comando

```bash
npm run validar-clonagem
npm run clonar-clinica
```

## Ordem de implantação

1. Criar projeto Supabase (sa-east-1)
2. Rodar `documentacao/MASTER_SCHEMA.sql`
3. Rodar `clientes/<slug>/clinic_config_personalizar.sql`
4. Criar superadmin no Auth + `promover_superadmin.sql`
5. Deploy Vercel com `vercel-env.txt`
6. Configurar URLs no Supabase Auth
7. Convidar equipe pelo app
8. Criar agendas e testar

## Migrar banco do sistema-clinica01

Se o banco foi criado com schema antigo (n8n), rode opcionalmente:

`documentacao/MIGRATION_n8n_legacy.sql`

Depois recrie `get_or_create_lead` a partir do MASTER_SCHEMA.sql seção 5.6.

## Clínicas já implantadas (v4.1)

Se o owner não consegue atribuir o papel **Gestor**, rode no SQL Editor:

`documentacao/PATCH_rls_gestor_v41.sql`

## Diferença do sistema-clinica01

| Item | 01 | 02 |
|------|----|----|
| n8n | Sim | Não |
| Chatwoot/transbordo | Sim | Não |
| Edge Functions IA | Sim | Não |
| Clonagem | 2 fases | 1 fase |

## Documentação relacionada

- [VISAO_PRODUTO.md](VISAO_PRODUTO.md) — roadmap IA interna + Meta
- [playbook_tecnico_clonagem.md](playbook_tecnico_clonagem.md)
- [MANUAL_MESTRE_SISTEMA.md](MANUAL_MESTRE_SISTEMA.md)
