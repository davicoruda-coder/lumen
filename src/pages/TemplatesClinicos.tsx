import React from 'react';
import { TabTemplates } from '../components/configuracoes/TabTemplates';

export function TemplatesClinicos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-heading font-bold text-text-main">Modelos Clínicos</h1>
        <p className="text-text-muted text-sm">Gerencie seus modelos de anamnese, termos de consentimento e receitas.</p>
      </div>
      
      <div className="bg-bg-card border border-border-card rounded-2xl p-6 shadow-sm">
        <TabTemplates />
      </div>
    </div>
  );
}
