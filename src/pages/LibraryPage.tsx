import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  getBusinessIdeas,
  getConnections,
  getKnowledgeItemById,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
  type ConnectionResponse,
  type KnowledgeItemResponse,
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
