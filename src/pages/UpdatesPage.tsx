import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BookOpen, Brain, Hash, Library, RadioTower, Rss } from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
  formatAlertTime,
  getAppAlerts,
  markAlertsSeen,
  type AppAlert,
} from "@/lib/alerts";

function getAlertIcon(kind: AppAlert["kind"]) {
  switch (kind) {
    case "thought":
      return Brain;
    case "knowledge":
      return Library;
    case "glossary":
      return BookOpen;
    case "topic":
      return Hash;
    case "watchlist":
      return RadioTower;
    default:
      return Rss;
  }
}

const UpdatesPage = () => {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        setError("");
        const data = await getAppAlerts();
        setAlerts(data);
        markAlertsSeen();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load updates.");
      } finally {
        setLoading(false);
      }
    }

    void loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (kindFilter !== "all" && alert.kind !== kindFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [alert.title, alert.description, alert.sourceLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [alerts, kindFilter, searchTerm]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Updates"
        description="Recent activity and fresh signals from across your CortexKnows workspace."
        actions={
          <Button variant="outline" size="sm" onClick={() => markAlertsSeen()}>
            Mark Current Feed As Seen
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <Input
          placeholder="Search updates by title, source or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All update types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All update types</SelectItem>
            <SelectItem value="discovery">Discovery</SelectItem>
            <SelectItem value="thought">Thoughts</SelectItem>
            <SelectItem value="knowledge">Library</SelectItem>
            <SelectItem value="glossary">Glossary</SelectItem>
            <SelectItem value="topic">Topics</SelectItem>
            <SelectItem value="watchlist">Watchlists</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading updates...</div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="No updates yet"
          description="As you capture thoughts, save library items, refresh watchlists, and grow your glossary, the latest activity will show here."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.kind);
            return (
              <ContentCard key={alert.id} className="group">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 rounded-lg bg-accent/10 p-2 text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {alert.sourceLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatAlertTime(alert.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">{alert.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{alert.description}</div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={alert.path}>Open</Link>
                  </Button>
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpdatesPage;
