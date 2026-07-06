import React, { useCallback, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { UploadCloud, X, File as FileIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { compressImage } from '../../lib/imageCompressor';

export interface FileUploadProps {
  bucket: 'prontuarios' | 'financeiro';
  folderPath?: string; // Ex: paciente_id/ ou lancamento_id/
  onUploadSuccess: (url: string, path: string) => void;
  maxSizeMB?: number;
  accept?: string; // Ex: 'image/*,application/pdf'
  label?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  folderPath = '',
  onUploadSuccess,
  maxSizeMB = 15,
  accept = 'image/*,application/pdf',
  label = 'Clique ou arraste um arquivo aqui',
  className
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const validateAndUpload = async (file: File) => {
    setError(null);
    setSuccess(false);
    setUploading(true);
    setProgress(5);

    try {
      let fileToUpload = file;

      // Compress if it is an image (excluding vector SVG and animated GIF to preserve their integrity)
      if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
        setProgress(15);
        try {
          const compressed = await compressImage(file);
          fileToUpload = compressed instanceof File 
            ? compressed 
            : new File([compressed], file.name.replace(/\.[^/.]+$/, "") + (compressed.type === 'image/jpeg' ? '.jpg' : ''), { 
                type: compressed.type,
                lastModified: Date.now()
              });
        } catch {
          // Falha na compactação — usa o arquivo original
        }
      }

      // Validação de tamanho sobre o arquivo final (compactado ou original)
      const fileSizeMB = fileToUpload.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`O arquivo é muito grande (${fileSizeMB.toFixed(1)}MB). O limite é ${maxSizeMB}MB.`);
        setUploading(false);
        return;
      }

      setProgress(30);

      // Create a unique file name to avoid collisions
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folderPath}${folderPath.endsWith('/') || folderPath === '' ? '' : '/'}${fileName}`;

      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(100);
      setSuccess(true);
      
      // We don't use getPublicUrl because our buckets are private.
      // To view them, we'll need to use createSignedUrl when fetching, 
      // but we can save the filePath in the database for now.
      onUploadSuccess(filePath, data.path);

      // Reset state after a delay
      setTimeout(() => {
        setSuccess(false);
        setProgress(0);
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload do arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden",
          isDragging ? "border-primary bg-primary/5" : "border-border-card bg-bg-card hover:bg-bg-base",
          uploading && "opacity-80 cursor-not-allowed",
          error && "border-error/50 bg-error/5",
          success && "border-success/50 bg-success/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-sm font-medium text-text-main">Enviando arquivo...</div>
            <div className="w-full max-w-xs bg-bg-base rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : success ? (
          <>
            <div className="p-3 bg-success/10 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div className="text-sm font-medium text-success">Upload concluído!</div>
          </>
        ) : error ? (
          <>
            <div className="p-3 bg-error/10 rounded-full">
              <AlertCircle className="w-6 h-6 text-error" />
            </div>
            <div className="text-sm font-medium text-error text-center">{error}</div>
            <div className="text-xs text-text-muted mt-1">Clique para tentar novamente</div>
          </>
        ) : (
          <>
            <div className="p-4 bg-primary-light/30 rounded-full">
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-main">{label}</p>
              <p className="text-xs text-text-muted mt-1">
                Suporta: {accept.replace(/, /g, ', ')} (Max: {maxSizeMB}MB)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
