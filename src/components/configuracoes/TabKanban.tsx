import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../ui/Badge';

const KANBAN_STATUSES: { label: string; value: BadgeVariant }[] = [
  { label: 'Início Atendimento', value: 'inicio_atendimento' },
  { label: 'Conversando', value: 'conversando' },
  { label: 'Agendado', value: 'agendado' },
  { label: 'Consulta Cancelada', value: 'cancelamento' },
  { label: 'Compareceu', value: 'compareceu' },
  { label: 'Follow Up 1', value: 'follow_up_1' },
  { label: 'Follow Up 2', value: 'follow_up_2' },
  { label: 'Follow Up 3', value: 'follow_up_3' },
  { label: 'Não Respondeu', value: 'nao_respondeu_follow_up' },
  { label: 'Cancelou Agendamento', value: 'cancelou_agendamento' },
  { label: 'Abandonou Conversa', value: 'abandonou_conversa' },
];

export function TabKanban() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referência do CRM</CardTitle>
        <p className="text-sm text-text-muted mt-1">
          Valores de status usados no Kanban e na tabela leads_estetica.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-[14px] border border-border-card/40 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[500px]">
            <thead className="bg-primary text-white shadow-inner">
              <tr>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Coluna no Kanban</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Valor no Banco de Dados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-card bg-bg-card">
              {KANBAN_STATUSES.map((status) => (
                <tr key={status.value} className="hover:bg-bg-base/50 transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant={status.value}>{status.label}</Badge>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <code className="bg-bg-base px-2 py-1 rounded text-primary font-mono text-xs">
                      {status.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(status.value)}
                      className="text-text-muted hover:text-primary transition-colors p-1 rounded-md hover:bg-primary-light relative group"
                      title="Copiar valor"
                    >
                      {copied === status.value ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied === status.value && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-main text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          Copiado!
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-primary-light rounded-[14px] border border-primary/20">
          <p className="text-sm text-text-main">
            Para atualizar o status de um lead, use o campo{' '}
            <code className="bg-bg-card px-1.5 py-0.5 rounded text-primary font-mono text-xs">status</code>{' '}
            da tabela{' '}
            <code className="bg-bg-card px-1.5 py-0.5 rounded text-primary font-mono text-xs">leads_estetica</code>{' '}
            com um dos valores acima.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
