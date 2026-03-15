import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ContentCard } from "@/components/shared/ContentCard";
import { ConnectionsPanel } from "@/components/shared/ConnectionsPanel";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { deleteQuote, getQuotes, type QuoteResponse } from "@/lib/api";
import { ArrowLeft, Pencil, Plus, Quote as QuoteIcon, Trash2 } from "lucide-react";

const QuotesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const quote = quotes.find((item) => item.id === selectedId);

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

  if (quote) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div className="mb-4 flex justify-end gap-2">
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
            {quote.page && <span className="text-xs text-muted-foreground">p. {quote.page}</span>}
          </div>
        </div>

        {quote.thoughts && (
          <ContentCard hover={false}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Thoughts</h3>
            <p className="text-sm text-foreground">{quote.thoughts}</p>
          </ContentCard>
        )}

        {quote.attachments.length > 0 && (
          <div className="mt-4">
            <AttachmentPreviewList title="Source Photo / Document" attachments={quote.attachments} />
          </div>
        )}

        <div className="mt-6">
          <ConnectionsPanel sourceType="quote" sourceId={quote.id} />
        </div>

        <div className="mt-6">
          <ConnectionSuggestionsPanel
            source={{
              id: quote.id,
              type: "quote",
              label: quote.book_title,
              text: [quote.book_title, quote.quote_text, quote.page, quote.thoughts]
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
      {loading && <div className="text-sm text-muted-foreground">Loading quotes...</div>}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && !error && quotes.length === 0 ? (
        <EmptyState icon={<QuoteIcon className="h-10 w-10" />} title="No quotes yet" description="Capture your first quote to start this section." action={<Button onClick={() => navigate("/capture?type=quote")}>Open Capture</Button>} />
      ) : (
        <div className="space-y-3">
          {quotes.map((item) => (
            <ContentCard key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent/50" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm italic text-foreground">"{item.quote_text}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{item.book_title}</span>
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
