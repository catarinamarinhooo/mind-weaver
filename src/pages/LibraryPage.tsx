import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ActionableAISuggestions } from "@/components/shared/ActionableAISuggestions";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopicTag } from "@/components/shared/TopicTag";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import {
  createConnection,
  deleteConnection,
  deleteKnowledgeItem,
  getAiMediaInsights,
  getAiSuggestions,
  getAiSummary,
  getBusinessIdeas,
  getConnections,
  getKnowledgeItemById,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
  updateKnowledgeItem,
  type AISuggestionsResponse,
  type ConnectionResponse,
  type KnowledgeItemResponse,
  type MediaLink,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  BookOpen,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const LibraryPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<KnowledgeItemResponse[]>([]);
  const [item, setItem] = useState<KnowledgeItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);
  const [connectionType, setConnectionType] = useState("thought");
  const [connectionTargetId, setConnectionTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [connectionNotes, setConnectionNotes] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActionKey, setAiActionKey] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [mediaLabel, setMediaLabel] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaNotes, setMediaNotes] = useState("");
  const [savingMedia, setSavingMedia] = useState(false);
  const [mediaInsightLoadingKey, setMediaInsightLoadingKey] = useState("");
  const [connectionOptions, setConnectionOptions] = useState<
    Record<string, { id: number; label: string }[]>
  >({
    thought: [],
    business_idea: [],
    work_idea: [],
    personal_idea: [],
    quote: [],
    topic: [],
  });
  const savedItem = searchParams.get("saved");
  const updatedItem = searchParams.get("updated");
  const itemId = id ? Number(id) : null;
  const isDetailView = Number.isInteger(itemId) && itemId !== null;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredItems = items
    .filter((currentItem) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      return [
        currentItem.title,
        currentItem.url,
        currentItem.personal_note,
        currentItem.source,
        currentItem.description,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearchTerm));
    })
    .sort((a, b) => {
      const firstDate = new Date(a.created_at).getTime();
      const secondDate = new Date(b.created_at).getTime();

      return sortOrder === "newest"
        ? secondDate - firstDate
        : firstDate - secondDate;
    });

  useEffect(() => {
    async function loadItems() {
      try {
        setLoading(true);
        setError("");
        setItems(await getKnowledgeItems());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load knowledge items."
        );
      } finally {
        setLoading(false);
      }
    }

    if (!isDetailView) {
      void loadItems();
    }
  }, [isDetailView]);

  useEffect(() => {
    async function loadItemDetail(currentItemId: number) {
      try {
        setLoading(true);
        setError("");
        const [
          knowledgeItem,
          connectionData,
          thoughts,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
          topics,
        ] = await Promise.all([
          getKnowledgeItemById(currentItemId),
          getConnections({ entity_type: "knowledge", entity_id: currentItemId }),
          getThoughts(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getTopics(),
        ]);

        setItem(knowledgeItem);
        setConnections(connectionData);
        setConnectionOptions({
          thought: thoughts.map((entry) => ({
            id: entry.id,
            label: entry.title || entry.content.slice(0, 60),
          })),
          business_idea: businessIdeas.map((entry) => ({
            id: entry.id,
            label: entry.title,
          })),
          work_idea: workIdeas.map((entry) => ({
            id: entry.id,
            label: entry.title,
          })),
          personal_idea: personalIdeas.map((entry) => ({
            id: entry.id,
            label: entry.title,
          })),
          quote: quotes.map((entry) => ({
            id: entry.id,
            label: entry.book_title,
          })),
          topic: topics.map((entry) => ({
            id: entry.id,
            label: entry.name,
          })),
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load knowledge item."
        );
      } finally {
        setLoading(false);
      }
    }

    if (isDetailView && itemId !== null) {
      void loadItemDetail(itemId);
      return;
    }

    setItem(null);
  }, [isDetailView, itemId]);

  useEffect(() => {
    setAiSuggestions(null);
    setSummaryText("");
  }, [itemId]);

  const handleDelete = async (idToDelete: number) => {
    if (!window.confirm("Are you sure you want to delete this knowledge item?")) {
      return;
    }

    try {
      setIsDeletingId(idToDelete);
      setError("");
      setActionMessage("");

      await deleteKnowledgeItem(idToDelete);
      setActionMessage("Knowledge item deleted successfully.");

      if (isDetailView && itemId === idToDelete) {
        navigate("/library?deleted=knowledge");
        return;
      }

      setItems((currentItems) => currentItems.filter((entry) => entry.id !== idToDelete));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete knowledge item."
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCreateConnection = async () => {
    if (!item || !connectionTargetId) {
      setError("Select an entity to connect.");
      return;
    }

    try {
      setError("");
      const newConnection = await createConnection({
        source_type: "knowledge",
        source_id: item.id,
        target_type: connectionType,
        target_id: Number(connectionTargetId),
        relationship_type: relationshipType.trim() || null,
        notes: connectionNotes.trim() || null,
      });
      setConnections((current) => [newConnection, ...current]);
      setConnectionTargetId("");
      setRelationshipType("");
      setConnectionNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create connection.");
    }
  };

  const handleDeleteConnection = async (connectionId: number) => {
    try {
      await deleteConnection(connectionId);
      setConnections((current) =>
        current.filter((connection) => connection.id !== connectionId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete connection.");
    }
  };

  const handleLoadAiSuggestions = async () => {
    if (!item) {
      return;
    }
    try {
      setAiLoading(true);
      setError("");
      setAiSuggestions(await getAiSuggestions("knowledge", item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI suggestions.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestedTopic = async (topicId: number) => {
    if (!item || item.topics.some((topic) => topic.id === topicId)) {
      return;
    }

    try {
      setAiActionKey(`topic-${topicId}`);
      setError("");
      const updatedItem = await updateKnowledgeItem(item.id, {
        title: item.title,
        url: item.url,
        personal_note: item.personal_note,
        source: item.source,
        description: item.description,
        attachments: item.attachments,
        media_links: item.media_links,
        topic_ids: [...item.topics.map((topic) => topic.id), topicId],
      });
      setItem(updatedItem);
      setAiSuggestions((current) =>
        current
          ? {
              ...current,
              suggested_topics: current.suggested_topics.filter(
                (topic) => topic.topic_id !== topicId
              ),
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add topic.");
    } finally {
      setAiActionKey("");
    }
  };

  const handleCreateSuggestedConnection = async (
    targetType: string,
    targetId: number,
    explanation: string
  ) => {
    if (!item) {
      return;
    }

    try {
      setAiActionKey(`entity-${targetType}-${targetId}`);
      setError("");
      const newConnection = await createConnection({
        source_type: "knowledge",
        source_id: item.id,
        target_type: targetType,
        target_id: targetId,
        relationship_type: "ai_suggested",
        notes: explanation,
      });
      setConnections((current) => [newConnection, ...current]);
      setAiSuggestions((current) =>
        current
          ? {
              ...current,
              suggested_related_entities: current.suggested_related_entities.filter(
                (entity) =>
                  !(
                    entity.entity_type === targetType && entity.entity_id === targetId
                  )
              ),
            }
          : current
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create suggested connection."
      );
    } finally {
      setAiActionKey("");
    }
  };

  const handleSummarize = async () => {
    if (!item) {
      return;
    }
    try {
      setSummaryLoading(true);
      setError("");
      const result = await getAiSummary({
        entity_type: "knowledge",
        entity_id: item.id,
      });
      setSummaryText(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize knowledge item.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAddMediaLink = async () => {
    if (!item || !mediaUrl.trim()) {
      setError("Media URL is required.");
      return;
    }

    const nextMediaLinks: MediaLink[] = [
      ...(item.media_links || []),
      {
        label: mediaLabel.trim() || mediaType.trim() || "Media link",
        url: mediaUrl.trim(),
        media_type: mediaType.trim() || null,
        notes: mediaNotes.trim() || null,
      },
    ];

    try {
      setSavingMedia(true);
      setError("");
      const updatedItem = await updateKnowledgeItem(item.id, {
        title: item.title,
        url: item.url,
        personal_note: item.personal_note,
        source: item.source,
        description: item.description,
        attachments: item.attachments,
        media_links: nextMediaLinks,
        topic_ids: item.topics.map((topic) => topic.id),
      });
      setItem(updatedItem);
      setMediaLabel("");
      setMediaUrl("");
      setMediaType("");
      setMediaNotes("");
      setActionMessage("Media link added successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add media link.");
    } finally {
      setSavingMedia(false);
    }
  };

  const handleRemoveMediaLink = async (urlToRemove: string) => {
    if (!item) {
      return;
    }

    try {
      setSavingMedia(true);
      setError("");
      const updatedItem = await updateKnowledgeItem(item.id, {
        title: item.title,
        url: item.url,
        personal_note: item.personal_note,
        source: item.source,
        description: item.description,
        attachments: item.attachments,
        media_links: item.media_links.filter((mediaLink) => mediaLink.url !== urlToRemove),
        topic_ids: item.topics.map((topic) => topic.id),
      });
      setItem(updatedItem);
      setActionMessage("Media link removed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove media link.");
    } finally {
      setSavingMedia(false);
    }
  };

  const handleAnalyzeMediaLink = async (mediaLink: MediaLink) => {
    if (!item) {
      return;
    }

    try {
      setMediaInsightLoadingKey(mediaLink.url);
      setError("");
      const result = await getAiMediaInsights({
        knowledge_item_id: item.id,
        media_url: mediaLink.url,
        media_type: mediaLink.media_type,
        label: mediaLink.label,
        notes: mediaLink.notes,
      });
      setItem((current) =>
        current
          ? {
              ...current,
              media_links: current.media_links.map((entry) =>
                entry.url === mediaLink.url
                  ? {
                      ...entry,
                      ai_title: result.title,
                      ai_summary: result.summary,
                      ai_key_points: result.key_points,
                      ai_last_analyzed_at: result.analyzed_at,
                      ai_source_kind: result.source_kind,
                      ai_transcript_used: result.transcript_used,
                    }
                  : entry
              ),
            }
          : current
      );
      setActionMessage("AI media insight saved to this knowledge item.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze media link.");
    } finally {
      setMediaInsightLoadingKey("");
    }
  };

  const handleDeleteMediaInsight = async (mediaLink: MediaLink) => {
    if (!item) {
      return;
    }

    try {
      setSavingMedia(true);
      setError("");
      const updatedItem = await updateKnowledgeItem(item.id, {
        title: item.title,
        url: item.url,
        personal_note: item.personal_note,
        source: item.source,
        description: item.description,
        attachments: item.attachments,
        topic_ids: item.topics.map((topic) => topic.id),
        media_links: item.media_links.map((entry) =>
          entry.url === mediaLink.url
            ? {
                label: entry.label,
                url: entry.url,
                media_type: entry.media_type || null,
                notes: entry.notes || null,
              }
            : entry
        ),
      });
      setItem(updatedItem);
      setActionMessage("AI media insight deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete media insight.");
    } finally {
      setSavingMedia(false);
    }
  };

  if (isDetailView) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/library")}
          className="mb-4 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Button>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading knowledge item...</div>
        )}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && item && (
          <>
            {actionMessage && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {actionMessage}
              </div>
            )}
            {updatedItem === "knowledge" && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Knowledge item updated successfully.
              </div>
            )}

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {item.title || item.url}
                </h1>
                {item.source && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Source: {item.source}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => void handleSummarize()}
                >
                  {summaryLoading ? "Summarizing..." : "Summarize"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    navigate(`/capture?type=knowledge&mode=edit&id=${item.id}`)
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isDeletingId === item.id}
                  onClick={() => void handleDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingId === item.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="glass-card mb-6 p-6 space-y-4">
              {item.description && (
                <p className="text-foreground">{item.description}</p>
              )}
              {item.personal_note && (
                <p className="text-sm text-muted-foreground">{item.personal_note}</p>
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 underline break-all"
              >
                <Link2 className="h-4 w-4" />
                {item.url}
              </a>
            </div>

            {item.topics.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {item.topics.map((topic) => (
                  <TopicTag key={topic.id} name={topic.name} variant="topic" />
                ))}
              </div>
            )}

            {item.attachments.length > 0 && (
              <div className="mb-6">
                <AttachmentPreviewList title="Images and Files" attachments={item.attachments} />
              </div>
            )}

            <div className="mb-6 rounded-xl border border-border bg-background/80 p-4 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  YouTube / Podcast Links
                </div>
                <p className="text-sm text-muted-foreground">
                  Add media links and notes. AI summaries use these notes as extra context for main ideas.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Label, e.g. Podcast episode"
                  value={mediaLabel}
                  onChange={(event) => setMediaLabel(event.target.value)}
                />
                <Input
                  placeholder="https://youtube.com/... or podcast URL"
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={savingMedia}
                  onClick={() => void handleAddMediaLink()}
                >
                  {savingMedia ? "Saving..." : "Add Media Link"}
                </Button>
              </div>

              <Input
                placeholder="Optional notes, transcript snippet, or key ideas from this media"
                value={mediaNotes}
                onChange={(event) => setMediaNotes(event.target.value)}
              />

              <div className="space-y-3">
                {item.media_links.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No media links yet.
                  </div>
                ) : (
                  item.media_links.map((mediaLink) => (
                    <div key={`${mediaLink.url}-${mediaLink.label}`} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{mediaLink.label}</div>
                          <a
                            href={mediaLink.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-sm text-blue-600 underline"
                          >
                            {mediaLink.url}
                          </a>
                          {mediaLink.media_type && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Type: {mediaLink.media_type}
                            </div>
                          )}
                          {mediaLink.notes && (
                            <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {mediaLink.notes}
                            </div>
                          )}
                          {mediaLink.ai_summary && (
                            <div className="mt-3 rounded-md border border-border bg-secondary/40 p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                AI Media Insight
                              </div>
                              <div className="mt-2 text-sm font-medium text-foreground">
                                {mediaLink.ai_title || mediaLink.label}
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                                {mediaLink.ai_summary}
                              </div>
                              {(mediaLink.ai_key_points || []).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {(mediaLink.ai_key_points || []).map((point) => (
                                    <div key={point} className="text-sm text-muted-foreground">
                                      - {point}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="mt-2 text-xs text-muted-foreground">
                                Source: {mediaLink.ai_source_kind || "unknown"}
                                {mediaLink.ai_transcript_used ? " - transcript used" : ""}
                                {mediaLink.ai_last_analyzed_at
                                  ? ` - saved ${new Date(mediaLink.ai_last_analyzed_at).toLocaleString()}`
                                  : ""}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={mediaInsightLoadingKey === mediaLink.url}
                            onClick={() => void handleAnalyzeMediaLink(mediaLink)}
                          >
                            {mediaInsightLoadingKey === mediaLink.url
                              ? "Analyzing..."
                              : mediaLink.ai_summary
                                ? "Refresh Insight"
                                : "Analyze with AI"}
                          </Button>
                          {mediaLink.ai_summary && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={savingMedia}
                              onClick={() => void handleDeleteMediaInsight(mediaLink)}
                            >
                              Delete Insight
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={savingMedia}
                            onClick={() => void handleRemoveMediaLink(mediaLink.url)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {summaryText && (
              <div className="mb-6 rounded-xl border border-border bg-background/80 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  AI Summary
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{summaryText}</p>
              </div>
            )}

            <ActionableAISuggestions
              suggestions={aiSuggestions}
              loading={aiLoading}
              actionKey={aiActionKey}
              appliedTopicIds={item.topics.map((topic) => topic.id)}
              onLoadSuggestions={handleLoadAiSuggestions}
              onApplyTopic={(topicId) => handleAddSuggestedTopic(topicId)}
              onApplyEntity={(entityType, entityId, explanation) =>
                handleCreateSuggestedConnection(entityType, entityId, explanation)
              }
              onOpenEntity={(entityType, entityId) =>
                navigate(
                  entityType === "thought"
                    ? `/thoughts/${entityId}`
                    : entityType === "knowledge"
                      ? `/library/${entityId}`
                      : entityType === "business_idea"
                        ? "/business-ideas"
                        : entityType === "work_idea"
                          ? "/work-ideas"
                          : entityType === "personal_idea"
                            ? "/personal-ideas"
                            : entityType === "quote"
                              ? "/quotes"
                              : "/topics"
                )
              }
            />

            <div className="glass-card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Connections
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thought">Thought</SelectItem>
                    <SelectItem value="business_idea">Business Idea</SelectItem>
                    <SelectItem value="work_idea">Work Idea</SelectItem>
                    <SelectItem value="personal_idea">Personal Idea</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={connectionTargetId} onValueChange={setConnectionTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionOptions[connectionType]?.map((option) => (
                      <SelectItem key={`${connectionType}-${option.id}`} value={String(option.id)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={relationshipType}
                  onChange={(event) => setRelationshipType(event.target.value)}
                  placeholder="Relationship type, e.g. expands"
                />
                <Input
                  value={connectionNotes}
                  onChange={(event) => setConnectionNotes(event.target.value)}
                  placeholder="Short note about this relation"
                />
              </div>

              <div className="mt-3">
                <Button onClick={() => void handleCreateConnection()}>
                  Add Connection
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {connections.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No connections yet for this knowledge item.
                  </div>
                ) : (
                  connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {connection.source_label} {"->"} {connection.target_label}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {connection.relationship_type || "related"}
                        </div>
                        {connection.notes && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {connection.notes}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDeleteConnection(connection.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6">
              <ConnectionSuggestionsPanel
                source={{
                  id: item.id,
                  type: "knowledge",
                  label: item.title || item.url,
                  text: [
                    item.title,
                    item.url,
                    item.description,
                    item.personal_note,
                    item.source,
                    ...item.media_links.flatMap((mediaLink) => [
                      mediaLink.label,
                      mediaLink.url,
                      mediaLink.media_type,
                      mediaLink.notes,
                      mediaLink.ai_title,
                      mediaLink.ai_summary,
                      ...(mediaLink.ai_key_points || []),
                    ]),
                  ]
                    .filter(Boolean)
                    .join(" "),
                  topics: item.topics,
                }}
                onConnectionCreated={(connection) =>
                  setConnections((current) => [connection, ...current])
                }
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Library"
        description="Saved knowledge items and resources"
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => navigate("/capture?type=knowledge")}
          >
            <Plus className="h-3.5 w-3.5" /> New Knowledge Item
          </Button>
        }
      />

      {savedItem === "knowledge" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Knowledge item saved successfully.
        </div>
      )}

      {updatedItem === "knowledge" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Knowledge item updated successfully.
        </div>
      )}

      {searchParams.get("deleted") === "knowledge" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Knowledge item deleted successfully.
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {actionMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, URL, source, note, or description"
            className="pl-9"
          />
        </div>

        {searchTerm && (
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            Clear
          </Button>
        )}

        <div className="w-full md:w-52">
          <Select
            value={sortOrder}
            onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading library...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No knowledge items yet. Go to Capture and save your first one.
        </div>
      )}

      {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No matching knowledge items"
          description="Try a different search term or clear the filter to see everything again."
          action={
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          }
        />
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Showing {filteredItems.length} of {items.length} knowledge items.
          </div>

          {filteredItems.map((currentItem) => (
            <ContentCard key={currentItem.id} onClick={() => navigate(`/library/${currentItem.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {currentItem.title || currentItem.url}
                  </h3>

                  {currentItem.description && (
                    <p className="text-sm text-muted-foreground">
                      {currentItem.description}
                    </p>
                  )}

                  {currentItem.personal_note && (
                    <p className="text-sm text-muted-foreground">
                      {currentItem.personal_note}
                    </p>
                  )}

                  <a
                    href={currentItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline break-all"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {currentItem.url}
                  </a>

                  {currentItem.source && (
                    <div className="text-xs text-muted-foreground">
                      Source: {currentItem.source}
                    </div>
                  )}

                  {currentItem.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentItem.topics.map((topic) => (
                        <TopicTag key={topic.id} name={topic.name} variant="topic" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/capture?type=knowledge&mode=edit&id=${currentItem.id}`);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isDeletingId === currentItem.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(currentItem.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeletingId === currentItem.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
