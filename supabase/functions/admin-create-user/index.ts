import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedRoles = ['especialista', 'gestor', 'owner', 'admin', 'superadmin'] as const;
type Role = (typeof allowedRoles)[number];

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Sessão não encontrada.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Configuração do servidor incompleta.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authorization.slice('Bearer '.length);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
  }

  const { data: caller, error: callerError } = await admin
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (callerError || !caller) {
    return jsonResponse({ error: 'Não foi possível verificar suas permissões.' }, 403);
  }

  if (caller.role !== 'superadmin' && caller.role !== 'owner') {
    return jsonResponse({ error: 'Somente o superadministrador ou o dono da clínica pode adicionar usuários.' }, 403);
  }

  let payload: { nome?: unknown; email?: unknown; password?: unknown; role?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Dados inválidos.' }, 400);
  }

  const nome = typeof payload.nome === 'string' ? payload.nome.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const role = payload.role as Role;

  if (!nome || !email || !password || !allowedRoles.includes(role)) {
    return jsonResponse({ error: 'Preencha nome, e-mail, senha e perfil corretamente.' }, 400);
  }

  if (nome.length > 120 || email.length > 254 || password.length > 128) {
    return jsonResponse({ error: 'Um dos campos ultrapassa o tamanho permitido.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Informe um e-mail válido.' }, 400);
  }

  if (!isStrongPassword(password)) {
    return jsonResponse({ error: 'A senha temporária não atende aos requisitos de segurança.' }, 400);
  }

  if (caller.role === 'owner' && (role === 'owner' || role === 'superadmin')) {
    return jsonResponse({ error: 'O dono da clínica não pode criar outro dono ou superadministrador.' }, 403);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (createError || !created.user) {
    const duplicate = createError?.message?.toLowerCase().includes('already');
    return jsonResponse(
      { error: duplicate ? 'Já existe um usuário com este e-mail.' : createError?.message || 'Não foi possível criar o usuário.' },
      duplicate ? 409 : 400,
    );
  }

  const { error: roleError } = await admin
    .from('users')
    .upsert({ id: created.user.id, role }, { onConflict: 'id' });

  if (roleError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: 'Não foi possível atribuir o perfil. A criação foi desfeita.' }, 500);
  }

  return jsonResponse(
    {
      user: {
        id: created.user.id,
        email: created.user.email,
        nome,
        role,
      },
    },
    201,
  );
});
