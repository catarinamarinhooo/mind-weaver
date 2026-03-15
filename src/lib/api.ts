const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// =========================
// Thought types
// =========================
export interface ThoughtCreate {
  title?: string | null;
  content: string;
  summary?: string | null;
  link?: string | null;
  thought_type?: string | null;
  priority?: string | null;
  topic_ids?: number[];
}

export interface TopicResponse {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  thought_count: number;
  knowledge_item_count: number;
  total_count: number;
}

export interface ThoughtResponse {
  id: number;
  title?: string | null;
  content: string;
  summary?: string | null;
  link?: string | null;
  thought_type?: string | null;
  priority?: string | null;
  topics: TopicResponse[];
  created_at: string;
}

// =========================
// Knowledge Item types
// =========================
export interface KnowledgeItemCreate {
  title?: string | null;
  url: string;
  personal_note?: string | null;
  source?: string | null;
  description?: string | null;
  topic_ids?: number[];
  attachments?: GlossaryAttachment[];
}

export interface KnowledgeItemResponse {
  id: number;
  title?: string | null;
  url: string;
  personal_note?: string | null;
  source?: string | null;
  description?: string | null;
  topics: TopicResponse[];
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface BusinessIdeaCreate {
  title: string;
  description?: string | null;
  problem?: string | null;
  audience?: string | null;
  priority?: string | null;
  next_steps?: string | null;
  topic_ids?: number[];
  attachments?: GlossaryAttachment[];
}

export interface BusinessIdeaResponse {
  id: number;
  title: string;
  description?: string | null;
  problem?: string | null;
  audience?: string | null;
  priority?: string | null;
  next_steps?: string | null;
  topics: TopicResponse[];
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface QuoteCreate {
  book_title: string;
  quote_text: string;
  page?: string | null;
  thoughts?: string | null;
  attachments?: GlossaryAttachment[];
}

export interface QuoteResponse {
  id: number;
  book_title: string;
  quote_text: string;
  page?: string | null;
  thoughts?: string | null;
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface WorkIdeaCreate {
  title: string;
  goal?: string | null;
  summary?: string | null;
  context?: string | null;
  application_category?: string | null;
  priority?: string | null;
  timeline?: string | null;
  execution_mode?: string | null;
  topic_ids?: number[];
  attachments?: GlossaryAttachment[];
}

export interface WorkIdeaResponse {
  id: number;
  title: string;
  goal?: string | null;
  summary?: string | null;
  context?: string | null;
  application_category?: string | null;
  priority?: string | null;
  timeline?: string | null;
  execution_mode?: string | null;
  topics: TopicResponse[];
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface PersonalIdeaCreate {
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  goal?: string | null;
  attachments?: GlossaryAttachment[];
}

export interface PersonalIdeaResponse {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  goal?: string | null;
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface TopicCreate {
  name: string;
  description?: string | null;
}

export interface ConnectionCreate {
  source_type: string;
  source_id: number;
  target_type: string;
  target_id: number;
  relationship_type?: string | null;
  notes?: string | null;
}

export interface ConnectionResponse {
  id: number;
  source_type: string;
  source_id: number;
  source_label: string;
  target_type: string;
  target_id: number;
  target_label: string;
  relationship_type?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface GlossaryAttachment {
  name: string;
  url: string;
  content_type?: string | null;
  kind?: string | null;
}

export interface GlossaryTermCreate {
  term: string;
  definition: string;
  term_type?: string | null;
  aliases: string[];
  tags: string[];
  links: string[];
  attachments: GlossaryAttachment[];
}

export interface GlossaryTermResponse {
  id: number;
  term: string;
  definition: string;
  term_type?: string | null;
  aliases: string[];
  tags: string[];
  links: string[];
  attachments: GlossaryAttachment[];
  created_at: string;
}

export interface UploadResponse {
  name: string;
  url: string;
  content_type?: string | null;
  kind?: string | null;
}

export interface WatchlistSourceCreate {
  name: string;
  url: string;
  source_type?: string | null;
  rss_url?: string | null;
}

export interface WatchlistSourceResponse {
  id: number;
  watchlist_id: number;
  name: string;
  url: string;
  source_type?: string | null;
  rss_url?: string | null;
  active: boolean;
  created_at: string;
}

export interface WatchlistCreate {
  name: string;
  topic: string;
  frequency: string;
  interval_days?: number | null;
  description?: string | null;
  sources: WatchlistSourceCreate[];
}

export interface WatchlistResponse {
  id: number;
  name: string;
  topic: string;
  frequency: string;
  interval_days?: number | null;
  description?: string | null;
  last_checked_at?: string | null;
  created_at: string;
  sources: WatchlistSourceResponse[];
}

export interface DiscoveryItemResponse {
  id: number;
  watchlist_id: number;
  source_id?: number | null;
  title: string;
  summary?: string | null;
  url: string;
  topic?: string | null;
  source_name?: string | null;
  published_at?: string | null;
  saved_to_library: boolean;
  saved_in_discovery: boolean;
  dismissed: boolean;
  assigned_topic?: string | null;
  created_at: string;
}

export interface DiscoveryItemUpdate {
  saved_in_discovery?: boolean;
  dismissed?: boolean;
  assigned_topic?: string | null;
}

export interface SourceSuggestionResponse {
  name: string;
  url: string;
  source_type?: string | null;
  rss_url?: string | null;
  reason?: string | null;
}

// =========================
// Thought API
// =========================
export async function createThought(
  data: ThoughtCreate
): Promise<ThoughtResponse> {
  const res = await fetch(`${API_URL}/thoughts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("createThought failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? JSON.stringify(responseData.detail)
        : `Failed to create thought (${res.status})`
    );
  }

  return responseData as ThoughtResponse;
}

export async function getThoughts(): Promise<ThoughtResponse[]> {
  const res = await fetch(`${API_URL}/thoughts`);
  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("getThoughts failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? JSON.stringify(responseData.detail)
        : `Failed to fetch thoughts (${res.status})`
    );
  }

  return responseData as ThoughtResponse[];
}

export async function getThoughtById(id: number): Promise<ThoughtResponse> {
  const res = await fetch(`${API_URL}/thoughts/${id}`);
  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("getThoughtById failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch thought (${res.status})`
    );
  }

