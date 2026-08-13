# Lumen

Painel white-label de gestão para clínicas de estética e saúde — **operação no app, sem n8n**.

Luz, clareza, a clínica inteira num só lugar (agenda, CRM, prontuário, financeiro).

Derivado do [sistema-clinica01](https://github.com/davicoruda-coder/sistema-clinica01). Automação WhatsApp/n8n ficou no repositório original.

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
