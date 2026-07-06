# 📧 Templates de E-mail do Supabase — Copie e Cole

> **Onde configurar:** Supabase Dashboard → Authentication → Email Templates
> **Projeto:** `seu-projeto-supabase` (substitua pelo slug do cliente)

---

## ⚠️ ANTES DE TUDO: Configurar URLs

> **🏷️ White-label:** Os valores abaixo são do sistema de origem. Ao clonar para um novo cliente, substitua `davicosystems.ia.br` pelo domínio do novo cliente (ex: `app.clinicabelaforma.com.br`).

**Vá em:** Supabase Dashboard → Authentication → URL Configuration

1. **Site URL:** `https://davicosystems.ia.br`
2. **Redirect URLs** (adicione todas):
   - `https://davicosystems.ia.br/**`
   - `http://localhost:5173/**`

---

## 1. Template: "Reset Password" (Redefinição de Senha / Convite)

> ⚠️ **ATENÇÃO:** Este template é usado tanto para **convites** quanto para **"esqueci a senha"**.
> O texto deve ser neutro para funcionar nos dois cenários.

**Onde:** Authentication → Email Templates → "Reset Password"

**Subject (Assunto):**
```
🔑 Defina sua senha — Sistema da Clínica
```

**Body (Corpo HTML):**
```html
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdf8f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6B4C3B; font-size: 22px; margin: 0;">Defina sua senha de acesso 🔐</h1>
  </div>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    Olá! Recebemos uma solicitação para <strong>definir ou redefinir sua senha</strong> no sistema de gestão da clínica.
  </p>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    Clique no botão abaixo para criar sua nova senha:
  </p>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; background: linear-gradient(135deg, #C47E7E, #A06060); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(196,126,126,0.3);">
      🔑 Definir minha senha
    </a>
  </div>
  
  <div style="background: #fff; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #f0e0d8;">
    <p style="color: #666; font-size: 13px; margin: 0 0 8px 0;">📋 <strong>Próximos passos:</strong></p>
    <ol style="color: #666; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
      <li>Clique no botão acima</li>
      <li>Crie uma senha forte (mín. 8 caracteres)</li>
      <li>Faça login com seu e-mail + nova senha</li>
    </ol>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
    ⏰ Este link expira em <strong>24 horas</strong>. Se expirar, solicite um novo pelo sistema.
  </p>
  
  <hr style="border: none; border-top: 1px solid #f0e0d8; margin: 20px 0;">
  
  <p style="color: #bbb; font-size: 11px; text-align: center;">
    Este e-mail foi enviado automaticamente pelo sistema de gestão da clínica.<br>
    Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.
  </p>
</div>
```

---

## 2. Template: "Confirm Signup" (Confirmação de Cadastro)

**Subject:**
```
✅ Confirme seu e-mail — Sistema da Clínica
```

**Body:**
```html
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdf8f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6B4C3B; font-size: 22px; margin: 0;">Confirme seu e-mail 📩</h1>
  </div>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    Olá! Para ativar sua conta no sistema, clique no botão abaixo:
  </p>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; background: linear-gradient(135deg, #C47E7E, #A06060); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(196,126,126,0.3);">
      ✅ Confirmar meu e-mail
    </a>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
    Se você não criou esta conta, pode ignorar este e-mail.
  </p>
</div>
```

---

## 3. Template: "Magic Link" (Link Mágico)

**Subject:**
```
🔗 Seu link de acesso — Sistema da Clínica
```

**Body:**
```html
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdf8f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6B4C3B; font-size: 22px; margin: 0;">Seu acesso rápido 🔗</h1>
  </div>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    Clique no botão abaixo para entrar no sistema sem precisar digitar sua senha:
  </p>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; background: linear-gradient(135deg, #C47E7E, #A06060); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(196,126,126,0.3);">
      🚀 Entrar no sistema
    </a>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
    Este link é de uso único e expira em 24 horas.
  </p>
</div>
```

---

## 4. Template: "Change Email Address" (Alteração de E-mail)

**Subject:**
```
📧 Confirme a alteração de e-mail — Sistema da Clínica
```

**Body:**
```html
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdf8f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6B4C3B; font-size: 22px; margin: 0;">Alteração de E-mail 📧</h1>
  </div>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    Você solicitou a alteração do e-mail da sua conta. Clique no botão abaixo para confirmar:
  </p>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; background: linear-gradient(135deg, #C47E7E, #A06060); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(196,126,126,0.3);">
      ✅ Confirmar novo e-mail
    </a>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
    Se você não solicitou esta alteração, ignore este e-mail.
  </p>
</div>
```

---

## 5. Template: "Invite User" (Convidar Usuário)

> **Nota:** Este template do painel Supabase **não é usado na implantação**. O superadmin é criado manualmente no Auth (Create new user). Convites da equipe usam o template **"Reset Password"** acima, disparados pelo app (Configurações → Equipe & Agendas).

**Subject:**
```
🎉 Você foi convidada para o sistema da clínica!
```

**Body:**
```html
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdf8f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #6B4C3B; font-size: 22px; margin: 0;">Você foi convidada! 🎉</h1>
  </div>
  
  <p style="color: #444; font-size: 15px; line-height: 1.6;">
    A gestão da clínica convidou você para acessar o sistema. Clique no botão abaixo para aceitar o convite e criar sua conta:
  </p>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" 
       style="display: inline-block; background: linear-gradient(135deg, #C47E7E, #A06060); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(196,126,126,0.3);">
      🤝 Aceitar convite
    </a>
  </div>
  
  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
    Este convite expira em 24 horas.
  </p>
</div>
```
