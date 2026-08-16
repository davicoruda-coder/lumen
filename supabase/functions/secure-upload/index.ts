import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Bucket = 'prontuarios' | 'assinaturas' | 'financeiro' | 'estoque' | 'avatars' | 'clinic-assets';

const BUCKET_RULES: Record<
  Bucket,
  { maxBytes: number; mime: string[]; roles: string[]; requireFichaPath?: boolean }
> = {
  prontuarios: {
    maxBytes: 15 * 1024 * 1024,
    mime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    roles: ['superadmin', 'owner', 'admin', 'gestor', 'especialista'],
    requireFichaPath: true,
  },
  assinaturas: {
    maxBytes: 15 * 1024 * 1024,
    mime: ['image/png', 'image/jpeg', 'image/webp'],
    roles: ['superadmin', 'owner', 'admin', 'gestor', 'especialista'],
    requireFichaPath: true,
  },
  financeiro: {
    maxBytes: 15 * 1024 * 1024,
    mime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    roles: ['superadmin', 'owner', 'admin', 'gestor'],
  },
  estoque: {
    maxBytes: 15 * 1024 * 1024,
    mime: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    roles: ['superadmin', 'owner', 'admin', 'gestor'],
  },
  avatars: {
    maxBytes: 2 * 1024 * 1024,
    mime: ['image/jpeg', 'image/png', 'image/webp'],
    roles: ['superadmin', 'owner', 'admin', 'gestor', 'especialista', 'user'],
  },
  'clinic-assets': {
    maxBytes: 2 * 1024 * 1024,
    mime: ['image/jpeg', 'image/png', 'image/webp'],
    roles: ['superadmin', 'owner', 'admin'],
  },
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf';
  }
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  if (callerError || !caller?.role) {
    return jsonResponse({ error: 'Não foi possível verificar suas permissões.' }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Formulário inválido.' }, 400);
  }

  const bucket = String(form.get('bucket') || '') as Bucket;
  const folderPath = String(form.get('folderPath') || '').replace(/^\/+|\/+$/g, '');
  const file = form.get('file');

  if (!(file instanceof File)) {
    return jsonResponse({ error: 'Arquivo obrigatório.' }, 400);
  }

  const rules = BUCKET_RULES[bucket];
  if (!rules) {
    return jsonResponse({ error: 'Bucket inválido.' }, 400);
  }

  if (!rules.roles.includes(caller.role)) {
    return jsonResponse({ error: 'Sem permissão para enviar arquivos neste bucket.' }, 403);
  }

  if (file.size <= 0 || file.size > rules.maxBytes) {
    return jsonResponse({
      error: `Arquivo inválido. Limite: ${Math.round(rules.maxBytes / (1024 * 1024))}MB.`,
    }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectMime(bytes);
  if (!detected || !rules.mime.includes(detected)) {
    return jsonResponse({
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.',
    }, 400);
  }

  // Avatars: path must start with auth uid
  if (bucket === 'avatars' && folderPath && !folderPath.startsWith(authData.user.id)) {
    return jsonResponse({ error: 'Pasta de avatar inválida.' }, 403);
  }

  if (rules.requireFichaPath) {
    const fichaId = folderPath.split('/')[0];
    if (!isUuid(fichaId)) {
      return jsonResponse({ error: 'Pasta deve começar com o ID da ficha clínica.' }, 400);
    }

    const { data: ficha } = await admin
      .from('fichas_clinicas')
      .select('paciente_id')
      .eq('id', fichaId)
      .maybeSingle();

    if (!ficha?.paciente_id) {
      return jsonResponse({ error: 'Ficha não encontrada.' }, 404);
    }

    if (caller.role === 'especialista') {
      const { data: link } = await admin
        .from('agendamentos_estetica')
        .select('id, agendas!inner(usuario_id)')
        .eq('lead_id', ficha.paciente_id)
        .eq('agendas.usuario_id', authData.user.id)
        .limit(1);

      if (!link || link.length === 0) {
        return jsonResponse({ error: 'Sem acesso a esta ficha.' }, 403);
      }
    }
  }

  const ext = EXT_BY_MIME[detected];
  const unique = `${crypto.randomUUID()}.${ext}`;
  let objectPath: string;

  if (bucket === 'avatars') {
    objectPath = `${authData.user.id}-${unique}`;
  } else if (bucket === 'clinic-assets') {
    objectPath = `logo-${unique}`;
  } else if (folderPath) {
    objectPath = `${folderPath}/${unique}`;
  } else {
    objectPath = unique;
  }

  const { error: uploadError } = await admin.storage.from(bucket).upload(objectPath, bytes, {
    contentType: detected,
    upsert: false,
    cacheControl: '3600',
  });

  if (uploadError) {
    return jsonResponse({ error: uploadError.message || 'Falha no upload.' }, 400);
  }

  let publicUrl: string | null = null;
  if (bucket === 'avatars' || bucket === 'clinic-assets') {
    publicUrl = admin.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  }

  return jsonResponse({
    path: objectPath,
    bucket,
    contentType: detected,
    publicUrl,
  }, 200);
});
