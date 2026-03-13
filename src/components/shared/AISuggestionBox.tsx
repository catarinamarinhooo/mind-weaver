import { Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

interface AISuggestionBoxProps {
  title?: string;
  children: ReactNode;
}

export function AISuggestionBox({ title = 'AI Suggestions', children }: AISuggestionBoxProps) {
  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold ai-gradient-text">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground space-y-2">
        {children}
      </div>
    </div>
  );
}
