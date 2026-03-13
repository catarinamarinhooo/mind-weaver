import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Trash2, Eye } from 'lucide-react';

const mockWatchlists = [
  {
    id: '1', name: 'AI & Machine Learning', topic: 'Machine Learning', frequency: 'Daily',
    sources: [
      { id: 's1', name: 'Hacker News', url: 'https://news.ycombinator.com', type: 'Forum' },
      { id: 's2', name: 'a16z Blog', url: 'https://a16z.com/blog', type: 'Blog' },
      { id: 's3', name: 'ArXiv CS.AI', url: 'https://arxiv.org/list/cs.AI', type: 'Academic' },
    ],
  },
  {
    id: '2', name: 'SaaS & Startups', topic: 'SaaS', frequency: 'Weekly',
    sources: [
      { id: 's4', name: 'First Round Review', url: 'https://firstround.com', type: 'Blog' },
      { id: 's5', name: 'SaaStr', url: 'https://saastr.com', type: 'Blog' },
    ],
  },
  {
    id: '3', name: 'Personal Development', topic: 'Self-improvement', frequency: 'Weekly',
    sources: [
      { id: 's6', name: 'James Clear', url: 'https://jamesclear.com', type: 'Newsletter' },
    ],
  },
];

const WatchlistsPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Watchlists" description="Monitor topics and sources" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Watchlist</Button>} />

      <div className="space-y-6">
        {mockWatchlists.map((wl) => (
          <ContentCard key={wl.id} hover={false}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">{wl.name}</h3>
                <Badge variant="secondary">{wl.topic}</Badge>
              </div>
              <Badge variant="outline">{wl.frequency}</Badge>
            </div>

            <div className="space-y-2">
              {wl.sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">{source.name}</span>
                    <span className="text-xs text-muted-foreground">{source.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="mt-3 gap-2">
              <Plus className="h-3 w-3" /> Add Source
            </Button>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default WatchlistsPage;
