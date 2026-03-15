import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
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
  deleteConnection,
  getConnections,
  type ConnectionResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Search, Trash2 } from "lucide-react";

const typeColors: Record<string, string> = {
  thought: "bg-violet-100 text-violet-700",
  knowledge: "bg-accent/10 text-accent",
  business_idea: "bg-amber-100 text-amber-700",
  work_idea: "bg-blue-100 text-blue-700",
  personal_idea: "bg-rose-100 text-rose-700",
  quote: "bg-emerald-100 text-emerald-700",
  topic: "bg-sky-100 text-sky-700",
  glossary_term: "bg-orange-100 text-orange-700",
};

const entityOptions = [
  { id: "all", label: "All entities" },
  { id: "thought", label: "Thoughts" },
  { id: "knowledge", label: "Knowledge" },
  { id: "business_idea", label: "Business" },
  { id: "work_idea", label: "Work" },
  { id: "personal_idea", label: "Personal" },
  { id: "quote", label: "Quotes" },
  { id: "topic", label: "Topics" },
  { id: "glossary_term", label: "Glossary" },
];

const ConnectionsPage = () => {
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadConnections() {
      try {
        setLoading(true);
        setError("");
        setConnections(await getConnections());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load connections.");
      } finally {
        setLoading(false);
      }
    }

    void loadConnections();
  }, []);

  const filteredConnections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return connections.filter((connection) => {
      const matchesFilter =
        entityFilter === "all" ||
        connection.source_type === entityFilter ||
        connection.target_type === entityFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        connection.source_label,
        connection.target_label,
        connection.relationship_type,
        connection.notes,
        connection.source_type,
        connection.target_type,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [connections, entityFilter, searchTerm]);

  const handleDelete = async (connectionId: number) => {
    if (!window.confirm("Are you sure you want to remove this connection?")) {
      return;
    }

    try {
      setIsDeletingId(connectionId);
      await deleteConnection(connectionId);
      setConnections((current) =>
        current.filter((connection) => connection.id !== connectionId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete connection.");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Connections"
        description="See how ideas, thoughts, knowledge, quotes, and topics are linked"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search source, target, relation type, or notes"
            className="pl-9"
          />
        </div>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading connections...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && connections.length === 0 && (
        <EmptyState
          icon={<GitBranch className="h-10 w-10" />}
          title="No connections yet"
          description="Create links from a thought or knowledge item detail page and they will appear here."
        />
      )}

      {!loading && !error && connections.length > 0 && filteredConnections.length === 0 && (
        <EmptyState
          icon={<GitBranch className="h-10 w-10" />}
          title="No matching connections"
          description="Try a different search term or change the entity filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setEntityFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      )}

      {!loading && !error && filteredConnections.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Showing {filteredConnections.length} of {connections.length} connections.
          </div>

          {filteredConnections.map((connection) => (
            <ContentCard key={connection.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={typeColors[connection.source_type] || "bg-muted text-muted-foreground"}>
                      {connection.source_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">from</span>
                    <Badge className={typeColors[connection.target_type] || "bg-muted text-muted-foreground"}>
                      {connection.target_type.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="text-sm font-medium text-foreground">
                    {connection.source_label} {"->"} {connection.target_label}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    {connection.relationship_type || "related"}
                  </div>

                  {connection.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {connection.notes}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isDeletingId === connection.id}
                  onClick={() => void handleDelete(connection.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingId === connection.id ? "Removing..." : "Remove"}
                </Button>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConnectionsPage;
