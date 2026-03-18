import { useEffect, useMemo, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopicTag } from "@/components/shared/TopicTag";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAiActionHistory, rollbackAiAction, type AIActionHistoryResponse } from "@/lib/api";

const AIHistoryPage = () => {
  const [history, setHistory] = useState<AIActionHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [rollbackId, setRollbackId] = useState<number | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError("");
        setHistory(await getAiActionHistory());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AI history.");
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    if (filter === "all") {
      return history;
    }
    return history.filter((entry) => entry.action_type === filter);
  }, [filter, history]);

  const actionTypes = Array.from(new Set(history.map((entry) => entry.action_type)));

  const handleRollback = async (entry: AIActionHistoryResponse) => {
    try {
      setRollbackId(entry.id);
      setError("");
      await rollbackAiAction(entry.id);
      setHistory(await getAiActionHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rollback AI action.");
    } finally {
      setRollbackId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="AI History"
        description="Audit trail of AI-applied actions, with filters and rollback for supported actions."
        actions={
          <div className="w-56">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((actionType) => (
                  <SelectItem key={actionType} value={actionType}>
                    {actionType.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {error && <div className="text-sm text-red-500">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading AI history...</div>
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          icon={<History className="h-10 w-10" />}
          title="No AI actions yet"
          description="When AI applies conversions, triage, or rollback actions, they will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((entry) => {
            const rollbackSupported =
              (entry.action_type === "thought_conversion" ||
                entry.action_type === "discovery_triage_apply") &&
              !entry.rolled_back_at;

            return (
              <ContentCard key={entry.id} hover={false}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.action_type.replaceAll("_", " ")}
                      </span>
                      <TopicTag name={entry.source_entity_type.replaceAll("_", " ")} />
                      {entry.target_entity_type && (
                        <TopicTag name={entry.target_entity_type.replaceAll("_", " ")} variant="topic" />
                      )}
                      {entry.rolled_back_at && (
                        <TopicTag name="Rolled back" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                    {entry.summary && (
                      <div className="mt-3 text-sm text-foreground">{entry.summary}</div>
                    )}
                    {entry.details && (
                      <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {entry.details}
                      </div>
                    )}
                    {entry.rollback_details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Rollback: {entry.rollback_details}
                      </div>
                    )}
                  </div>

                  {rollbackSupported && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={rollbackId === entry.id}
                      onClick={() => void handleRollback(entry)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {rollbackId === entry.id ? "Rolling back..." : "Rollback"}
                    </Button>
                  )}
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIHistoryPage;
