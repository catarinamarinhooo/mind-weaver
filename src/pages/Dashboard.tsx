import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AISuggestionBox } from "@/components/shared/AISuggestionBox";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applyDiscoveryActionWithAi,
  applyThoughtConversionWithAi,
  getBusinessIdeas,
  getDiscoveryItems,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
  type BusinessIdeaResponse,
  type DiscoveryItemResponse,
  type ThoughtResponse,
  type PersonalIdeaResponse,
  type WorkIdeaResponse,
} from "@/lib/api";
import { getUserProfile } from "@/lib/userProfile";
import {
  buildGlobalWorkspaceSuggestions,
  getEntityPath,
  loadWorkspaceSuggestionContext,
} from "@/lib/workspaceSuggestions";
import {
  Brain,
  Briefcase,
  Clock3,
  Compass,
  Heart,
  Lightbulb,
  Link2,
  Quote,
  Sparkles,
  ArrowRight,
  Hash,
  Gift,
  BookOpen,
} from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  timestamp: number;
  path: string;
  icon: typeof Brain;
};

type PriorityCardProps = {
  title: string;
  icon: typeof Lightbulb;
  item: BusinessIdeaResponse | WorkIdeaResponse | PersonalIdeaResponse | null;
  path: string;
};

type AIInboxItem =
  | {
      key: string;
      kind: "thought_conversion";
      title: string;
      description: string;
      actionLabel: string;
      secondaryLabel: string;
      score: number;
      thought: ThoughtResponse;
      target: "business" | "work" | "personal";
      path: string;
    }
  | {
      key: string;
      kind: "discovery_triage";
      title: string;
      description: string;
      actionLabel: string;
      secondaryLabel: string;
      score: number;
      discoveryItem: DiscoveryItemResponse;
      path: string;
    };

const priorityColors: Record<string, string> = {
  high: "bg-priority-high/10 text-priority-high border-priority-high/20",
  medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
  low: "bg-priority-low/10 text-priority-low border-priority-low/20",
};

function formatActivityDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}

