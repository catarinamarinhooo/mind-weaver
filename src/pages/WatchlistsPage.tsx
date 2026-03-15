import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  addWatchlistSource,
  createWatchlist,
  deleteWatchlist,
  deleteWatchlistSource,
  getWatchlistSourceSuggestions,
  getWatchlists,
  refreshWatchlist,
  updateWatchlist,
  type SourceSuggestionResponse,
  type WatchlistResponse,
} from "@/lib/api";
import {
  Check,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "interval", label: "Custom interval" },
];

function getFrequencyPreset(
  frequency: string | null | undefined,
  intervalDays: number | null | undefined
) {
  if (intervalDays && intervalDays > 0) {
    return "interval";
  }
  return frequency?.trim().toLowerCase() === "weekly" ? "weekly" : "daily";
}

function getWatchlistPayload(
  preset: string,
  intervalDaysValue: string
): { frequency: string; interval_days: number | null } {
  if (preset === "interval") {
    const parsedInterval = Number.parseInt(intervalDaysValue, 10);
    if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
      throw new Error("For custom frequency, enter a valid number of days.");
    }
    return {
      frequency: `every ${parsedInterval} days`,
      interval_days: parsedInterval,
    };
  }

  return {
    frequency: preset,
    interval_days: null,
  };
}

function formatWatchlistFrequency(watchlist: WatchlistResponse) {
  if (watchlist.interval_days && watchlist.interval_days > 0) {
    return watchlist.interval_days === 1
      ? "Every 1 day"
      : `Every ${watchlist.interval_days} days`;
  }
  const normalized = (watchlist.frequency || "daily").trim().toLowerCase();
  if (normalized === "weekly") return "Weekly";
  return "Daily";
}

