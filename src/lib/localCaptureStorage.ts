export type StoredBusinessIdea = {
  id: string;
  title: string;
  description: string;
  problem: string;
  audience: string;
  priority: string;
  next_steps: string;
  created_at: string;
};

export type StoredQuote = {
  id: string;
  book_title: string;
  quote_text: string;
  page: string;
  thoughts: string;
  created_at: string;
};

export type StoredWorkIdea = {
  id: string;
  title: string;
  goal: string;
  summary: string;
  context: string;
  application_category: string;
  priority: string;
  timeline: string;
  execution_mode: string;
  created_at: string;
};

export type StoredPersonalIdea = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  goal: string;
  created_at: string;
};

const STORAGE_KEYS = {
  business: "mindweaver_business_ideas",
  quotes: "mindweaver_quotes",
  work: "mindweaver_work_ideas",
  personal: "mindweaver_personal_ideas",
} as const;

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(items));
}

function prependItem<T extends { created_at: string }>(key: string, item: T) {
  const currentItems = readList<T>(key);
  writeList(
    key,
    [item, ...currentItems].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );
}

export function createLocalBusinessIdea(
  item: Omit<StoredBusinessIdea, "id" | "created_at">
) {
  prependItem(STORAGE_KEYS.business, {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
}

export function getLocalBusinessIdeas() {
  return readList<StoredBusinessIdea>(STORAGE_KEYS.business);
}

export function createLocalQuote(item: Omit<StoredQuote, "id" | "created_at">) {
  prependItem(STORAGE_KEYS.quotes, {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
}

export function getLocalQuotes() {
  return readList<StoredQuote>(STORAGE_KEYS.quotes);
}

export function createLocalWorkIdea(
  item: Omit<StoredWorkIdea, "id" | "created_at">
) {
  prependItem(STORAGE_KEYS.work, {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
}

export function getLocalWorkIdeas() {
  return readList<StoredWorkIdea>(STORAGE_KEYS.work);
}

export function createLocalPersonalIdea(
  item: Omit<StoredPersonalIdea, "id" | "created_at">
) {
  prependItem(STORAGE_KEYS.personal, {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  });
}

export function getLocalPersonalIdeas() {
  return readList<StoredPersonalIdea>(STORAGE_KEYS.personal);
}

export function getLocalCaptureCounts() {
  return {
    business: getLocalBusinessIdeas().length,
    quotes: getLocalQuotes().length,
    work: getLocalWorkIdeas().length,
    personal: getLocalPersonalIdeas().length,
  };
}
