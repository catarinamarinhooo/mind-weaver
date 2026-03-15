import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ContentCard } from "@/components/shared/ContentCard";
import { AISuggestionBox } from "@/components/shared/AISuggestionBox";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  getBusinessIdeas,
  getKnowledgeItems,
  getPersonalIdeas,
  getQuotes,
  getThoughts,
  getWorkIdeas,
} from "@/lib/api";
import { getUserProfile } from "@/lib/userProfile";
import {
  Link2,
  Brain,
  Lightbulb,
  Briefcase,
  Heart,
  ArrowRight,
  Sparkles,
  Clock,
  Quote,
  BookOpen,
} from "lucide-react";

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  time: string;
  timestamp: number;
  path: string;
  icon: typeof Brain;
};

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({
    knowledge: 0,
    thoughts: 0,
    business: 0,
    work: 0,
    personal: 0,
    quotes: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const userProfile = getUserProfile();

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [
          thoughts,
          knowledgeItems,
          businessIdeas,
          workIdeas,
          personalIdeas,
          quotes,
        ] = await Promise.all([
          getThoughts(),
          getKnowledgeItems(),
          getBusinessIdeas(),
          getWorkIdeas(),
          getPersonalIdeas(),
          getQuotes(),
        ]);

        setCounts({
          knowledge: knowledgeItems.length,
          thoughts: thoughts.length,
          business: businessIdeas.length,
          work: workIdeas.length,
          personal: personalIdeas.length,
          quotes: quotes.length,
        });

        const activity: ActivityItem[] = [
          ...thoughts.map((item) => ({
            id: `thought-${item.id}`,
            type: "Thought",
            title: item.title || item.content.slice(0, 60),
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: `/thoughts/${item.id}`,
            icon: Brain,
          })),
          ...knowledgeItems.map((item) => ({
            id: `knowledge-${item.id}`,
            type: "Knowledge",
            title: item.title || item.url,
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: "/library",
            icon: Link2,
          })),
          ...businessIdeas.map((item) => ({
            id: `business-${item.id}`,
            type: "Business",
            title: item.title,
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: "/business-ideas",
            icon: Lightbulb,
          })),
          ...workIdeas.map((item) => ({
            id: `work-${item.id}`,
            type: "Work",
            title: item.title,
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: "/work-ideas",
            icon: Briefcase,
          })),
          ...personalIdeas.map((item) => ({
            id: `personal-${item.id}`,
            type: "Personal",
            title: item.title,
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: "/personal-ideas",
            icon: Heart,
          })),
          ...quotes.map((item) => ({
            id: `quote-${item.id}`,
            type: "Quote",
            title: item.book_title,
            time: formatRelativeTime(item.created_at),
            timestamp: new Date(item.created_at).getTime(),
            path: "/quotes",
            icon: Quote,
          })),
        ]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 8);

        setRecentActivity(activity);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const statCards = [
    {
      label: "Knowledge Items",
      count: counts.knowledge,
      icon: Link2,
      path: "/library",
    },
    {
      label: "Thoughts",
      count: counts.thoughts,
      icon: Brain,
      path: "/thoughts",
    },
    {
      label: "Business Ideas",
      count: counts.business,
      icon: Lightbulb,
      path: "/business-ideas",
    },
    {
      label: "Work Ideas",
      count: counts.work,
      icon: Briefcase,
      path: "/work-ideas",
    },
    {
      label: "Personal Ideas",
      count: counts.personal,
      icon: Heart,
      path: "/personal-ideas",
    },
    {
      label: "Quotes",
      count: counts.quotes,
      icon: Quote,
      path: "/quotes",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Dashboard"
        description={`CortexKnows at a glance for ${userProfile.nickname}`}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Add Link", icon: Link2, path: "/capture?type=knowledge" },
            { label: "Add Thought", icon: Brain, path: "/capture?type=thought" },
            {
              label: "Add Business Idea",
              icon: Lightbulb,
              path: "/capture?type=business",
            },
            { label: "Add Quote", icon: Quote, path: "/capture?type=quote" },
            { label: "Add Work Idea", icon: Briefcase, path: "/capture?type=work" },
            {
              label: "Add Personal Idea",
              icon: Heart,
              path: "/capture?type=personal",
            },
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

      {loading && (
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      )}

      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card) => (
              <Link key={card.label} to={card.path}>
                <ContentCard className="flex items-center gap-4">
                  <div className="rounded-full bg-accent/10 p-3 text-accent">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">
                      {card.count}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {card.label}
                    </div>
                  </div>
                </ContentCard>
              </Link>
            ))}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Recent Activity
              </h2>
            </div>

            {recentActivity.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-10 w-10" />}
                title="No activity yet"
                description="Start by capturing your first thought or knowledge item in CortexKnows."
                action={
                  <Link to="/capture">
                    <Button>Open Capture</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <Link key={item.id} to={item.path}>
                    <ContentCard className="flex items-center gap-3 py-3">
                      <item.icon className="h-4 w-4 shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.type}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.time}
                      </span>
                    </ContentCard>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <AISuggestionBox title="MVP Status">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-accent" />
                CortexKnows already stores Thoughts, Knowledge Items, Business Ideas, Work Ideas, Personal Ideas, and Quotes in the real backend.
              </p>
              <p className="flex items-center gap-2">
                <ArrowRight className="h-3 w-3 text-accent" />
                The next strong step is adding topics and relationships on top
                of these core entities.
              </p>
              <p className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-accent" />
                After that, semantic search and AI suggestions become much
                easier to layer in.
              </p>
            </div>
          </AISuggestionBox>
        </>
      )}
    </div>
  );
};

export default Dashboard;
