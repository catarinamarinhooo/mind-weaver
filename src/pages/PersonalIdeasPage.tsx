import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ContentCard } from "@/components/shared/ContentCard";
import { ConnectionsPanel } from "@/components/shared/ConnectionsPanel";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deletePersonalIdea,
  getPersonalIdeas,
  type PersonalIdeaResponse,
} from "@/lib/api";
import { ArrowLeft, Heart, Pencil, Plus, Trash2 } from "lucide-react";

const priorityColors: Record<string, string> = {
  high: "bg-priority-high/10 text-priority-high",
  medium: "bg-priority-medium/10 text-priority-medium",
  low: "bg-priority-low/10 text-priority-low",
};

const PersonalIdeasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<PersonalIdeaResponse[]>([]);
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
        setIdeas(await getPersonalIdeas());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load personal ideas.");
      } finally {
        setLoading(false);
      }
    }
    void loadIdeas();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this personal idea?")) return;
    try {
      setIsDeletingId(id);
      await deletePersonalIdea(id);
      setIdeas((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete personal idea.");
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
            <div className="flex items-center gap-2">
              <Badge className={priorityColors[idea.priority || "medium"] || priorityColors.medium}>{idea.priority || "medium"}</Badge>
              {idea.category && <span className="text-sm text-muted-foreground">{idea.category}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/capture?type=personal&mode=edit&id=${idea.id}`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled={isDeletingId === idea.id} onClick={() => void handleDelete(idea.id)}>
              <Trash2 className="h-3.5 w-3.5" /> {isDeletingId === idea.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {idea.description && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h3><p className="text-sm text-foreground">{idea.description}</p></ContentCard>}
          {idea.goal && <ContentCard hover={false}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goal</h3><p className="text-sm text-foreground">{idea.goal}</p></ContentCard>}
        </div>

        {idea.attachments.length > 0 && (
          <div className="mt-4">
            <AttachmentPreviewList title="Images and Files" attachments={idea.attachments} />
          </div>
        )}

        <div className="mt-6">
          <ConnectionsPanel sourceType="personal_idea" sourceId={idea.id} />
        </div>

        <div className="mt-6">
          <ConnectionSuggestionsPanel
            source={{
              id: idea.id,
              type: "personal_idea",
              label: idea.title,
              text: [idea.title, idea.description, idea.category, idea.goal]
                .filter(Boolean)
                .join(" "),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Personal Ideas" description="Personal ideas stored in your real backend" actions={<Button size="sm" className="gap-2" onClick={() => navigate("/capture?type=personal")}><Plus className="h-3.5 w-3.5" /> New Idea</Button>} />
      {searchParams.get("saved") === "personal" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Personal idea saved successfully.</div>}
      {searchParams.get("updated") === "personal" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Personal idea updated successfully.</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading personal ideas...</div>}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && !error && ideas.length === 0 ? (
        <EmptyState icon={<Heart className="h-10 w-10" />} title="No personal ideas yet" description="Capture your first personal idea to start this section." action={<Button onClick={() => navigate("/capture?type=personal")}>Open Capture</Button>} />
      ) : (
        <div className="space-y-3">
          {ideas.map((item) => (
            <ContentCard key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColors[item.priority || "medium"] || priorityColors.medium}>{item.priority || "medium"}</Badge>
                  <Button variant="outline" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); navigate(`/capture?type=personal&mode=edit&id=${item.id}`); }}>
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

export default PersonalIdeasPage;
