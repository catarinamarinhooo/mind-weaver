import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, BookmarkPlus, X, Hash, Filter } from 'lucide-react';

const mockDiscovery = [
  { id: '1', title: 'The Rise of Edge Computing in AI Inference', summary: 'How edge computing is reducing latency for AI applications by moving computation closer to users.', topic: 'Machine Learning', source: 'TechCrunch', sourceUrl: '#', publishDate: '2026-03-13' },
  { id: '2', title: 'PostgreSQL 17: Performance Breakthroughs', summary: 'New features including incremental backups, improved sort performance, and better JSON support.', topic: 'Databases', source: 'Hacker News', sourceUrl: '#', publishDate: '2026-03-12' },
  { id: '3', title: 'Building with LLMs in Production: Lessons Learned', summary: 'Practical advice on deploying language models, handling hallucinations, and managing costs.', topic: 'AI', source: 'a16z Blog', sourceUrl: '#', publishDate: '2026-03-11' },
  { id: '4', title: 'The Future of Remote Work: 2026 Trends', summary: 'How companies are adapting their culture and tools for hybrid and fully remote teams.', topic: 'Productivity', source: 'HBR', sourceUrl: '#', publishDate: '2026-03-10' },
  { id: '5', title: 'Why Most SaaS Pricing is Wrong', summary: 'Analysis of common pricing mistakes and frameworks for value-based pricing strategies.', topic: 'SaaS', source: 'First Round Review', sourceUrl: '#', publishDate: '2026-03-09' },
];

const DiscoveryPage = () => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Discovery"
        description="New content from your watchlists"
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        }
      />

      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 glass-card">
          <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="ml">Machine Learning</SelectItem>
              <SelectItem value="saas">SaaS</SelectItem>
            </SelectContent>
          </Select>
          <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="hn">Hacker News</SelectItem>
              <SelectItem value="tc">TechCrunch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        {mockDiscovery.map((item) => (
          <ContentCard key={item.id} className="group">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  <TopicTag name={item.topic} />
                  <span className="text-xs text-muted-foreground">· {item.source}</span>
                  <span className="text-xs text-muted-foreground">· {item.publishDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Open source">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Save to library">
                  <BookmarkPlus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Link to topic">
                  <Hash className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Ignore">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryPage;
