import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { TopicTag } from "@/components/shared/TopicTag";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createTopic,
  deleteTopic,
  getTopics,
  updateTopic,
  type TopicResponse,
} from "@/lib/api";
import { Plus, ArrowLeft, Hash, Pencil, Trash2 } from "lucide-react";

const TopicsPage = () => {
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const topic = topics.find((item) => item.id === selectedId);

  useEffect(() => {
    async function loadTopics() {
      try {
        setLoading(true);
        setError("");
        setTopics(await getTopics());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load topics.");
      } finally {
        setLoading(false);
      }
    }

    void loadTopics();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Topic name is required.");
      return;
    }

    try {
      setError("");
      const newTopic = await createTopic({
        name: name.trim(),
        description: description.trim() || null,
      });
      setTopics((current) => [...current, newTopic].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic.");
    }
  };

  const handleUpdate = async () => {
    if (!topic || !name.trim()) {
      setError("Topic name is required.");
      return;
    }

    try {
      setError("");
      const updatedTopic = await updateTopic(topic.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setTopics((current) =>
        current
          .map((item) => (item.id === updatedTopic.id ? updatedTopic : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedId(updatedTopic.id);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update topic.");
    }
  };

  const handleDelete = async (topicId: number) => {
    if (!window.confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    try {
      setIsDeletingId(topicId);
      await deleteTopic(topicId);
      setTopics((current) => current.filter((item) => item.id !== topicId));
      if (selectedId === topicId) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete topic.");
    } finally {
      setIsDeletingId(null);
    }
  };

  if (topic) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); resetForm(); }} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Hash className="h-6 w-6 text-accent" />
              <h1 className="text-2xl font-semibold text-foreground">{topic.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {topic.description || "No description yet."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setIsEditing(true);
                setName(topic.name);
                setDescription(topic.description || "");
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isDeletingId === topic.id}
              onClick={() => void handleDelete(topic.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeletingId === topic.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ContentCard hover={false}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Thoughts
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {topic.thought_count}
            </div>
          </ContentCard>
          <ContentCard hover={false}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Knowledge Items
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {topic.knowledge_item_count}
            </div>
          </ContentCard>
          <ContentCard hover={false}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Linked
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {topic.total_count}
            </div>
          </ContentCard>
        </div>

        {isEditing && (
          <ContentCard hover={false} className="space-y-4">
            <div className="text-sm font-medium text-foreground">Edit Topic</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Topic description" rows={3} />
            <div className="flex gap-2">
              <Button onClick={() => void handleUpdate()}>Save Changes</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </ContentCard>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Topics"
        description="Organize your knowledge by topic"
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New Topic
          </Button>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      {isCreating && (
        <ContentCard hover={false} className="mb-6 space-y-4">
          <div className="text-sm font-medium text-foreground">Create Topic</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Topic description" rows={3} />
          <div className="flex gap-2">
            <Button onClick={() => void handleCreate()}>Create Topic</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </ContentCard>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading topics...</div>}

      {!loading && topics.length === 0 ? (
        <EmptyState
          icon={<Hash className="h-10 w-10" />}
          title="No topics yet"
          description="Create your first topic so you can start organizing thoughts and knowledge items."
          action={<Button onClick={() => setIsCreating(true)}>Create Topic</Button>}
        />
      ) : (
        <div className="content-grid">
          {topics.map((item) => (
            <ContentCard key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.total_count}
                </Badge>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {item.description || "No description yet."}
              </p>
              <div className="flex flex-wrap gap-2">
                <TopicTag name={`${item.thought_count} thoughts`} />
                <TopicTag name={`${item.knowledge_item_count} knowledge`} />
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopicsPage;
