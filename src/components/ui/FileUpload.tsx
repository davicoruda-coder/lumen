import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { compressImage } from '../../lib/imageCompressor';
import { secureUpload, type SecureBucket } from '../../lib/secureUpload';

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export interface FileUploadProps {
  bucket: Extract<SecureBucket, 'prontuarios' | 'financeiro' | 'estoque'>;
  folderPath?: string;
  onUploadSuccess: (url: string, path: string) => void;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  folderPath = '',
  onUploadSuccess,
  maxSizeMB = 15,
  accept = DEFAULT_ACCEPT,
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
      if (file.type && !ALLOWED_MIME.has(file.type)) {
        throw new Error('Tipo não permitido. Use JPEG, PNG, WebP ou PDF.');
      }
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        throw new Error('SVG e GIF não são permitidos.');
      }

      let fileToUpload: Blob = file;
      let uploadName = file.name;

      if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
        setProgress(15);
        try {
          const compressed = await compressImage(file);
          fileToUpload = compressed;
          uploadName = file.name.replace(/\.[^/.]+$/, '') + (compressed.type === 'image/jpeg' ? '.jpg' : '.png');
        } catch {
          // mantém original
        }
      }

      const fileSizeMB = fileToUpload.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`O arquivo é muito grande (${fileSizeMB.toFixed(1)}MB). O limite é ${maxSizeMB}MB.`);
        setUploading(false);
        return;
      }

      if (bucket === 'prontuarios' && !folderPath) {
        throw new Error('Pasta da ficha clínica é obrigatória.');
      }

      setProgress(40);
      const result = await secureUpload(bucket, fileToUpload, folderPath, uploadName);
      setProgress(100);
      setSuccess(true);
      onUploadSuccess(result.path, result.path);

      setTimeout(() => {
        setSuccess(false);
        setProgress(0);
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload do arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      void validateAndUpload(e.dataTransfer.files[0]);
    }
  }, [bucket, folderPath, maxSizeMB]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.[0]) {
      void validateAndUpload(e.target.files[0]);
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
                JPEG, PNG, WebP ou PDF (máx. {maxSizeMB}MB)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
