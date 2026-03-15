import {
  getDiscoveryItems,
  getGlossaryTerms,
  getKnowledgeItems,
  getThoughts,
  getTopics,
  getWatchlists,
} from "@/lib/api";

export type AppAlert = {
  id: string;
  title: string;
  description: string;
  path: string;
  createdAt: string;
  kind: "discovery" | "thought" | "knowledge" | "glossary" | "topic" | "watchlist";
  sourceLabel: string;
};

const ALERTS_SEEN_KEY = "cortexknows_alerts_seen_at";
const ALERTS_EVENT = "cortexknows-alerts-updated";

function asTimestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAlertTime(dateString: string) {
  const diffMs = Date.now() - asTimestamp(dateString);
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function getAppAlerts(): Promise<AppAlert[]> {
  const [discoveryItems, thoughts, knowledgeItems, glossaryTerms, topics, watchlists] =
    await Promise.all([
      getDiscoveryItems(),
      getThoughts(),
      getKnowledgeItems(),
      getGlossaryTerms(),
      getTopics(),
      getWatchlists(),
    ]);

  const alerts: AppAlert[] = [
    ...discoveryItems
      .filter((item) => !item.dismissed)
      .map((item) => ({
        id: `discovery-${item.id}`,
        title: item.title,
        description: `${item.source_name || "Source"} published something new for ${item.assigned_topic || item.topic || "your discovery flow"}.`,
        path: "/discovery",
        createdAt: item.published_at || item.created_at,
        kind: "discovery" as const,
        sourceLabel: item.source_name || "Discovery",
      })),
    ...thoughts.slice(0, 8).map((item) => ({
      id: `thought-${item.id}`,
      title: item.title || item.content.slice(0, 80),
      description: "New thought captured in your workspace.",
      path: `/thoughts/${item.id}`,
      createdAt: item.created_at,
      kind: "thought" as const,
      sourceLabel: "Thoughts",
    })),
    ...knowledgeItems.slice(0, 8).map((item) => ({
      id: `knowledge-${item.id}`,
      title: item.title || item.url,
      description: "New knowledge item saved to your library.",
      path: `/library/${item.id}`,
      createdAt: item.created_at,
      kind: "knowledge" as const,
      sourceLabel: "Library",
    })),
    ...glossaryTerms.slice(0, 8).map((item) => ({
      id: `glossary-${item.id}`,
      title: item.term,
      description: `Glossary term${item.term_type ? ` (${item.term_type})` : ""} added or updated.`,
      path: `/glossary?id=${item.id}`,
      createdAt: item.created_at,
      kind: "glossary" as const,
      sourceLabel: "Glossary",
    })),
    ...topics.slice(0, 6).map((item) => ({
      id: `topic-${item.id}`,
      title: item.name,
      description: "Topic available to organize new captures and discovery items.",
      path: "/topics",
      createdAt: item.created_at,
      kind: "topic" as const,
      sourceLabel: "Topics",
    })),
    ...watchlists
      .filter((item) => item.last_checked_at)
      .slice(0, 6)
      .map((item) => ({
        id: `watchlist-${item.id}`,
        title: item.name,
        description: `Watchlist refreshed for ${item.topic}.`,
        path: "/watchlists",
        createdAt: item.last_checked_at || item.created_at,
        kind: "watchlist" as const,
        sourceLabel: "Watchlists",
      })),
  ];

  return alerts.sort((a, b) => asTimestamp(b.createdAt) - asTimestamp(a.createdAt)).slice(0, 30);
}

export function getAlertsSeenAt() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ALERTS_SEEN_KEY);
}

export function markAlertsSeen(timestamp = new Date().toISOString()) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ALERTS_SEEN_KEY, timestamp);
  window.dispatchEvent(new CustomEvent(ALERTS_EVENT));
}

export function getUnreadAlertsCount(alerts: AppAlert[]) {
  const seenAt = getAlertsSeenAt();
  const seenTs = seenAt ? asTimestamp(seenAt) : 0;
  return alerts.filter((alert) => asTimestamp(alert.createdAt) > seenTs).length;
}

export function getAlertsEventName() {
  return ALERTS_EVENT;
}