  return responseData as ThoughtResponse;
}

export async function deleteThought(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/thoughts/${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("deleteThought failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete thought (${res.status})`
    );
  }
}

export async function updateThought(
  id: number,
  data: ThoughtCreate
): Promise<ThoughtResponse> {
  const res = await fetch(`${API_URL}/thoughts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("updateThought failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update thought (${res.status})`
    );
  }

  return responseData as ThoughtResponse;
}

// =========================
// Knowledge Item API
// =========================
export async function createKnowledgeItem(
  data: KnowledgeItemCreate
): Promise<KnowledgeItemResponse> {
  const res = await fetch(`${API_URL}/knowledge-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("createKnowledgeItem failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? JSON.stringify(responseData.detail)
        : `Failed to create knowledge item (${res.status})`
    );
  }

  return responseData as KnowledgeItemResponse;
}

export async function getKnowledgeItems(): Promise<KnowledgeItemResponse[]> {
  const res = await fetch(`${API_URL}/knowledge-items`);
  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("getKnowledgeItems failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? JSON.stringify(responseData.detail)
        : `Failed to fetch knowledge items (${res.status})`
    );
  }

  return responseData as KnowledgeItemResponse[];
}

export async function getKnowledgeItemById(
  id: number
): Promise<KnowledgeItemResponse> {
  const res = await fetch(`${API_URL}/knowledge-items/${id}`);
  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("getKnowledgeItemById failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch knowledge item (${res.status})`
    );
  }

  return responseData as KnowledgeItemResponse;
}

export async function deleteKnowledgeItem(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/knowledge-items/${id}`, {
    method: "DELETE",
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("deleteKnowledgeItem failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete knowledge item (${res.status})`
    );
  }
}

export async function updateKnowledgeItem(
  id: number,
  data: KnowledgeItemCreate
): Promise<KnowledgeItemResponse> {
  const res = await fetch(`${API_URL}/knowledge-items/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("updateKnowledgeItem failed:", {
      status: res.status,
      response: responseData,
    });

    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update knowledge item (${res.status})`
    );
  }

  return responseData as KnowledgeItemResponse;
}

export async function createTopic(data: TopicCreate): Promise<TopicResponse> {
  const res = await fetch(`${API_URL}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create topic (${res.status})`
    );
  }
  return responseData as TopicResponse;
}

