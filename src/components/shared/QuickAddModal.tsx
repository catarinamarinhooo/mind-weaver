import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Link2, Brain, Lightbulb, Briefcase, Heart, Quote, BookOpen } from 'lucide-react';

const quickAddItems = [
  { label: 'Knowledge Item', icon: Link2, tab: 'knowledge' },
  { label: 'Thought', icon: Brain, tab: 'thought' },
  { label: 'Business Idea', icon: Lightbulb, tab: 'business' },
  { label: 'Work Idea', icon: Briefcase, tab: 'work' },
  { label: 'Personal Idea', icon: Heart, tab: 'personal' },
  { label: 'Quote', icon: Quote, tab: 'quote' },
  { label: 'Glossary Term', icon: BookOpen, tab: 'glossary' },
];

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const navigate = useNavigate();

  const handleSelect = (tab: string) => {
    navigate(`/capture?type=${tab}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {quickAddItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleSelect(item.tab)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary transition-colors text-left"
            >
              <item.icon className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
