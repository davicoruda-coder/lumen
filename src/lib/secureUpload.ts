import { supabase } from './supabase';

export type SecureBucket =
  | 'prontuarios'
  | 'assinaturas'
  | 'financeiro'
  | 'estoque'
  | 'avatars'
  | 'clinic-assets';

export interface SecureUploadResult {
  path: string;
  bucket: SecureBucket;
  contentType: string;
  publicUrl: string | null;
}

export async function secureUpload(
  bucket: SecureBucket,
  file: Blob,
  folderPath = '',
  fileName = 'upload.bin',
): Promise<SecureUploadResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }

  const form = new FormData();
  form.append('bucket', bucket);
  form.append('folderPath', folderPath);
  form.append('file', file, fileName);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${baseUrl}/functions/v1/secure-upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: form,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Falha no upload seguro.');
  }

  return payload as SecureUploadResult;
}