export async function getTopics(): Promise<TopicResponse[]> {
  const res = await fetch(`${API_URL}/topics`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch topics (${res.status})`
    );
  }
  return responseData as TopicResponse[];
}

export async function updateTopic(
  id: number,
  data: TopicCreate
): Promise<TopicResponse> {
  const res = await fetch(`${API_URL}/topics/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update topic (${res.status})`
    );
  }
  return responseData as TopicResponse;
}

export async function deleteTopic(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/topics/${id}`, {
    method: "DELETE",
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete topic (${res.status})`
    );
  }
}

export async function createConnection(
  data: ConnectionCreate
): Promise<ConnectionResponse> {
  const res = await fetch(`${API_URL}/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create connection (${res.status})`
    );
  }
  return responseData as ConnectionResponse;
}

export async function getConnections(params?: {
  entity_type?: string;
  entity_id?: number;
}): Promise<ConnectionResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.entity_type) {
    searchParams.set("entity_type", params.entity_type);
  }
  if (typeof params?.entity_id === "number") {
    searchParams.set("entity_id", String(params.entity_id));
  }

  const query = searchParams.toString();
  const res = await fetch(`${API_URL}/connections${query ? `?${query}` : ""}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch connections (${res.status})`
    );
  }
  return responseData as ConnectionResponse[];
}

export async function deleteConnection(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/connections/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete connection (${res.status})`
    );
  }
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    body: formData,
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to upload file (${res.status})`
    );
  }
  return responseData as UploadResponse;
}

export async function createGlossaryTerm(
  data: GlossaryTermCreate
): Promise<GlossaryTermResponse> {
  const res = await fetch(`${API_URL}/glossary-terms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create glossary term (${res.status})`
    );
  }
  return responseData as GlossaryTermResponse;
}

export async function getGlossaryTerms(): Promise<GlossaryTermResponse[]> {
  const res = await fetch(`${API_URL}/glossary-terms`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch glossary terms (${res.status})`
    );
  }
  return responseData as GlossaryTermResponse[];
}

export async function getGlossaryTermById(id: number): Promise<GlossaryTermResponse> {
  const res = await fetch(`${API_URL}/glossary-terms/${id}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch glossary term (${res.status})`
    );
  }
  return responseData as GlossaryTermResponse;
}

export async function updateGlossaryTerm(
  id: number,
  data: GlossaryTermCreate
): Promise<GlossaryTermResponse> {
  const res = await fetch(`${API_URL}/glossary-terms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update glossary term (${res.status})`
    );
  }
  return responseData as GlossaryTermResponse;
}

export async function deleteGlossaryTerm(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/glossary-terms/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete glossary term (${res.status})`
    );
  }
}

export async function createWatchlist(
  data: WatchlistCreate
): Promise<WatchlistResponse> {
  const res = await fetch(`${API_URL}/watchlists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create watchlist (${res.status})`
    );
  }
  return responseData as WatchlistResponse;
}

export async function getWatchlists(): Promise<WatchlistResponse[]> {
  const res = await fetch(`${API_URL}/watchlists`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch watchlists (${res.status})`
    );
  }
  return responseData as WatchlistResponse[];
}

export async function deleteWatchlist(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/watchlists/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete watchlist (${res.status})`
    );
  }
}

export async function addWatchlistSource(
  watchlistId: number,
  data: WatchlistSourceCreate
): Promise<WatchlistSourceResponse> {
  const res = await fetch(`${API_URL}/watchlists/${watchlistId}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to add watchlist source (${res.status})`
    );
  }
  return responseData as WatchlistSourceResponse;
}

export async function deleteWatchlistSource(sourceId: number): Promise<void> {
  const res = await fetch(`${API_URL}/watchlists/sources/${sourceId}`, {
    method: "DELETE",
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete watchlist source (${res.status})`
    );
  }
}

export async function getWatchlistSourceSuggestions(
  topic: string
): Promise<SourceSuggestionResponse[]> {
  const params = new URLSearchParams({ topic });
  const res = await fetch(`${API_URL}/watchlists/source-suggestions?${params.toString()}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch source suggestions (${res.status})`
    );
  }
  return responseData as SourceSuggestionResponse[];
}

export async function refreshWatchlist(
  watchlistId: number
): Promise<DiscoveryItemResponse[]> {
  const res = await fetch(`${API_URL}/watchlists/${watchlistId}/refresh`, {
    method: "POST",
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to refresh watchlist (${res.status})`
    );
  }
  return responseData as DiscoveryItemResponse[];
}

export async function getDiscoveryItems(params?: {
  include_dismissed?: boolean;
  saved_only?: boolean;
}): Promise<DiscoveryItemResponse[]> {
  const searchParams = new URLSearchParams();
  if (params?.include_dismissed) searchParams.set("include_dismissed", "true");
  if (params?.saved_only) searchParams.set("saved_only", "true");
  const query = searchParams.toString();
  const res = await fetch(`${API_URL}/discovery-items${query ? `?${query}` : ""}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch discovery items (${res.status})`
    );
  }
  return responseData as DiscoveryItemResponse[];
}

export async function updateDiscoveryItem(
  id: number,
  data: DiscoveryItemUpdate
): Promise<DiscoveryItemResponse> {
  const res = await fetch(`${API_URL}/discovery-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update discovery item (${res.status})`
    );
  }
  return responseData as DiscoveryItemResponse;
}

export async function saveDiscoveryItemToLibrary(
  id: number
): Promise<KnowledgeItemResponse> {
  const res = await fetch(`${API_URL}/discovery-items/${id}/save-to-library`, {
    method: "POST",
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to save discovery item to library (${res.status})`
    );
  }
  return responseData as KnowledgeItemResponse;
}

