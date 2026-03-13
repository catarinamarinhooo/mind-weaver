import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ContentCard } from '@/components/shared/ContentCard';
import { TopicTag } from '@/components/shared/TopicTag';
import { AISuggestionBox } from '@/components/shared/AISuggestionBox';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, ArrowRight, Quote as QuoteIcon } from 'lucide-react';

const mockQuotes = [
  { id: '1', bookTitle: 'Atomic Habits', text: 'You do not rise to the level of your goals. You fall to the level of your systems.', page: 27, thoughts: 'This applies perfectly to knowledge management — need systems, not just intentions.', topics: ['Habits', 'Productivity'] },
  { id: '2', bookTitle: 'The Pragmatic Programmer', text: 'Don\'t live with broken windows. Fix each one as soon as it is discovered.', page: 14, thoughts: 'Technical debt metaphor that applies broadly to life.', topics: ['Engineering', 'Quality'] },
  { id: '3', bookTitle: 'Thinking, Fast and Slow', text: 'A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth.', page: 62, thoughts: undefined, topics: ['Psychology', 'Decision Making'] },
  { id: '4', bookTitle: 'Deep Work', text: 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable.', page: 14, thoughts: 'This is why I need to protect my focus time.', topics: ['Productivity', 'Focus'] },
];

const QuotesPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const quote = mockQuotes.find(q => q.id === selectedId);

  if (quote) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="glass-card p-8 mb-6">
          <QuoteIcon className="h-8 w-8 text-accent/30 mb-4" />
          <blockquote className="text-lg text-foreground leading-relaxed italic">
            "{quote.text}"
          </blockquote>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{quote.bookTitle}</span>
            {quote.page && <span className="text-xs text-muted-foreground">· p. {quote.page}</span>}
          </div>
        </div>

        {quote.thoughts && (
          <div className="glass-card p-4 mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Thoughts</h3>
            <p className="text-sm text-foreground">{quote.thoughts}</p>
          </div>
        )}

        <div className="flex gap-2 mb-6">{quote.topics.map(t => <TopicTag key={t} name={t} />)}</div>

        <AISuggestionBox>
          <p className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-accent" /> This quote connects to your thought on "knowledge compounding"</p>
        </AISuggestionBox>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Quotes" description="Collected wisdom from books" actions={<Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Quote</Button>} />
      <div className="space-y-3">
        {mockQuotes.map((q) => (
          <ContentCard key={q.id} onClick={() => setSelectedId(q.id)}>
            <div className="flex items-start gap-3">
              <QuoteIcon className="h-4 w-4 text-accent/50 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground italic line-clamp-2">"{q.text}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-foreground">{q.bookTitle}</span>
                  {q.page && <span className="text-xs text-muted-foreground">· p. {q.page}</span>}
                  {q.topics.map(t => <TopicTag key={t} name={t} />)}
                </div>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
};

export default QuotesPage;
