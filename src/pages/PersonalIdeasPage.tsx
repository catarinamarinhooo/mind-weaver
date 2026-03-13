import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';

const mockIdeas = [
  { id: '1', title: 'Morning routine optimization', description: 'Design a structured morning routine based on sleep science and habit research.', category: 'Wellness', priority: 'high' as const, goal: 'Consistent energy throughout the day', timeline: 'This month', expectedImpact: 'High', topics: ['Wellness', 'Productivity'] },
  { id: '2', title: 'Personal finance automation', description: 'Set up automated savings, investments, and budget tracking.', category: 'Finance', priority: 'medium' as const, goal: 'Financial independence by 2030', timeline: 'Q2 2026', expectedImpact: 'Very High', topics: ['Finance', 'Automation'] },
  { id: '3', title: 'Learn Rust for systems programming', description: 'Deep dive into Rust for performance-critical applications.', category: 'Learning', priority: 'low' as const, goal: 'Build one production service in Rust', timeline: 'H2 2026', expectedImpact: 'Medium', topics: ['Engineering', 'Learning'] },
];

const PersonalIdeasPage = () => {
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
          <span className="text-sm text-muted-foreground">{idea.category}</span>
          <span className="text-sm text-muted-foreground">· Impact: {idea.expectedImpact}</span>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Description', value: idea.description },
            { label: 'Goal', value: idea.goal },
            { label: 'Timeline', value: idea.timeline },
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
            <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Your notes on "Atomic Habits" could help structure this</p>
          </AISuggestionBox>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Personal Ideas" description="Ideas for your personal life and growth" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Idea</Button>} />
      <div className="space-y-3">
        {mockIdeas.map((idea) => (
          <ContentCard key={idea.id} onClick={() => setSelectedId(idea.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>
                <div className="flex items-center gap-2 mt-2">{idea.topics.map(t => <TopicTag key={t} name={t} />)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={idea.priority} />
                <span className="text-xs text-muted-foreground">{idea.category}</span>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default PersonalIdeasPage;