export async function createBusinessIdea(
  data: BusinessIdeaCreate
): Promise<BusinessIdeaResponse> {
  const res = await fetch(`${API_URL}/business-ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create business idea (${res.status})`
    );
  }
  return responseData as BusinessIdeaResponse;
}

export async function getBusinessIdeas(): Promise<BusinessIdeaResponse[]> {
  const res = await fetch(`${API_URL}/business-ideas`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch business ideas (${res.status})`
    );
  }
  return responseData as BusinessIdeaResponse[];
}

export async function getBusinessIdeaById(id: number): Promise<BusinessIdeaResponse> {
  const res = await fetch(`${API_URL}/business-ideas/${id}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch business idea (${res.status})`
    );
  }
  return responseData as BusinessIdeaResponse;
}

export async function updateBusinessIdea(
  id: number,
  data: BusinessIdeaCreate
): Promise<BusinessIdeaResponse> {
  const res = await fetch(`${API_URL}/business-ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update business idea (${res.status})`
    );
  }
  return responseData as BusinessIdeaResponse;
}

export async function deleteBusinessIdea(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/business-ideas/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete business idea (${res.status})`
    );
  }
}

export async function createQuote(data: QuoteCreate): Promise<QuoteResponse> {
  const res = await fetch(`${API_URL}/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create quote (${res.status})`
    );
  }
  return responseData as QuoteResponse;
}

export async function getQuotes(): Promise<QuoteResponse[]> {
  const res = await fetch(`${API_URL}/quotes`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch quotes (${res.status})`
    );
  }
  return responseData as QuoteResponse[];
}

export async function getQuoteById(id: number): Promise<QuoteResponse> {
  const res = await fetch(`${API_URL}/quotes/${id}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch quote (${res.status})`
    );
  }
  return responseData as QuoteResponse;
}

export async function updateQuote(id: number, data: QuoteCreate): Promise<QuoteResponse> {
  const res = await fetch(`${API_URL}/quotes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update quote (${res.status})`
    );
  }
  return responseData as QuoteResponse;
}

export async function deleteQuote(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/quotes/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete quote (${res.status})`
    );
  }
}

export async function createWorkIdea(data: WorkIdeaCreate): Promise<WorkIdeaResponse> {
  const res = await fetch(`${API_URL}/work-ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create work idea (${res.status})`
    );
  }
  return responseData as WorkIdeaResponse;
}

export async function getWorkIdeas(): Promise<WorkIdeaResponse[]> {
  const res = await fetch(`${API_URL}/work-ideas`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch work ideas (${res.status})`
    );
  }
  return responseData as WorkIdeaResponse[];
}

export async function getWorkIdeaById(id: number): Promise<WorkIdeaResponse> {
  const res = await fetch(`${API_URL}/work-ideas/${id}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch work idea (${res.status})`
    );
  }
  return responseData as WorkIdeaResponse;
}

export async function updateWorkIdea(
  id: number,
  data: WorkIdeaCreate
): Promise<WorkIdeaResponse> {
  const res = await fetch(`${API_URL}/work-ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update work idea (${res.status})`
    );
  }
  return responseData as WorkIdeaResponse;
}

export async function deleteWorkIdea(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/work-ideas/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete work idea (${res.status})`
    );
  }
}

export async function createPersonalIdea(
  data: PersonalIdeaCreate
): Promise<PersonalIdeaResponse> {
  const res = await fetch(`${API_URL}/personal-ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to create personal idea (${res.status})`
    );
  }
  return responseData as PersonalIdeaResponse;
}

export async function getPersonalIdeas(): Promise<PersonalIdeaResponse[]> {
  const res = await fetch(`${API_URL}/personal-ideas`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch personal ideas (${res.status})`
    );
  }
  return responseData as PersonalIdeaResponse[];
}

export async function getPersonalIdeaById(id: number): Promise<PersonalIdeaResponse> {
  const res = await fetch(`${API_URL}/personal-ideas/${id}`);
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to fetch personal idea (${res.status})`
    );
  }
  return responseData as PersonalIdeaResponse;
}

export async function updatePersonalIdea(
  id: number,
  data: PersonalIdeaCreate
): Promise<PersonalIdeaResponse> {
  const res = await fetch(`${API_URL}/personal-ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to update personal idea (${res.status})`
    );
  }
  return responseData as PersonalIdeaResponse;
}

export async function deletePersonalIdea(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/personal-ideas/${id}`, { method: "DELETE" });
  const responseData = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      responseData?.detail
        ? String(responseData.detail)
        : `Failed to delete personal idea (${res.status})`
    );
  }
}
