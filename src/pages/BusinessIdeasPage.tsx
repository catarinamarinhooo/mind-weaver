import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

const mockIdeas = [
  { id: '1', title: 'AI-powered recipe planner', description: 'Personalized meal planning using dietary preferences and grocery availability.', problem: 'People waste time and money on unplanned meals.', audience: 'Health-conscious professionals', category: 'FoodTech', priority: 'high' as const, stage: 'validation', potentialScore: 85, insights: 'Market growing 15% YoY', topics: ['AI', 'Health'] },
  { id: '2', title: 'Smart home energy optimizer', description: 'ML-based system to reduce home energy consumption.', problem: 'Rising energy costs and environmental impact.', audience: 'Homeowners', category: 'CleanTech', priority: 'high' as const, stage: 'concept', potentialScore: 72, insights: 'Government incentives increasing', topics: ['IoT', 'Sustainability'] },
  { id: '3', title: 'Freelancer invoice automation', description: 'Automated invoicing and payment tracking for freelancers.', problem: 'Manual invoicing wastes hours monthly.', audience: 'Freelancers', category: 'FinTech', priority: 'medium' as const, stage: 'concept', potentialScore: 68, insights: 'Gig economy expanding rapidly', topics: ['SaaS', 'Finance'] },
];

const stageColors: Record<string, string> = {
  concept: 'bg-muted text-muted-foreground',
  validation: 'bg-priority-medium/10 text-priority-medium',
  development: 'bg-accent/10 text-accent',
  launched: 'bg-priority-low/10 text-priority-low',
};

const BusinessIdeasPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idea = mockIdeas.find(i => i.id === selectedId);

  if (idea) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{idea.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <PriorityBadge priority={idea.priority} />
              <Badge className={stageColors[idea.stage]}>{idea.stage}</Badge>
              <span className="text-sm text-muted-foreground">Score: {idea.potentialScore}/100</span>
            </div>
          </div>
          <Button size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Develop this idea</Button>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Problem', value: idea.problem },
            { label: 'Audience', value: idea.audience },
            { label: 'Description', value: idea.description },
            { label: 'Insights', value: idea.insights },
          ].map(({ label, value }) => value && (
            <div key={label} className="glass-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</h3>
              <p className="text-sm text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {idea.topics.map(t => <TopicTag key={t} name={t} />)}
        </div>

        <div className="mt-6">
          <AISuggestionBox>
            <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Similar idea found: "Personalized nutrition app" — consider merging</p>
            <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Your thought on "health personalization" could strengthen this</p>
          </AISuggestionBox>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Business Ideas"
        description="Develop potential businesses"
        actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Idea</Button>}
      />
      <div className="space-y-3">
        {mockIdeas.map((idea) => (
          <ContentCard key={idea.id} onClick={() => setSelectedId(idea.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{idea.insights}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">{idea.category}</span>
                  {idea.topics.map(t => <TopicTag key={t} name={t} />)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={idea.priority} />
                <Badge className={stageColors[idea.stage]}>{idea.stage}</Badge>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default BusinessIdeasPage;
