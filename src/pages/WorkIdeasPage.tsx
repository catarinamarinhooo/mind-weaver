import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, ArrowRight, Users, User } from 'lucide-react';

const mockIdeas = [
  { id: '1', title: 'Automated code review pipeline', summary: 'AI-assisted code reviews to catch patterns and suggest improvements.', goal: 'Reduce review turnaround from 2 days to 2 hours', context: 'Growing team, increasing PR volume', priority: 'high' as const, timeline: 'Q2 2026', executionMode: 'team' as const, topics: ['Engineering', 'AI'] },
  { id: '2', title: 'Team knowledge sharing platform', summary: 'Internal wiki with smart search and auto-categorization.', goal: 'Reduce onboarding time by 50%', context: 'Knowledge silos across departments', priority: 'high' as const, timeline: 'Q3 2026', executionMode: 'team' as const, topics: ['Knowledge Management'] },
  { id: '3', title: 'Personal dashboard automation', summary: 'Automated daily/weekly dashboards with key metrics.', goal: 'Save 3 hours per week on reporting', context: 'Manual data aggregation', priority: 'medium' as const, timeline: 'Q2 2026', executionMode: 'solo' as const, topics: ['Productivity', 'Data'] },
];

const WorkIdeasPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idea = mockIdeas.find(i => i.id === selectedId);

  if (idea) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <h1 className="text-2xl font-semibold text-foreground mb-2">{idea.title}</h1>
        <div className="flex items-center gap-2 mb-6">
          <PriorityBadge priority={idea.priority} />
          <Badge variant="outline">{idea.timeline}</Badge>
          <Badge variant="outline" className="gap-1">
            {idea.executionMode === 'team' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {idea.executionMode}
          </Badge>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Goal', value: idea.goal },
            { label: 'Context', value: idea.context },
            { label: 'Summary', value: idea.summary },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</h3>
              <p className="text-sm text-foreground">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">{idea.topics.map(t => <TopicTag key={t} name={t} />)}</div>
        <div className="mt-6">
          <AISuggestionBox>
            <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Related knowledge: "AI Code Review Tools Comparison"</p>
          </AISuggestionBox>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Work Ideas" description="Improvements and initiatives" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Idea</Button>} />
      <div className="space-y-3">
        {mockIdeas.map((idea) => (
          <ContentCard key={idea.id} onClick={() => setSelectedId(idea.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{idea.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  {idea.topics.map(t => <TopicTag key={t} name={t} />)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={idea.priority} />
                <Badge variant="outline" className="text-xs">{idea.timeline}</Badge>
                {idea.executionMode === 'team' ? <Users className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default WorkIdeasPage;
