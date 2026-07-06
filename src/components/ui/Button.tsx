import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'copper';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-[14px] font-heading font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
          {
            "bg-gradient-to-br from-primary to-primary-hover text-[color:var(--primary-foreground)] border-none shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 hover:brightness-110": variant === 'primary',
            "bg-transparent border border-border-card text-text-main hover:bg-bg-base": variant === 'secondary',
            "bg-transparent border border-primary text-primary hover:bg-primary/10": variant === 'outline',
            "bg-transparent text-text-muted hover:text-text-main hover:bg-bg-base": variant === 'ghost',
            "bg-gradient-to-br from-[var(--color-rubi-from)] to-[var(--color-rubi-to)] text-white border-none shadow-md hover:brightness-110": variant === 'danger',
            "bg-gradient-to-br from-[#B87333] via-[#D49A89] to-[#8B6354] text-white border-none shadow-md hover:brightness-110 hover:shadow-lg transition-all": variant === 'copper',
            "px-4 py-2 text-sm": size === 'sm',
            "px-6 py-2.5 text-base": size === 'md',
            "px-8 py-3.5 text-lg": size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
