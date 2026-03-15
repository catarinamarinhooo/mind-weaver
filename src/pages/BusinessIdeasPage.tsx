import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ContentCard } from "@/components/shared/ContentCard";
import { ConnectionsPanel } from "@/components/shared/ConnectionsPanel";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteBusinessIdea,
  getBusinessIdeas,
  type BusinessIdeaResponse,
} from "@/lib/api";
import { ArrowLeft, Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-priority-high/10 text-priority-high",
  medium: "bg-priority-medium/10 text-priority-medium",
  low: "bg-priority-low/10 text-priority-low",
};

const BusinessIdeasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<BusinessIdeaResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const idea = ideas.find((item) => item.id === selectedId);

  useEffect(() => {
    async function loadIdeas() {
      try {
        setLoading(true);
        setError("");
        setIdeas(await getBusinessIdeas());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business ideas.");
      } finally {
        setLoading(false);
      }
    }

    void loadIdeas();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this business idea?")) {
      return;
    }

    try {
      setIsDeletingId(id);
      await deleteBusinessIdea(id);
      setIdeas((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete business idea.");
    } finally {
      setIsDeletingId(null);
    }
  };

  if (idea) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-foreground">{idea.title}</h1>
            <Badge className={priorityColors[idea.priority || "medium"] || priorityColors.medium}>
              {idea.priority || "medium"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/capture?type=business&mode=edit&id=${idea.id}`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled={isDeletingId === idea.id} onClick={() => void handleDelete(idea.id)}>
              <Trash2 className="h-3.5 w-3.5" /> {isDeletingId === idea.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {idea.description && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3><p className="text-sm text-foreground">{idea.description}</p></ContentCard>}
          {idea.problem && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problem</h3><p className="text-sm text-foreground">{idea.problem}</p></ContentCard>}
          {idea.audience && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience</h3><p className="text-sm text-foreground">{idea.audience}</p></ContentCard>}
          {idea.next_steps && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Steps</h3><p className="text-sm text-foreground">{idea.next_steps}</p></ContentCard>}
        </div>

        {idea.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {idea.topics.map((topic) => (
              <TopicTag key={topic.id} name={topic.name} variant="topic" />
            ))}
          </div>
        )}

        {idea.attachments.length > 0 && (
          <div className="mt-4">
            <AttachmentPreviewList title="Images and Files" attachments={idea.attachments} />
          </div>
        )}

        <div className="mt-6">
          <ConnectionsPanel sourceType="business_idea" sourceId={idea.id} />
        </div>

        <div className="mt-6">
          <ConnectionSuggestionsPanel
            source={{
              id: idea.id,
              type: "business_idea",
              label: idea.title,
              text: [idea.title, idea.description, idea.problem, idea.audience, idea.next_steps]
                .filter(Boolean)
                .join(" "),
              topics: idea.topics,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Business Ideas"
        description="Business ideas stored in your real backend"
        actions={<Button size="sm" className="gap-2" onClick={() => navigate("/capture?type=business")}><Plus className="h-3.5 w-3.5" /> New Idea</Button>}
      />

      {searchParams.get("saved") === "business" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Business idea saved successfully.</div>}
      {searchParams.get("updated") === "business" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Business idea updated successfully.</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading business ideas...</div>}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-10 w-10" />}
          title="No business ideas yet"
          description="Capture your first business idea to start this section."
          action={<Button onClick={() => navigate("/capture?type=business")}>Open Capture</Button>}
        />
      ) : (
        <div className="space-y-3">
          {ideas.map((item) => (
            <ContentCard key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                  {item.topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.topics.map((topic) => (
                        <TopicTag key={topic.id} name={topic.name} variant="topic" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[item.priority || "medium"] || priorityColors.medium}>{item.priority || "medium"}</Badge>
                  <Button variant="outline" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); navigate(`/capture?type=business&mode=edit&id=${item.id}`); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isDeletingId === item.id} onClick={(event) => { event.stopPropagation(); void handleDelete(item.id); }}>
                    <Trash2 className="h-3.5 w-3.5" /> {isDeletingId === item.id ? "Deleting..." : "Delete"}
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

export default BusinessIdeasPage;
