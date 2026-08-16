import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useClinic } from '../../contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { Upload, Trash2, Loader2, Save } from 'lucide-react';
import { compressImage } from '../../lib/imageCompressor';

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;

export function TabGeral() {
  const { clinicName, clinicLogo, refreshClinic } = useClinic();
  
  // States - Identidade
  const [nome, setNome] = useState(clinicName);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNome(clinicName);
  }, [clinicName]);

  const handleSaveIdentidade = async () => {
    try {
      setSavingId(true);
      await supabase.from('clinic_config').update({ 
        nome,
        plano: 'GESTAO',
      }).eq('id', 1);
      await refreshClinic();
      alert('Configurações salvas com sucesso!');
    } catch (e) {
      alert('Erro ao salvar configurações');
    } finally {
      setSavingId(false);
    }
  };

  // States - Horários
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [hours, setHours] = useState<any[]>([]);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    setLoadingHours(true);
    const { data } = await supabase.from('clinic_hours').select('*').order('id', { ascending: true });
    if (data && data.length > 0) {
      const sorted = DIAS_SEMANA.map(dia => data.find(h => h.dia === dia) || { dia, aberto: false, hora_inicio: '', hora_fim: '' });
      setHours(sorted);
    } else {
      setHours(DIAS_SEMANA.map(dia => ({ dia, aberto: false, hora_inicio: '', hora_fim: '' })));
    }
    setLoadingHours(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        throw new Error('Use JPEG, PNG ou WebP (SVG não permitido).');
      }
      if (file.size > 2 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 2MB.");
      
      setUploading(true);
      
      const { secureUpload } = await import('../../lib/secureUpload');
      const compressedBlob = await compressImage(file);
      const fileToUpload = compressedBlob instanceof File ? compressedBlob : new File([compressedBlob], file.name, { type: compressedBlob.type });

      const result = await secureUpload('clinic-assets', fileToUpload, '', fileToUpload.name);
      if (!result.publicUrl) throw new Error('URL da logo não retornada.');
      
      await supabase.from('clinic_config').update({ logo_url: result.publicUrl }).eq('id', 1);
      await refreshClinic();
      
    } catch (error: any) {
      alert(error.message || 'Erro ao fazer upload da logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    if (!confirm('Tem certeza que deseja remover a logo atual?')) return;
    try {
      setUploading(true);
      await supabase.from('clinic_config').update({ logo_url: null }).eq('id', 1);
      await refreshClinic();
    } catch (error) {
      alert('Erro ao remover logo');
    } finally {
      setUploading(false);
    }
  };

  const handleHourChange = (index: number, field: string, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const saveHours = async () => {
    try {
      setSavingHours(true);
      for (const h of hours) {
        if (h.aberto && h.hora_inicio && h.hora_fim) {
          if (h.hora_fim <= h.hora_inicio) {
             throw new Error(`Na ${h.dia}, a hora de fim deve ser maior que a hora de início.`);
          }
        }
      }

      for (const h of hours) {
        if (h.id) {
          await supabase.from('clinic_hours').update(h).eq('id', h.id);
        } else {
          await supabase.from('clinic_hours').insert(h);
        }
      }
      
      alert('Horários salvos com sucesso!');
      fetchHours();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar horários');
    } finally {
      setSavingHours(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade e Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-text-muted uppercase tracking-widest text-[10px] font-black">Nome da clínica</label>
            <Input 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              placeholder="Ex: Clínica Bela Forma" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-text-muted uppercase tracking-widest text-[10px] font-black">Plano de Assinatura</label>
            <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(212,163,163,0.15)]">
              {/* Decorative light effect */}
              <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="font-heading font-black text-[15px] text-primary tracking-wide uppercase">
                      Plano Integrado Premium
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary mt-1.5 border border-primary/10 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Status: Ativo
                    </span>
                  </div>
                  
                  <p className="text-xs text-text-muted leading-relaxed">
                    Seu ecossistema está 100% desbloqueado. Aproveite todas as funcionalidades de **Agenda**, **CRM**, **Prontuário Clínico**, **Assinatura Digital**, **Controle Financeiro**, **Estoque** e **Comissões** de forma ilimitada.
                  </p>
                  
                  <div className="pt-2 border-t border-border-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-text-main">
                      👤 Limite Base: Até 3 agendas de profissionais inclusas
                    </span>
                    <a 
                      href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '5571996952190'}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-wider transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
                    >
                      Solicitar mais agendas →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-text-muted uppercase tracking-widest text-[10px] font-black">Logo da clínica</label>
            <div className="flex items-center gap-4 border border-border-card p-4 rounded-xl bg-bg-base/50">
              {clinicLogo ? (
                <div className="relative group">
                  <img src={clinicLogo} alt="Logo" className="w-16 h-16 object-cover rounded-full bg-bg-card border border-border-card" />
                  <button 
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-error text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 bg-border-card rounded-lg flex items-center justify-center text-text-muted text-[11px] text-center leading-tight px-1">
                  Sem logo
                </div>
              )}
              
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  isLoading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload (Máx 2MB)
                </Button>
                <p className="text-xs text-text-muted">Formatos: PNG, JPG ou SVG.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveIdentidade} isLoading={savingId} className="w-full bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20">
              <Save className="w-4 h-4 mr-2" />
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHours ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
          ) : (
            <div className="space-y-4">
              {hours.map((h, i) => (
                <div key={h.dia} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-border-card hover:bg-bg-base transition-colors">
                  <div className="flex items-center gap-3 w-32 shrink-0">
                    <input 
                      type="checkbox" 
                      className="rounded border-border-card text-primary focus:ring-primary"
                      checked={h.aberto}
                      onChange={e => handleHourChange(i, 'aberto', e.target.checked)}
                    />
                    <span className="text-sm font-medium capitalize">{h.dia}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 w-full">
                    <Input 
                      type="time" 
                      disabled={!h.aberto} 
                      value={h.hora_inicio || ''}
                      onChange={e => handleHourChange(i, 'hora_inicio', e.target.value)}
                      className="w-full h-9 px-2 text-center" 
                    />
                    <span className="text-text-muted text-sm">às</span>
                    <Input 
                      type="time" 
                      disabled={!h.aberto} 
                      value={h.hora_fim || ''}
                      onChange={e => handleHourChange(i, 'hora_fim', e.target.value)}
                      className="w-full h-9 px-2 text-center" 
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <Button onClick={saveHours} isLoading={savingHours} className="w-full bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/20">
                  Salvar horários
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
