import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft, Hash } from 'lucide-react';

const mockTopics = [
  { id: '1', name: 'Machine Learning', description: 'Artificial intelligence and deep learning concepts.', itemCount: 24, relatedTopics: ['AI', 'Data Science'], subtopics: ['NLP', 'Computer Vision', 'Reinforcement Learning'] },
  { id: '2', name: 'Productivity', description: 'Methods and tools for personal and professional effectiveness.', itemCount: 18, relatedTopics: ['Habits', 'Time Management'], subtopics: ['GTD', 'Deep Work'] },
  { id: '3', name: 'SaaS', description: 'Software as a Service business models and strategies.', itemCount: 15, relatedTopics: ['Startups', 'Growth'], subtopics: ['Pricing', 'Churn', 'PLG'] },
  { id: '4', name: 'Personal Finance', description: 'Money management, investing, and financial independence.', itemCount: 12, relatedTopics: ['Investing', 'Budgeting'], subtopics: [] },
  { id: '5', name: 'Engineering', description: 'Software engineering practices and architecture.', itemCount: 21, relatedTopics: ['DevOps', 'Architecture'], subtopics: ['API Design', 'Testing', 'CI/CD'] },
];

const TopicsPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const topic = mockTopics.find(t => t.id === selectedId);

  if (topic) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Hash className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-semibold text-foreground">{topic.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{topic.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subtopics</h3>
            <div className="flex flex-wrap gap-2">
              {topic.subtopics.length > 0 ? topic.subtopics.map(s => <TopicTag key={s} name={s} />) : <span className="text-sm text-muted-foreground">None yet</span>}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {topic.relatedTopics.map(r => <TopicTag key={r} name={r} />)}
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Linked Items</h3>
          <p className="text-sm text-muted-foreground">{topic.itemCount} items linked to this topic</p>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">Edit Topic</Button>
          <Button variant="outline" size="sm">Merge Topics</Button>
          <Button variant="outline" size="sm">Create Subtopic</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Topics" description="Organize knowledge by topic" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Topic</Button>} />
      <div className="content-grid">
        {mockTopics.map((topic) => (
          <ContentCard key={topic.id} onClick={() => setSelectedId(topic.id)}>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">{topic.name}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">{topic.itemCount}</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{topic.description}</p>
            <div className="flex flex-wrap gap-1">
              {topic.relatedTopics.map(r => <TopicTag key={r} name={r} />)}
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default TopicsPage;
