import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCheck, Sparkles, X } from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserProfile } from "@/lib/userProfile";
import {
  buildGlobalWorkspaceSuggestions,
  getEntityPath,
  loadWorkspaceSuggestionContext,
} from "@/lib/workspaceSuggestions";
import { dismissLearnedSuggestion } from "@/lib/connectionLearning";
import { createConnection, type ConnectionCreate } from "@/lib/api";

const HIGH_CONFIDENCE_SCORE = 8;

const RecommendationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<Awaited<
    ReturnType<typeof loadWorkspaceSuggestionContext>
  > | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const [batchApplying, setBatchApplying] = useState(false);

  const profile = getUserProfile();
  const userKey = String(profile.id || profile.email || "default");

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
    return buildGlobalWorkspaceSuggestions({
      userKey,
      entities: context.entities,
      connections: context.connections,
      limit: 20,
    }).filter((item) => !dismissedKeys.includes(item.pairKey));
  }, [context, dismissedKeys, userKey]);

  const highConfidenceSuggestions = useMemo(
    () => suggestions.filter((item) => item.suggestion.score >= HIGH_CONFIDENCE_SCORE),
    [suggestions]
  );

  const handleCreateSuggestedConnection = async (pairKey: string) => {
    if (!context) {
      return;
    }

    const suggestion = suggestions.find((item) => item.pairKey === pairKey);
    if (!suggestion) {
      return;
    }

    const payload: ConnectionCreate = {
      source_type: suggestion.source.type,
      source_id: suggestion.source.id,
      target_type: suggestion.suggestion.targetType,
      target_id: suggestion.suggestion.targetId,
      relationship_type: "ai_suggested",
      notes: suggestion.suggestion.reasons.join(" | "),
    };

    try {
      setActionKey(pairKey);
      setError("");
      const created = await createConnection(payload);
      setContext((current) =>
        current
          ? {
              ...current,
              connections: [created, ...current.connections],
            }
          : current
      );
      setDismissedKeys((current) => [...current, pairKey]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create connection.");
    } finally {
      setActionKey("");
    }
  };

  const handleDismissSuggestion = (pairKey: string) => {
    const suggestion = suggestions.find((item) => item.pairKey === pairKey);
    if (!suggestion) {
      return;
    }

    dismissLearnedSuggestion(userKey, suggestion.source, {
      type: suggestion.suggestion.targetType,
      id: suggestion.suggestion.targetId,
    });
    setDismissedKeys((current) => [...current, pairKey]);
  };

  const handleAcceptHighConfidence = async () => {
    if (highConfidenceSuggestions.length === 0) {
      return;
    }

    try {
      setBatchApplying(true);
      setError("");

      for (const item of highConfidenceSuggestions) {
        await handleCreateSuggestedConnection(item.pairKey);
      }
    } finally {
      setBatchApplying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Recommended Links"
        description="Global suggested connections across your workspace, ranked by shared topics, keywords, and learned linking patterns"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewMode((current) => !current)}
            >
              {reviewMode ? "Exit Review Mode" : "AI Review Mode"}
            </Button>
            <Button
              size="sm"
              disabled={batchApplying || highConfidenceSuggestions.length === 0}
              onClick={() => void handleAcceptHighConfidence()}
            >
              {batchApplying
                ? "Applying..."
                : `Accept High-Confidence${
                    highConfidenceSuggestions.length > 0
                      ? ` (${highConfidenceSuggestions.length})`
                      : ""
                  }`}
            </Button>
          </div>
        }
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
          {!reviewMode && (
            <div className="grid gap-3 md:grid-cols-3">
              <ContentCard hover={false}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Suggestions
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {suggestions.length}
                </div>
              </ContentCard>
              <ContentCard hover={false}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  High Confidence
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {highConfidenceSuggestions.length}
                </div>
              </ContentCard>
              <ContentCard hover={false}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Review Mode
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Use review mode to apply or dismiss each recommendation individually.
                </div>
              </ContentCard>
            </div>
          )}

          {suggestions.map((item) => (
            <ContentCard key={item.pairKey} hover={false}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="text-base font-semibold text-foreground">{item.source.label}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TopicTag name={item.source.type.replaceAll("_", " ")} />
                    <TopicTag name={`score ${item.suggestion.score}`} variant="topic" />
                    {item.suggestion.score >= HIGH_CONFIDENCE_SCORE && (
                      <Badge className="bg-accent/10 text-accent">high confidence</Badge>
                    )}
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
                  {reviewMode && (
                    <>
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={batchApplying || actionKey === item.pairKey}
                        onClick={() => void handleCreateSuggestedConnection(item.pairKey)}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {actionKey === item.pairKey ? "Applying..." : "Create Connection"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="gap-2 text-muted-foreground"
                        disabled={batchApplying}
                        onClick={() => handleDismissSuggestion(item.pairKey)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </>
                  )}
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
