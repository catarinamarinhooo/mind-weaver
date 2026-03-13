import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, BookOpen } from 'lucide-react';

const mockTerms = [
  { id: '1', term: 'Vector Embedding', definition: 'A numerical representation of data (text, image, etc.) in a high-dimensional space, enabling similarity comparisons.', aliases: ['Embedding', 'Feature Vector'], topics: ['Machine Learning', 'Search'] },
  { id: '2', term: 'Product-Led Growth (PLG)', definition: 'A business methodology where the product itself is the primary driver of customer acquisition, conversion, and expansion.', aliases: ['PLG'], topics: ['SaaS', 'Growth'] },
  { id: '3', term: 'Cognitive Load', definition: 'The total amount of mental effort being used in working memory during problem-solving or learning.', aliases: [], topics: ['Productivity', 'UX'] },
  { id: '4', term: 'Compound Interest', definition: 'Interest calculated on the initial principal and accumulated interest from previous periods.', aliases: ['Compounding'], topics: ['Personal Finance'] },
];

const GlossaryPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const term = mockTerms.find(t => t.id === selectedId);

  if (term) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold text-foreground">{term.term}</h1>
        </div>
        <div className="glass-card p-6 mb-4">
          <p className="text-foreground leading-relaxed">{term.definition}</p>
        </div>
        {term.aliases.length > 0 && (
          <div className="glass-card p-4 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Also known as</h3>
            <div className="flex gap-2">{term.aliases.map(a => <span key={a} className="text-sm text-foreground">{a}</span>)}</div>
          </div>
        )}
        <div className="flex gap-2">{term.topics.map(t => <TopicTag key={t} name={t} />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Glossary" description="Key concepts and definitions" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Term</Button>} />
      <div className="space-y-2">
        {mockTerms.map((term) => (
          <ContentCard key={term.id} onClick={() => setSelectedId(term.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{term.term}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{term.definition}</p>
              </div>
              <div className="flex gap-1 shrink-0">{term.topics.map(t => <TopicTag key={t} name={t} />)}</div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default GlossaryPage;
