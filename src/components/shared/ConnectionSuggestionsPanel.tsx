import { useEffect, useMemo, useState } from "react";
import { Sparkles, Link2 } from "lucide-react";
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

type EntityType =
  | "thought"
  | "knowledge"
  | "business_idea"
  | "work_idea"
  | "personal_idea"
  | "quote"
  | "topic"
  | "glossary_term";

interface SourceEntity {
  id: number;
  type: EntityType;
  label: string;
  text: string;
  topics?: TopicResponse[];
}

interface Suggestion {
  key: string;
  targetType: EntityType;
  targetId: number;
  label: string;
  score: number;
  reasons: string[];
}

interface ConnectionSuggestionsPanelProps {
  source: SourceEntity;
  onConnectionCreated?: (connection: ConnectionResponse) => void;
}

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "about",
  "have",
  "will",
  "been",
  "como",
  "para",
  "com",
  "uma",
  "mais",
  "isso",
  "este",
  "essa",
  "from",
  "http",
  "https",
  "www",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token))
    )
  );
}

function getTopicNames(topics?: TopicResponse[]) {
  return new Set((topics || []).map((topic) => topic.name.toLowerCase()));
}

export function ConnectionSuggestionsPanel({
  source,
  onConnectionCreated,
}: ConnectionSuggestionsPanelProps) {
  const [existingConnections, setExistingConnections] = useState<ConnectionResponse[]>([]);
  const [error, setError] = useState("");
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [allEntities, setAllEntities] = useState<
    Array<{
      type: EntityType;
      id: number;
      label: string;
      text: string;
      topics?: TopicResponse[];
    }>
  >([]);

  useEffect(() => {
    async function loadSuggestionData() {
      try {
        setError("");
        const [
          connections,
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
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getTopics(),
          getGlossaryTerms(),
        ]);

        setExistingConnections(connections);
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
          })),
          ...quotes.map((item) => ({
            type: "quote" as const,
            id: item.id,
            label: item.book_title,
            text: [item.book_title, item.quote_text, item.page, item.thoughts].filter(Boolean).join(" "),
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
          err instanceof Error
            ? err.message
            : "Failed to load connection suggestions."
        );
      }
    }

    void loadSuggestionData();
  }, [source.id, source.type]);

  const suggestions = useMemo(() => {
    const connectedKeys = new Set(
      existingConnections.map((connection) => `${connection.target_type}:${connection.target_id}`)
    );
    const sourceTokens = tokenize(`${source.label} ${source.text}`);
    const sourceTopicNames = getTopicNames(source.topics);

    return allEntities
      .filter((entity) => !(entity.type === source.type && entity.id === source.id))
      .filter((entity) => !connectedKeys.has(`${entity.type}:${entity.id}`))
      .map((entity) => {
        const reasons: string[] = [];
        let score = 0;

        const targetTokens = tokenize(`${entity.label} ${entity.text}`);
        const overlappingTokens = sourceTokens.filter((token) => targetTokens.includes(token));
        if (overlappingTokens.length > 0) {
          score += Math.min(overlappingTokens.length, 3) * 2;
          reasons.push(`shared keywords: ${overlappingTokens.slice(0, 3).join(", ")}`);
        }

        const targetTopicNames = getTopicNames(entity.topics);
        const sharedTopics = Array.from(sourceTopicNames).filter((topic) =>
          targetTopicNames.has(topic)
        );
        if (sharedTopics.length > 0) {
          score += sharedTopics.length * 4;
          reasons.push(`shared topics: ${sharedTopics.join(", ")}`);
        }

        if (entity.type === "topic") {
          const topicName = entity.label.toLowerCase();
          if (sourceTopicNames.has(topicName) || sourceTokens.includes(topicName)) {
            score += 5;
            reasons.push("topic appears directly in this entry");
          }
        }

        return {
          key: `${entity.type}:${entity.id}`,
          targetType: entity.type,
          targetId: entity.id,
          label: entity.label,
          score,
          reasons,
        };
      })
      .filter((suggestion) => suggestion.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 5);
  }, [allEntities, existingConnections, source]);

  const handleCreateSuggestion = async (suggestion: Suggestion) => {
    try {
      setCreatingKey(suggestion.key);
      setError("");
      const connection = await createConnection({
        source_type: source.type,
        source_id: source.id,
        target_type: suggestion.targetType,
        target_id: suggestion.targetId,
        relationship_type: "suggested match",
        notes: suggestion.reasons.join(" | "),
      });
      setExistingConnections((current) => [connection, ...current]);
      onConnectionCreated?.(connection);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create suggested connection."
      );
    } finally {
      setCreatingKey(null);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Suggested Connections
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Heuristic suggestions based on shared topics and overlapping keywords. Mais
        tarde isto pode ser substituido ou reforcado por AI/LLM.
      </p>

      {error && <div className="mb-3 text-sm text-red-500">{error}</div>}

      {suggestions.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No obvious suggestions yet. Add more topics or richer descriptions to improve matches.
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.key}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {suggestion.label}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {suggestion.targetType.replaceAll("_", " ")} • score {suggestion.score}
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

                <Button
                  size="sm"
                  onClick={() => void handleCreateSuggestion(suggestion)}
                  disabled={creatingKey === suggestion.key}
                >
                  {creatingKey === suggestion.key ? "Adding..." : "Connect"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
