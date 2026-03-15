import { cn } from '@/lib/utils';

interface TopicTagProps {
  name: string;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "topic";
}

export function TopicTag({
  name,
  className,
  onClick,
  variant = "default",
}: TopicTagProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-default",
        variant === "default" &&
          "bg-accent/10 text-accent border border-transparent",
        variant === "topic" &&
          "border border-sky-200 bg-sky-50 text-sky-700 shadow-sm",
        onClick &&
          variant === "default" &&
          "cursor-pointer hover:bg-accent/20 transition-colors",
        onClick &&
          variant === "topic" &&
          "cursor-pointer hover:border-sky-300 hover:bg-sky-100 transition-colors",
        className
      )}
    >
      {variant === "topic" ? "# " : ""}
      {name}
    </span>
  );
}
