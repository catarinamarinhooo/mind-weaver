import {
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
} from "@/lib/api";
import {
  buildRelatedSuggestions,
  getDismissedSuggestionPairs,
  type ConnectableEntity,
} from "@/lib/connectionLearning";

export async function loadWorkspaceSuggestionContext(): Promise<{
  entities: ConnectableEntity[];
  connections: ConnectionResponse[];
}> {
  const [
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

  return {
    connections: allConnections,
    entities: [
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
        text: [item.title, item.url, item.description, item.personal_note, item.source]
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
    ],
  };
}

export function buildGlobalWorkspaceSuggestions(args: {
  userKey: string;
  entities: ConnectableEntity[];
  connections: ConnectionResponse[];
  limit?: number;
}) {
  const { userKey, entities, connections, limit = 20 } = args;
  const seenPairs = new Set<string>();
  const aggregate = [];

  for (const source of entities) {
    const suggestions = buildRelatedSuggestions({
      source,
      allEntities: entities,
      existingConnections: connections.filter(
        (connection) => connection.source_type === source.type && connection.source_id === source.id
      ),
      learningConnections: connections,
      dismissedPairs: getDismissedSuggestionPairs(userKey),
      limit: 3,
    });

    for (const suggestion of suggestions) {
      const pairKey = `${source.type}:${source.id}->${suggestion.targetType}:${suggestion.targetId}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);
      aggregate.push({
        pairKey,
        source,
        suggestion,
      });
    }
  }

  return aggregate
    .sort((a, b) => b.suggestion.score - a.suggestion.score || a.source.label.localeCompare(b.source.label))
    .slice(0, limit);
}

export function getEntityPath(type: ConnectableEntity["type"], id: number) {
  switch (type) {
    case "thought":
      return `/thoughts/${id}`;
    case "knowledge":
      return `/library/${id}`;
    case "business_idea":
      return "/business-ideas";
    case "work_idea":
      return "/work-ideas";
    case "personal_idea":
      return "/personal-ideas";
    case "quote":
      return "/quotes";
    case "topic":
      return "/topics";
    case "glossary_term":
      return "/glossary";
    default:
      return "/";
  }
}

