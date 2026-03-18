import {
  createBusinessIdea,
  createGlossaryTerm,
  createKnowledgeItem,
  createPersonalIdea,
  createQuote,
  createThought,
  createTopic,
  createWorkIdea,
  getBusinessIdeaById,
  getGlossaryTermById,
  getKnowledgeItemById,
  getPersonalIdeaById,
  getQuoteById,
  getThoughtById,
  getTopics,
  getWorkIdeaById,
  type GlossaryAttachment,
  type MediaLink,
  type TopicResponse,
  updateBusinessIdea,
  updateGlossaryTerm,
  updateKnowledgeItem,
  updatePersonalIdea,
  updateQuote,
  updateThought,
  updateWorkIdea,
  uploadFile,
} from "../lib/api";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, Briefcase, Heart, Lightbulb, Pencil, Quote, Save, Sparkles, Link2, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttachmentPreviewList } from "@/components/shared/AttachmentPreviewList";
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
import { cn } from "@/lib/utils";

const tabs = [
  { id: "knowledge", label: "Knowledge Item", icon: Link2 },
  { id: "thought", label: "Thought", icon: Brain },
  { id: "business", label: "Business Idea", icon: Lightbulb },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "work", label: "Work Idea", icon: Briefcase },
  { id: "personal", label: "Personal Idea", icon: Heart },
  { id: "glossary", label: "Glossary Term", icon: BookOpen },
] as const;

const tabLabels: Record<string, string> = {
  knowledge: "knowledge item",
  thought: "thought",
  business: "business idea",
  quote: "quote",
  work: "work idea",
  personal: "personal idea",
  glossary: "glossary term",
};

const backRoutes: Record<string, string> = {
  knowledge: "/library",
  thought: "/thoughts",
  business: "/business-ideas",
  quote: "/quotes",
  work: "/work-ideas",
  personal: "/personal-ideas",
  glossary: "/glossary",
};

const glossaryTypeDefaults = [
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

const FieldGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">{label}</label>
    {children}
  </div>
);

function normalizeTermType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

