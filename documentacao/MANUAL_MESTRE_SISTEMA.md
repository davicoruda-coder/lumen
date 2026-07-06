# MANUAL MESTRE: sistema-clinica02

> **Versão:** 2.0 — Painel sem n8n (Jun/2026)  
> **Automação WhatsApp:** use repositório `sistema-clinica01` ou roadmap em `VISAO_PRODUTO.md`

Este documento é a **base de conhecimento definitiva** para quem opera, vende ou replica o sistema. Aqui você encontrará desde definições estratégicas até detalhes técnicos de funcionamento, segurança e automação.

---

## 📚 1. GLOSSÁRIO ESTRATÉGICO

| Termo | O que é | Por que importa |
|-------|---------|-----------------|
| **ROI** | Return on Investment (Retorno sobre Investimento) | Prove ao dono da clínica que as automações funcionam. Se gastar R$1.000 em ads e gerar R$5.000 em vendas, ROI = 400% |
| **CRM** | Customer Relationship Management | Módulo visual (Kanban) que gerencia o "namoro" com o cliente. Nenhum lead fica sem resposta |
| **PWA** | Progressive Web App | Transforma o site em app real no celular sem App Store/Google Play. Zero taxas de loja |
| **NPS** | Net Promoter Score (0-10) | Pesquisa de satisfação automática pós-consulta. Nota <7 = alerta vermelho; 9-10 = pedir avaliação no Google |
| **RLS** | Row Level Security | Cada usuário vê apenas o que o dono permitiu. Dados de clínicas nunca se misturam |
| **RBAC** | Role-Based Access Control | 5 níveis: `superadmin` > `owner` > `admin` > `gestor` > `especialista`. Cada nível tem telas e ações específicas |
| **White-label** | Marca própria do cliente | O sistema assume a identidade visual (logo, cores, nome) de cada clínica |

---

## 🏗️ 2. ARQUITETURA TÉCNICA

### Stack Tecnológico

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| **Frontend** | React 19 + Vite + TypeScript | SPA com lazy-loading e code-splitting |
| **Estilo** | Tailwind CSS 4 + CSS Variables | Tematização dinâmica com 8 paletas premium |
| **Backend** | Supabase (PostgreSQL) | Auth, Database, Storage, RLS |
| **Deploy** | Vercel | Deploy automático via Git |

### Estrutura de Pastas do Projeto

```
sistema-clinica02/
├── src/
├── documentacao/
├── clientes/              # Pacotes gerados (gitignored)
└── .env                   # VITE_SUPABASE_*, VITE_SUPPORT_WHATSAPP_NUMBER
```

### Banco de Dados — Tabelas Principais (27 tabelas)

| Grupo | Tabelas | Descrição |
|-------|---------|-----------|
| **Config** | `clinic_config`, `clinic_hours`, `clinic_closures`, `modulos_clinica` | Identidade, horários, feriados, plano (a tabela legada `profiles` foi removida) |
| **CRM** | `leads_estetica`, `lead_notes`, `nps_feedbacks` | Pipeline de leads (Kanban), anotações e histórico completo de pesquisas de satisfação (NPS) |
| **Agenda** | `agendas`, `agenda_hours`, `agendamentos_estetica` | Multi-agenda com cores e horários individuais por profissional |
| **Prontuário** | `fichas_clinicas`, `evolucoes`, `anamneses`, `galeria_paciente`, `templates_clinicos`, `documentos_pacientes` | Ficha de paciente, evoluções imutáveis, galeria de fotos e documentos |
| **Financeiro** | `lancamentos_financeiros`, `categorias_financeiras`, `comissoes`, `comissoes_procedimentos` | Fluxo de caixa com recorrência, comissões de equipe |
| **Estoque** | `produtos_estoque`, `movimentacoes_estoque`, `kits_procedimento` | Controle de insumos, movimentações e kits vinculados a procedimentos |
| **Sistema** | `users` | Controle RBAC (equipe) |

---

## 💎 3. MODELO DE NEGÓCIOS E PRECIFICAÇÃO (HIGH-TICKET)

O sistema opera sob uma estratégia de **Alto Valor Percebido (High-Ticket)**, focando em retorno sobre investimento (ROI) e automação de elite.

### Estrutura de Valores

| Item | Valor | Periodicidade | Descrição |
| :--- | :--- | :--- | :--- |
| **Taxa de Implantação (Setup)** | **R$ 2.000,00** | Única | Engenharia inicial, banco dedicado e personalização Soft UI. |
| **Recorrência Mensal (SaaS)** | **R$ 1.500,00** | Mensal | Manutenção, infraestrutura, suporte e créditos de IA. |

