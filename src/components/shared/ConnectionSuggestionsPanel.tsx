import { useEffect, useMemo, useState } from "react";
import { Link2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createConnection,
  getBusinessIdeas,
  getConnections,
  getGlossaryTerms,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
  type ConnectionResponse,
  type TopicResponse,
} from "@/lib/api";
import {
  buildRelatedSuggestions,
  dismissLearnedSuggestion,
  getDismissedSuggestionPairs,
  type ConnectableEntity,
  type ConnectableEntityType,
} from "@/lib/connectionLearning";
import { getUserProfile } from "@/lib/userProfile";

interface SourceEntity {
  id: number;
  type: ConnectableEntityType;
  label: string;
  text: string;
  topics?: TopicResponse[];
}

interface ConnectionSuggestionsPanelProps {
  source: SourceEntity;
  onConnectionCreated?: (connection: ConnectionResponse) => void;
}

export function ConnectionSuggestionsPanel({
  source,
  onConnectionCreated,
}: ConnectionSuggestionsPanelProps) {
  const [existingConnections, setExistingConnections] = useState<ConnectionResponse[]>([]);
  const [learningConnections, setLearningConnections] = useState<ConnectionResponse[]>([]);
  const [error, setError] = useState("");
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<Set<string>>(new Set());
  const [allEntities, setAllEntities] = useState<ConnectableEntity[]>([]);

  const userKey = String(getUserProfile().id || getUserProfile().email || "default");

  useEffect(() => {
    setDismissedSuggestionKeys(getDismissedSuggestionPairs(userKey));
  }, [userKey]);

  useEffect(() => {
    async function loadSuggestionData() {
      try {
        setError("");
        const [
          sourceConnections,
          allConnections,
          thoughts,
          knowledgeItems,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
          topics,
          glossaryTerms,
        ] = await Promise.all([
          getConnections({ entity_type: source.type, entity_id: source.id }),
          getConnections(),
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getTopics(),
          getGlossaryTerms(),
        ]);

        setExistingConnections(sourceConnections);
        setLearningConnections(allConnections);
        setAllEntities([
          ...thoughts.map((item) => ({
            type: "thought" as const,
            id: item.id,
            label: item.title || item.content.slice(0, 80),
            text: [item.title, item.content, item.summary, item.link].filter(Boolean).join(" "),
            topics: item.topics,
          })),
          ...knowledgeItems.map((item) => ({
            type: "knowledge" as const,
            id: item.id,
            label: item.title || item.url,
            text: [
              item.title,
              item.url,
              item.description,
              item.personal_note,
              item.source,
            ]
              .filter(Boolean)
              .join(" "),
            topics: item.topics,
          })),
          ...businessIdeas.map((item) => ({
            type: "business_idea" as const,
            id: item.id,
            label: item.title,
            text: [item.title, item.description, item.problem, item.audience, item.next_steps]
              .filter(Boolean)
              .join(" "),
            topics: item.topics,
          })),
          ...workIdeas.map((item) => ({
            type: "work_idea" as const,
            id: item.id,
            label: item.title,
            text: [
              item.title,
              item.goal,
              item.summary,
              item.context,
              item.application_category,
              item.timeline,
            ]
              .filter(Boolean)
              .join(" "),
            topics: item.topics,
          })),
          ...personalIdeas.map((item) => ({
            type: "personal_idea" as const,
            id: item.id,
            label: item.title,
            text: [item.title, item.description, item.category, item.goal].filter(Boolean).join(" "),
            topics: item.topics,
          })),
          ...quotes.map((item) => ({
            type: "quote" as const,
            id: item.id,
            label: item.book_title,
            text: [item.book_title, item.quote_text, item.page, item.thoughts].filter(Boolean).join(" "),
            topics: item.topics,
          })),
          ...topics.map((item) => ({
            type: "topic" as const,
            id: item.id,
            label: item.name,
            text: [item.name, item.description].filter(Boolean).join(" "),
          })),
          ...glossaryTerms.map((item) => ({
            type: "glossary_term" as const,
            id: item.id,
            label: item.term,
            text: [
              item.term,
              item.definition,
              item.term_type,
              ...item.aliases,
              ...item.tags,
              ...item.links,
            ]
              .filter(Boolean)
              .join(" "),
          })),
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load connection suggestions."
        );
      }
    }

    void loadSuggestionData();
  }, [source.id, source.type]);

  const suggestions = useMemo(
    () =>
      buildRelatedSuggestions({
        source,
        allEntities,
        existingConnections,
        learningConnections,
        dismissedPairs: dismissedSuggestionKeys,
        limit: 5,
      }),
    [allEntities, dismissedSuggestionKeys, existingConnections, learningConnections, source]
  );

  const handleCreateSuggestion = async (suggestionKey: string) => {
    const suggestion = suggestions.find((item) => item.key === suggestionKey);
    if (!suggestion) {
      return;
    }

    try {
      setCreatingKey(suggestion.key);
      setError("");
      const connection = await createConnection({
        source_type: source.type,
        source_id: source.id,
        target_type: suggestion.targetType,
        target_id: suggestion.targetId,
        relationship_type: "learned match",
        notes: suggestion.reasons.join(" | "),
      });
      setExistingConnections((current) => [connection, ...current]);
      setLearningConnections((current) => [connection, ...current]);
      onConnectionCreated?.(connection);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create suggested connection."
      );
    } finally {
      setCreatingKey(null);
    }
  };

  const handleDismissSuggestion = (suggestionKey: string) => {
    const suggestion = suggestions.find((item) => item.key === suggestionKey);
    if (!suggestion) {
      return;
    }
    dismissLearnedSuggestion(
      userKey,
      { type: source.type, id: source.id },
      { type: suggestion.targetType, id: suggestion.targetId }
    );
    setDismissedSuggestionKeys(getDismissedSuggestionPairs(userKey));
  };

  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Suggested Connections
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Suggestions are now ranked by shared topics, shared keywords, existing
        connections, and patterns from the links you have already accepted or rejected.
      </p>

      {error && <div className="mb-3 text-sm text-red-500">{error}</div>}

      {suggestions.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No strong suggestions yet. Add more topics, richer descriptions, or make a few
          manual connections so the ranking can learn your patterns.
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.key} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{suggestion.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {suggestion.targetType.replaceAll("_", " ")} · score {suggestion.score}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {suggestion.reasons.map((reason) => (
                      <div key={reason} className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissSuggestion(suggestion.key)}
                    title="Not relevant"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleCreateSuggestion(suggestion.key)}
                    disabled={creatingKey === suggestion.key}
                  >
                    {creatingKey === suggestion.key ? "Adding..." : "Connect"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

