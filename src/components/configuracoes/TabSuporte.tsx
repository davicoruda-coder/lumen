import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import {
  MessageCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border-card/45 last:border-0 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left font-semibold text-sm text-text-main hover:text-primary transition-colors gap-4"
      >
        <span>{question}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>
      {isOpen && (
        <p className="text-xs text-text-muted mt-2 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {answer}
        </p>
      )}
    </div>
  );
}

export function TabSuporte() {
  const systemVersion = import.meta.env.VITE_APP_VERSION || '2.0.0';

  const faqs = [
    {
      question: 'Como adicionar novas profissionais/agendas ao sistema?',
      answer:
        "Por padrão, o plano contempla até 3 agendas ativas. Para incluir mais profissionais, fale com o suporte administrativo e solicite a liberação de agendas extras.",
    },
    {
      question: 'Como funciona a ativação e desativação de módulos?',
      answer:
        "Na aba Módulos você liga ou desliga Financeiro, Prontuário, Estoque, CRM e Cadastro. O item some do menu na hora; os dados ficam salvos e voltam quando o módulo é reativado.",
    },
    {
      question: 'O sistema possui backup automático?',
      answer:
        'Sim. Os dados da clínica ficam no Supabase, com backups automáticos da nuvem. Em caso de dúvida sobre restauração, fale com o suporte.',
    },
    {
      question: 'Como vincular especialistas às agendas?',
      answer:
        "Em Equipe & Agendas, cadastre a equipe e vincule cada agenda a um responsável. Para deixar a agenda visível a todos, use a opção 'Nenhum (Visível para todos)'.",
    },
    {
      question: 'Onde gerencio feriados e bloqueios de agenda?',
      answer:
        'Em Configurações → Bloqueios, ou pelo botão Gerenciar Bloqueios na Agenda. Ali você marca feriados e datas indisponíveis.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h3 className="text-lg font-heading font-semibold text-text-main">Central de Ajuda & Suporte</h3>
        <p className="text-sm text-text-muted mt-1">
          Precisa de auxílio técnico ou comercial? Nossa central de atendimento está pronta para ajudar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-primary-light/10 relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-primary/10 text-primary rounded-[16px] border border-primary/20 shrink-0">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80">Canal exclusivo</span>
                  <h4 className="font-heading font-bold text-text-main text-base">Falar com o suporte</h4>
                  <p className="text-xs text-text-muted leading-relaxed mt-2 max-w-xl">
                    Dúvidas sobre o sistema, problemas técnicos ou pedidos de novos recursos: inicie o atendimento pelo WhatsApp.
                  </p>
                  <div className="pt-4 flex flex-wrap items-center gap-4">
                    <a
                      href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '5571985084522'}?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20suporte%20para%20o%20Lumen.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm transition-all"
                    >
                      <MessageCircle className="w-4.5 h-4.5 fill-white text-white" />
                      Iniciar suporte no WhatsApp
                    </a>
                    <span className="text-[11px] text-text-muted font-medium">
                      Tempo médio de resposta: rápido
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border-card/40">
            <CardContent className="p-6">
              <h4 className="font-heading font-bold text-text-main text-sm mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" /> Perguntas frequentes
              </h4>
              <div className="divide-y divide-border-card/40">
                {faqs.map((faq) => (
                  <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border-card/40 bg-bg-base/30">
            <CardContent className="p-5 space-y-4">
              <h4 className="font-heading font-bold text-text-main text-xs uppercase tracking-wider">Status do sistema</h4>

              <div className="flex items-center justify-between py-2 border-b border-border-card/30">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span>Versão</span>
                </div>
                <span className="text-xs font-mono font-semibold bg-bg-card px-2 py-0.5 rounded-[8px] border border-border-card/40 text-text-main">
                  v{systemVersion}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-card/30">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Ambiente</span>
                </div>
                <span className="text-xs font-semibold text-success">Operacional</span>
              </div>

              <div className="text-[11px] text-text-muted leading-relaxed pt-2">
                Lumen é o painel de gestão da sua clínica. Backups e atualizações de segurança ocorrem na nuvem sem interromper o uso.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
