import { cn } from '@/lib/utils';

interface TopicTagProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export function TopicTag({ name, className, onClick }: TopicTagProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent cursor-default',
        onClick && 'cursor-pointer hover:bg-accent/20 transition-colors',
        className
      )}
    >
      # {name}
    </span>
  );
}
