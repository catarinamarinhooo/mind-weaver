import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        priority === 'high' && 'bg-priority-high/10 text-priority-high',
        priority === 'medium' && 'bg-priority-medium/10 text-priority-medium',
        priority === 'low' && 'bg-priority-low/10 text-priority-low',
        className
      )}
    >
      {priority}
    </span>
  );
}
