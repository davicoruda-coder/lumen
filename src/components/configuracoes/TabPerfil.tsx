import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { compressImage } from '../../lib/imageCompressor';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Loader2, Upload, Check } from 'lucide-react';

export function TabPerfil() {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setNome(user.user_metadata?.nome || user.email?.split('@')[0] || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          nome: nome,
          avatar_url: avatarUrl,
        }
      });
      if (error) throw error;
      alert('Perfil atualizado com sucesso! Recarregue a página para ver as mudanças.');
    } catch (err: any) {
      alert('Erro ao atualizar perfil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para o upload.');
      }

      const file = event.target.files[0];
      
      // Compress the image before uploading
      const compressedBlob = await compressImage(file);
      const fileToUpload = compressedBlob instanceof File ? compressedBlob : new File([compressedBlob], file.name, { type: compressedBlob.type });

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert('Erro ao fazer upload da imagem. Certifique-se de que o bucket "avatars" existe no Supabase e está público.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <p className="text-sm text-text-muted">Atualize suas informações pessoais e sua foto de perfil.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border-card/40">
              <div className="relative group">
                <Avatar 
                  name={nome || user?.email || '?'} 
                  src={avatarUrl} 
                  size="xl" 
                />
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  <span className="text-xs font-semibold mt-1">Alterar</span>
                </label>
                <input 
                  id="avatar-upload"
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h3 className="font-heading font-semibold text-lg text-text-main">Sua Foto</h3>
                <p className="text-sm text-text-muted">
                  Recomendamos imagens quadradas em formato JPG ou PNG (máx. 2MB).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1">
                  Nome Completo
                </label>
                <Input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1">
                  Endereço de E-mail
                </label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-bg-sidebar cursor-not-allowed text-text-muted"
                />
                <p className="text-xs text-text-muted mt-1">
                  O e-mail não pode ser alterado por aqui. Contate o administrador.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" isLoading={loading}>
                <Check className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
