import { useEffect, useMemo, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { AISuggestionBox } from "@/components/shared/AISuggestionBox";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type AISuggestedEntity,
  type AISuggestedTopic,
  type AISuggestionsResponse,
} from "@/lib/api";

const DEFAULT_HIGH_CONFIDENCE_SCORE = 8;

interface ActionableAISuggestionsProps {
  suggestions: AISuggestionsResponse | null;
  loading: boolean;
  actionKey: string;
  appliedTopicIds?: number[];
  topicActionLabel?: string;
  onLoadSuggestions: () => Promise<void> | void;
  onApplyTopic: (topicId: number, explanation: string) => Promise<void> | void;
  onApplyEntity: (
    entityType: string,
    entityId: number,
    explanation: string
  ) => Promise<void> | void;
  onOpenEntity: (entityType: string, entityId: number) => void;
}

export function ActionableAISuggestions({
  suggestions,
  loading,
  actionKey,
  appliedTopicIds = [],
  topicActionLabel = "Add Topic",
  onLoadSuggestions,
  onApplyTopic,
  onApplyEntity,
  onOpenEntity,
}: ActionableAISuggestionsProps) {
  const [reviewMode, setReviewMode] = useState(false);
  const [batchApplying, setBatchApplying] = useState(false);

  useEffect(() => {
    setReviewMode(false);
  }, [suggestions?.entity_id, suggestions?.entity_type]);

  const unappliedHighConfidenceTopics = useMemo(
    () =>
      (suggestions?.suggested_topics ?? []).filter(
        (topic) =>
          topic.score >= DEFAULT_HIGH_CONFIDENCE_SCORE &&
          !appliedTopicIds.includes(topic.topic_id)
      ),
    [appliedTopicIds, suggestions?.suggested_topics]
  );

  const highConfidenceEntities = useMemo(
    () =>
      (suggestions?.suggested_related_entities ?? []).filter(
        (entity) => entity.score >= DEFAULT_HIGH_CONFIDENCE_SCORE
      ),
    [suggestions?.suggested_related_entities]
  );

  const highConfidenceCount =
    unappliedHighConfidenceTopics.length + highConfidenceEntities.length;

  const handleAcceptHighConfidence = async () => {
    if (!suggestions || highConfidenceCount === 0) {
      return;
    }

    try {
      setBatchApplying(true);

      for (const topic of unappliedHighConfidenceTopics) {
        await onApplyTopic(topic.topic_id, topic.explanation);
      }

      for (const entity of highConfidenceEntities) {
        await onApplyEntity(
          entity.entity_type,
          entity.entity_id,
          entity.explanation
        );
      }
    } finally {
      setBatchApplying(false);
    }
  };

  const renderTopicRow = (topic: AISuggestedTopic) => {
    const isAlreadyApplied = appliedTopicIds.includes(topic.topic_id);
    const key = `topic-${topic.topic_id}`;

    return (
      <div key={topic.topic_id} className="rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TopicTag name={topic.topic_name} variant="topic" />
            <Badge variant="outline">score {topic.score}</Badge>
            {topic.score >= DEFAULT_HIGH_CONFIDENCE_SCORE && (
              <Badge className="bg-accent/10 text-accent">high confidence</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={actionKey === key || isAlreadyApplied || batchApplying}
            onClick={() => void onApplyTopic(topic.topic_id, topic.explanation)}
          >
            {isAlreadyApplied
              ? "Added"
              : actionKey === key
                ? "Applying..."
                : topicActionLabel}
          </Button>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {topic.explanation}
        </div>
      </div>
    );
  };

  const renderEntityRow = (entity: AISuggestedEntity) => {
    const key = `entity-${entity.entity_type}-${entity.entity_id}`;

    return (
      <div
        key={`${entity.entity_type}-${entity.entity_id}`}
        className="rounded-md border border-border p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {entity.entity_type.replaceAll("_", " ")}
            </Badge>
            <span className="font-medium text-foreground">{entity.label}</span>
            <Badge variant="outline">score {entity.score}</Badge>
            {entity.score >= DEFAULT_HIGH_CONFIDENCE_SCORE && (
              <Badge className="bg-accent/10 text-accent">
                high confidence
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenEntity(entity.entity_type, entity.entity_id)}
            >
              Open
            </Button>
            <Button
              size="sm"
              disabled={actionKey === key || batchApplying}
              onClick={() =>
                void onApplyEntity(
                  entity.entity_type,
                  entity.entity_id,
                  entity.explanation
                )
              }
            >
              {actionKey === key ? "Applying..." : "Create Connection"}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {entity.explanation}
        </div>
      </div>
    );
  };

  return (
    <AISuggestionBox>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Generate AI suggestions for topics and related entities.
          </p>
          <p className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-accent" />
            Use `Accept High-Confidence` for fast batch actions or `AI Review Mode`
            for item-by-item approval.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void onLoadSuggestions()}>
            {loading ? "Thinking..." : "Suggest with AI"}
          </Button>
          {suggestions && (
            <>
              <Button
                size="sm"
                disabled={batchApplying || highConfidenceCount === 0}
                onClick={() => void handleAcceptHighConfidence()}
              >
                {batchApplying
                  ? "Applying..."
                  : `Accept High-Confidence${highConfidenceCount > 0 ? ` (${highConfidenceCount})` : ""}`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewMode((current) => !current)}
              >
                {reviewMode ? "Exit AI Review" : "AI Review Mode"}
              </Button>
            </>
          )}
        </div>
      </div>

      {suggestions && (
        <div className="space-y-4">
          <div className="rounded-md bg-background/70 p-3 text-sm text-foreground">
            {suggestions.explanation}
          </div>

          {!reviewMode && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested Topics
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {suggestions.suggested_topics.length}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Related Entities
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {suggestions.suggested_related_entities.length}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  High Confidence
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {highConfidenceCount}
                </div>
              </div>
            </div>
          )}

          {reviewMode && (
            <>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  Suggested Topics
                </div>
                {suggestions.suggested_topics.length === 0 ? (
                  <div>No topic suggestions yet.</div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.suggested_topics.map(renderTopicRow)}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  Suggested Related Entities
                </div>
                {suggestions.suggested_related_entities.length === 0 ? (
                  <div>No related entity suggestions yet.</div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.suggested_related_entities.map(renderEntityRow)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </AISuggestionBox>
  );
}
