import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowRight, Lightbulb, Briefcase, Heart, Plus, ArrowLeft } from 'lucide-react';

const mockThoughts = [
  { id: '1', title: 'Rethinking productivity metrics', preview: 'Traditional productivity metrics focus on output, but what if we measured quality of decisions instead?', type: 'Hypothesis', maturity: 'growing', topics: ['Productivity', 'Management'] },
  { id: '2', title: 'The connection between sleep and creativity', preview: 'Noticed a pattern — best ideas come after deep sleep cycles. What if sleep optimization is the key?', type: 'Observation', maturity: 'seed', topics: ['Wellness', 'Creativity'] },
  { id: '3', title: 'API design as user experience', preview: 'Good APIs feel like good UX. Same principles apply: consistency, discoverability, progressive disclosure.', type: 'Reflection', maturity: 'mature', topics: ['Engineering', 'Design'] },
  { id: '4', title: 'Knowledge compounding', preview: 'Ideas get exponentially more valuable when connected. Need a system for cross-pollination.', type: 'Hypothesis', maturity: 'growing', topics: ['Knowledge Management'] },
];

const maturityColors: Record<string, string> = {
  seed: 'bg-priority-low/10 text-priority-low',
  growing: 'bg-priority-medium/10 text-priority-medium',
  mature: 'bg-accent/10 text-accent',
};

const ThoughtsPage = () => {
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const thought = mockThoughts.find(t => t.id === selectedThought);

  if (thought) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedThought(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Thoughts
        </Button>
        <h1 className="text-2xl font-semibold text-foreground mb-2">{thought.title}</h1>
        <div className="flex items-center gap-2 mb-6">
          <Badge className={maturityColors[thought.maturity]}>{thought.maturity}</Badge>
          <span className="text-sm text-muted-foreground">{thought.type}</span>
        </div>

        <div className="glass-card p-6 mb-6">
          <p className="text-foreground leading-relaxed">{thought.preview}</p>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {thought.topics.map(t => <TopicTag key={t} name={t} />)}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="outline" size="sm" className="gap-2"><Brain className="h-3.5 w-3.5" /> Develop this thought</Button>
          <Button variant="outline" size="sm" className="gap-2"><Lightbulb className="h-3.5 w-3.5" /> Convert to business idea</Button>
          <Button variant="outline" size="sm" className="gap-2"><Briefcase className="h-3.5 w-3.5" /> Convert to work idea</Button>
          <Button variant="outline" size="sm" className="gap-2"><Heart className="h-3.5 w-3.5" /> Convert to personal idea</Button>
        </div>

        <AISuggestionBox>
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> This thought connects to your note on "API design best practices"</p>
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Consider exploring how this relates to developer experience</p>
        </AISuggestionBox>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Thoughts"
        description="Your personal thinking space"
        actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Thought</Button>}
      />
      <div className="space-y-3">
        {mockThoughts.map((t) => (
          <ContentCard key={t.id} onClick={() => setSelectedThought(t.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.preview}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {t.topics.map(topic => <TopicTag key={topic} name={topic} />)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={maturityColors[t.maturity]}>{t.maturity}</Badge>
                <span className="text-xs text-muted-foreground">{t.type}</span>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default ThoughtsPage;
