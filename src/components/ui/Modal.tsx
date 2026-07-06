import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div 
        className={cn(
          "relative z-50 w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[14px] bg-bg-card p-6 shadow-[var(--shadow-modal)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-semibold text-text-main">{title}</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-bg-base transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-text-main">
          {children}
        </div>
      </div>
    </div>
  );
}
