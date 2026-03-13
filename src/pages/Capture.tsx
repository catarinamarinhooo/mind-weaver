import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Brain, Lightbulb, Briefcase, Heart, Quote, Save, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'knowledge', label: 'Knowledge Item', icon: Link2 },
  { id: 'thought', label: 'Thought', icon: Brain },
  { id: 'business', label: 'Business Idea', icon: Lightbulb },
  { id: 'quote', label: 'Quote', icon: Quote },
  { id: 'work', label: 'Work Idea', icon: Briefcase },
  { id: 'personal', label: 'Personal Idea', icon: Heart },
];

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">{label}</label>
    {children}
  </div>
);

const Capture = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'knowledge');

  const renderForm = () => {
    switch (activeTab) {
      case 'knowledge':
        return (
          <div className="space-y-4">
            <FieldGroup label="URL"><Input placeholder="https://..." /></FieldGroup>
            <FieldGroup label="Title"><Input placeholder="Article title" /></FieldGroup>
            <FieldGroup label="Personal Note"><Textarea placeholder="Your takeaways..." rows={3} /></FieldGroup>
            <FieldGroup label="Source (optional)"><Input placeholder="Blog, newsletter, etc." /></FieldGroup>
            <FieldGroup label="Brief Description"><Textarea placeholder="What is this about?" rows={2} /></FieldGroup>
            <FieldGroup label="Image (optional)">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground hover:border-accent/50 transition-colors cursor-pointer">
                Click or drag to upload an image
              </div>
            </FieldGroup>
          </div>
        );
      case 'thought':
        return (
          <div className="space-y-4">
            <FieldGroup label="Title"><Input placeholder="Name your thought" /></FieldGroup>
            <FieldGroup label="Thought Text"><Textarea placeholder="Write your thought..." rows={6} /></FieldGroup>
            <FieldGroup label="Thought Type (optional)">
              <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="observation">Observation</SelectItem>
                  <SelectItem value="hypothesis">Hypothesis</SelectItem>
                  <SelectItem value="reflection">Reflection</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Link (optional)"><Input placeholder="Related URL" /></FieldGroup>
          </div>
        );
      case 'business':
        return (
          <div className="space-y-4">
            <FieldGroup label="Title"><Input placeholder="Business idea name" /></FieldGroup>
            <FieldGroup label="Description"><Textarea placeholder="Describe the idea..." rows={3} /></FieldGroup>
            <FieldGroup label="Problem"><Textarea placeholder="What problem does it solve?" rows={2} /></FieldGroup>
            <FieldGroup label="Audience"><Input placeholder="Who is this for?" /></FieldGroup>
            <FieldGroup label="Priority">
              <Select><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Next Steps"><Textarea placeholder="What should be done next?" rows={2} /></FieldGroup>
          </div>
        );
      case 'quote':
        return (
          <div className="space-y-4">
            <FieldGroup label="Book Title"><Input placeholder="Name of the book" /></FieldGroup>
            <FieldGroup label="Quote Text"><Textarea placeholder="Enter the quote..." rows={4} /></FieldGroup>
            <FieldGroup label="Page (optional)"><Input type="number" placeholder="Page number" /></FieldGroup>
            <FieldGroup label="Your Thoughts (optional)"><Textarea placeholder="What does this quote mean to you?" rows={3} /></FieldGroup>
          </div>
        );
      case 'work':
        return (
          <div className="space-y-4">
            <FieldGroup label="Title"><Input placeholder="Work idea name" /></FieldGroup>
            <FieldGroup label="Goal"><Input placeholder="What do you want to achieve?" /></FieldGroup>
            <FieldGroup label="Summary"><Textarea placeholder="Summarize the idea..." rows={3} /></FieldGroup>
            <FieldGroup label="Context"><Textarea placeholder="What's the context?" rows={2} /></FieldGroup>
            <FieldGroup label="Application Category"><Input placeholder="Engineering, Design, etc." /></FieldGroup>
            <FieldGroup label="Priority">
              <Select><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Timeline"><Input placeholder="Q2 2026, Next month, etc." /></FieldGroup>
            <FieldGroup label="Execution Mode">
              <Select><SelectTrigger><SelectValue placeholder="Solo or Team?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </div>
        );
      case 'personal':
        return (
          <div className="space-y-4">
            <FieldGroup label="Title"><Input placeholder="Personal idea name" /></FieldGroup>
            <FieldGroup label="Description"><Textarea placeholder="Describe your idea..." rows={3} /></FieldGroup>
            <FieldGroup label="Category"><Input placeholder="Wellness, Finance, Learning, etc." /></FieldGroup>
            <FieldGroup label="Priority">
              <Select><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Goal"><Textarea placeholder="What's the end goal?" rows={2} /></FieldGroup>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Capture" description="Quickly add new information to your system" />

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-secondary rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="glass-card p-6">
        {renderForm()}

        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button className="gap-2">
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button variant="outline" className="gap-2">
            <Zap className="h-4 w-4" /> Save & Process
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Capture;
