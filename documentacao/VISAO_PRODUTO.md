# Visão de produto — sistema-clinica02

## Posicionamento

Painel de gestão clínica **self-contained**: Supabase + Vercel. Sem servidor n8n, sem Hostinger para automação.

## Arquitetura alvo (roadmap — não implementado)

```
Gestor/Especialista → IA interna (OpenRouter) → Supabase
Paciente WhatsApp   → Meta Business Agent → Google Calendar
                              ↕ sync (a construir)
                         Supabase / App
```

- **OpenRouter:** só IA interna (equipe), não atendimento WhatsApp
- **Meta Agent:** FAQ + agendar/cancelar no Google Agenda
- **Sync Google ↔ Supabase:** obrigatório antes de prometer integração

## Fases

| Fase | Entrega | Status |
|------|---------|--------|
| 1 | Painel estável (este repo) | Em uso |
| 2 | IA interna no app | Planejado |
| 3 | Sync Google Calendar | Planejado |
| 4 | Meta Agent por clínica | Planejado |

## Relação com sistema-clinica01

- **01:** template completo com n8n (VivaBem, automação WhatsApp)
- **02:** produto enxuto, menor custo operacional, evolução nativa

## Comercial (referência)

- Setup ~R$ 2.000
- Mensal ~R$ 1.500
- Extra agenda +R$ 39/mês (4ª+)
