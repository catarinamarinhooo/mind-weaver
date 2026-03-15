import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRelatedSuggestions } from "@/lib/connectionLearning";
import {
  getEntityPath,
  loadWorkspaceSuggestionContext,
} from "@/lib/workspaceSuggestions";

type WorkspaceSuggestionContext = Awaited<ReturnType<typeof loadWorkspaceSuggestionContext>>;

interface RelatedWorkspaceMatchesProps {
  source: {
    id: number;
    label: string;
    text: string;
    topics?: Parameters<typeof buildRelatedSuggestions>[0]["source"]["topics"];
  };
  context?: WorkspaceSuggestionContext | null;
}

export function RelatedWorkspaceMatches({
  source,
  context,
}: RelatedWorkspaceMatchesProps) {
  const [localContext, setLocalContext] = useState<WorkspaceSuggestionContext | null>(context || null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (context) {
      setLocalContext(context);
      return;
    }

    async function loadData() {
      try {
        setError("");
        setLocalContext(await loadWorkspaceSuggestionContext());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load related matches.");
      }
    }

    void loadData();
  }, [context]);

  const suggestions = useMemo(() => {
    if (!localContext) {
      return [];
    }
    return buildRelatedSuggestions({
      source: {
        id: source.id,
        type: "knowledge",
        label: source.label,
        text: source.text,
        topics: source.topics,
      },
      allEntities: localContext.entities,
      existingConnections: [],
      learningConnections: localContext.connections,
      limit: 3,
    });
  }, [localContext, source.id, source.label, source.text, source.topics]);

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (!localContext) {
    return <div className="text-sm text-muted-foreground">Loading related matches...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No strong internal matches yet for this discovery item.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Related In Your Workspace
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.key}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{suggestion.label}</div>
              <div className="text-xs text-muted-foreground">{suggestion.reasons[0]}</div>
            </div>
            <a href={getEntityPath(suggestion.targetType, suggestion.targetId)}>
              <Button size="sm" variant="outline" className="gap-2">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
