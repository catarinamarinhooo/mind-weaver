import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopicTag } from "@/components/shared/TopicTag";
import { AISuggestionBox } from "@/components/shared/AISuggestionBox";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  ArrowRight,
  Lightbulb,
  Briefcase,
  Heart,
  Plus,
  ArrowLeft,
  Trash2,
  Pencil,
  Search,
} from "lucide-react";
import {
  createConnection,
  deleteConnection,
  getBusinessIdeas,
  getConnections,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  deleteThought,
  getThoughtById,
  getThoughts,
  getTopics,
  getWorkIdeas,
  type ConnectionResponse,
  type ThoughtResponse,
} from "@/lib/api";

const maturityColors: Record<string, string> = {
  seed: "bg-priority-low/10 text-priority-low",
  growing: "bg-priority-medium/10 text-priority-medium",
  mature: "bg-accent/10 text-accent",
};

const defaultMaturity = "growing";

const ThoughtsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [thoughts, setThoughts] = useState<ThoughtResponse[]>([]);
  const [thought, setThought] = useState<ThoughtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);
  const [connectionType, setConnectionType] = useState("knowledge");
  const [connectionTargetId, setConnectionTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [connectionNotes, setConnectionNotes] = useState("");
  const [connectionOptions, setConnectionOptions] = useState<
    Record<string, { id: number; label: string }[]>
  >({
    knowledge: [],
    business_idea: [],
    work_idea: [],
    personal_idea: [],
    quote: [],
    topic: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const savedItem = searchParams.get("saved");
  const updatedItem = searchParams.get("updated");
  const thoughtId = id ? Number(id) : null;
  const isDetailView = Number.isInteger(thoughtId) && thoughtId !== null;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredThoughts = thoughts.filter((currentThought) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    return [
      currentThought.title,
      currentThought.content,
      currentThought.summary,
      currentThought.link,
      currentThought.thought_type,
      currentThought.priority,
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
    async function loadThoughts() {
      try {
        setLoading(true);
        setError("");
        const data = await getThoughts();
        setThoughts(data);
      } catch (err) {
        console.error("Failed to load thoughts:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load thoughts."
        );
      } finally {
        setLoading(false);
      }
    }

    if (!isDetailView) {
      void loadThoughts();
    }
  }, [isDetailView]);

  useEffect(() => {
    async function loadThoughtDetail(currentThoughtId: number) {
      try {
        setLoading(true);
        setError("");
        const [data, connectionData, knowledgeItems, businessIdeas, workIdeas, personalIdeas, quotes, topics] =
          await Promise.all([
            getThoughtById(currentThoughtId),
            getConnections({ entity_type: "thought", entity_id: currentThoughtId }),
            getKnowledgeItems(),
            getBusinessIdeas(),
            getWorkIdeas(),
            getPersonalIdeas(),
            getQuotes(),
            getTopics(),
          ]);
        setThought(data);
        setConnections(connectionData);
        setConnectionOptions({
          knowledge: knowledgeItems.map((item) => ({
            id: item.id,
            label: item.title || item.url,
          })),
          business_idea: businessIdeas.map((item) => ({
            id: item.id,
            label: item.title,
          })),
          work_idea: workIdeas.map((item) => ({
            id: item.id,
            label: item.title,
          })),
          personal_idea: personalIdeas.map((item) => ({
            id: item.id,
            label: item.title,
          })),
          quote: quotes.map((item) => ({
            id: item.id,
            label: item.book_title,
          })),
          topic: topics.map((item) => ({
            id: item.id,
            label: item.name,
          })),
        });
      } catch (err) {
        console.error("Failed to load thought:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load thought."
        );
      } finally {
        setLoading(false);
      }
    }

    if (isDetailView && thoughtId !== null) {
      void loadThoughtDetail(thoughtId);
      return;
    }

    setThought(null);
  }, [isDetailView, thoughtId]);

  const handleDelete = async (idToDelete: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this thought?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingId(idToDelete);
      setError("");
      setActionMessage("");

      await deleteThought(idToDelete);
      setActionMessage("Thought deleted successfully.");

      if (isDetailView && thoughtId === idToDelete) {
        navigate("/thoughts?deleted=thought");
        return;
      }

      setThoughts((currentThoughts) =>
        currentThoughts.filter((currentThought) => currentThought.id !== idToDelete)
      );
    } catch (err) {
      console.error("Failed to delete thought:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete thought."
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCreateConnection = async () => {
    if (!thought || !connectionTargetId) {
      setError("Select an entity to connect.");
      return;
    }

    try {
      setError("");
      const newConnection = await createConnection({
        source_type: "thought",
        source_id: thought.id,
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
          onClick={() => navigate("/thoughts")}
          className="mb-4 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Thoughts
        </Button>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading thought...</div>
        )}

        {!loading && error && <div className="text-sm text-red-500">{error}</div>}

        {!loading && !error && thought && (
          <>
            {updatedItem === "thought" && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Thought updated successfully.
              </div>
            )}

            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-semibold text-foreground">
                {thought.title || "Untitled Thought"}
              </h1>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    navigate(`/capture?type=thought&mode=edit&id=${thought.id}`)
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isDeletingId === thought.id}
                  onClick={() => void handleDelete(thought.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingId === thought.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Badge className={maturityColors[defaultMaturity]}>
                {defaultMaturity}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {thought.thought_type || "Thought"}
              </span>
            </div>

            <div className="glass-card p-6 mb-6">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {thought.content}
              </p>

              {thought.link && (
                <a
                  href={thought.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm text-blue-600 underline break-all"
                >
                  {thought.link}
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <TopicTag name={thought.thought_type || "General"} />
              {thought.priority && (
                <TopicTag name={`Priority: ${thought.priority}`} />
              )}
              {thought.topics.map((topic) => (
                <TopicTag key={topic.id} name={topic.name} variant="topic" />
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <Button variant="outline" size="sm" className="gap-2">
                <Brain className="h-3.5 w-3.5" /> Develop this thought
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Lightbulb className="h-3.5 w-3.5" /> Convert to business idea
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Briefcase className="h-3.5 w-3.5" /> Convert to work idea
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="h-3.5 w-3.5" /> Convert to personal idea
              </Button>
            </div>

            <AISuggestionBox>
              <p className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-accent" />
                This thought was saved in your real database.
              </p>
              <p className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-accent" />
                Next step: connect topics, summaries, and AI suggestions.
              </p>
            </AISuggestionBox>

            <div className="mt-6 glass-card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Connections
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knowledge">Knowledge Item</SelectItem>
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
                  placeholder="Relationship type, e.g. supports"
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
                    No connections yet for this thought.
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
                  id: thought.id,
                  type: "thought",
                  label: thought.title || "Untitled Thought",
                  text: [
                    thought.title,
                    thought.content,
                    thought.summary,
                    thought.link,
                    thought.thought_type,
                    thought.priority,
                  ]
                    .filter(Boolean)
                    .join(" "),
                  topics: thought.topics,
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
        title="Thoughts"
        description="Your personal thinking space"
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => navigate("/capture?type=thought")}
          >
            <Plus className="h-3.5 w-3.5" /> New Thought
          </Button>
        }
      />

      {savedItem === "thought" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Thought saved successfully.
        </div>
      )}

      {updatedItem === "thought" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Thought updated successfully.
        </div>
      )}

      {searchParams.get("deleted") === "thought" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Thought deleted successfully.
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {actionMessage}
        </div>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">Loading thoughts...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && thoughts.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No thoughts yet. Go to Capture and save your first thought.
        </div>
      )}

      {!loading && !error && thoughts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, content, type, or priority"
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
      )}

      {!loading && !error && thoughts.length > 0 && filteredThoughts.length === 0 && (
        <EmptyState
          icon={<Brain className="h-10 w-10" />}
          title="No matching thoughts"
          description="Try a different search term or clear the filter to see all your thoughts again."
          action={
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          }
        />
      )}

      {filteredThoughts.length > 0 && (
        <div className="space-y-3">
          {!loading && !error && thoughts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredThoughts.length} of {thoughts.length} thoughts.
            </div>
          )}

          {filteredThoughts.map((currentThought) => (
            <ContentCard
              key={currentThought.id}
              onClick={() => navigate(`/thoughts/${currentThought.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {currentThought.title || "Untitled Thought"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {currentThought.content}
                  </p>
                  {currentThought.link && (
                    <a
                      href={currentThought.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-blue-600 underline break-all"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {currentThought.link}
                    </a>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TopicTag name={currentThought.thought_type || "General"} />
                    {currentThought.priority && (
                      <TopicTag name={`Priority: ${currentThought.priority}`} />
                    )}
                    {currentThought.topics.map((topic) => (
                      <TopicTag key={topic.id} name={topic.name} variant="topic" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={maturityColors[defaultMaturity]}>
                    {defaultMaturity}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(
                        `/capture?type=thought&mode=edit&id=${currentThought.id}`
                      );
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isDeletingId === currentThought.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(currentThought.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeletingId === currentThought.id ? "Deleting..." : "Delete"}
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

export default ThoughtsPage;