const Capture = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "knowledge");
  const mode = searchParams.get("mode");
  const itemId = searchParams.get("id");
  const isEditMode = mode === "edit" && !!itemId;

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [availableTopics, setAvailableTopics] = useState<TopicResponse[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isExtractingQuoteText, setIsExtractingQuoteText] = useState(false);
  const quoteExtractedTextRef = useRef<HTMLTextAreaElement | null>(null);

  const [thoughtTitle, setThoughtTitle] = useState("");
  const [thoughtContent, setThoughtContent] = useState("");
  const [thoughtType, setThoughtType] = useState("");
  const [thoughtLink, setThoughtLink] = useState("");
  const [thoughtTopicIds, setThoughtTopicIds] = useState<number[]>([]);

  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeNote, setKnowledgeNote] = useState("");
  const [knowledgeSource, setKnowledgeSource] = useState("");
  const [knowledgeDescription, setKnowledgeDescription] = useState("");
  const [knowledgeTopicIds, setKnowledgeTopicIds] = useState<number[]>([]);
  const [knowledgeAttachments, setKnowledgeAttachments] = useState<GlossaryAttachment[]>([]);
  const [knowledgeMediaLinks, setKnowledgeMediaLinks] = useState<MediaLink[]>([]);
  const [knowledgeMediaLabel, setKnowledgeMediaLabel] = useState("");
  const [knowledgeMediaUrl, setKnowledgeMediaUrl] = useState("");
  const [knowledgeMediaType, setKnowledgeMediaType] = useState("");
  const [knowledgeMediaNotes, setKnowledgeMediaNotes] = useState("");

  const [businessTitle, setBusinessTitle] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessProblem, setBusinessProblem] = useState("");
  const [businessAudience, setBusinessAudience] = useState("");
  const [businessPriority, setBusinessPriority] = useState("");
  const [businessNextSteps, setBusinessNextSteps] = useState("");
  const [businessTopicIds, setBusinessTopicIds] = useState<number[]>([]);
  const [businessAttachments, setBusinessAttachments] = useState<GlossaryAttachment[]>([]);

  const [quoteBookTitle, setQuoteBookTitle] = useState("");
  const [quoteBookType, setQuoteBookType] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteThoughts, setQuoteThoughts] = useState("");
  const [quoteAttachments, setQuoteAttachments] = useState<GlossaryAttachment[]>([]);
  const [quoteExtractedText, setQuoteExtractedText] = useState("");

  const [workTitle, setWorkTitle] = useState("");
  const [workGoal, setWorkGoal] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [workContext, setWorkContext] = useState("");
  const [workApplicationCategory, setWorkApplicationCategory] = useState("");
  const [workPriority, setWorkPriority] = useState("");
  const [workTimeline, setWorkTimeline] = useState("");
  const [workExecutionMode, setWorkExecutionMode] = useState("");
  const [workTopicIds, setWorkTopicIds] = useState<number[]>([]);
  const [workAttachments, setWorkAttachments] = useState<GlossaryAttachment[]>([]);

  const [personalTitle, setPersonalTitle] = useState("");
  const [personalDescription, setPersonalDescription] = useState("");
  const [personalCategory, setPersonalCategory] = useState("");
  const [personalPriority, setPersonalPriority] = useState("");
  const [personalGoal, setPersonalGoal] = useState("");
  const [personalAttachments, setPersonalAttachments] = useState<GlossaryAttachment[]>([]);

  const [glossaryTerm, setGlossaryTerm] = useState("");
  const [glossaryDefinition, setGlossaryDefinition] = useState("");
  const [glossaryTermType, setGlossaryTermType] = useState("");
  const [glossaryCustomType, setGlossaryCustomType] = useState("");
  const [glossaryAliasInput, setGlossaryAliasInput] = useState("");
  const [glossaryAliases, setGlossaryAliases] = useState<string[]>([]);
  const [glossaryTagInput, setGlossaryTagInput] = useState("");
  const [glossaryTags, setGlossaryTags] = useState<string[]>([]);
  const [glossaryLinkInput, setGlossaryLinkInput] = useState("");
  const [glossaryLinks, setGlossaryLinks] = useState<string[]>([]);
  const [glossaryAttachments, setGlossaryAttachments] = useState<GlossaryAttachment[]>([]);

  const availableGlossaryTypes = Array.from(
    new Set(
      [
        ...glossaryTypeDefaults,
        glossaryTermType,
        glossaryCustomType ? normalizeTermType(glossaryCustomType) : "",
      ].filter(Boolean)
    )
  );

  useEffect(() => {
    async function loadTopics() {
      try {
        setIsLoadingTopics(true);
        setAvailableTopics(await getTopics());
      } catch (error) {
        console.error("Error loading topics:", error);
      } finally {
        setIsLoadingTopics(false);
      }
    }

    void loadTopics();
  }, []);

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

  const removeAttachment = (
    attachmentUrl: string,
    setter: React.Dispatch<React.SetStateAction<GlossaryAttachment[]>>
  ) => {
    setter((current) => current.filter((item) => item.url !== attachmentUrl));
  };

  const addKnowledgeMediaLink = () => {
    const normalizedUrl = knowledgeMediaUrl.trim();
    if (!normalizedUrl) {
      setMessageType("error");
      setMessage("Media URL is required.");
      return;
    }

    setKnowledgeMediaLinks((current) => [
      ...current,
      {
        label: knowledgeMediaLabel.trim() || knowledgeMediaType.trim() || "Media link",
        url: normalizedUrl,
        media_type: knowledgeMediaType.trim() || null,
        notes: knowledgeMediaNotes.trim() || null,
      },
    ]);
    setKnowledgeMediaLabel("");
    setKnowledgeMediaUrl("");
    setKnowledgeMediaType("");
    setKnowledgeMediaNotes("");
    setMessage("");
  };

  const removeKnowledgeMediaLink = (urlToRemove: string) => {
    setKnowledgeMediaLinks((current) =>
      current.filter((mediaLink) => mediaLink.url !== urlToRemove)
    );
  };

  const handleAttachmentUpload = async (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<GlossaryAttachment[]>>
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setMessage("");
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadFile(file)));
      setter((current) => [...current, ...uploaded]);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Failed to upload files.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const extractTextFromFile = async (file: File) => {
    if (file.type.startsWith("text/")) {
      return file.text();
    }

    if (file.type.startsWith("image/")) {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(file, "eng");
      return result.data.text;
    }

    throw new Error(
      "Automatic text extraction is currently supported for images and text files. PDFs and other document types can still be uploaded, but OCR is not ready for them yet."
    );
  };

  const handleQuoteSourceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setIsExtractingQuoteText(true);
      setMessage("");
      const fileArray = Array.from(files);
      const uploaded = await Promise.all(fileArray.map((file) => uploadFile(file)));
      setQuoteAttachments((current) => [...current, ...uploaded]);

      const firstSupportedFile = fileArray.find(
        (file) => file.type.startsWith("image/") || file.type.startsWith("text/")
      );

      if (firstSupportedFile) {
        const extractedText = await extractTextFromFile(firstSupportedFile);
        setQuoteExtractedText(extractedText.trim());
        setMessageType("info");
        setMessage(
          "Text extracted. Review it and keep only the part you want as the final quote."
        );
      } else {
        setMessageType("info");
        setMessage(
          "File uploaded. Automatic text extraction is available for images and text files in this MVP."
        );
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to process quote source."
      );
    } finally {
      setIsUploadingAttachment(false);
      setIsExtractingQuoteText(false);
    }
  };

  const useSelectedExtractedText = () => {
    const textarea = quoteExtractedTextRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText =
      start !== end ? quoteExtractedText.slice(start, end).trim() : quoteExtractedText.trim();

    if (!selectedText) {
      setMessageType("error");
      setMessage("Select part of the extracted text first, or use the full extracted text.");
      return;
    }

    setQuoteText(selectedText);
    setMessageType("success");
    setMessage("Selected extracted text moved into Quote Text.");
  };

  const useAllExtractedText = () => {
    if (!quoteExtractedText.trim()) {
      return;
    }
    setQuoteText(quoteExtractedText.trim());
    setMessageType("success");
    setMessage("Full extracted text moved into Quote Text.");
  };

  const resetThoughtForm = () => {
    setThoughtTitle("");
    setThoughtContent("");
    setThoughtType("");
    setThoughtLink("");
    setThoughtTopicIds([]);
  };

  const resetKnowledgeForm = () => {
    setKnowledgeUrl("");
    setKnowledgeTitle("");
    setKnowledgeNote("");
    setKnowledgeSource("");
    setKnowledgeDescription("");
    setKnowledgeTopicIds([]);
    setKnowledgeAttachments([]);
    setKnowledgeMediaLinks([]);
    setKnowledgeMediaLabel("");
    setKnowledgeMediaUrl("");
    setKnowledgeMediaType("");
    setKnowledgeMediaNotes("");
  };

  const resetBusinessForm = () => {
    setBusinessTitle("");
    setBusinessDescription("");
    setBusinessProblem("");
    setBusinessAudience("");
    setBusinessPriority("");
    setBusinessNextSteps("");
    setBusinessTopicIds([]);
    setBusinessAttachments([]);
  };

  const resetQuoteForm = () => {
    setQuoteBookTitle("");
    setQuoteBookType("");
    setQuoteText("");
    setQuotePage("");
    setQuoteThoughts("");
    setQuoteAttachments([]);
    setQuoteExtractedText("");
  };

  const resetWorkForm = () => {
    setWorkTitle("");
    setWorkGoal("");
    setWorkSummary("");
    setWorkContext("");
    setWorkApplicationCategory("");
    setWorkPriority("");
    setWorkTimeline("");
    setWorkExecutionMode("");
    setWorkTopicIds([]);
    setWorkAttachments([]);
  };

  const resetPersonalForm = () => {
    setPersonalTitle("");
    setPersonalDescription("");
    setPersonalCategory("");
    setPersonalPriority("");
    setPersonalGoal("");
    setPersonalAttachments([]);
  };

  const resetGlossaryForm = () => {
    setGlossaryTerm("");
    setGlossaryDefinition("");
    setGlossaryTermType("");
    setGlossaryCustomType("");
    setGlossaryAliasInput("");
    setGlossaryAliases([]);
    setGlossaryTagInput("");
    setGlossaryTags([]);
    setGlossaryLinkInput("");
    setGlossaryLinks([]);
    setGlossaryAttachments([]);
  };

  useEffect(() => {
    async function loadItemForEdit() {
      if (!isEditMode || !itemId) {
        return;
      }

      try {
        setIsLoadingItem(true);
        setMessage("");
        setMessageType("info");

        if (activeTab === "thought") {
          const thought = await getThoughtById(Number(itemId));
          setThoughtTitle(thought.title || "");
          setThoughtContent(thought.content || "");
          setThoughtType(thought.thought_type || "");
          setThoughtLink(thought.link || "");
          setThoughtTopicIds(thought.topics.map((topic) => topic.id));
          return;
        }

        if (activeTab === "knowledge") {
          const item = await getKnowledgeItemById(Number(itemId));
          setKnowledgeUrl(item.url || "");
          setKnowledgeTitle(item.title || "");
          setKnowledgeNote(item.personal_note || "");
          setKnowledgeSource(item.source || "");
          setKnowledgeDescription(item.description || "");
          setKnowledgeTopicIds(item.topics.map((topic) => topic.id));
          setKnowledgeAttachments(item.attachments || []);
          setKnowledgeMediaLinks(item.media_links || []);
          return;
        }

        if (activeTab === "business") {
          const item = await getBusinessIdeaById(Number(itemId));
          setBusinessTitle(item.title || "");
          setBusinessDescription(item.description || "");
          setBusinessProblem(item.problem || "");
          setBusinessAudience(item.audience || "");
          setBusinessPriority(item.priority || "");
          setBusinessNextSteps(item.next_steps || "");
          setBusinessTopicIds(item.topics.map((topic) => topic.id));
          setBusinessAttachments(item.attachments || []);
          return;
        }

        if (activeTab === "quote") {
          const item = await getQuoteById(Number(itemId));
          setQuoteBookTitle(item.book_title || "");
          setQuoteBookType(item.book_type || "");
          setQuoteText(item.quote_text || "");
          setQuotePage(item.page || "");
          setQuoteThoughts(item.thoughts || "");
          setQuoteAttachments(item.attachments || []);
          setQuoteExtractedText("");
          return;
        }

        if (activeTab === "work") {
          const item = await getWorkIdeaById(Number(itemId));
          setWorkTitle(item.title || "");
          setWorkGoal(item.goal || "");
          setWorkSummary(item.summary || "");
          setWorkContext(item.context || "");
          setWorkApplicationCategory(item.application_category || "");
          setWorkPriority(item.priority || "");
          setWorkTimeline(item.timeline || "");
          setWorkExecutionMode(item.execution_mode || "");
          setWorkTopicIds(item.topics.map((topic) => topic.id));
          setWorkAttachments(item.attachments || []);
          return;
        }

        if (activeTab === "personal") {
          const item = await getPersonalIdeaById(Number(itemId));
          setPersonalTitle(item.title || "");
          setPersonalDescription(item.description || "");
          setPersonalCategory(item.category || "");
          setPersonalPriority(item.priority || "");
          setPersonalGoal(item.goal || "");
          setPersonalAttachments(item.attachments || []);
          return;
        }

        if (activeTab === "glossary") {
          const item = await getGlossaryTermById(Number(itemId));
          setGlossaryTerm(item.term || "");
          setGlossaryDefinition(item.definition || "");
          setGlossaryTermType(item.term_type || "");
          setGlossaryAliases(item.aliases || []);
          setGlossaryTags(item.tags || []);
          setGlossaryLinks(item.links || []);
          setGlossaryAttachments(item.attachments || []);
        }
      } catch (error) {
        console.error("Error loading item for edit:", error);
        setMessageType("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load item for editing."
        );
      } finally {
        setIsLoadingItem(false);
      }
    }

    void loadItemForEdit();
  }, [activeTab, isEditMode, itemId]);

  const saveThought = async () => {
    if (!thoughtContent.trim()) {
      setMessageType("error");
      setMessage("Thought text is required.");
      return;
    }

    const payload = {
      title: thoughtTitle.trim() || null,
      content: thoughtContent.trim(),
      summary: thoughtContent.trim() || null,
      link: thoughtLink.trim() || null,
      thought_type: thoughtType || null,
      priority: "medium",
      topic_ids: thoughtTopicIds,
    };

    if (isEditMode && itemId) {
      await updateThought(Number(itemId), payload);
      navigate(`/thoughts/${itemId}?updated=thought`);
      return;
    }

    await createThought(payload);
    resetThoughtForm();
    navigate("/thoughts?saved=thought");
  };

  const saveKnowledgeItem = async () => {
    if (!knowledgeUrl.trim()) {
      setMessageType("error");
      setMessage("URL is required.");
      return;
    }

    const payload = {
      title: knowledgeTitle.trim() || null,
      url: knowledgeUrl.trim(),
      personal_note: knowledgeNote.trim() || null,
      source: knowledgeSource.trim() || null,
      description: knowledgeDescription.trim() || null,
      topic_ids: knowledgeTopicIds,
      attachments: knowledgeAttachments,
      media_links: knowledgeMediaLinks,
    };

    if (isEditMode && itemId) {
      await updateKnowledgeItem(Number(itemId), payload);
      navigate("/library?updated=knowledge");
      return;
    }

    await createKnowledgeItem(payload);
    resetKnowledgeForm();
    navigate("/library?saved=knowledge");
  };

  const saveBusinessIdea = async () => {
    if (!businessTitle.trim()) {
      setMessageType("error");
      setMessage("Business idea title is required.");
      return;
    }

    const payload = {
      title: businessTitle.trim(),
      description: businessDescription.trim() || null,
      problem: businessProblem.trim() || null,
      audience: businessAudience.trim() || null,
      priority: businessPriority || "medium",
      next_steps: businessNextSteps.trim() || null,
      topic_ids: businessTopicIds,
      attachments: businessAttachments,
    };

    if (isEditMode && itemId) {
      await updateBusinessIdea(Number(itemId), payload);
      navigate("/business-ideas?updated=business");
      return;
    }

    await createBusinessIdea(payload);
    resetBusinessForm();
    navigate("/business-ideas?saved=business");
  };

  const saveQuote = async () => {
    if (!quoteBookTitle.trim() || !quoteText.trim()) {
      setMessageType("error");
      setMessage("Book title and quote text are required.");
      return;
    }

    const payload = {
      book_title: quoteBookTitle.trim(),
      book_type: quoteBookType.trim() || null,
      quote_text: quoteText.trim(),
      page: quotePage.trim() || null,
      thoughts: quoteThoughts.trim() || null,
      attachments: quoteAttachments,
    };

    if (isEditMode && itemId) {
      await updateQuote(Number(itemId), payload);
      navigate("/quotes?updated=quote");
      return;
    }

    await createQuote(payload);
    resetQuoteForm();
    navigate("/quotes?saved=quote");
  };

  const saveWorkIdea = async () => {
    if (!workTitle.trim()) {
      setMessageType("error");
      setMessage("Work idea title is required.");
      return;
    }

    const payload = {
      title: workTitle.trim(),
      goal: workGoal.trim() || null,
      summary: workSummary.trim() || null,
      context: workContext.trim() || null,
      application_category: workApplicationCategory.trim() || null,
      priority: workPriority || "medium",
      timeline: workTimeline.trim() || null,
      execution_mode: workExecutionMode || "solo",
      topic_ids: workTopicIds,
      attachments: workAttachments,
    };

    if (isEditMode && itemId) {
      await updateWorkIdea(Number(itemId), payload);
      navigate("/work-ideas?updated=work");
      return;
    }

    await createWorkIdea(payload);
    resetWorkForm();
    navigate("/work-ideas?saved=work");
  };

  const savePersonalIdea = async () => {
    if (!personalTitle.trim()) {
      setMessageType("error");
      setMessage("Personal idea title is required.");
      return;
    }

    const payload = {
      title: personalTitle.trim(),
      description: personalDescription.trim() || null,
      category: personalCategory.trim() || null,
      priority: personalPriority || "medium",
      goal: personalGoal.trim() || null,
      attachments: personalAttachments,
    };

    if (isEditMode && itemId) {
      await updatePersonalIdea(Number(itemId), payload);
      navigate("/personal-ideas?updated=personal");
      return;
    }

    await createPersonalIdea(payload);
    resetPersonalForm();
    navigate("/personal-ideas?saved=personal");
  };

  const saveGlossaryTerm = async () => {
    if (!glossaryTerm.trim() || !glossaryDefinition.trim()) {
      setMessageType("error");
      setMessage("Term and definition are required.");
      return;
    }

    const payload = {
      term: glossaryTerm.trim(),
      definition: glossaryDefinition.trim(),
      term_type: glossaryTermType || null,
      aliases: glossaryAliases,
      tags: glossaryTags,
      links: glossaryLinks,
      attachments: glossaryAttachments,
    };

    if (isEditMode && itemId) {
      await updateGlossaryTerm(Number(itemId), payload);
      navigate("/glossary");
      return;
    }

    await createGlossaryTerm(payload);
    resetGlossaryForm();
    navigate("/glossary");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage("");

      if (activeTab === "thought") return void (await saveThought());
      if (activeTab === "knowledge") return void (await saveKnowledgeItem());
      if (activeTab === "business") return void (await saveBusinessIdea());
      if (activeTab === "quote") return void (await saveQuote());
      if (activeTab === "work") return void (await saveWorkIdea());
      if (activeTab === "personal") return void (await savePersonalIdea());
      if (activeTab === "glossary") return void (await saveGlossaryTerm());
    } catch (error) {
      console.error("Error saving capture item:", error);
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndProcess = async () => {
    await handleSave();
  };

  const toggleTopicSelection = (
    topicId: number,
    target: "thought" | "knowledge" | "business" | "work"
  ) => {
    if (target === "thought") {
      setThoughtTopicIds((current) =>
        current.includes(topicId)
          ? current.filter((id) => id !== topicId)
          : [...current, topicId]
      );
      return;
    }

    if (target === "business") {
      setBusinessTopicIds((current) =>
        current.includes(topicId)
          ? current.filter((id) => id !== topicId)
          : [...current, topicId]
      );
      return;
    }

    if (target === "work") {
      setWorkTopicIds((current) =>
        current.includes(topicId)
          ? current.filter((id) => id !== topicId)
          : [...current, topicId]
      );
      return;
    }

    setKnowledgeTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId]
    );
  };

  const renderTopicPicker = (target: "thought" | "knowledge" | "business" | "work") => {
    const selectedIds =
      target === "thought"
        ? thoughtTopicIds
        : target === "knowledge"
          ? knowledgeTopicIds
          : target === "business"
            ? businessTopicIds
            : workTopicIds;

    return (
      <FieldGroup label="Topics">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopicSelection(topic.id, target)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  selectedIds.includes(topic.id)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/40"
                )}
              >
                # {topic.name}
              </button>
            ))}
          </div>

          {isLoadingTopics && (
            <div className="text-xs text-muted-foreground">Loading topics...</div>
          )}

          {target === "thought" && (
            <div className="flex gap-2">
              <Input
                placeholder="Quick add a topic"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!newTopicName.trim()) {
                    return;
                  }

                  try {
                    const topic = await createTopic({ name: newTopicName.trim() });
                    setAvailableTopics((current) =>
                      [...current, topic].sort((a, b) => a.name.localeCompare(b.name))
                    );
                    setThoughtTopicIds((current) => [...current, topic.id]);
                    setNewTopicName("");
                  } catch (error) {
                    setMessageType("error");
                    setMessage(
                      error instanceof Error ? error.message : "Failed to create topic."
                    );
                  }
                }}
              >
                Add Topic
              </Button>
            </div>
          )}
        </div>
      </FieldGroup>
    );
  };

  const renderGlossaryFields = () => (
    <div className="space-y-4">
      <FieldGroup label="Term">
        <Input
          placeholder="Large Language Model"
          value={glossaryTerm}
          onChange={(e) => setGlossaryTerm(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Definition">
        <Textarea
          placeholder="Explain the term in simple words..."
          rows={4}
          value={glossaryDefinition}
          onChange={(e) => setGlossaryDefinition(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Select Term Type">
        <div className="space-y-3">
          <Select
            value={glossaryTermType || "__none__"}
            onValueChange={(value) => setGlossaryTermType(value === "__none__" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a term type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No type</SelectItem>
              {availableGlossaryTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Input
              placeholder="Create a new term type"
              value={glossaryCustomType}
              onChange={(e) => setGlossaryCustomType(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const nextType = normalizeTermType(glossaryCustomType);
                if (!nextType) return;
                setGlossaryTermType(nextType);
                setGlossaryCustomType("");
              }}
            >
              Add Type
            </Button>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup label="Alias">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="LLM, Postgres, GPT..."
              value={glossaryAliasInput}
              onChange={(e) => setGlossaryAliasInput(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addStringItem(glossaryAliasInput, glossaryAliases, setGlossaryAliases, () =>
                  setGlossaryAliasInput("")
                )
              }
            >
              Add Alias
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Alias = another name, acronym, abbreviation, or alternate spelling for the same term.
          </p>
          <div className="flex flex-wrap gap-2">
            {glossaryAliases.map((alias) => (
              <button
                key={alias}
                type="button"
                onClick={() =>
                  setGlossaryAliases((current) => current.filter((item) => item !== alias))
                }
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {alias}
              </button>
            ))}
          </div>
        </div>
      </FieldGroup>

      <FieldGroup label="Tags">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="ai, wellness, systems..."
              value={glossaryTagInput}
              onChange={(e) => setGlossaryTagInput(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addStringItem(glossaryTagInput, glossaryTags, setGlossaryTags, () =>
                  setGlossaryTagInput("")
                )
              }
            >
              Add Tag
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {glossaryTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setGlossaryTags((current) => current.filter((item) => item !== tag))
                }
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </FieldGroup>

      <FieldGroup label="Links">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={glossaryLinkInput}
              onChange={(e) => setGlossaryLinkInput(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addStringItem(glossaryLinkInput, glossaryLinks, setGlossaryLinks, () =>
                  setGlossaryLinkInput("")
                )
              }
            >
              Add Link
            </Button>
          </div>
          <div className="space-y-2">
            {glossaryLinks.map((link) => (
              <div
                key={link}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
              >
                <span className="truncate">{link}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setGlossaryLinks((current) => current.filter((item) => item !== link))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </FieldGroup>

      <AttachmentPreviewList
        title="Images and Files"
        attachments={glossaryAttachments}
        uploadingText={isUploadingAttachment ? "Uploading..." : "Upload images or files"}
        onUpload={(files) => handleAttachmentUpload(files, setGlossaryAttachments)}
        onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setGlossaryAttachments)}
      />
    </div>
  );

  const renderForm = () => {
    switch (activeTab) {
      case "knowledge":
        return (
          <div className="space-y-4">
            <FieldGroup label="URL">
              <Input placeholder="https://..." value={knowledgeUrl} onChange={(e) => setKnowledgeUrl(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Title">
              <Input placeholder="Article title" value={knowledgeTitle} onChange={(e) => setKnowledgeTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Personal Note">
              <Textarea placeholder="Your takeaways..." rows={3} value={knowledgeNote} onChange={(e) => setKnowledgeNote(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Source (optional)">
              <Input placeholder="Blog, newsletter, etc." value={knowledgeSource} onChange={(e) => setKnowledgeSource(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Brief Description">
              <Textarea placeholder="What is this about?" rows={2} value={knowledgeDescription} onChange={(e) => setKnowledgeDescription(e.target.value)} />
            </FieldGroup>
            <AttachmentPreviewList
              title="Images and Files"
              attachments={knowledgeAttachments}
              uploadingText={isUploadingAttachment ? "Uploading..." : "Upload images or files"}
              onUpload={(files) => handleAttachmentUpload(files, setKnowledgeAttachments)}
              onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setKnowledgeAttachments)}
            />
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Video / Podcast Links
                </div>
                <p className="text-xs text-muted-foreground">
                  Add YouTube, podcast, or media links. Include notes or key ideas so AI summaries can use them.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Label, e.g. Episode 12"
                  value={knowledgeMediaLabel}
                  onChange={(e) => setKnowledgeMediaLabel(e.target.value)}
                />
                <Input
                  placeholder="https://youtube.com/... or podcast URL"
                  value={knowledgeMediaUrl}
                  onChange={(e) => setKnowledgeMediaUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={knowledgeMediaType} onValueChange={setKnowledgeMediaType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addKnowledgeMediaLink}>
                  Add Media Link
                </Button>
              </div>
              <Textarea
                placeholder="Optional notes, transcript snippets, or key ideas from this media"
                rows={3}
                value={knowledgeMediaNotes}
                onChange={(e) => setKnowledgeMediaNotes(e.target.value)}
              />
              <div className="space-y-2">
                {knowledgeMediaLinks.map((mediaLink) => (
                  <div
                    key={`${mediaLink.url}-${mediaLink.label}`}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{mediaLink.label}</div>
                        <div className="text-xs text-muted-foreground break-all">{mediaLink.url}</div>
                        {mediaLink.media_type && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Type: {mediaLink.media_type}
                          </div>
                        )}
                        {mediaLink.notes && (
                          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            {mediaLink.notes}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeKnowledgeMediaLink(mediaLink.url)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {renderTopicPicker("knowledge")}
          </div>
        );

      case "thought":
        return (
          <div className="space-y-4">
            <FieldGroup label="Title">
              <Input placeholder="Name your thought" value={thoughtTitle} onChange={(e) => setThoughtTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Thought Text">
              <Textarea placeholder="Write your thought..." rows={6} value={thoughtContent} onChange={(e) => setThoughtContent(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Thought Type (optional)">
              <Select value={thoughtType} onValueChange={setThoughtType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observation">Observation</SelectItem>
                  <SelectItem value="hypothesis">Hypothesis</SelectItem>
                  <SelectItem value="reflection">Reflection</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Link (optional)">
              <Input placeholder="Related URL" value={thoughtLink} onChange={(e) => setThoughtLink(e.target.value)} />
            </FieldGroup>
            {renderTopicPicker("thought")}
          </div>
        );

      case "business":
        return (
          <div className="space-y-4">
            <FieldGroup label="Title">
              <Input placeholder="Business idea name" value={businessTitle} onChange={(e) => setBusinessTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Description">
              <Textarea placeholder="Describe the idea..." rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Problem">
              <Textarea placeholder="What problem does it solve?" rows={2} value={businessProblem} onChange={(e) => setBusinessProblem(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Audience">
              <Input placeholder="Who is this for?" value={businessAudience} onChange={(e) => setBusinessAudience(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Priority">
              <Select value={businessPriority} onValueChange={setBusinessPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Next Steps">
              <Textarea placeholder="What should be done next?" rows={2} value={businessNextSteps} onChange={(e) => setBusinessNextSteps(e.target.value)} />
            </FieldGroup>
            <AttachmentPreviewList
              title="Images and Files"
              attachments={businessAttachments}
              uploadingText={isUploadingAttachment ? "Uploading..." : "Upload images or files"}
              onUpload={(files) => handleAttachmentUpload(files, setBusinessAttachments)}
              onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setBusinessAttachments)}
            />
            {renderTopicPicker("business")}
          </div>
        );

      case "quote":
        return (
          <div className="space-y-4">
            <FieldGroup label="Book Title">
              <Input placeholder="Name of the book" value={quoteBookTitle} onChange={(e) => setQuoteBookTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Book Type">
              <Input
                placeholder="Book, article, paper, essay, report..."
                value={quoteBookType}
                onChange={(e) => setQuoteBookType(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Quote Text">
              <Textarea placeholder="Enter the quote..." rows={4} value={quoteText} onChange={(e) => setQuoteText(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Page (optional)">
              <Input type="number" placeholder="Page number" value={quotePage} onChange={(e) => setQuotePage(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Your Thoughts (optional)">
              <Textarea placeholder="What does this quote mean to you?" rows={3} value={quoteThoughts} onChange={(e) => setQuoteThoughts(e.target.value)} />
            </FieldGroup>
            <AttachmentPreviewList
              title="Quote Source Photo / Document"
              attachments={quoteAttachments}
              uploadingText={
                isUploadingAttachment || isExtractingQuoteText
                  ? "Uploading and extracting..."
                  : "Upload a photo or document"
              }
              onUpload={handleQuoteSourceUpload}
              onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setQuoteAttachments)}
            />
            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                Extracted Text Review
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Upload a photo/image or text file. We extract text first, then you choose exactly what part should become the final quote.
              </p>
              <Textarea
                ref={quoteExtractedTextRef}
                placeholder="Extracted text will appear here..."
                rows={8}
                value={quoteExtractedText}
                onChange={(e) => setQuoteExtractedText(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={useSelectedExtractedText}>
                  Use Selected Text
                </Button>
                <Button type="button" variant="outline" onClick={useAllExtractedText}>
                  Use All Extracted Text
                </Button>
              </div>
            </div>
          </div>
        );

      case "work":
        return (
          <div className="space-y-4">
            <FieldGroup label="Title">
              <Input placeholder="Work idea name" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Goal">
              <Input placeholder="What do you want to achieve?" value={workGoal} onChange={(e) => setWorkGoal(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Summary">
              <Textarea placeholder="Summarize the idea..." rows={3} value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Context">
              <Textarea placeholder="What's the context?" rows={2} value={workContext} onChange={(e) => setWorkContext(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Application Category">
              <Input placeholder="Engineering, Design, etc." value={workApplicationCategory} onChange={(e) => setWorkApplicationCategory(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Priority">
              <Select value={workPriority} onValueChange={setWorkPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Timeline">
              <Input placeholder="Q2 2026, Next month, etc." value={workTimeline} onChange={(e) => setWorkTimeline(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Execution Mode">
              <Select value={workExecutionMode} onValueChange={setWorkExecutionMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Solo or Team?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <AttachmentPreviewList
              title="Images and Files"
              attachments={workAttachments}
              uploadingText={isUploadingAttachment ? "Uploading..." : "Upload images or files"}
              onUpload={(files) => handleAttachmentUpload(files, setWorkAttachments)}
              onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setWorkAttachments)}
            />
            {renderTopicPicker("work")}
          </div>
        );

      case "personal":
        return (
          <div className="space-y-4">
            <FieldGroup label="Title">
              <Input placeholder="Personal idea name" value={personalTitle} onChange={(e) => setPersonalTitle(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Description">
              <Textarea placeholder="Describe your idea..." rows={3} value={personalDescription} onChange={(e) => setPersonalDescription(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Category">
              <Input placeholder="Wellness, Finance, Learning, etc." value={personalCategory} onChange={(e) => setPersonalCategory(e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Priority">
              <Select value={personalPriority} onValueChange={setPersonalPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="Goal">
              <Textarea placeholder="What's the end goal?" rows={2} value={personalGoal} onChange={(e) => setPersonalGoal(e.target.value)} />
            </FieldGroup>
            <AttachmentPreviewList
              title="Images and Files"
              attachments={personalAttachments}
              uploadingText={isUploadingAttachment ? "Uploading..." : "Upload images or files"}
              onUpload={(files) => handleAttachmentUpload(files, setPersonalAttachments)}
              onRemove={(attachmentUrl) => removeAttachment(attachmentUrl, setPersonalAttachments)}
            />
          </div>
        );

      case "glossary":
        return renderGlossaryFields();

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={isEditMode ? "Edit Entry" : "Capture"}
        description={
          isEditMode
            ? "Update an existing item in your system"
            : "Quickly add new information to your system"
        }
      />

      {isEditMode && (
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate(backRoutes[activeTab] || "/")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      )}

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setMessage("");
              setMessageType("info");
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-card p-6">
        {isEditMode && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              You are editing this {tabLabels[activeTab] || "entry"}.
            </span>
          </div>
        )}

        {isLoadingItem && (
          <div className="mb-4 text-sm text-muted-foreground">
            Loading item for editing...
          </div>
        )}

        {renderForm()}

        {message && (
          <div
            className={cn(
              "mt-4 rounded-md border px-3 py-2 text-sm",
              messageType === "success" &&
                "border-green-200 bg-green-50 text-green-700",
              messageType === "error" &&
                "border-red-200 bg-red-50 text-red-700",
              messageType === "info" &&
                "border-border bg-secondary text-muted-foreground"
            )}
          >
            {message}
          </div>
        )}

        <div className="mt-6 flex gap-3 border-t border-border pt-4">
          <Button
            className="gap-2"
            onClick={() => void handleSave()}
            disabled={isSaving || isLoadingItem}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : isEditMode ? "Update" : "Save"}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void handleSaveAndProcess()}
            disabled={isSaving || isLoadingItem}
          >
            <Zap className="h-4 w-4" />
            {isSaving
              ? "Saving..."
              : isEditMode
                ? "Update & Process"
                : "Save & Process"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Capture;
