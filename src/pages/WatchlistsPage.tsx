import { useEffect, useState } from "react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addWatchlistSource,
  createWatchlist,
  deleteWatchlist,
  deleteWatchlistSource,
  getWatchlistSourceSuggestions,
  getWatchlists,
  refreshWatchlist,
  type SourceSuggestionResponse,
  type WatchlistResponse,
} from "@/lib/api";
import { ExternalLink, Eye, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

const WatchlistsPage = () => {
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshingId, setIsRefreshingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceRssUrl, setSourceRssUrl] = useState("");
  const [suggestions, setSuggestions] = useState<SourceSuggestionResponse[]>([]);

  useEffect(() => {
    async function loadWatchlists() {
      try {
        setLoading(true);
        setError("");
        setWatchlists(await getWatchlists());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load watchlists.");
      } finally {
        setLoading(false);
      }
    }

    void loadWatchlists();
  }, []);

  useEffect(() => {
    async function loadSuggestions() {
      if (!topic.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        setSuggestions(await getWatchlistSourceSuggestions(topic.trim()));
      } catch {
        setSuggestions([]);
      }
    }

    void loadSuggestions();
  }, [topic]);

  const resetForm = () => {
    setName("");
    setTopic("");
    setFrequency("daily");
    setDescription("");
    setSourceName("");
    setSourceUrl("");
    setSourceType("");
    setSourceRssUrl("");
    setSuggestions([]);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) {
      setError("Watchlist name and topic are required.");
      return;
    }

    try {
      setError("");
      const created = await createWatchlist({
        name: name.trim(),
        topic: topic.trim(),
        frequency,
        description: description.trim() || null,
        interval_days: null,
        sources: sourceName.trim() && sourceUrl.trim()
          ? [
              {
                name: sourceName.trim(),
                url: sourceUrl.trim(),
                source_type: sourceType.trim() || null,
                rss_url: sourceRssUrl.trim() || null,
              },
            ]
          : [],
      });
      setWatchlists((current) => [created, ...current]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create watchlist.");
    }
  };

  const handleAddSuggestedSource = (suggestion: SourceSuggestionResponse) => {
    setSourceName(suggestion.name);
    setSourceUrl(suggestion.url);
    setSourceType(suggestion.source_type || "");
    setSourceRssUrl(suggestion.rss_url || "");
  };

  const handleRefresh = async (watchlistId: number) => {
    try {
      setIsRefreshingId(watchlistId);
      await refreshWatchlist(watchlistId);
      setWatchlists(await getWatchlists());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh watchlist.");
    } finally {
      setIsRefreshingId(null);
    }
  };

  const handleDeleteWatchlist = async (watchlistId: number) => {
    if (!window.confirm("Delete this watchlist and its discovery items?")) {
      return;
    }
    try {
      await deleteWatchlist(watchlistId);
      setWatchlists((current) => current.filter((item) => item.id !== watchlistId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete watchlist.");
    }
  };

  const handleDeleteSource = async (sourceId: number, watchlistId: number) => {
    try {
      await deleteWatchlistSource(sourceId);
      setWatchlists((current) =>
        current.map((watchlist) =>
          watchlist.id === watchlistId
            ? {
                ...watchlist,
                sources: watchlist.sources.filter((source) => source.id !== sourceId),
              }
            : watchlist
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete source.");
    }
  };

  const handleAddSourceToExisting = async (watchlistId: number, suggestion: SourceSuggestionResponse) => {
    try {
      const created = await addWatchlistSource(watchlistId, {
        name: suggestion.name,
        url: suggestion.url,
        source_type: suggestion.source_type || null,
        rss_url: suggestion.rss_url || null,
      });
      setWatchlists((current) =>
        current.map((watchlist) =>
          watchlist.id === watchlistId
            ? { ...watchlist, sources: [...watchlist.sources, created] }
            : watchlist
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add suggested source.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Watchlists"
        description="Track sources by topic and refresh them into Discovery"
        actions={
          <Button size="sm" className="gap-2" onClick={() => setIsCreating((current) => !current)}>
            <Plus className="h-3.5 w-3.5" /> New Watchlist
          </Button>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      {isCreating && (
        <ContentCard hover={false} className="mb-6 space-y-4">
          <Input placeholder="Watchlist name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Topic, e.g. SaaS or Machine Learning" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Input placeholder="Frequency: daily, weekly, every 3 days..." value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          <Textarea placeholder="What is this watchlist for?" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-medium text-foreground">Initial Source</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input placeholder="Source name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
              <Input placeholder="Source URL or feed URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              <Input placeholder="Type: blog, podcast, newsletter..." value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
              <Input placeholder="RSS URL if available" value={sourceRssUrl} onChange={(e) => setSourceRssUrl(e.target.value)} />
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                Suggested Sources For This Topic
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div key={`${suggestion.name}-${suggestion.url}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{suggestion.name}</div>
                      <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddSuggestedSource(suggestion)}>
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => void handleCreate()}>Create Watchlist</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </ContentCard>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading watchlists...</div>}

      {!loading && watchlists.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-10 w-10" />}
          title="No watchlists yet"
          description="Create your first watchlist to start feeding Discovery with external content."
          action={<Button onClick={() => setIsCreating(true)}>Create Watchlist</Button>}
        />
      ) : (
        <div className="space-y-6">
          {watchlists.map((wl) => (
            <ContentCard key={wl.id} hover={false}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">{wl.name}</h3>
                  <TopicTag name={wl.topic} variant="topic" />
                </div>
                <div className="flex items-center gap-2">
                  <TopicTag name={wl.frequency} />
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleRefresh(wl.id)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isRefreshingId === wl.id ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleDeleteWatchlist(wl.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>

              {wl.description && <p className="mb-3 text-sm text-muted-foreground">{wl.description}</p>}
              {wl.last_checked_at && <div className="mb-3 text-xs text-muted-foreground">Last checked: {new Date(wl.last_checked_at).toLocaleString()}</div>}

              <div className="space-y-2">
                {wl.sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">{source.name}</div>
                      <div className="text-xs text-muted-foreground">{source.source_type || "source"} • {source.url}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={source.url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => void handleDeleteSource(source.id, wl.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {suggestions.length > 0 && topic.trim().toLowerCase() === wl.topic.trim().toLowerCase() && (
                <div className="mt-4 rounded-lg border border-dashed border-border p-4">
                  <div className="mb-3 text-sm font-medium text-foreground">Quick Suggestions For This Watchlist</div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <div key={`${wl.id}-${suggestion.name}-${suggestion.url}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{suggestion.name}</div>
                          <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void handleAddSourceToExisting(wl.id, suggestion)}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistsPage;
