import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Star, ExternalLink } from 'lucide-react';

const mockItems = [
  { id: '1', title: 'How Stripe Built a $95B Company', summary: 'Deep dive into Stripe\'s growth strategy focusing on developer experience and API-first approach.', topics: ['SaaS', 'Growth'], source: 'First Round Review', date: '2026-03-10', importance: 'high' as const },
  { id: '2', title: 'The Art of PostgreSQL', summary: 'Comprehensive guide to advanced PostgreSQL features including CTEs, window functions, and JSONB.', topics: ['Databases', 'Engineering'], source: 'Personal Notes', date: '2026-03-08', importance: 'medium' as const },
  { id: '3', title: 'Atomic Habits Key Takeaways', summary: 'Core concepts: habit stacking, environment design, identity-based habits, and the plateau of latent potential.', topics: ['Productivity', 'Self-improvement'], source: 'Book Notes', date: '2026-03-05', importance: 'high' as const },
  { id: '4', title: 'Vector Search in Production', summary: 'Practical guide to implementing semantic search with pgvector and embedding models.', topics: ['Machine Learning', 'Search'], source: 'Hacker News', date: '2026-03-03', importance: 'medium' as const },
  { id: '5', title: 'Building Second Brains', summary: 'Tiago Forte\'s PARA method for organizing digital information and knowledge.', topics: ['Productivity', 'Knowledge Management'], source: 'Book Notes', date: '2026-02-28', importance: 'low' as const },
];

const LibraryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredItems = mockItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Library"
        description="Your knowledge collection"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 glass-card">
          <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="saas">SaaS</SelectItem>
              <SelectItem value="ml">Machine Learning</SelectItem>
              <SelectItem value="productivity">Productivity</SelectItem>
            </SelectContent>
          </Select>
          <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="book">Book Notes</SelectItem>
              <SelectItem value="hn">Hacker News</SelectItem>
            </SelectContent>
          </Select>
          <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Importance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <ContentCard key={item.id} className="group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {item.topics.map((t) => <TopicTag key={t} name={t} />)}
                  <span className="text-xs text-muted-foreground">· {item.source}</span>
                  <span className="text-xs text-muted-foreground">· {item.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <PriorityBadge priority={item.importance} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default LibraryPage;
