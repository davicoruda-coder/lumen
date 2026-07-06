import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  MessageCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  LifeBuoy, 
  ShieldCheck, 
  Cpu 
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
  const systemVersion = "1.8.1";

  const faqs = [
    {
      question: "Como adicionar novas profissionais/agendas ao sistema?",
      answer: "Por padrão, seu plano contempla até 3 agendas de especialistas ativas. Caso precise expandir sua equipe e incluir mais profissionais no ecossistema inteligente, entre em contato diretamente com o nosso suporte administrativo para liberar agendas extras sob demanda."
    },
    {
      question: "Como funciona a ativação e desativação de módulos?",
      answer: "Você pode personalizar o sistema inteiro na aba 'Módulos'. Ao desativar um módulo (como Estoque ou Financeiro), ele ficará oculto instantaneamente no menu lateral da sua equipe. Seus dados cadastrados continuam salvos com segurança e reaparecem imediatamente caso decida reativá-lo no futuro."
    },
    {
      question: "O sistema possui backup automático?",
      answer: "Sim! Todos os dados de clientes, prontuários, agendamentos e transações financeiras passam por rotinas diárias de backup criptografados em nuvem. Suas informações estão 100% protegidas e em conformidade com as regras de segurança."
    },
    {
      question: "Como vincular meus especialistas às agendas específicas?",
      answer: "Na aba 'Equipe & Agendas', você pode cadastrar sua equipe e vincular cada profissional/agenda a um especialista responsável no menu de seleção. Se preferir deixar a agenda visível para todos, basta selecionar a opção 'Nenhum (Visível para todos)'."
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h3 className="text-lg font-heading font-semibold text-text-main">Central de Ajuda & Suporte</h3>
        <p className="text-sm text-text-muted mt-1">
          Precisa de auxílio técnico ou comercial? Nossa central de atendimento está sempre pronta para ajudar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Direct WhatsApp Support Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary-light/10 to-bg-card relative overflow-hidden">
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-primary/10 text-primary rounded-[16px] border border-primary/20 shrink-0">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80">Canal Exclusivo</span>
                  <h4 className="font-heading font-bold text-text-main text-base">Falar com o Administrador Geral</h4>
                  <p className="text-xs text-text-muted leading-relaxed mt-2 max-w-xl">
                    Tem alguma dúvida sobre o sistema, deseja reportar um problema técnico ou solicitar novos recursos personalizados 
                    para a sua clínica? Clique no botão abaixo para iniciar um atendimento direto e humanizado via WhatsApp.
                  </p>
                  <div className="pt-4 flex flex-wrap items-center gap-4">
                    <a
                      href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '5571985084522'}?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20suporte%20para%20o%20meu%20sistema%20de%20est%C3%A9tica.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md hover:scale-[1.02]"
                    >
                      <MessageCircle className="w-4.5 h-4.5 fill-white text-white" />
                      Iniciar Suporte no WhatsApp
                    </a>
                    <span className="text-[11px] text-text-muted font-medium">
                      ⏱️ Tempo médio de resposta: rápido
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQs Container */}
          <Card className="border-border-card/40">
            <CardContent className="p-6">
              <h4 className="font-heading font-bold text-text-main text-sm mb-4 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" /> Perguntas Frequentes (FAQ)
              </h4>
              <div className="divide-y divide-border-card/40">
                {faqs.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: System metadata & security guidelines */}
        <div className="space-y-6">
          <Card className="border-border-card/40 bg-bg-base/30">
            <CardContent className="p-5 space-y-4">
              <h4 className="font-heading font-bold text-text-main text-xs uppercase tracking-wider">Status do Sistema</h4>
              
              <div className="flex items-center justify-between py-2 border-b border-border-card/30">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span>Versão da Plataforma</span>
                </div>
                <span className="text-xs font-mono font-semibold bg-bg-card px-2 py-0.5 rounded-[8px] border border-border-card/40 text-text-main">
                  v{systemVersion}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border-card/30">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Ambiente Online</span>
                </div>
                <span className="text-xs font-semibold text-success">Operacional</span>
              </div>

              <div className="text-[11px] text-text-muted leading-relaxed pt-2">
                Este ecossistema de estética é uma marca registrada de uso exclusivo do gestor licenciado. 
                Os backups e atualizações de segurança ocorrem de forma transparente sem interromper suas atividades.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
