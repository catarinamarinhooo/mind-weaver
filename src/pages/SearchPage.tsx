import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Sparkles, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockResults = [
  { type: 'knowledge', id: '1', title: 'How Stripe Built a $95B Company', snippet: 'Deep dive into Stripe\'s growth strategy focusing on developer experience...', relevance: 0.95 },
  { type: 'thought', id: '2', title: 'API design as user experience', snippet: 'Good APIs feel like good UX. Same principles apply: consistency...', relevance: 0.88 },
  { type: 'business_idea', id: '3', title: 'AI-powered recipe planner', snippet: 'Personalized meal planning using dietary preferences...', relevance: 0.82 },
  { type: 'work_idea', id: '4', title: 'Automated code review pipeline', snippet: 'AI-assisted code reviews to catch patterns...', relevance: 0.79 },
  { type: 'discovery', id: '5', title: 'Building with LLMs in Production', snippet: 'Practical advice on deploying language models...', relevance: 0.75 },
];

const typeColors: Record<string, string> = {
  knowledge: 'bg-accent/10 text-accent',
  thought: 'bg-purple-100 text-purple-700',
  business_idea: 'bg-priority-medium/10 text-priority-medium',
  work_idea: 'bg-blue-100 text-blue-700',
  personal_idea: 'bg-pink-100 text-pink-700',
  discovery: 'bg-muted text-muted-foreground',
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [hasSearched, setHasSearched] = useState(!!searchParams.get('q'));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setHasSearched(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Search" description="Find anything in your knowledge base" />

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your entire knowledge base..."
            className="h-12 pl-12 pr-4 text-base"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex gap-1 p-0.5 bg-secondary rounded-md">
            <button
              type="button"
              onClick={() => setSearchMode('keyword')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded', searchMode === 'keyword' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              Keyword
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('semantic')}
              className={cn('px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1', searchMode === 'semantic' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              <Sparkles className="h-3 w-3" /> Semantic
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Advanced
          </Button>
        </div>
      </form>

      {hasSearched && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">{mockResults.length} results for "{query || 'stripe'}"</p>
          {mockResults.map((result) => (
            <ContentCard key={`${result.type}-${result.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-xs', typeColors[result.type])}>{result.type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(result.relevance * 100)}% match</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{result.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-16 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Start typing to search across all your knowledge</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
