import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TopicTag } from "@/components/shared/TopicTag";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
import { ConnectionsPanel } from "@/components/shared/ConnectionsPanel";
import { ConnectionSuggestionsPanel } from "@/components/shared/ConnectionSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGlossaryTerm,
  deleteGlossaryTerm,
  getGlossaryTermById,
  getGlossaryTerms,
  type GlossaryAttachment,
  type GlossaryTermResponse,
  updateGlossaryTerm,
  uploadFile,
} from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const defaultTermTypes = [
  "concept",
  "framework",
  "acronym",
  "tool",
  "company",
  "person",
  "finance",
  "ai",
  "other",
];

function normalizeTermType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

const GlossaryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [terms, setTerms] = useState<GlossaryTermResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const [termValue, setTermValue] = useState("");
  const [definition, setDefinition] = useState("");
  const [termType, setTermType] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<GlossaryAttachment[]>([]);
  const [customTypeInput, setCustomTypeInput] = useState("");

  const selectedTerm = terms.find((item) => item.id === selectedId);

  useEffect(() => {
    async function loadTerms() {
      try {
        setLoading(true);
        setError("");
        setTerms(await getGlossaryTerms());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load glossary.");
      } finally {
        setLoading(false);
      }
    }

    void loadTerms();
  }, []);

  useEffect(() => {
    const selectedIdFromUrl = Number(searchParams.get("id"));
    if (Number.isFinite(selectedIdFromUrl) && selectedIdFromUrl > 0) {
      setSelectedId(selectedIdFromUrl);
    }
  }, [searchParams]);

  const availableTermTypes = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...defaultTermTypes,
          ...terms.map((item) => item.term_type || "").filter(Boolean),
          termType,
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [termType, terms]);

  const filteredTerms = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return terms.filter((item) => {
      const matchesType = typeFilter === "all" || item.term_type === typeFilter;
      if (!matchesType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        item.term,
        item.definition,
        item.term_type,
        ...item.aliases,
        ...item.tags,
        ...item.links,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [searchTerm, terms, typeFilter]);

  const resetForm = () => {
    setTermValue("");
    setDefinition("");
    setTermType("");
    setAliasInput("");
    setAliases([]);
    setTagInput("");
    setTags([]);
    setLinkInput("");
    setLinks([]);
    setAttachments([]);
    setCustomTypeInput("");
    setIsCreating(false);
    setIsEditing(false);
  };

  const startEditing = (item: GlossaryTermResponse) => {
    setTermValue(item.term);
    setDefinition(item.definition);
    setTermType(item.term_type || "");
    setAliases(item.aliases);
    setTags(item.tags);
      setLinks(item.links);
      setAttachments(item.attachments);
    setAliasInput("");
    setTagInput("");
    setLinkInput("");
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleAddTermType = () => {
    const normalizedValue = normalizeTermType(customTypeInput);
    if (!normalizedValue) {
      return;
    }

    setTermType(normalizedValue);
    setCustomTypeInput("");
  };

  const saveTerm = async () => {
    if (!termValue.trim() || !definition.trim()) {
      setError("Term and definition are required.");
      return;
    }

    try {
      setError("");
      const payload = {
        term: termValue.trim(),
        definition: definition.trim(),
        term_type: termType || null,
        aliases,
        tags,
        links,
        attachments,
      };

      if (isEditing && selectedTerm) {
        const updated = await updateGlossaryTerm(selectedTerm.id, payload);
        const refreshed = await getGlossaryTermById(updated.id);
        setTerms((current) =>
          current
            .map((item) => (item.id === refreshed.id ? refreshed : item))
            .sort((a, b) => a.term.localeCompare(b.term))
        );
        setSelectedId(refreshed.id);
        setSearchParams({ id: String(refreshed.id) });
        resetForm();
        return;
      }

      const created = await createGlossaryTerm(payload);
      setTerms((current) =>
        [...current, created].sort((a, b) => a.term.localeCompare(b.term))
      );
      setSelectedId(created.id);
      setSearchParams({ id: String(created.id) });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save glossary term.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this glossary entry?")) {
      return;
    }

    try {
      setIsDeletingId(id);
      await deleteGlossaryTerm(id);
      setTerms((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setSearchParams({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete glossary term.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const addStringItem = (
    value: string,
    currentItems: string[],
    setItems: (items: string[]) => void,
    resetInput: () => void
  ) => {
    const normalizedValue = value.trim();
    if (!normalizedValue || currentItems.includes(normalizedValue)) {
      return;
    }
    setItems([...currentItems, normalizedValue]);
    resetInput();
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadFile(file)));
      setAttachments((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderForm = () => (
    <ContentCard hover={false} className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">
          {isEditing ? "Edit Glossary Term" : "Add Glossary Term"}
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => {
              setIsEditing(false);
              setIsCreating(false);
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        )}
      </div>

      <Input
        value={termValue}
        onChange={(e) => setTermValue(e.target.value)}
        placeholder="Term"
      />

      <Textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        rows={4}
      />

      <div className="space-y-3">
        <div className="w-full md:w-64">
          <Select value={termType || "__none__"} onValueChange={(value) => setTermType(value === "__none__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select term type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No type</SelectItem>
              {availableTermTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            value={customTypeInput}
            onChange={(e) => setCustomTypeInput(e.target.value)}
            placeholder="Create new term type, e.g. protocol"
          />
          <Button type="button" variant="outline" onClick={handleAddTermType}>
            Add Type
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          You can keep the default types or create new ones on the fly.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            placeholder="Add alias"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              addStringItem(aliasInput, aliases, setAliases, () => setAliasInput(""))
            }
          >
            Add Alias
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {aliases.map((alias) => (
            <TopicTag
              key={alias}
              name={alias}
              onClick={() => setAliases((current) => current.filter((item) => item !== alias))}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Alias = another name people might use for the same term, like a synonym, acronym, abbreviation, or alternate spelling.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add etiqueta / tag"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              addStringItem(tagInput, tags, setTags, () => setTagInput(""))
            }
          >
            Add Tag
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TopicTag
              key={tag}
              name={tag}
              variant="topic"
              onClick={() => setTags((current) => current.filter((item) => item !== tag))}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Add link"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              addStringItem(linkInput, links, setLinks, () => setLinkInput(""))
            }
          >
            Add Link
          </Button>
        </div>
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
              <span className="truncate">{link}</span>
              <Button variant="outline" size="sm" onClick={() => setLinks((current) => current.filter((item) => item !== link))}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      <AttachmentPreviewList
        title="Images and Files"
        attachments={attachments}
        uploadingText={isUploading ? "Uploading..." : "Upload images or files"}
        onUpload={handleUpload}
        onRemove={(attachmentUrl) =>
          setAttachments((current) =>
            current.filter((item) => item.url !== attachmentUrl)
          )
        }
      />

      <div className="flex gap-2">
        <Button onClick={() => void saveTerm()}>
          {isEditing ? "Save Changes" : "Create Term"}
        </Button>
        <Button variant="outline" onClick={resetForm}>
          Cancel
        </Button>
      </div>
    </ContentCard>
  );

  if (selectedTerm && !isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedId(null);
            setSearchParams({});
          }}
          className="mb-4 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-semibold text-foreground">
                {selectedTerm.term}
              </h1>
            </div>
            {selectedTerm.term_type && (
              <div className="text-sm text-muted-foreground">
                Type: {selectedTerm.term_type}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => startEditing(selectedTerm)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isDeletingId === selectedTerm.id}
              onClick={() => void handleDelete(selectedTerm.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeletingId === selectedTerm.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        <div className="glass-card mb-4 p-6">
          <p className="leading-relaxed text-foreground">{selectedTerm.definition}</p>
        </div>

        {selectedTerm.links.length > 0 && (
          <ContentCard hover={false} className="mb-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Links
              </h3>
              <div className="text-xs text-muted-foreground">
                {selectedTerm.links.length} saved
              </div>
            </div>
            {selectedTerm.links.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-blue-600 underline break-all"
              >
                <Link2 className="h-4 w-4" />
                {link}
              </a>
            ))}
          </ContentCard>
        )}

        {selectedTerm.aliases.length > 0 && (
          <ContentCard hover={false} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Also known as
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedTerm.aliases.map((alias) => (
                <TopicTag key={alias} name={alias} />
              ))}
            </div>
          </ContentCard>
        )}

        {selectedTerm.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedTerm.tags.map((tag) => (
              <TopicTag key={tag} name={tag} variant="topic" />
            ))}
          </div>
        )}

        {selectedTerm.attachments.length > 0 && (
          <AttachmentPreviewList
            title="Images and Files"
            attachments={selectedTerm.attachments}
          />
        )}

        <div className="mt-6">
          <ConnectionsPanel sourceType="glossary_term" sourceId={selectedTerm.id} />
        </div>

        <div className="mt-6">
          <ConnectionSuggestionsPanel
            source={{
              id: selectedTerm.id,
              type: "glossary_term",
              label: selectedTerm.term,
              text: [
                selectedTerm.term,
                selectedTerm.definition,
                selectedTerm.term_type,
                ...selectedTerm.aliases,
                ...selectedTerm.tags,
                ...selectedTerm.links,
              ]
                .filter(Boolean)
                .join(" "),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Glossary"
        description="Key concepts, definitions, links, and supporting material"
        actions={
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Term
          </Button>
        }
      />

      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      {(isCreating || isEditing) && renderForm()}

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by term, definition, tag, alias, or link"
            className="pl-9"
          />
        </div>

        <div className="w-full md:w-56">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {availableTermTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading glossary...</div>
      )}

      {!loading && terms.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No glossary terms yet"
          description="Add your first glossary term to start building a shared language in CortexKnows."
          action={<Button onClick={() => setIsCreating(true)}>Add Term</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filteredTerms.map((item) => (
            <ContentCard
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                setSearchParams({ id: String(item.id) });
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.term}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {item.definition}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.term_type && <TopicTag name={item.term_type} />}
                    {item.tags.map((tag) => (
                      <TopicTag key={tag} name={tag} variant="topic" />
                    ))}
                    {item.links.length > 0 && (
                      <TopicTag name={`${item.links.length} link${item.links.length > 1 ? "s" : ""}`} />
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditing(item);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isDeletingId === item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeletingId === item.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlossaryPage;