function buildPriorityItem<T extends { priority?: string | null; created_at: string }>(
  items: T[]
) {
  const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return [...items].sort((a, b) => {
    const aScore = rank[(a.priority || "medium").toLowerCase()] || 0;
    const bScore = rank[(b.priority || "medium").toLowerCase()] || 0;
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0] || null;
}

function getThoughtConversionSuggestion(thought: ThoughtResponse) {
  const combinedText = [
    thought.title,
    thought.content,
    thought.summary,
    thought.thought_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const priorityBoost =
    thought.priority?.toLowerCase() === "high"
      ? 2
      : thought.priority?.toLowerCase() === "medium"
        ? 1
        : 0;

  const businessScore =
    (combinedText.includes("saas") ? 3 : 0) +
    (combinedText.includes("market") ? 2 : 0) +
    (combinedText.includes("startup") ? 2 : 0) +
    (combinedText.includes("business") ? 2 : 0) +
    priorityBoost;

  const workScore =
    (combinedText.includes("workflow") ? 3 : 0) +
    (combinedText.includes("team") ? 2 : 0) +
    (combinedText.includes("project") ? 2 : 0) +
    (combinedText.includes("meeting") ? 2 : 0) +
    (combinedText.includes("work") ? 2 : 0) +
    priorityBoost;

  const personalScore =
    (combinedText.includes("habit") ? 3 : 0) +
    (combinedText.includes("journaling") ? 2 : 0) +
    (combinedText.includes("health") ? 2 : 0) +
    (combinedText.includes("personal") ? 2 : 0) +
    (combinedText.includes("wellness") ? 2 : 0) +
    priorityBoost;

  const ranked = [
    { target: "business" as const, score: businessScore, label: "Convert to Business Idea" },
    { target: "work" as const, score: workScore, label: "Convert to Work Idea" },
    { target: "personal" as const, score: personalScore, label: "Convert to Personal Idea" },
  ].sort((a, b) => b.score - a.score);

  return ranked[0].score >= 3 ? ranked[0] : null;
}

function PriorityCard({ title, icon: Icon, item, path }: PriorityCardProps) {
  return (
    <ContentCard className="min-h-[180px] rounded-3xl border border-border/70 bg-white/90 p-5 shadow-sm" hover={false}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </div>

      {!item ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No priority items yet in this area.
          </p>
          <Link to={path}>
            <Button variant="outline" size="sm">
              Open section
            </Button>
          </Link>
        </div>
      ) : (
        <Link to={path}>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:bg-background">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              <Badge
                className={
                  priorityColors[(item.priority || "medium").toLowerCase()] ||
                  priorityColors.medium
                }
              >
                {item.priority || "medium"}
              </Badge>
            </div>
            {"description" in item && item.description && (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            {"summary" in item && item.summary && (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {item.summary}
              </p>
            )}
            {"goal" in item && !("summary" in item) && item.goal && (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {item.goal}
              </p>
            )}
          </div>
        </Link>
      )}
    </ContentCard>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const userProfile = getUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItemResponse[]>([]);
  const [activeTopics, setActiveTopics] = useState<Awaited<ReturnType<typeof getTopics>>>([]);
  const [aiSuggestions, setAiSuggestions] = useState<
    ReturnType<typeof buildGlobalWorkspaceSuggestions>
  >([]);
  const [thoughts, setThoughts] = useState<ThoughtResponse[]>([]);
  const [priorityBusiness, setPriorityBusiness] = useState<BusinessIdeaResponse | null>(null);
  const [priorityWork, setPriorityWork] = useState<WorkIdeaResponse | null>(null);
  const [priorityPersonal, setPriorityPersonal] = useState<PersonalIdeaResponse | null>(null);
  const [aiInboxDismissedKeys, setAiInboxDismissedKeys] = useState<string[]>([]);
  const [aiActionKey, setAiActionKey] = useState("");
  const [aiActionMessage, setAiActionMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [
          thoughts,
          knowledgeItems,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
          discoveryFeed,
          topics,
          workspaceContext,
        ] = await Promise.all([
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getDiscoveryItems(),
          getTopics(),
          loadWorkspaceSuggestionContext(),
        ]);

        const activity: ActivityItem[] = [
          ...thoughts.map((item) => ({
            id: `thought-${item.id}`,
            type: "Thought",
            title: item.title || item.content.slice(0, 72),
            subtitle: `Thought · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: `/thoughts/${item.id}`,
            icon: Brain,
          })),
          ...knowledgeItems.map((item) => ({
            id: `knowledge-${item.id}`,
            type: "Knowledge Item",
            title: item.title || item.url,
            subtitle: `Knowledge Item · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: `/library/${item.id}`,
            icon: Link2,
          })),
          ...businessIdeas.map((item) => ({
            id: `business-${item.id}`,
            type: "Business Idea",
            title: item.title,
            subtitle: `Business Idea · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: "/business-ideas",
            icon: Lightbulb,
          })),
          ...workIdeas.map((item) => ({
            id: `work-${item.id}`,
            type: "Work Idea",
            title: item.title,
            subtitle: `Work Idea · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: "/work-ideas",
            icon: Briefcase,
          })),
          ...personalIdeas.map((item) => ({
            id: `personal-${item.id}`,
            type: "Personal Idea",
            title: item.title,
            subtitle: `Personal Idea · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: "/personal-ideas",
            icon: Heart,
          })),
          ...quotes.map((item) => ({
            id: `quote-${item.id}`,
            type: "Quote",
            title: item.book_title,
            subtitle: `Quote · ${formatActivityDate(item.created_at)}`,
            timestamp: new Date(item.created_at).getTime(),
            path: "/quotes",
            icon: Quote,
          })),
        ]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 8);

        const suggestionUserKey = String(
          userProfile.id || userProfile.email || "default"
        );

        setRecentActivity(activity);
        setThoughts(thoughts);
        setDiscoveryItems(
          discoveryFeed
            .filter((item) => !item.dismissed)
            .sort((a, b) => {
              const first = new Date(b.published_at || b.created_at).getTime();
              const second = new Date(a.published_at || a.created_at).getTime();
              return first - second;
            })
            .slice(0, 3)
        );
        setActiveTopics(
          [...topics]
            .sort((a, b) => b.total_count - a.total_count || a.name.localeCompare(b.name))
            .slice(0, 5)
        );
        setAiSuggestions(
          buildGlobalWorkspaceSuggestions({
            userKey: suggestionUserKey,
            entities: workspaceContext.entities,
            connections: workspaceContext.connections,
            limit: 4,
          })
        );
        setPriorityBusiness(buildPriorityItem(businessIdeas));
        setPriorityWork(buildPriorityItem(workIdeas));
        setPriorityPersonal(buildPriorityItem(personalIdeas));
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [userProfile.email, userProfile.id]);

  const quickActions = useMemo(
    () => [
      { label: "Add Link", icon: Link2, path: "/capture?type=knowledge" },
      { label: "Add Thought", icon: Brain, path: "/capture?type=thought" },
      { label: "Add Quote", icon: Quote, path: "/capture?type=quote" },
      { label: "Add Business Idea", icon: Lightbulb, path: "/capture?type=business" },
      { label: "Add Work Idea", icon: Briefcase, path: "/capture?type=work" },
      { label: "Add Personal Idea", icon: Heart, path: "/capture?type=personal" },
      { label: "Add Glossary Term", icon: BookOpen, path: "/capture?type=glossary" },
    ],
    []
  );

  const aiInboxItems = useMemo(() => {
    const thoughtActions: AIInboxItem[] = thoughts
      .map((thought) => {
        const suggestion = getThoughtConversionSuggestion(thought);
        if (!suggestion) {
          return null;
        }

        return {
          key: `thought-conversion-${thought.id}-${suggestion.target}`,
          kind: "thought_conversion" as const,
          title: thought.title || thought.content.slice(0, 80),
          description: `AI suggests turning this thought into a ${suggestion.target} idea based on its content, keywords, and priority.`,
          actionLabel: suggestion.label,
          secondaryLabel: "Open thought",
          score: suggestion.score,
          thought,
          target: suggestion.target,
          path: `/thoughts/${thought.id}`,
        };
      })
      .filter((item): item is AIInboxItem => Boolean(item));

    const discoveryActions: AIInboxItem[] = discoveryItems
      .filter((item) => !item.saved_to_library && !item.dismissed)
      .map((item) => ({
        key: `discovery-triage-${item.id}`,
        kind: "discovery_triage" as const,
        title: item.title,
        description:
          "AI can review this discovery item and decide whether it should go to Library with a topic assignment.",
        actionLabel: "Triage and Apply",
        secondaryLabel: "Open discovery",
        score: item.assigned_topic ? 5 : 7,
        discoveryItem: item,
        path: "/discovery",
      }));

    return [...thoughtActions, ...discoveryActions]
      .filter((item) => !aiInboxDismissedKeys.includes(item.key))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [aiInboxDismissedKeys, discoveryItems, thoughts]);

  const handleRunAiInboxAction = async (item: AIInboxItem) => {
    try {
      setAiActionKey(item.key);
      setError("");
      setAiActionMessage("");

      if (item.kind === "thought_conversion") {
        const result = await applyThoughtConversionWithAi({
          thought_id: item.thought.id,
          target_type: item.target,
        });
        setAiActionMessage(
          `AI created ${result.title} and suggested next steps automatically.`
        );
        navigate(result.target_path);
      } else {
        const result = await applyDiscoveryActionWithAi(item.discoveryItem.id);
        setAiActionMessage(
          `AI applied discovery triage: ${result.recommended_action.replaceAll("_", " ")}.`
        );
        navigate(result.target_path);
      }

      setAiInboxDismissedKeys((current) => [...current, item.key]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply AI action.");
    } finally {
      setAiActionKey("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Your knowledge and ideas at a glance, ${userProfile.nickname}.`}
      />

      {aiActionMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {aiActionMessage}
        </div>
      )}

      <section>
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Quick Actions
        </div>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-border/70 bg-white/90 px-4 shadow-sm"
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <ContentCard className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm" hover={false}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Compass className="h-4 w-4 text-accent" />
                  Discovery Feed
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/discovery")}>
                  View all
                </Button>
              </div>

              {discoveryItems.length === 0 ? (
                <EmptyState
                  icon={<Compass className="h-8 w-8" />}
                  title="No discovery items yet"
                  description="Refresh your watchlists to pull in the latest posts and articles."
                />
              ) : (
                <div className="space-y-5">
                  {discoveryItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-transparent p-2 transition-colors hover:border-border hover:bg-background/70"
                    >
                      <div className="text-xl font-semibold leading-snug text-foreground">
                        {item.title}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {[item.source_name || "Source", formatActivityDate(item.published_at || item.created_at)]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm" hover={false}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Hash className="h-4 w-4 text-accent" />
                  Active Topics
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/topics")}>
                  View all
                </Button>
              </div>

              {activeTopics.length === 0 ? (
                <EmptyState
                  icon={<Hash className="h-8 w-8" />}
                  title="No topics yet"
                  description="Create topics to organize your knowledge and help AI suggestions get smarter."
                />
              ) : (
                <div className="flex flex-wrap gap-3">
                  {activeTopics.map((topic) => (
                    <TopicTag
                      key={topic.id}
                      name={topic.name}
                      variant="topic"
                      onClick={() => navigate("/topics")}
                      className="rounded-xl px-3 py-2 text-sm"
                    />
                  ))}
                </div>
              )}
            </ContentCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.8fr_0.9fr]">
            <ContentCard className="rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm" hover={false}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Clock3 className="h-4 w-4 text-accent" />
                  Recent Activity
                </div>
                <div className="text-sm text-muted-foreground">
                  {recentActivity.length} items
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={<Clock3 className="h-8 w-8" />}
                  title="No activity yet"
                  description="Start capturing thoughts, links, ideas, or quotes to bring the workspace to life."
                />
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <Link key={item.id} to={item.path}>
                      <div className="flex items-start gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-background/70">
                        <div className="mt-0.5 rounded-full bg-accent/10 p-2 text-accent">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-foreground">
                            {item.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </ContentCard>

            <AISuggestionBox title="Suggested by AI">
              {aiSuggestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-accent/30 bg-white/70 p-4">
                  Build a few more items and accept some suggested connections to make the AI panel more useful.
                </div>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((item) => (
                    <div
                      key={item.pairKey}
                      className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() =>
                          navigate(
                            getEntityPath(
                              item.suggestion.targetType,
                              item.suggestion.targetId
                            )
                          )
                        }
                      >
                        <div className="flex items-start gap-2 text-sm font-medium text-foreground">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                          <span>
                            Connect <span className="font-semibold">{item.source.label}</span> with{" "}
                            <span className="font-semibold">{item.suggestion.label}</span>
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {item.suggestion.reasons[0] || "Shared topics and patterns suggest a strong relation."}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </AISuggestionBox>
          </section>

          <section>
            <AISuggestionBox title="AI Inbox">
              {aiInboxItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-accent/30 bg-white/70 p-4">
                  No pending AI actions right now. As new thoughts and discovery items arrive,
                  CortexKnows will queue the most useful next moves here.
                </div>
              ) : (
                <div className="space-y-3">
                  {aiInboxItems.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {item.title}
                            </span>
                            <Badge variant="outline">score {item.score}</Badge>
                            <Badge className="bg-accent/10 text-accent">
                              {item.kind === "thought_conversion"
                                ? "conversion"
                                : "discovery triage"}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={aiActionKey === item.key}
                            onClick={() => void handleRunAiInboxAction(item)}
                          >
                            {aiActionKey === item.key ? "Applying..." : item.actionLabel}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(item.path)}
                          >
                            {item.secondaryLabel}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setAiInboxDismissedKeys((current) => [...current, item.key])
                            }
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AISuggestionBox>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <PriorityCard
              title="High Priority Business"
              icon={Lightbulb}
              item={priorityBusiness}
              path="/business-ideas"
            />
            <PriorityCard
              title="High Priority Work"
              icon={Gift}
              item={priorityWork}
              path="/work-ideas"
            />
            <PriorityCard
              title="High Priority Personal"
              icon={Heart}
              item={priorityPersonal}
              path="/personal-ideas"
            />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
