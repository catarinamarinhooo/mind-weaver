import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/userProfile";
import {
  buildGlobalWorkspaceSuggestions,
  getEntityPath,
  loadWorkspaceSuggestionContext,
} from "@/lib/workspaceSuggestions";

const RecommendationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof loadWorkspaceSuggestionContext>
  > | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setLoading(true);
        setError("");
        setContext(await loadWorkspaceSuggestionContext());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recommendations.");
      } finally {
        setLoading(false);
      }
    }

    void loadRecommendations();
  }, []);

  const suggestions = useMemo(() => {
    if (!context) {
      return [];
    }
    const userKey = String(getUserProfile().id || getUserProfile().email || "default");
    return buildGlobalWorkspaceSuggestions({
      userKey,
      entities: context.entities,
      connections: context.connections,
      limit: 20,
    });
  }, [context]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Recommended Links"
        description="Global suggested connections across your workspace, ranked by shared topics, keywords, and learned linking patterns"
      />

      {error && <div className="text-sm text-red-500">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading workspace recommendations...</div>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="No recommendations yet"
          description="Create more entries, connect a few entities, and the recommendation engine will start surfacing stronger links."
        />
      ) : (
        <div className="space-y-3">
          {suggestions.map((item) => (
            <ContentCard key={item.pairKey} hover={false}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="text-base font-semibold text-foreground">{item.source.label}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TopicTag name={item.source.type.replaceAll("_", " ")} />
                    <TopicTag name={`score ${item.suggestion.score}`} variant="topic" />
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">Suggested target</div>
                  <div className="text-base font-semibold text-foreground">
                    {item.suggestion.label}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {item.suggestion.reasons.map((reason) => (
                      <div key={reason}>{reason}</div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <a href={getEntityPath(item.source.type, item.source.id)}>
                    <Button variant="outline" className="gap-2">
                      Open Source <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a href={getEntityPath(item.suggestion.targetType, item.suggestion.targetId)}>
                    <Button className="gap-2">
                      Open Suggested Match <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;
