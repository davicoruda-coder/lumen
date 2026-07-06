# sistema-clinica02

Sistema de gestão para clínicas de estética e saúde — **painel web completo, sem n8n**.

Repositório derivado do [sistema-clinica01](https://github.com/davicoruda-coder/sistema-clinica01), focado em operação manual no painel (agenda, CRM, prontuário, financeiro). Automação WhatsApp/n8n ficou no repositório original.

## O que inclui

- Agenda multi-profissional
- CRM / Kanban de leads
- Dashboard (métricas, NPS, confirmações)
- Prontuário, financeiro, estoque (módulos)
- Clonagem white-label: `npm run clonar-clinica`

## O que **não** inclui (vs sistema-clinica01)

- Fluxos n8n / UAZAPI / Chatwoot
- Transbordo de IA
- Edge Functions de agendamento por IA
- Campanhas automáticas WhatsApp

Roadmap futuro: IA interna (OpenRouter) + Meta Business Agent + sync Google Calendar — ver [documentacao/VISAO_PRODUTO.md](documentacao/VISAO_PRODUTO.md).

## Início rápido

```bash
npm install
cp .env.example .env   # preencher Supabase
npm run dev
```

## Implantar nova clínica

```bash
npm run validar-clonagem
npm run clonar-clinica
```

Siga `clientes/<slug>/PENDENCIAS.txt`.

Documentação completa: [documentacao/CLONAGEM_CLINICA.md](documentacao/CLONAGEM_CLINICA.md).

## Stack

- React 19 + Vite + Tailwind 4
- Supabase (Auth, Postgres, Storage)

## Licença

Privado — DavicoSystems.
