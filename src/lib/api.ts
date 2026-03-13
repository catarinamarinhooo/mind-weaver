// Placeholder API service — all calls return mock data.
// Replace base URL and implement real fetch logic when backend is ready.

const API_BASE = '/api/v1';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Placeholder: in production, this would call the real API
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Entity types
export interface KnowledgeItem {
  id: string;
  title: string;
  url?: string;
  summary: string;
  source?: string;
  topics: string[];
  date: string;
  importance: 'high' | 'medium' | 'low';
  imageUrl?: string;
  personalNote?: string;
}

export interface Thought {
  id: string;
  title: string;
  content: string;
  type?: string;
  maturityLevel: 'seed' | 'growing' | 'mature';
  topics: string[];
  createdAt: string;
  link?: string;
}

export interface BusinessIdea {
  id: string;
  title: string;
  description: string;
  problem: string;
  audience: string;
  category?: string;
  priority: 'high' | 'medium' | 'low';
  stage: 'concept' | 'validation' | 'development' | 'launched';
  potentialScore: number;
  insights?: string;
  opportunity?: string;
  risks?: string;
  nextSteps?: string;
  topics: string[];
}

export interface WorkIdea {
  id: string;
  title: string;
  summary: string;
  goal?: string;
  context?: string;
  applicationCategory?: string;
  priority: 'high' | 'medium' | 'low';
  timeline?: string;
  executionMode: 'solo' | 'team';
  topics: string[];
}

export interface PersonalIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  goal?: string;
  timeline?: string;
  expectedImpact?: string;
  topics: string[];
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  itemCount: number;
  relatedTopics: string[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  aliases?: string[];
  topics: string[];
}

export interface Watchlist {
  id: string;
  name: string;
  topic: string;
  frequency: string;
  sources: WatchlistSource[];
}

export interface WatchlistSource {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface DiscoveryItem {
  id: string;
  title: string;
  summary: string;
  topic: string;
  source: string;
  sourceUrl: string;
  publishDate: string;
}

export interface Quote {
  id: string;
  bookTitle: string;
  text: string;
  page?: number;
  thoughts?: string;
  topics: string[];
}

export interface SearchResult {
  type: 'knowledge' | 'thought' | 'business_idea' | 'work_idea' | 'personal_idea' | 'discovery';
  id: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Placeholder API calls
export const api = {
  // Dashboard
  getRecentActivity: () => fetchApi<any[]>('/dashboard/recent'),
  getAISuggestions: () => fetchApi<any[]>('/dashboard/suggestions'),

  // Knowledge
  getKnowledgeItems: (filters?: Record<string, string>) => fetchApi<KnowledgeItem[]>('/knowledge'),
  getKnowledgeItem: (id: string) => fetchApi<KnowledgeItem>(`/knowledge/${id}`),
  createKnowledgeItem: (data: Partial<KnowledgeItem>) => fetchApi<KnowledgeItem>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),

  // Thoughts
  getThoughts: () => fetchApi<Thought[]>('/thoughts'),
  getThought: (id: string) => fetchApi<Thought>(`/thoughts/${id}`),
  createThought: (data: Partial<Thought>) => fetchApi<Thought>('/thoughts', { method: 'POST', body: JSON.stringify(data) }),

  // Business Ideas
  getBusinessIdeas: () => fetchApi<BusinessIdea[]>('/business-ideas'),
  getBusinessIdea: (id: string) => fetchApi<BusinessIdea>(`/business-ideas/${id}`),
  createBusinessIdea: (data: Partial<BusinessIdea>) => fetchApi<BusinessIdea>('/business-ideas', { method: 'POST', body: JSON.stringify(data) }),

  // Work Ideas
  getWorkIdeas: () => fetchApi<WorkIdea[]>('/work-ideas'),
  getWorkIdea: (id: string) => fetchApi<WorkIdea>(`/work-ideas/${id}`),
  createWorkIdea: (data: Partial<WorkIdea>) => fetchApi<WorkIdea>('/work-ideas', { method: 'POST', body: JSON.stringify(data) }),

  // Personal Ideas
  getPersonalIdeas: () => fetchApi<PersonalIdea[]>('/personal-ideas'),
  getPersonalIdea: (id: string) => fetchApi<PersonalIdea>(`/personal-ideas/${id}`),
  createPersonalIdea: (data: Partial<PersonalIdea>) => fetchApi<PersonalIdea>('/personal-ideas', { method: 'POST', body: JSON.stringify(data) }),

  // Topics
  getTopics: () => fetchApi<Topic[]>('/topics'),
  getTopic: (id: string) => fetchApi<Topic>(`/topics/${id}`),

  // Glossary
  getGlossaryTerms: () => fetchApi<GlossaryTerm[]>('/glossary'),
  getGlossaryTerm: (id: string) => fetchApi<GlossaryTerm>(`/glossary/${id}`),

  // Watchlists
  getWatchlists: () => fetchApi<Watchlist[]>('/watchlists'),

  // Discovery
  getDiscoveryItems: () => fetchApi<DiscoveryItem[]>('/discovery'),

  // Search
  search: (query: string, type?: string) => fetchApi<SearchResult[]>(`/search?q=${query}${type ? `&type=${type}` : ''}`),

  // Chat
  sendMessage: (message: string) => fetchApi<ChatMessage>('/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  // Quotes
  getQuotes: () => fetchApi<Quote[]>('/quotes'),
  createQuote: (data: Partial<Quote>) => fetchApi<Quote>('/quotes', { method: 'POST', body: JSON.stringify(data) }),
};
