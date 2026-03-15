import { useEffect, useState } from "react";
import {
  createConnection,
  deleteConnection,
  getBusinessIdeas,
  getConnections,
  getGlossaryTerms,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
  type ConnectionResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConnectionsPanelProps {
  sourceType: string;
  sourceId: number;
  title?: string;
}

export function ConnectionsPanel({
  sourceType,
  sourceId,
  title = "Connections",
}: ConnectionsPanelProps) {
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);
  const [error, setError] = useState("");
  const [connectionType, setConnectionType] = useState("thought");
  const [connectionTargetId, setConnectionTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [connectionNotes, setConnectionNotes] = useState("");
  const [connectionOptions, setConnectionOptions] = useState<
    Record<string, { id: number; label: string }[]>
  >({
    thought: [],
    knowledge: [],
    business_idea: [],
    work_idea: [],
    personal_idea: [],
    quote: [],
    topic: [],
    glossary_term: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        setError("");
        const [
          connectionData,
          thoughts,
          knowledgeItems,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
          topics,
          glossaryTerms,
        ] = await Promise.all([
          getConnections({ entity_type: sourceType, entity_id: sourceId }),
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getTopics(),
          getGlossaryTerms(),
        ]);

        setConnections(connectionData);
        setConnectionOptions({
          thought: thoughts.map((entry) => ({
            id: entry.id,
            label: entry.title || entry.content.slice(0, 60),
          })),
          knowledge: knowledgeItems.map((entry) => ({
            id: entry.id,
            label: entry.title || entry.url,
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
          glossary_term: glossaryTerms.map((entry) => ({
            id: entry.id,
            label: entry.term,
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load connections.");
      }
    }

    void loadData();
  }, [sourceId, sourceType]);

  const filteredOptions =
    connectionOptions[connectionType]?.filter(
      (option) => !(connectionType === sourceType && option.id === sourceId)
    ) || [];

  const handleCreateConnection = async () => {
    if (!connectionTargetId) {
      setError("Select an entity to connect.");
      return;
    }

    try {
      setError("");
      const newConnection = await createConnection({
        source_type: sourceType,
        source_id: sourceId,
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

  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>

      {error && <div className="mb-3 text-sm text-red-500">{error}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select value={connectionType} onValueChange={setConnectionType}>
          <SelectTrigger>
            <SelectValue placeholder="Target type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thought">Thought</SelectItem>
            <SelectItem value="knowledge">Knowledge Item</SelectItem>
            <SelectItem value="business_idea">Business Idea</SelectItem>
            <SelectItem value="work_idea">Work Idea</SelectItem>
            <SelectItem value="personal_idea">Personal Idea</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="topic">Topic</SelectItem>
            <SelectItem value="glossary_term">Glossary Term</SelectItem>
          </SelectContent>
        </Select>

        <Select value={connectionTargetId} onValueChange={setConnectionTargetId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose target" />
          </SelectTrigger>
          <SelectContent>
            {filteredOptions.map((option) => (
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
            No connections yet.
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
  );
}
