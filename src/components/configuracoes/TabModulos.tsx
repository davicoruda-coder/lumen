import { useModulos } from '../../contexts/ModulosContext';
import type { ModulosConfig } from '../../contexts/ModulosContext';
import { Card, CardContent } from '../ui/Card';
import {
  DollarSign,
  ClipboardList,
  Package,
  Kanban,
  Calendar,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ModuloCard {
  key: keyof ModulosConfig;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const MODULOS: ModuloCard[] = [
  {
    key: 'modulo_agenda',
    label: 'Agenda',
    desc: 'Agendamento inteligente com IA, visualização semanal/diária e integração WhatsApp.',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    key: 'modulo_crm',
    label: 'CRM',
    desc: 'Pipeline Kanban para acompanhamento de leads, etapas de vendas e automações.',
    icon: Kanban,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    key: 'modulo_leads',
    label: 'Leads e Clientes',
    desc: 'Gestão completa de leads e clientes com filtros, exportação CSV/PDF e histórico.',
    icon: Users,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    key: 'modulo_financeiro',
    label: 'Financeiro',
    desc: 'Contas a pagar/receber, fluxo de caixa, comissionamento de profissionais e relatórios.',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    key: 'modulo_prontuario',
    label: 'Prontuário Eletrônico',
    desc: 'Ficha clínica, anamnese personalizada, evolução do paciente e galeria antes/depois.',
    icon: ClipboardList,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    key: 'modulo_estoque',
    label: 'Controle de Estoque',
    desc: 'Produtos, movimentações de entrada/saída, alertas de mínimo e baixa automática.',
    icon: Package,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    key: 'modulo_campanhas',
    label: 'Marketing & Campanhas',
    desc: 'Gestão de campanhas de aniversário, reativação de clientes e cupons de desconto.',
    icon: Sparkles,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
];

export function TabModulos() {
  const { modulos, loading, updateModulo } = useModulos();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ativos = Object.values(modulos).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading font-semibold text-text-main">Módulos do Sistema</h3>
          <p className="text-sm text-text-muted mt-1">
            Ative ou desative módulos para esta clínica. Módulos desativados ficam invisíveis para o cliente.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-primary-light/40 border border-primary/20 shrink-0">
          <span className="text-sm font-medium text-text-main">{ativos}</span>
          <span className="text-sm text-text-muted whitespace-nowrap">/ {MODULOS.length} ativos</span>
        </div>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULOS.map((mod) => {
          const Icon = mod.icon;
          const ativo = modulos[mod.key];

          return (
            <Card
              key={mod.key}
              className={`transition-all duration-300 ${
                ativo
                  ? 'border-primary/30 shadow-sm'
                  : 'border-border-card/40 opacity-60 grayscale-[30%]'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-[14px] ${ativo ? mod.bgColor : 'bg-bg-base'}`}>
                    <Icon className={`w-5 h-5 ${ativo ? mod.color : 'text-text-muted'}`} />
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => updateModulo(mod.key, !ativo)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      ativo ? 'bg-primary' : 'bg-gray-300'
                    }`}
                    title={ativo ? 'Desativar módulo' : 'Ativar módulo'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                        ativo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <h4 className="font-heading font-semibold text-text-main mb-1">{mod.label}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{mod.desc}</p>
                <div className="mt-3 pt-3 border-t border-border-card">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-[14px] ${
                      ativo
                        ? 'bg-gradient-to-r from-[var(--color-emerald-from)]/20 to-[var(--color-emerald-to)]/20 text-emerald-800 border border-[var(--color-emerald-from)]/30'
                        : 'bg-gray-100 text-text-muted border border-transparent'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                    {ativo ? 'Ativo' : 'Desativado'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 rounded-[14px] bg-primary/5 border border-primary/20 text-sm text-text-muted">
        <span className="text-primary text-base">⚙️</span>
        <div>
          <p className="font-medium text-text-main mb-1">Personalização do Workspace</p>
          <p>
            Ative ou desative os módulos do seu sistema para simplificar o menu lateral da sua equipe. 
            Ao ocultar um módulo, todos os dados cadastrados permanecem salvos em total segurança 
            e reaparecem instantaneamente caso você decida reativá-lo no futuro.
          </p>
        </div>
      </div>
    </div>
  );
}
