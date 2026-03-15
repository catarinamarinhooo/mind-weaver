import { useEffect, useMemo, useState } from "react";
import { BookmarkPlus, ExternalLink, Filter, Hash, Library, RefreshCw, X } from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
  updateDiscoveryItem,
  type DiscoveryItemResponse,
  type TopicResponse,
  type WatchlistResponse,
} from "@/lib/api";

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
  const [activeSavedMode, setActiveSavedMode] = useState<"all" | "saved">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [discoveryItems, watchlistData, topicData] = await Promise.all([
          getDiscoveryItems(),
          getWatchlists(),
          getTopics(),
        ]);
        setItems(discoveryItems);
        setWatchlists(watchlistData);
        setTopics(topicData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load discovery.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (activeSavedMode === "saved" && !item.saved_in_discovery) return false;
      if (topicFilter !== "all" && (item.assigned_topic || item.topic || "") !== topicFilter) return false;
      if (sourceFilter !== "all" && (item.source_name || "") !== sourceFilter) return false;
      if (!normalizedSearch) return true;
      return [item.title, item.summary, item.topic, item.source_name, item.assigned_topic]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [activeSavedMode, items, searchTerm, sourceFilter, topicFilter]);

  const distinctSources = Array.from(new Set(items.map((item) => item.source_name).filter(Boolean))) as string[];
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
      await Promise.all(watchlists.map((watchlist) => refreshWatchlist(watchlist.id)));
      setItems(await getDiscoveryItems());
      setWatchlists(await getWatchlists());
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
      await saveDiscoveryItemToLibrary(itemId);
      const updated = await updateDiscoveryItem(itemId, { saved_in_discovery: true });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to library.");
    }
  };

  const handleSaveInDiscovery = async (itemId: number) => {
    try {
      const updated = await updateDiscoveryItem(itemId, { saved_in_discovery: true });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    }
  };

  const handleDismiss = async (itemId: number) => {
    try {
      const updated = await updateDiscoveryItem(itemId, { dismissed: true });
      setItems((current) => current.filter((item) => item.id !== updated.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss item.");
    }
  };

  const handleAssignTopic = async (itemId: number, topicName: string) => {
    try {
      const updated = await updateDiscoveryItem(itemId, { assigned_topic: topicName });
      updateLocalItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign topic.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Discovery"
        description="Latest content coming from your watchlists"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters((current) => !current)}>
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void refreshAllWatchlists()}>
              <RefreshCw className="h-3.5 w-3.5" />
              {isRefreshing ? "Refreshing..." : "Refresh Watchlists"}
            </Button>
          </div>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      <div className="mb-4 flex gap-2">
        <Button variant={activeSavedMode === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveSavedMode("all")}>
          All Items
        </Button>
        <Button variant={activeSavedMode === "saved" ? "default" : "outline"} size="sm" onClick={() => setActiveSavedMode("saved")}>
          Saved Topics
        </Button>
      </div>

      {showFilters && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
          <Input
            placeholder="Search title, summary, source or topic"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
            <SelectTrigger><SelectValue /></SelectTrigger>
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
          title="No discovery items yet"
          description="Refresh your watchlists first so Discovery can collect the latest updates."
          action={<Button onClick={() => void refreshAllWatchlists()}>Refresh Now</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ContentCard key={item.id} className="group">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.assigned_topic ? (
                      <TopicTag name={item.assigned_topic} variant="topic" />
                    ) : item.topic ? (
                      <TopicTag name={item.topic} variant="topic" />
                    ) : null}
                    {item.source_name && <span className="text-xs text-muted-foreground">{item.source_name}</span>}
                    {item.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.published_at).toLocaleDateString()}
                      </span>
                    )}
                    {item.saved_to_library && <TopicTag name="Saved to Library" />}
                    {item.saved_in_discovery && <TopicTag name="Saved" />}
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="flex flex-wrap items-center justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Open source">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Save to library" onClick={() => void handleSaveToLibrary(item.id)}>
                      <Library className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Save in discovery" onClick={() => void handleSaveInDiscovery(item.id)}>
                      <BookmarkPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Ignore" onClick={() => void handleDismiss(item.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="mt-2 w-44">
                    <Select
                      value={item.assigned_topic || "__none__"}
                      onValueChange={(value) => void handleAssignTopic(item.id, value === "__none__" ? "" : value)}
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
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoveryPage;
