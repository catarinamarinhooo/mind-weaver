import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiChatResponse,
  type AIChatCitation,
  type AIChatMessage,
} from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AIChatCitation[];
}

const examplePrompts = [
  "What thoughts do I have about stress and productivity?",
  "Which business ideas are high priority?",
  "Show my work ideas for next quarter.",
  "Summarize what I know about machine learning.",
  "What connections exist between my recent readings?",
  "What did I save from YouTube videos and podcasts about AI?",
  "Summarize the main ideas from my saved podcast notes.",
];

function getCitationPath(citation: AIChatCitation) {
  switch (citation.entity_type) {
    case "thought":
      return `/thoughts/${citation.entity_id}`;
    case "knowledge":
      return `/library/${citation.entity_id}`;
    case "knowledge_media":
      return citation.parent_entity_id ? `/library/${citation.parent_entity_id}` : "/library";
    case "business_idea":
      return "/business-ideas";
    case "work_idea":
      return "/work-ideas";
    case "personal_idea":
      return "/personal-ideas";
    case "quote":
      return "/quotes";
    case "glossary_term":
      return "/glossary";
    case "topic":
      return "/topics";
    default:
      return "/";
  }
}

function getCitationTypeLabel(citation: AIChatCitation) {
  if (citation.entity_type === "knowledge_media") {
    const lowerUrl = (citation.url || "").toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
      return "Video";
    }
    return "Podcast";
  }

  switch (citation.entity_type) {
    case "knowledge":
      return "Knowledge";
    case "thought":
      return "Thought";
    case "business_idea":
      return "Business";
    case "work_idea":
      return "Work";
    case "personal_idea":
      return "Personal";
    case "quote":
      return "Quote";
    case "glossary_term":
      return "Glossary";
    case "topic":
      return "Topic";
    default:
      return "Source";
  }
}

function getCitationTypeClasses(citation: AIChatCitation) {
  if (citation.entity_type === "knowledge_media") {
    const lowerUrl = (citation.url || "").toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
      return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  switch (citation.entity_type) {
    case "knowledge":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "thought":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "business_idea":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "work_idea":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "personal_idea":
      return "border-pink-200 bg-pink-50 text-pink-700";
    case "quote":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "glossary_term":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "topic":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-border bg-background text-muted-foreground";
  }
}

function getGroupedCitations(citations: AIChatCitation[]) {
  const groups = new Map<string, AIChatCitation[]>();
  for (const citation of citations) {
    const label = getCitationTypeLabel(citation);
    const current = groups.get(label) ?? [];
    current.push(citation);
    groups.set(label, current);
  }
  return Array.from(groups.entries()).map(([label, items]) => [
    label,
    [...items].sort((first, second) => (second.score || 0) - (first.score || 0)),
  ] as const);
}

const AskPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && messages.length === 0 && !isSending) {
      setInput(prompt);
    }
  }, [isSending, messages.length, searchParams]);

  const handleSend = async (text?: string) => {
    const message = (text || input).trim();
    if (!message || isSending) return;

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
    };

    const historyPayload: AIChatMessage[] = messages.slice(-8).map((item) => ({
      role: item.role,
      content: item.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await getAiChatResponse({
        message,
        history: historyPayload,
      });

      const aiMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.answer,
        citations: response.citations,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ask AI.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <PageHeader
        title="Ask AI"
        description="Chat with your own workspace. The AI uses only your authenticated context, including saved media insights from videos and podcasts."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="ai-gradient mb-6 rounded-full p-4">
            <Sparkles className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            What would you like to know?
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Ask about your saved knowledge, thoughts, ideas, glossary terms, media links, and AI-generated insights inside your workspace.
          </p>
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void handleSend(prompt)}
                className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex-1 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="ai-gradient mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass-card text-foreground"
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Related workspace items
                    </div>
                    <div className="space-y-3">
                      {getGroupedCitations(msg.citations).map(([groupLabel, groupCitations]) => (
                        <div
                          key={`${msg.id}-${groupLabel}`}
                          className="rounded-xl border border-border/70 bg-background/60 p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium",
                                getCitationTypeClasses(groupCitations[0])
                              )}
                            >
                              {groupLabel}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {groupCitations.length} source{groupCitations.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {groupCitations.map((citation) => (
                              <div
                                key={`${msg.id}-${citation.entity_type}-${citation.entity_id}-${citation.label}`}
                                className="flex flex-wrap gap-2"
                              >
                                {citation.url ? (
                                  <a
                                    href={citation.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-accent"
                                  >
                                    {citation.label}
                                    <ArrowRight className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <Link
                                    to={getCitationPath(citation)}
                                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-accent"
                                  >
                                    {citation.label}
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                )}
                                {citation.parent_entity_id && citation.parent_label && (
                                  <Link
                                    to={getCitationPath({
                                      ...citation,
                                      entity_type: citation.parent_entity_type || "knowledge",
                                      entity_id: citation.parent_entity_id,
                                    })}
                                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent"
                                  >
                                    In {citation.parent_label}
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start gap-3">
              <div className="ai-gradient mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <div className="glass-card rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                Thinking about your workspace...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="border-t border-border pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your knowledge..."
            className="flex-1"
            maxLength={4000}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AskPage;