### Políticas de Garantia e Reembolso
Para garantir a segurança do cliente e a viabilidade do negócio, seguimos a seguinte regra:
- **Garantia Incondicional:** 7 dias a partir da entrega do sistema configurado.
- **Regra de Estorno:** Em caso de desistência no prazo, apenas o valor da **Recorrência Mensal (R$ 1.500,00)** é devolvido. A **Taxa de Implantação (R$ 2.000,00)** é retida para cobrir custos fixos de engenharia e infraestrutura consumidos.

### Métrica de Escala (Upgrade)
O plano base cobre até **3 profissionais/agendas** ativos. O sistema bloqueia automaticamente a criação de uma 4ª agenda, direcionando para o suporte para contratação da taxa de **R$ 39/mês por agenda extra**.

---

## 4. AUTOMAÇÃO E IA (sistema-clinica02)

Este repositório **não inclui n8n, Chatwoot ou UAZAPI**. Operação via painel web:

- Agenda e CRM manuais
- Dashboard com confirmações compareceu/faltou
- NPS: leitura de `nps_feedbacks` (entrada manual ou futura IA)
- PWA: notificação ao especialista (8h e 15 min antes)

**Roadmap:** IA interna (OpenRouter) + Meta Business Agent + sync Google Calendar — ver `VISAO_PRODUTO.md`.

**Automação WhatsApp completa:** repositório `sistema-clinica01`.

---

## 🎨 5. DESIGN SYSTEM E IDENTIDADE VISUAL (SOFT UI LUXO)

O sistema foi construído sob o conceito de **Soft UI de Luxo**, focado em clínicas premium que desejam transmitir sofisticação, limpeza e tecnologia.

### Pilares Visuais
- **Tipografia:** Uso exclusivo da fonte **DM Sans**, focada em legibilidade e modernidade.
- **Contrastes Suaves:** Fundo off-white (`#FDFBF7`) no modo claro para reduzir a fadiga ocular e aumentar a percepção de "limpeza".
- **Componentes:** Bordas arredondadas (`rounded-xl`), sombras profundas e suaves (`shadow-card`) e micro-interações fluidas.
- **Sidebar Responsiva:** Design flutuante que se adapta ao mobile, mantendo o foco no conteúdo central.

### Paletas de Cores Premium (8 Temas)

| Tema | Cor Principal | Aplicação Típica |
|------|-------------|------------|
| Rose Gold | `#D49A89` | Estética feminina, dermatologia de luxo |
| Ouro Champagne| `#D4AF37` | Clínicas boutique, procedimentos VIP |
| Verde Esmeralda| `#2D5A27` | Bem-estar, spa, medicina natural |
| Rubi Imperial | `#A34E50` | Clínicas de alta performance, cirurgia |
| Bronze Quente | `#A87E6E` | Wellness, pilates, estética corporal |
| Azul Safira | `#4A6FA5` | Odontologia, clínica geral moderna |
| Grafite Premium | `#5A5A6E` | Clínicas masculinas, estética avançada |
| Ametista Luxo | `#7B6B8D` | Spa holístico, tratamentos premium |

---

### Controle por Perfil

| Funcionalidade | superadmin | owner/admin/gestor | especialista |
|----------------|-----------|-------------------|-----------|
| Trocar tema de cores (global) | ✅ | ✅ | ❌ |
| Modo claro/escuro (individual) | ✅ | ✅ | ✅ |
| Upload de logo | ✅ | ✅ | ❌ |
| Horários da clínica | ✅ | ✅ | ❌ |
| Meu Perfil (foto/nome) | ✅ | ✅ | ✅ |
| Alterar senha | ✅ | ✅ | ✅ |
| Convidar usuários | ✅ | ✅ | ❌ |
| Criar / Desativar / Reativar Agendas (Limite de 3) | ✅ | ✅ | ❌ |
| Editar Agendas (Nome, Cores, especialista) | ✅ | ✅ | ❌ |
| Vincular agenda a especialista | ✅ | ✅ | ❌ |
| Ver IDs de agendas (UUID) | ✅ | ❌ | ❌ |
| Limpar Dados de Teste | ✅ | ❌ | ❌ |
| Cancelar agendamento | ✅ | ❌ | ❌ |
| Atualizar status (agendado/confirmado) | ✅ | ✅ | ✅ |
| Atualizar status final (compareceu/faltou) | ✅ | ✅ | ❌ |
| Painel de Confirmações Pendentes (Dashboard) | ✅ | ✅ | ❌ |
| Prontuário (consultar, evoluir, anexar) | ✅ | ✅ | ✅ (módulo ativo) |
| Ver data de nascimento / idade do paciente | ✅ | ✅ | ✅ |
| Ver CPF completo | ✅ | ✅ | ❌ (mascarado) |
| Informar WhatsApp ao criar agendamento | ✅ | ✅ | ❌ |
| Editar Nome/CPF/nascimento/WhatsApp/interesse no modal da Agenda | ✅ | ✅ (incl. gestor) | ❌ (somente notas) |
| Editar Nome/WhatsApp de ficha existente no Prontuário | ✅ | ✅ | ❌ |
| **Limpar Dados de Teste** (Configurações > Clínica) | ✅ | ❌ | ❌ |
| Excluir registros do prontuário | ✅ | ✅ | ❌ |
| Modelos Clínicos (templates) | ✅ | ✅ | ❌ |

