import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getBusinessIdeas,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getTopics,
  getWorkIdeas,
} from "@/lib/api";
import {
  Search as SearchIcon,
  Brain,
  Link2,
  Lightbulb,
  Briefcase,
  Heart,
  Quote,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  type:
    | "knowledge"
    | "thought"
    | "business_idea"
    | "work_idea"
    | "personal_idea"
    | "quote"
    | "topic";
  id: number;
  title: string;
  snippet: string;
  searchText: string;
  path: string;
};

const typeColors: Record<string, string> = {
  knowledge: "bg-accent/10 text-accent",
  thought: "bg-violet-100 text-violet-700",
  business_idea: "bg-amber-100 text-amber-700",
  work_idea: "bg-blue-100 text-blue-700",
  personal_idea: "bg-rose-100 text-rose-700",
  quote: "bg-emerald-100 text-emerald-700",
  topic: "bg-sky-100 text-sky-700",
};

const typeIcons = {
  knowledge: Link2,
  thought: Brain,
  business_idea: Lightbulb,
  work_idea: Briefcase,
  personal_idea: Heart,
  quote: Quote,
  topic: Hash,
};

function buildSnippet(text: string, query: string) {
  if (!text) {
    return "";
  }

  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return text.slice(0, 140);
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + normalizedQuery.length + 100);
  return text.slice(start, end);
}

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allResults, setAllResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    async function loadSearchData() {
      try {
        setLoading(true);
        setError("");

        const [
          thoughts,
          knowledgeItems,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
          topics,
        ] = await Promise.all([
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
          getTopics(),
        ]);

        const results: SearchResult[] = [
          ...thoughts.map((item) => ({
            type: "thought" as const,
            id: item.id,
            title: item.title || "Untitled Thought",
            snippet: item.content,
            searchText: [
              item.title,
              item.content,
              item.summary,
              item.link,
              item.thought_type,
              item.priority,
              ...item.topics.map((topic) => topic.name),
            ]
              .filter(Boolean)
              .join(" "),
            path: `/thoughts/${item.id}`,
          })),
          ...knowledgeItems.map((item) => ({
            type: "knowledge" as const,
            id: item.id,
            title: item.title || item.url,
            snippet: [item.description, item.personal_note, item.url]
              .filter(Boolean)
              .join(" "),
            searchText: [
              item.title,
              item.description,
              item.personal_note,
              item.url,
              item.source,
              ...item.topics.map((topic) => topic.name),
            ]
              .filter(Boolean)
              .join(" "),
            path: "/library",
          })),
          ...businessIdeas.map((item) => ({
            type: "business_idea" as const,
            id: item.id,
            title: item.title,
            snippet: [item.description, item.problem, item.audience, item.next_steps]
              .filter(Boolean)
              .join(" "),
            searchText: [
              item.title,
              item.description,
              item.problem,
              item.audience,
              item.priority,
              item.next_steps,
            ]
              .filter(Boolean)
              .join(" "),
            path: "/business-ideas",
          })),
          ...workIdeas.map((item) => ({
            type: "work_idea" as const,
            id: item.id,
            title: item.title,
            snippet: [item.summary, item.goal, item.context]
              .filter(Boolean)
              .join(" "),
            searchText: [
              item.title,
              item.summary,
              item.goal,
              item.context,
              item.application_category,
              item.priority,
              item.timeline,
              item.execution_mode,
            ]
              .filter(Boolean)
              .join(" "),
            path: "/work-ideas",
          })),
          ...personalIdeas.map((item) => ({
            type: "personal_idea" as const,
            id: item.id,
            title: item.title,
            snippet: [item.description, item.goal, item.category]
              .filter(Boolean)
              .join(" "),
            searchText: [
              item.title,
              item.description,
              item.goal,
              item.category,
              item.priority,
            ]
              .filter(Boolean)
              .join(" "),
            path: "/personal-ideas",
          })),
          ...quotes.map((item) => ({
            type: "quote" as const,
            id: item.id,
            title: item.book_title,
            snippet: [item.quote_text, item.thoughts].filter(Boolean).join(" "),
            searchText: [item.book_title, item.quote_text, item.page, item.thoughts]
              .filter(Boolean)
              .join(" "),
            path: "/quotes",
          })),
          ...topics.map((item) => ({
            type: "topic" as const,
            id: item.id,
            title: item.name,
            snippet: item.description || `${item.total_count} linked items`,
            searchText: [item.name, item.description].filter(Boolean).join(" "),
            path: "/topics",
          })),
        ];

        setAllResults(results);
      } catch (err) {
        console.error("Failed to load search data:", err);
        setError(err instanceof Error ? err.message : "Failed to load search.");
      } finally {
        setLoading(false);
      }
    }

    void loadSearchData();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const searchTerms = query
    .split(";")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const filteredResults = useMemo(() => {
    if (searchTerms.length === 0) {
      return [];
    }

    return allResults
      .filter((result) => {
        const haystack = result.searchText.toLowerCase();
        const matchesQuery = searchTerms.some((term) => haystack.includes(term));
        const matchesType = selectedType === "all" || result.type === selectedType;
        return matchesQuery && matchesType;
      })
      .sort((a, b) => {
        const aScore = searchTerms.reduce(
          (score, term) =>
            score +
            (a.title.toLowerCase().includes(term) ? 2 : 0) +
            (a.searchText.toLowerCase().includes(term) ? 1 : 0),
          0
        );
        const bScore = searchTerms.reduce(
          (score, term) =>
            score +
            (b.title.toLowerCase().includes(term) ? 2 : 0) +
            (b.searchText.toLowerCase().includes(term) ? 1 : 0),
          0
        );
        return bScore - aScore;
      });
  }, [allResults, searchTerms, selectedType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const nextParams: Record<string, string> = { q: query.trim() };
      if (selectedType !== "all") {
        nextParams.type = selectedType;
      }
      setSearchParams(nextParams);
      return;
    }

    setSearchParams({});
  };

  const filterOptions = [
    { id: "all", label: "All" },
    { id: "thought", label: "Thoughts" },
    { id: "knowledge", label: "Knowledge" },
    { id: "business_idea", label: "Business" },
    { id: "work_idea", label: "Work" },
    { id: "personal_idea", label: "Personal" },
    { id: "quote", label: "Quotes" },
    { id: "topic", label: "Topics" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Search" description="Find anything in your knowledge base" />

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search thoughts, knowledge, ideas, quotes, and topics..."
            className="h-12 pl-12 pr-4 text-base"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit">Search</Button>
          {query && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setSelectedType("all");
                setSearchParams({});
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelectedType(option.id);
                if (query.trim()) {
                  const nextParams: Record<string, string> = { q: query.trim() };
                  if (option.id !== "all") {
                    nextParams.type = option.id;
                  }
                  setSearchParams(nextParams);
                }
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedType === option.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/40"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: use `;` to search multiple terms, for example `machine; wellness`.
        </p>
      </form>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading search index...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && searchTerms.length > 0 && filteredResults.length > 0 && (
        <div className="space-y-3">
          <p className="mb-4 text-sm text-muted-foreground">
            {filteredResults.length} results for "{query}"
          </p>
          {filteredResults.map((result) => {
            const Icon = typeIcons[result.type];

            return (
              <Link key={`${result.type}-${result.id}`} to={result.path}>
                <ContentCard>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-secondary p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge className={cn("text-xs", typeColors[result.type])}>
                          {result.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {result.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {buildSnippet(result.snippet, searchTerms[0] || query)}
                      </p>
                    </div>
                  </div>
                </ContentCard>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && searchTerms.length > 0 && filteredResults.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-10 w-10" />}
          title="No results found"
          description="Try a broader term or search for a different entity name."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setSearchParams({});
              }}
            >
              Clear Search
            </Button>
          }
        />
      )}

      {!loading && !error && searchTerms.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-10 w-10" />}
          title="Search everything"
          description="Search across thoughts, knowledge items, business ideas, work ideas, personal ideas, quotes, and topics."
        />
      )}
    </div>
  );
};

export default SearchPage;
