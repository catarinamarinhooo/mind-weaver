import { Link } from 'react-router-dom';
import { ContentCard } from '@/components/shared/ContentCard';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Link2, Brain, Lightbulb, Briefcase, Heart, ArrowRight, Sparkles, TrendingUp, Clock } from 'lucide-react';

// Mock data
const recentActivity = [
  { id: '1', type: 'knowledge', title: 'How Stripe Built a $95B Company', time: '2h ago', icon: Link2 },
  { id: '2', type: 'thought', title: 'Rethinking productivity metrics', time: '4h ago', icon: Brain },
  { id: '3', type: 'business', title: 'AI-powered recipe planner', time: '1d ago', icon: Lightbulb },
  { id: '4', type: 'work', title: 'Automated code review pipeline', time: '1d ago', icon: Briefcase },
  { id: '5', type: 'personal', title: 'Morning routine optimization', time: '2d ago', icon: Heart },
];

const priorityBusinessIdeas = [
  { id: '1', title: 'AI-powered recipe planner', priority: 'high' as const, stage: 'validation' },
  { id: '2', title: 'Smart home energy optimizer', priority: 'high' as const, stage: 'concept' },
];

const priorityWorkIdeas = [
  { id: '1', title: 'Automated code review pipeline', priority: 'high' as const, timeline: 'Q2 2026' },
  { id: '2', title: 'Team knowledge sharing platform', priority: 'high' as const, timeline: 'Q3 2026' },
];

const priorityPersonalIdeas = [
  { id: '1', title: 'Morning routine optimization', priority: 'high' as const, category: 'Wellness' },
];

const discoveryItems = [
  { id: '1', title: 'The Rise of Edge Computing in AI', source: 'TechCrunch', time: '3h ago' },
  { id: '2', title: 'PostgreSQL 17: What\'s New', source: 'Hacker News', time: '5h ago' },
  { id: '3', title: 'Building with LLMs in Production', source: 'a16z Blog', time: '1d ago' },
];

const activeTopics = [
  { name: 'Machine Learning', count: 24 },
  { name: 'Productivity', count: 18 },
  { name: 'SaaS', count: 15 },
  { name: 'Personal Finance', count: 12 },
];

const Dashboard = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader title="Dashboard" description="Your knowledge ecosystem at a glance" />

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Add Link', icon: Link2, path: '/capture?type=knowledge' },
            { label: 'Add Thought', icon: Brain, path: '/capture?type=thought' },
            { label: 'Add Business Idea', icon: Lightbulb, path: '/capture?type=business' },
            { label: 'Add Work Idea', icon: Briefcase, path: '/capture?type=work' },
            { label: 'Add Personal Idea', icon: Heart, path: '/capture?type=personal' },
          ].map((action) => (
            <Link key={action.path} to={action.path}>
              <Button variant="outline" size="sm" className="gap-2">
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Recent Activity
            </h2>
          </div>
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <ContentCard key={item.id} className="flex items-center gap-3 py-3">
                <item.icon className="h-4 w-4 text-accent shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
              </ContentCard>
            ))}
          </div>
        </div>

        {/* Topic Activity */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5" /> Active Topics
          </h2>
          <ContentCard hover={false} className="space-y-3">
            {activeTopics.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between">
                <TopicTag name={topic.name} />
                <span className="text-xs text-muted-foreground">{topic.count} items</span>
              </div>
            ))}
          </ContentCard>
        </div>
      </div>

      {/* Priority Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5" /> Business Ideas
          </h2>
          <div className="space-y-2">
            {priorityBusinessIdeas.map((idea) => (
              <ContentCard key={idea.id}>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-foreground">{idea.title}</span>
                  <PriorityBadge priority={idea.priority} />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{idea.stage}</span>
              </ContentCard>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5" /> Work Ideas
          </h2>
          <div className="space-y-2">
            {priorityWorkIdeas.map((idea) => (
              <ContentCard key={idea.id}>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-foreground">{idea.title}</span>
                  <PriorityBadge priority={idea.priority} />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{idea.timeline}</span>
              </ContentCard>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="h-3.5 w-3.5" /> Personal Ideas
          </h2>
          <div className="space-y-2">
            {priorityPersonalIdeas.map((idea) => (
              <ContentCard key={idea.id}>
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-foreground">{idea.title}</span>
                  <PriorityBadge priority={idea.priority} />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{idea.category}</span>
              </ContentCard>
            ))}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <AISuggestionBox title="Suggested by AI">
        <div className="space-y-2">
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Your thought on "productivity metrics" could become a work improvement idea</p>
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> 3 new articles match your "Machine Learning" watchlist</p>
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> Consider connecting "AI recipe planner" with your notes on personalization</p>
        </div>
      </AISuggestionBox>

      {/* Discovery Feed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Discovery Feed
          </h2>
          <Link to="/discovery" className="text-xs text-accent hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {discoveryItems.map((item) => (
            <ContentCard key={item.id}>
              <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-accent">{item.source}</span>
                <span className="text-xs text-muted-foreground">· {item.time}</span>
              </div>
            </ContentCard>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