### Abas de Configurações (Reorganizadas)

| Aba | Contém | Visível para |
|-----|--------|-------------|
| **Minha Conta** | Perfil (foto, nome) + Alterar Senha | Todos |
| **Personalização** | Escolha de tema (cores) e modo claro/escuro | Todos |
| **Clínica** | Identidade (nome, logo, plano) + Kanban + Limpeza de dados | superadmin, admin, owner |
| **Equipe & Agendas** | Gerenciar Usuários + Gerenciar Agendas | superadmin, owner, admin, gestor |
| **Módulos** | Ativar/desativar os 7 módulos do sistema | superadmin, owner, admin, gestor |
| **Suporte** | Central de Ajuda, FAQ e contato com Administrador Geral | superadmin, owner, admin, gestor |

> 📌 **Nota:** **Modelos Clínicos** (edição de templates) ficam no menu lateral apenas para gestores. Especialistas usam os modelos ao preencher documentos dentro do Prontuário.

> 🔐 **Segurança de URL:** Especialistas que tentarem acessar abas restritas de Configurações por manipulação de URL são automaticamente redirecionados para a aba `minha-conta`. As únicas abas acessíveis por especialistas são **Minha Conta** e **Personalização**.

### Lista de Usuários do Sistema (Equipe & Agendas)

A tabela de usuários em **Configurações → Equipe & Agendas** exibe:

| Coluna | Conteúdo | Observação |
|--------|---------|-------------|
| **Usuário** | Nome completo (negrito) + E-mail (subtítulo) | Nome lido de `raw_user_meta_data->>'nome'` via view `auth_users` |
| **Perfil** | Select editável com os cargos disponíveis | `owner`, `admin`, `superadmin`, `especialista` |
| **Data de Criação** | Data do cadastro (oculto no mobile) | — |
| **Ações** | Botão de remover (Trash) | Inativo para o próprio usuário logado e para `superadmin` |

> ℹ️ Usuários convidados **antes** da versão 3.4 podem não ter o nome registrado no `raw_user_meta_data`. Nesses casos, somente o e-mail será exibido (comportamento retrocompatível).

### Atalhos de Navegação

- **Desktop:** Clicar no nome/foto do usuário na sidebar → abre "Minha Conta" em Configurações
- **Mobile:** Clicar no avatar no cabeçalho → mesma ação
- **Bottom Nav:** Dentro do drawer "Mais", link direto para o perfil

---

## 🔒 6. SEGURANÇA E COMPLIANCE

### Camadas de Proteção Ativas

| Camada | Implementação | Status |
|--------|--------------|--------|
| **Autenticação** | Supabase Auth (convite por e-mail + redefinição de senha) | ✅ Ativo |
| **RBAC** | 5 roles (superadmin, owner, admin, gestor, especialista) com permissões granulares | ✅ Ativo |
| **RLS** | Todas as 27 tabelas com Row Level Security | ✅ Ativo |
| **Rotas Protegidas** | `ProtectedRoute`, `AdminRoute`, `SuperAdminRoute` | ✅ Ativo |
| **CPF Oculto** | especialistas veem `***.***.***-**` na Agenda e Prontuário; gestores veem completo | ✅ Ativo |
| **Data de nascimento visível** | especialistas veem data e idade para atendimento clínico (Agenda + Prontuário) | ✅ Ativo |
| **Funções Bloqueadas** | `handle_new_user()`, `check_is_admin()` — REVOKE para anon | ✅ Corrigido |
| **Políticas Otimizadas** | `(select auth.uid())` em vez de `auth.uid()` em todas as policies | ✅ Otimizado |
| **RLS Cargos** | Policy `"Admins can update user roles"` permite que `owner`/`superadmin` altere o `role` de outros usuários (correção Jun/2026) | ✅ Corrigido |
| **Índices de FK** | 10 índices criados para performance em escala | ✅ Criado |
| **Senhas Vazadas** | HaveIBeenPwned via Supabase Auth | ⚠️ Ativar manualmente |

### Como Ativar Proteção contra Senhas Vazadas

1. Acesse o **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Habilite **"Leaked Password Protection"**
3. Pronto — senhas comprometidas serão bloqueadas automaticamente

---

## 📱 7. USO MOBILE (PWA)

