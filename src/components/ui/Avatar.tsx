import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full font-medium items-center justify-center transition-all",
        !src && "bg-primary text-white shadow-sm",
        src && "border border-primary/20",
        {
          "h-6 w-6 text-[10px]": size === 'xs',
          "h-8 w-8 text-xs": size === 'sm',
          "h-10 w-10 text-sm": size === 'md',
          "h-14 w-14 text-lg": size === 'lg',
          "h-20 w-20 text-2xl": size === 'xl',
        },
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="drop-shadow-md">{initials}</span>
      )}
    </div>
  );
}
