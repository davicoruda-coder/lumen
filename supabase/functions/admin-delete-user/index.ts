import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    return jsonResponse({ error: 'Somente o superadministrador ou o dono da clínica pode remover usuários.' }, 403);
  }

  let payload: { userId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Dados inválidos.' }, 400);
  }

  const userId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
  if (!userId) {
    return jsonResponse({ error: 'Informe o usuário a remover.' }, 400);
  }

  if (userId === authData.user.id) {
    return jsonResponse({ error: 'Você não pode remover o próprio usuário logado.' }, 400);
  }

  const { data: target, error: targetError } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) {
    return jsonResponse({ error: 'Não foi possível localizar o usuário.' }, 500);
  }

  if (target) {
    if (caller.role === 'owner' && (target.role === 'owner' || target.role === 'superadmin')) {
      return jsonResponse({ error: 'O dono da clínica não pode remover outro dono ou superadministrador.' }, 403);
    }
    if (caller.role !== 'superadmin' && target.role === 'superadmin') {
      return jsonResponse({ error: 'Somente um superadministrador pode remover outro superadministrador.' }, 403);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message || 'Não foi possível remover o usuário.' }, 400);
  }

  return jsonResponse({ ok: true, userId }, 200);
});