- **Instalação:** Pelo próprio navegador (Safari no iPhone, Chrome no Android) — sem loja de apps
- **Fotos Blindadas (LGPD):** Fotos clínicas vão direto para a nuvem, NÃO ficam no rolo de câmera do funcionário
- **Assinatura Digital:** Paciente assina termos com o dedo na tela do tablet
- **Menu Inferior:** Atalhos fixos (Visão Geral, Agenda, CRM, Cadastro) estilo Instagram
- **Tema Dinâmico:** Reflete automaticamente as cores escolhidas pela gestão

> 📖 Para detalhes de instalação passo a passo, consulte `manual_aplicativo_pwa.md`

---

## 🛠️ 8. PLAYBOOK DE REPLICAÇÃO (DEPLOY PARA NOVO CLIENTE)

**Comando:** `npm run clonar-clinica -- <slug>`

| Passo | Ação | Tempo |
|-------|------|-------|
| 0 | `npm run clonar-clinica` → pacote em `clientes/<nome>/` | 2 min |
| 1 | Supabase: `MASTER_SCHEMA.sql` + `clinic_config_personalizar.sql` | 3 min |
| 2 | Criar usuário superadmin no Auth + `promover_superadmin.sql` | 2 min |
| 3 | Vercel: `vercel-env.txt` + deploy | 3 min |
| 4 | Convidar equipe + configurar agendas | 5 min |
| **Total** | **Clínica nova do zero** | **~15 min** |

> 📖 Guia mestre: `CLONAGEM_CLINICA.md` (inclui o que é manual: planilha Google, procedimentos nos prompts, agendas) | Detalhes técnicos: `playbook_tecnico_clonagem.md`

### Custos de infraestrutura (resumo)

| Serviço | Quando pagar | Ordem de grandeza |
|---------|--------------|-------------------|
| **Vercel Pro** | **1º cliente real** (uso comercial) | ~US$ 20/mês (1 seat) — **não** é por clínica |
| **Supabase Free** | Até **2 projetos** por org | Grátis |
| **Supabase Pro** | **3º cliente** na mesma org (ou produção séria) | ~US$ 25/mês + ~US$ 10/projeto extra |

Demo e testes: Vercel **Hobby** + Supabase **Free** bastam. Detalhes, tabelas e checklist: `CLONAGEM_CLINICA.md` → seção **Custos e planos**.

---

## 📊 9. MONITORAMENTO E MANUTENÇÃO

### Checklist Mensal de Saúde do Sistema

- [ ] Verificar Supabase Dashboard → **Database Linter** (segurança + performance)
- [ ] Revisar uso de Storage (fotos de prontuário consomem espaço)
- [ ] Atualizar `MASTER_SCHEMA.sql` se houve mudança no banco
- [ ] Atualizar manuais se houve mudança funcional
- [ ] Usar **Limpar Dados de Teste** (Configurações > Clínica) após homologação

> ⚠️ A ferramenta de limpeza é exclusiva para `superadmin` e exige **dupla confirmação**. Ela deleta agendamentos, notas de histórico CRM e **agendas inativas/ocultas** (especialistas desativados e seus horários) diretamente do banco. O item "Leads/Cadastros" é opcional e deve ser usado com extremo cuidado.

### Métricas de Performance do Banco

- **Versão PostgreSQL:** 17.6
- **Região:** sa-east-1 (São Paulo)
- **RLS otimizado:** `(select auth.uid())` — avaliação única por query
- **Índices:** 10+ índices em FKs mais consultadas
- **Políticas:** Consolidadas — sem duplicação de SELECT

### ⚡ Otimizações Automáticas de Infraestrutura e Performance

#### 1. Compactação de Imagens Inteligente no Upload (Frontend)
- **Funcionamento:** O componente genérico de upload (`FileUpload.tsx`) intercepta qualquer upload de imagem no próprio navegador do cliente e realiza uma compactação dinâmica antes de enviar o arquivo ao Supabase Storage.
- **Padrão de Qualidade:**
  - Redimensionamento máximo inteligente limitando a largura a **2048px (resolução 2K)**, preservando perfeitamente a proporção de tela e mantendo a nitidez e o zoom de detalhes clínicos.
  - Conversão de formatos pesados (como PNG) para **JPEG** com fator de qualidade de **90%**.
  - Economia real de **95%+ no tamanho do arquivo** (imagens pesadas de 12MB são comprimidas para ~300KB de forma transparente).
  - Limite padrão aumentado para **15MB** para tolerar fotos originais pesadas diretamente no componente.

#### 2. Compactação de Imagens (continuação)

Ver item 1 acima — padrão de qualidade e economia de banda no Storage.

---

**Este ecossistema — Sistema de Gestão Clínica — é uma plataforma completa para operação diária da clínica.** 🏆