const WatchlistsPage = () => {
  const [watchlists, setWatchlists] = useState<WatchlistResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshingId, setIsRefreshingId] = useState<number | null>(null);
  const [editingWatchlistId, setEditingWatchlistId] = useState<number | null>(null);
  const [addingSourceWatchlistId, setAddingSourceWatchlistId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [frequencyPreset, setFrequencyPreset] = useState("daily");
  const [intervalDays, setIntervalDays] = useState("3");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceRssUrl, setSourceRssUrl] = useState("");
  const [suggestions, setSuggestions] = useState<SourceSuggestionResponse[]>([]);

  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editFrequencyPreset, setEditFrequencyPreset] = useState("daily");
  const [editIntervalDays, setEditIntervalDays] = useState("3");
  const [editDescription, setEditDescription] = useState("");

  const [existingSourceName, setExistingSourceName] = useState("");
  const [existingSourceUrl, setExistingSourceUrl] = useState("");
  const [existingSourceType, setExistingSourceType] = useState("");
  const [existingSourceRssUrl, setExistingSourceRssUrl] = useState("");

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      setError("");
      setWatchlists(await getWatchlists());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const resetCreateForm = () => {
    setName("");
    setTopic("");
    setFrequencyPreset("daily");
    setIntervalDays("3");
    setDescription("");
    setSourceName("");
    setSourceUrl("");
    setSourceType("");
    setSourceRssUrl("");
    setSuggestions([]);
    setIsCreating(false);
  };

  const resetExistingSourceForm = () => {
    setExistingSourceName("");
    setExistingSourceUrl("");
    setExistingSourceType("");
    setExistingSourceRssUrl("");
    setAddingSourceWatchlistId(null);
  };

  const startEditingWatchlist = (watchlist: WatchlistResponse) => {
    setEditingWatchlistId(watchlist.id);
    setEditName(watchlist.name);
    setEditTopic(watchlist.topic);
    setEditFrequencyPreset(getFrequencyPreset(watchlist.frequency, watchlist.interval_days));
    setEditIntervalDays(String(watchlist.interval_days || 3));
    setEditDescription(watchlist.description || "");
  };

  const cancelEditingWatchlist = () => {
    setEditingWatchlistId(null);
    setEditName("");
    setEditTopic("");
    setEditFrequencyPreset("daily");
    setEditIntervalDays("3");
    setEditDescription("");
  };

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) {
      setError("Watchlist name and topic are required.");
      return;
    }

    try {
      setError("");
      const frequencyData = getWatchlistPayload(frequencyPreset, intervalDays);
      const created = await createWatchlist({
        name: name.trim(),
        topic: topic.trim(),
        frequency: frequencyData.frequency,
        interval_days: frequencyData.interval_days,
        description: description.trim() || null,
        sources:
          sourceName.trim() && sourceUrl.trim()
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
      resetCreateForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create watchlist.");
    }
  };

  const handleSaveWatchlist = async (watchlistId: number) => {
    if (!editName.trim() || !editTopic.trim()) {
      setError("Watchlist name and topic are required.");
      return;
    }

    try {
      setError("");
      const frequencyData = getWatchlistPayload(editFrequencyPreset, editIntervalDays);
      const updated = await updateWatchlist(watchlistId, {
        name: editName.trim(),
        topic: editTopic.trim(),
        frequency: frequencyData.frequency,
        interval_days: frequencyData.interval_days,
        description: editDescription.trim() || null,
      });
      setWatchlists((current) =>
        current.map((watchlist) => (watchlist.id === watchlistId ? updated : watchlist))
      );
      cancelEditingWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update watchlist.");
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
      setError("");
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
      setError("");
      await deleteWatchlist(watchlistId);
      setWatchlists((current) => current.filter((item) => item.id !== watchlistId));
      if (editingWatchlistId === watchlistId) {
        cancelEditingWatchlist();
      }
      if (addingSourceWatchlistId === watchlistId) {
        resetExistingSourceForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete watchlist.");
    }
  };

  const handleDeleteSource = async (sourceId: number, watchlistId: number) => {
    try {
      setError("");
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

  const handleAddSourceToExisting = async (watchlistId: number) => {
    if (!existingSourceName.trim() || !existingSourceUrl.trim()) {
      setError("Source name and URL are required.");
      return;
    }

    try {
      setError("");
      const created = await addWatchlistSource(watchlistId, {
        name: existingSourceName.trim(),
        url: existingSourceUrl.trim(),
        source_type: existingSourceType.trim() || null,
        rss_url: existingSourceRssUrl.trim() || null,
      });
      setWatchlists((current) =>
        current.map((watchlist) =>
          watchlist.id === watchlistId
            ? { ...watchlist, sources: [...watchlist.sources, created] }
            : watchlist
        )
      );
      resetExistingSourceForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source.");
    }
  };

  const handleAddSuggestedSourceToExisting = async (
    watchlistId: number,
    suggestion: SourceSuggestionResponse
  ) => {
    try {
      setError("");
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
        description="Track sources by topic, tune refresh frequency, and feed Discovery with fresh signals"
        actions={
          <Button size="sm" className="gap-2" onClick={() => setIsCreating((current) => !current)}>
            <Plus className="h-3.5 w-3.5" /> New Watchlist
          </Button>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      {isCreating && (
        <ContentCard hover={false} className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Watchlist name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Topic, e.g. SaaS or Machine Learning"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
            <Select value={frequencyPreset} onValueChange={setFrequencyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {frequencyPreset === "interval" ? (
              <Input
                type="number"
                min="1"
                placeholder="How many days between refreshes?"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
              />
            ) : (
              <div className="flex items-center rounded-md border border-border bg-secondary/30 px-3 text-sm text-muted-foreground">
                The scheduler will refresh this watchlist automatically.
              </div>
            )}
          </div>

          <Textarea
            placeholder="What is this watchlist for?"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-medium text-foreground">Initial Source</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                placeholder="Source name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
              <Input
                placeholder="Source URL or website"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <Input
                placeholder="Type: blog, podcast, newsletter..."
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              />
              <Input
                placeholder="RSS URL if available"
                value={sourceRssUrl}
                onChange={(e) => setSourceRssUrl(e.target.value)}
              />
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
                  <div
                    key={`${suggestion.name}-${suggestion.url}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {suggestion.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.reason}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSuggestedSource(suggestion)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => void handleCreate()}>Create Watchlist</Button>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
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
          {watchlists.map((wl) => {
            const isEditing = editingWatchlistId === wl.id;
            const isAddingSource = addingSourceWatchlistId === wl.id;
            const watchlistSuggestions =
              suggestions.length > 0 && topic.trim().toLowerCase() === wl.topic.trim().toLowerCase()
                ? suggestions
                : [];

            return (
              <ContentCard key={wl.id} hover={false}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">{wl.name}</h3>
                    <TopicTag name={wl.topic} variant="topic" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TopicTag name={formatWatchlistFrequency(wl)} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void handleRefresh(wl.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {isRefreshingId === wl.id ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => (isEditing ? cancelEditingWatchlist() : startEditingWatchlist(wl))}
                    >
                      {isEditing ? (
                        <>
                          <X className="h-3.5 w-3.5" /> Cancel
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        isAddingSource ? resetExistingSourceForm() : setAddingSourceWatchlistId(wl.id)
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isAddingSource ? "Cancel Source" : "Add Source"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void handleDeleteWatchlist(wl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mb-4 space-y-3 rounded-lg border border-border p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                      <Select value={editFrequencyPreset} onValueChange={setEditFrequencyPreset}>
                        <SelectTrigger>
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editFrequencyPreset === "interval" ? (
                        <Input
                          type="number"
                          min="1"
                          value={editIntervalDays}
                          onChange={(e) => setEditIntervalDays(e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center rounded-md border border-border bg-secondary/30 px-3 text-sm text-muted-foreground">
                          This watchlist will use the selected recurring cadence.
                        </div>
                      )}
                    </div>
                    <Textarea
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => void handleSaveWatchlist(wl.id)}>
                        <Check className="mr-2 h-3.5 w-3.5" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={cancelEditingWatchlist}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {wl.description && (
                      <p className="mb-3 text-sm text-muted-foreground">{wl.description}</p>
                    )}
                    {wl.last_checked_at && (
                      <div className="mb-3 text-xs text-muted-foreground">
                        Last checked: {new Date(wl.last_checked_at).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  {wl.sources.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                      No sources yet. Add one to start feeding Discovery.
                    </div>
                  ) : (
                    wl.sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">{source.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {source.source_type || "source"} · {source.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a href={source.url} target="_blank" rel="noreferrer">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => void handleDeleteSource(source.id, wl.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isAddingSource && (
                  <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
                    <div className="text-sm font-medium text-foreground">
                      Add A Source To This Watchlist
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Source name"
                        value={existingSourceName}
                        onChange={(e) => setExistingSourceName(e.target.value)}
                      />
                      <Input
                        placeholder="Source URL or website"
                        value={existingSourceUrl}
                        onChange={(e) => setExistingSourceUrl(e.target.value)}
                      />
                      <Input
                        placeholder="Type: blog, podcast, newsletter..."
                        value={existingSourceType}
                        onChange={(e) => setExistingSourceType(e.target.value)}
                      />
                      <Input
                        placeholder="RSS URL if available"
                        value={existingSourceRssUrl}
                        onChange={(e) => setExistingSourceRssUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => void handleAddSourceToExisting(wl.id)}>
                        Add Source
                      </Button>
                      <Button variant="outline" onClick={resetExistingSourceForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {watchlistSuggestions.length > 0 && (
                  <div className="mt-4 rounded-lg border border-dashed border-border p-4">
                    <div className="mb-3 text-sm font-medium text-foreground">
                      Quick Suggestions For This Watchlist
                    </div>
                    <div className="space-y-2">
                      {watchlistSuggestions.map((suggestion) => (
                        <div
                          key={`${wl.id}-${suggestion.name}-${suggestion.url}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">
                              {suggestion.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.reason}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAddSuggestedSourceToExisting(wl.id, suggestion)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ContentCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WatchlistsPage;
