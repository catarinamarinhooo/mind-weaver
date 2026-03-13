import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
  "What thoughts do I have about stress and productivity?",
  "Which business ideas are high priority?",
  "Show my work ideas for next quarter.",
  "Summarize what I know about machine learning.",
  "What connections exist between my recent readings?",
];

const AskPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = text || input;
    if (!message.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: message };
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `I'll analyze your knowledge base for "${message}". This is a placeholder response — once connected to the backend API, I'll provide real insights from your stored knowledge, thoughts, and ideas.`,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      <PageHeader title="Ask AI" description="Chat with your knowledge base" />

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="ai-gradient rounded-full p-4 mb-6">
            <Sparkles className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">What would you like to know?</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            Ask questions about your stored knowledge, explore connections, or get suggestions.
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="ai-gradient rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-lg px-4 py-3 text-sm',
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'glass-card text-foreground'
              )}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="bg-muted rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="border-t border-border pt-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your knowledge..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AskPage;
