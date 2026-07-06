import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface HScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function HScrollArea({ children, className, contentClassName }: HScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setScrollProgress] = useState(0);
  const [, setIsScrolling] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    // Check if content actually overflows
    setHasOverflow(scrollWidth > clientWidth + 1);
    
    // Calculate percentage
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    
    const progress = (scrollLeft / maxScroll) * 100;
    setScrollProgress(progress);
    
    // Show progress bar logic kept for state but UI removed per user request
    setIsScrolling(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1500);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('resize', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleScroll]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "w-full h-full overflow-x-auto hscroll-content",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
