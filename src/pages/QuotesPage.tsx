import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ActionableAISuggestions } from "@/components/shared/ActionableAISuggestions";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ContentCard } from "@/components/shared/ContentCard";
import { ConnectionsPanel } from "@/components/shared/ConnectionsPanel";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
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
  createConnection,
  deleteQuote,
  getAiSuggestions,
  getAiSummary,
  getQuotes,
  type AISuggestionsResponse,
  type QuoteResponse,
} from "@/lib/api";
import { ArrowLeft, Brain, Pencil, Plus, Quote as QuoteIcon, Trash2 } from "lucide-react";

const QuotesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActionKey, setAiActionKey] = useState("");
  const [connectionsKey, setConnectionsKey] = useState(0);
  const [bookTypeFilter, setBookTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const quote = quotes.find((item) => item.id === selectedId);
  const availableBookTypes = Array.from(
    new Set(
      quotes
        .map((item) => item.book_type?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((first, second) => first.localeCompare(second));
  const filteredQuotes = quotes.filter((item) => {
    const matchesBookType =
      bookTypeFilter === "all" || (item.book_type || "Uncategorized") === bookTypeFilter;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      [item.book_title, item.book_type, item.quote_text, item.thoughts]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    return matchesBookType && matchesSearch;
  });

  useEffect(() => {
    async function loadQuotes() {
      try {
        setLoading(true);
        setError("");
        setQuotes(await getQuotes());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quotes.");
      } finally {
        setLoading(false);
      }
    }
    void loadQuotes();
  }, []);

  useEffect(() => {
    setSummaryText("");
    setAiSuggestions(null);
  }, [selectedId]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this quote?")) return;
    try {
      setIsDeletingId(id);
      await deleteQuote(id);
      setQuotes((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quote.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSummarize = async () => {
    if (!quote) {
      return;
    }
    try {
      setSummaryLoading(true);
      setError("");
      const result = await getAiSummary({
        entity_type: "quote",
        entity_id: quote.id,
      });
      setSummaryText(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize quote.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleLoadAiSuggestions = async () => {
    if (!quote) return;
    try {
      setAiLoading(true);
      setError("");
      setAiSuggestions(await getAiSuggestions("quote", quote.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI suggestions.");
    } finally {
      setAiLoading(false);
    }
  };

  const getTargetPath = (entityType: string, entityId: number) => {
    switch (entityType) {
      case "thought":
        return `/thoughts/${entityId}`;
      case "knowledge":
        return `/library/${entityId}`;
      case "business_idea":
        return "/business-ideas";
      case "work_idea":
        return "/work-ideas";
      case "personal_idea":
        return "/personal-ideas";
      case "quote":
        return "/quotes";
      default:
        return "/topics";
    }
  };

  const handleConnectSuggestedTopic = async (topicId: number, explanation: string) => {
    if (!quote) return;
    try {
      setAiActionKey(`topic-${topicId}`);
      setError("");
      await createConnection({
        source_type: "quote",
        source_id: quote.id,
        target_type: "topic",
        target_id: topicId,
        relationship_type: "ai_suggested_topic",
        notes: explanation,
      });
      setConnectionsKey((current) => current + 1);
      setAiSuggestions((current) =>
        current
          ? {
              ...current,
              suggested_topics: current.suggested_topics.filter((topic) => topic.topic_id !== topicId),
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect suggested topic.");
    } finally {
      setAiActionKey("");
    }
  };

  const handleCreateSuggestedConnection = async (
    targetType: string,
    targetId: number,
    explanation: string
  ) => {
    if (!quote) return;
    try {
      setAiActionKey(`entity-${targetType}-${targetId}`);
      setError("");
      await createConnection({
        source_type: "quote",
        source_id: quote.id,
        target_type: targetType,
        target_id: targetId,
        relationship_type: "ai_suggested",
        notes: explanation,
      });
      setConnectionsKey((current) => current + 1);
      setAiSuggestions((current) =>
        current
          ? {
              ...current,
              suggested_related_entities: current.suggested_related_entities.filter(
                (entity) => !(entity.entity_type === targetType && entity.entity_id === targetId)
              ),
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create connection.");
    } finally {
      setAiActionKey("");
    }
  };

  if (quote) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div className="mb-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/ask?prompt=${encodeURIComponent(`Help me analyse this quote from ${quote.book_title}`)}`)}>
            <Brain className="h-3.5 w-3.5" /> Ask AI
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleSummarize()}>
            {summaryLoading ? "Summarizing..." : "Summarize"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/capture?type=quote&mode=edit&id=${quote.id}`)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={isDeletingId === quote.id} onClick={() => void handleDelete(quote.id)}>
            <Trash2 className="h-3.5 w-3.5" /> {isDeletingId === quote.id ? "Deleting..." : "Delete"}
          </Button>
        </div>

        <div className="mb-6 glass-card p-8">
          <QuoteIcon className="mb-4 h-8 w-8 text-accent/30" />
          <blockquote className="text-lg italic leading-relaxed text-foreground">
            "{quote.quote_text}"
          </blockquote>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{quote.book_title}</span>
            {quote.book_type && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                {quote.book_type}
              </span>
            )}
            {quote.page && <span className="text-xs text-muted-foreground">p. {quote.page}</span>}
          </div>
        </div>

        {quote.thoughts && (
          <ContentCard hover={false}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Thoughts</h3>
            <p className="text-sm text-foreground">{quote.thoughts}</p>
          </ContentCard>
        )}

        {summaryText && (
          <div className="mt-4">
            <ContentCard hover={false}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Summary</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{summaryText}</p>
            </ContentCard>
          </div>
        )}

        {quote.attachments.length > 0 && (
          <div className="mt-4">
            <AttachmentPreviewList title="Source Photo / Document" attachments={quote.attachments} />
          </div>
        )}

        <div className="mt-6">
          <ActionableAISuggestions
            suggestions={aiSuggestions}
            loading={aiLoading}
            actionKey={aiActionKey}
            topicActionLabel="Connect Topic"
            onLoadSuggestions={handleLoadAiSuggestions}
            onApplyTopic={(topicId, explanation) =>
              handleConnectSuggestedTopic(topicId, explanation)
            }
            onApplyEntity={(entityType, entityId, explanation) =>
              handleCreateSuggestedConnection(entityType, entityId, explanation)
            }
            onOpenEntity={(entityType, entityId) =>
              navigate(getTargetPath(entityType, entityId))
            }
          />
        </div>

        <div className="mt-6">
          <ConnectionsPanel key={connectionsKey} sourceType="quote" sourceId={quote.id} />
        </div>

        <div className="mt-6">
          <ConnectionSuggestionsPanel
            source={{
              id: quote.id,
              type: "quote",
              label: quote.book_title,
              text: [quote.book_title, quote.book_type, quote.quote_text, quote.page, quote.thoughts]
                .filter(Boolean)
                .join(" "),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Quotes" description="Quotes stored in your real backend" actions={<Button size="sm" className="gap-2" onClick={() => navigate("/capture?type=quote")}><Plus className="h-3.5 w-3.5" /> Add Quote</Button>} />
      {searchParams.get("saved") === "quote" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Quote saved successfully.</div>}
      {searchParams.get("updated") === "quote" && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Quote updated successfully.</div>}
      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          placeholder="Search by book, type, quote, or thoughts"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Select value={bookTypeFilter} onValueChange={setBookTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by book type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All book types</SelectItem>
            <SelectItem value="Uncategorized">Uncategorized</SelectItem>
            {availableBookTypes.map((bookType) => (
              <SelectItem key={bookType} value={bookType}>
                {bookType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading quotes...</div>}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && !error && quotes.length === 0 ? (
        <EmptyState icon={<QuoteIcon className="h-10 w-10" />} title="No quotes yet" description="Capture your first quote to start this section." action={<Button onClick={() => navigate("/capture?type=quote")}>Open Capture</Button>} />
      ) : !loading && !error && filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<QuoteIcon className="h-10 w-10" />}
          title="No matching quotes"
          description="Try another search or book type filter."
        />
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((item) => (
            <ContentCard key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent/50" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm italic text-foreground">"{item.quote_text}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{item.book_title}</span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                        {item.book_type || "Uncategorized"}
                      </span>
                      {item.page && <span className="text-xs text-muted-foreground">p. {item.page}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={(event) => { event.stopPropagation(); navigate(`/capture?type=quote&mode=edit&id=${item.id}`); }}>
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

export default QuotesPage;
