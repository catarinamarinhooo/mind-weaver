import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  BookmarkPlus,
  ExternalLink,
  Filter,
  Hash,
  Library,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RelatedWorkspaceMatches } from "@/components/shared/RelatedWorkspaceMatches";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDiscoveryItems,
  getTopics,
  getWatchlists,
  refreshWatchlist,
  saveDiscoveryItemToLibrary,
  triageDiscoveryItemWithAi,
  updateDiscoveryItem,
  type DiscoveryItemResponse,
  type AIDiscoveryTriageResponse,
  type TopicResponse,
  type WatchlistResponse,
} from "@/lib/api";
import { loadWorkspaceSuggestionContext } from "@/lib/workspaceSuggestions";

type DiscoveryView = "all" | "saved" | "dismissed" | "library";

const VIEW_LABELS: Record<DiscoveryView, string> = {
  all: "All",
  saved: "Saved",
  dismissed: "Dismissed",
  library: "Saved to Library",
};

const DiscoveryPage = () => {
  const [items, setItems] = useState<DiscoveryItemResponse[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [topicFilter, setTopicFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<DiscoveryView>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [relatedContext, setRelatedContext] = useState<Awaited<
    ReturnType<typeof loadWorkspaceSuggestionContext>
  > | null>(null);
  const [triageResults, setTriageResults] = useState<Record<number, AIDiscoveryTriageResponse>>({});
  const [triageLoadingId, setTriageLoadingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [discoveryItems, watchlistData, topicData] = await Promise.all([
        getDiscoveryItems({ include_dismissed: true }),
        getWatchlists(),
        getTopics(),
      ]);
      setItems(discoveryItems);
      setWatchlists(watchlistData);
      setTopics(topicData);
      setRelatedContext(await loadWorkspaceSuggestionContext());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discovery.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const counts = useMemo(
    () => ({
      all: items.filter((item) => !item.dismissed).length,
      saved: items.filter((item) => item.saved_in_discovery && !item.dismissed).length,
      dismissed: items.filter((item) => item.dismissed).length,
      library: items.filter((item) => item.saved_to_library && !item.dismissed).length,
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (activeView === "all" && item.dismissed) return false;
      if (activeView === "saved" && (!item.saved_in_discovery || item.dismissed)) return false;
      if (activeView === "dismissed" && !item.dismissed) return false;
      if (activeView === "library" && (!item.saved_to_library || item.dismissed)) return false;
      if (topicFilter !== "all" && (item.assigned_topic || item.topic || "") !== topicFilter) return false;
      if (sourceFilter !== "all" && (item.source_name || "") !== sourceFilter) return false;
      if (!normalizedSearch) return true;
      return [item.title, item.summary, item.topic, item.source_name, item.assigned_topic]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [activeView, items, searchTerm, sourceFilter, topicFilter]);

  const distinctSources = Array.from(
    new Set(items.map((item) => item.source_name).filter(Boolean))
  ) as string[];

  const discoveryTopics = Array.from(
    new Set(
      [
        ...items.map((item) => item.assigned_topic || item.topic || "").filter(Boolean),
        ...topics.map((topic) => topic.name),
      ]
    )
  );

  const refreshAllWatchlists = async () => {
    try {
      setIsRefreshing(true);
      setError("");
      await Promise.all(watchlists.map((watchlist) => refreshWatchlist(watchlist.id)));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh discovery.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateLocalItem = (updated: DiscoveryItemResponse) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleSaveToLibrary = async (itemId: number) => {
    try {
      setError("");
      await saveDiscoveryItemToLibrary(itemId);
      const updated = await updateDiscoveryItem(itemId, { saved_in_discovery: true });
      updateLocalItem({
        ...updated,
        saved_to_library: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to library.");
    }
  };

  const handleSaveInDiscovery = async (itemId: number) => {
    try {
      setError("");
      const updated = await updateDiscoveryItem(itemId, { saved_in_discovery: true });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    }
  };

  const handleDismiss = async (itemId: number) => {
    try {
      setError("");
      const updated = await updateDiscoveryItem(itemId, { dismissed: true });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss item.");
    }
  };

  const handleRestore = async (itemId: number) => {
    try {
      setError("");
      const updated = await updateDiscoveryItem(itemId, { dismissed: false });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore item.");
    }
  };

  const handleAssignTopic = async (itemId: number, topicName: string) => {
    try {
      setError("");
      const updated = await updateDiscoveryItem(itemId, {
        assigned_topic: topicName === "__none__" ? "" : topicName,
      });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign topic.");
    }
  };

  const handleTriageWithAi = async (itemId: number) => {
    try {
      setError("");
      setTriageLoadingId(itemId);
      const result = await triageDiscoveryItemWithAi(itemId);
      setTriageResults((current) => ({ ...current, [itemId]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to triage with AI.");
    } finally {
      setTriageLoadingId(null);
    }
  };

  const applyTriageRecommendation = async (result: AIDiscoveryTriageResponse) => {
    if (result.suggested_topic) {
      await handleAssignTopic(result.discovery_item_id, result.suggested_topic);
    }

    if (result.recommended_action === "save_to_library") {
      await handleSaveToLibrary(result.discovery_item_id);
      return;
    }
    if (result.recommended_action === "save_in_discovery") {
      await handleSaveInDiscovery(result.discovery_item_id);
      return;
    }
    await handleDismiss(result.discovery_item_id);
  };

  const currentEmptyState = (() => {
    if (activeView === "saved") {
      return {
        title: "No saved discovery items yet",
        description: "Save useful findings so you can come back to them later.",
      };
    }
    if (activeView === "dismissed") {
      return {
        title: "No dismissed items",
        description: "Ignored discovery items will appear here so you can restore them if needed.",
      };
    }
    if (activeView === "library") {
      return {
        title: "Nothing saved to Library yet",
        description: "When an item looks valuable, send it to Library from Discovery.",
      };
    }
    return {
      title: "No discovery items yet",
      description: "Refresh your watchlists first so Discovery can collect the latest updates.",
    };
  })();

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Discovery"
        description="Review external signals, save the important ones, and keep your feed clean"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters((current) => !current)}
            >
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void refreshAllWatchlists()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isRefreshing ? "Refreshing..." : "Refresh Watchlists"}
            </Button>
          </div>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(VIEW_LABELS) as DiscoveryView[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={`rounded-xl border p-4 text-left transition ${
              activeView === view
                ? "border-accent bg-accent/10"
                : "border-border bg-card hover:border-accent/40"
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {VIEW_LABELS[view]}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{counts[view]}</div>
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Current view:</span>
        <TopicTag name={VIEW_LABELS[activeView]} variant="topic" />
      </div>

      {showFilters && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
          <Input
            placeholder="Search title, summary, source or topic"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {discoveryTopics.map((topicName) => (
                <SelectItem key={topicName} value={topicName}>
                  {topicName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {distinctSources.map((sourceName) => (
                <SelectItem key={sourceName} value={sourceName}>
                  {sourceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading discovery...</div>}

      {!loading && filteredItems.length === 0 ? (
        <EmptyState
          icon={<Hash className="h-10 w-10" />}
          title={currentEmptyState.title}
          description={currentEmptyState.description}
          action={
            activeView === "all" ? (
              <Button onClick={() => void refreshAllWatchlists()}>Refresh Now</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ContentCard key={item.id} className="group">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.assigned_topic ? (
                      <TopicTag name={item.assigned_topic} variant="topic" />
                    ) : item.topic ? (
                      <TopicTag name={item.topic} variant="topic" />
                    ) : null}
                    {item.source_name && (
                      <span className="text-xs text-muted-foreground">{item.source_name}</span>
                    )}
                    {item.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.published_at).toLocaleDateString()}
                      </span>
                    )}
                    {item.saved_to_library && <TopicTag name="Saved to Library" />}
                    {item.saved_in_discovery && <TopicTag name="Saved" />}
                    {item.dismissed && <TopicTag name="Dismissed" />}
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="flex flex-wrap items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        title="Open source"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    {!item.dismissed && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Triage with AI"
                          onClick={() => void handleTriageWithAi(item.id)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Save to library"
                          onClick={() => void handleSaveToLibrary(item.id)}
                        >
                          <Library className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Save in discovery"
                          onClick={() => void handleSaveInDiscovery(item.id)}
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Ignore"
                          onClick={() => void handleDismiss(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {item.dismissed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        title="Restore"
                        onClick={() => void handleRestore(item.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-2 w-44">
                    <Select
                      value={item.assigned_topic || "__none__"}
                      onValueChange={(value) => void handleAssignTopic(item.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No assigned topic</SelectItem>
                        {topics.map((topic) => (
                          <SelectItem key={`${item.id}-${topic.id}`} value={topic.name}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {!item.dismissed && (
                <div className="mt-4">
                  {triageResults[item.id] && (
                    <div className="mb-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Sparkles className="h-4 w-4 text-accent" />
                          AI Triage
                        </div>
                        <Button
                          size="sm"
                          onClick={() => void applyTriageRecommendation(triageResults[item.id])}
                        >
                          Apply Recommendation
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs mb-2">
                        <TopicTag
                          name={`score ${triageResults[item.id].relevance_score}/10`}
                          variant="topic"
                        />
                        <TopicTag
                          name={triageResults[item.id].recommended_action.replaceAll("_", " ")}
                        />
                        {triageResults[item.id].suggested_topic && (
                          <TopicTag
                            name={triageResults[item.id].suggested_topic || ""}
                            variant="topic"
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {triageResults[item.id].explanation}
                      </p>
                    </div>
                  )}

                  {triageLoadingId === item.id && (
                    <div className="mb-4 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-muted-foreground">
                      AI is reviewing this discovery item...
                    </div>
                  )}

                  <RelatedWorkspaceMatches
                    context={relatedContext}
                    source={{
                      id: item.id,
                      label: item.title,
                      text: [
                        item.title,
                        item.summary,
                        item.source_name,
                        item.topic,
                        item.assigned_topic,
                      ]
                        .filter(Boolean)
                        .join(" "),
                      topics:
                        item.assigned_topic || item.topic
                          ? [
                              {
                                id: -item.id,
                                name: item.assigned_topic || item.topic || "",
                                description: "",
                                created_at: item.created_at,
                                thought_count: 0,
                                knowledge_item_count: 0,
                                total_count: 0,
                              },
                            ]
                          : [],
                    }}
                  />
                </div>
              )}
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoveryPage;
