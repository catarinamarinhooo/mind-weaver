import type { ConnectionResponse, TopicResponse } from "@/lib/api";

export type ConnectableEntityType =
  | "thought"
  | "knowledge"
  | "business_idea"
  | "work_idea"
  | "personal_idea"
  | "quote"
  | "topic"
  | "glossary_term";

export interface ConnectableEntity {
  id: number;
  type: ConnectableEntityType;
  label: string;
  text: string;
  topics?: TopicResponse[];
}

export interface RelatedSuggestion {
  key: string;
  targetType: ConnectableEntityType;
  targetId: number;
  label: string;
  score: number;
  reasons: string[];
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

function getSuggestionStorageKey(userKey: string) {
  return `cortexknows_connection_suggestion_learning_${userKey}`;
}

interface SuggestionLearningState {
  dismissedPairs: string[];
}

function readLearningState(userKey: string): SuggestionLearningState {
  if (typeof window === "undefined") {
    return { dismissedPairs: [] };
  }

  try {
    const raw = window.localStorage.getItem(getSuggestionStorageKey(userKey));
    if (!raw) {
      return { dismissedPairs: [] };
    }
    const parsed = JSON.parse(raw) as SuggestionLearningState;
    return {
      dismissedPairs: Array.isArray(parsed.dismissedPairs) ? parsed.dismissedPairs : [],
    };
  } catch {
    return { dismissedPairs: [] };
  }
}

function writeLearningState(userKey: string, state: SuggestionLearningState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getSuggestionStorageKey(userKey), JSON.stringify(state));
}

export function dismissLearnedSuggestion(
  userKey: string,
  source: Pick<ConnectableEntity, "type" | "id">,
  target: Pick<ConnectableEntity, "type" | "id">
) {
  const state = readLearningState(userKey);
  const pairKey = `${source.type}:${source.id}->${target.type}:${target.id}`;
  if (!state.dismissedPairs.includes(pairKey)) {
    state.dismissedPairs.push(pairKey);
    writeLearningState(userKey, state);
  }
}

export function getDismissedSuggestionPairs(userKey: string) {
  return new Set(readLearningState(userKey).dismissedPairs);
}

function buildConnectionLearningMaps(connections: ConnectionResponse[]) {
  const typePairs = new Map<string, number>();
  const topicPairs = new Map<string, number>();

  for (const connection of connections) {
    const sourceType = connection.source_type;
    const targetType = connection.target_type;
    typePairs.set(`${sourceType}->${targetType}`, (typePairs.get(`${sourceType}->${targetType}`) || 0) + 1);
    typePairs.set(`${targetType}->${sourceType}`, (typePairs.get(`${targetType}->${sourceType}`) || 0) + 1);

    const notes = `${connection.notes || ""} ${connection.relationship_type || ""}`.toLowerCase();
    const topicMatches = notes.match(/shared topics:\s*([^|]+)/i);
    if (topicMatches?.[1]) {
      const topics = topicMatches[1]
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      for (const topic of topics) {
        topicPairs.set(`${sourceType}:${topic}`, (topicPairs.get(`${sourceType}:${topic}`) || 0) + 1);
        topicPairs.set(`${targetType}:${topic}`, (topicPairs.get(`${targetType}:${topic}`) || 0) + 1);
      }
    }
  }

  return { typePairs, topicPairs };
}

export function buildRelatedSuggestions({
  source,
  allEntities,
  existingConnections,
  learningConnections,
  dismissedPairs,
  limit = 5,
}: {
  source: ConnectableEntity;
  allEntities: ConnectableEntity[];
  existingConnections: ConnectionResponse[];
  learningConnections: ConnectionResponse[];
  dismissedPairs?: Set<string>;
  limit?: number;
}): RelatedSuggestion[] {
  const connectedKeys = new Set(
    existingConnections.map((connection) => `${connection.target_type}:${connection.target_id}`)
  );
  const sourceTokens = tokenize(`${source.label} ${source.text}`);
  const sourceTopicNames = getTopicNames(source.topics);
  const learned = buildConnectionLearningMaps(learningConnections);

  return allEntities
    .filter((entity) => !(entity.type === source.type && entity.id === source.id))
    .filter((entity) => !connectedKeys.has(`${entity.type}:${entity.id}`))
    .filter((entity) => !dismissedPairs?.has(`${source.type}:${source.id}->${entity.type}:${entity.id}`))
    .map((entity) => {
      const reasons: string[] = [];
      let score = 0;

      const targetTokens = tokenize(`${entity.label} ${entity.text}`);
      const overlappingTokens = sourceTokens.filter((token) => targetTokens.includes(token));
      if (overlappingTokens.length > 0) {
        score += Math.min(overlappingTokens.length, 4) * 2;
        reasons.push(`shared keywords: ${overlappingTokens.slice(0, 4).join(", ")}`);
      }

      const targetTopicNames = getTopicNames(entity.topics);
      const sharedTopics = Array.from(sourceTopicNames).filter((topic) =>
        targetTopicNames.has(topic)
      );
      if (sharedTopics.length > 0) {
        score += sharedTopics.length * 4;
        reasons.push(`shared topics: ${sharedTopics.join(", ")}`);
      }

      const learnedTypeScore =
        learned.typePairs.get(`${source.type}->${entity.type}`) || 0;
      if (learnedTypeScore > 0) {
        score += Math.min(learnedTypeScore, 3);
        reasons.push("similar connection pattern from past accepted links");
      }

      const topicLearningBonus = sharedTopics.reduce(
        (sum, topic) => sum + (learned.topicPairs.get(`${source.type}:${topic}`) || 0),
        0
      );
      if (topicLearningBonus > 0) {
        score += Math.min(topicLearningBonus, 4);
        reasons.push("matches topics you have linked before");
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
    .slice(0, limit);
}

