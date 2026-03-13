import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function ContentCard({ children, className, onClick, hover = true }: ContentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card p-4',
        hover && 'hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
