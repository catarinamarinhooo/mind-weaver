from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TopicCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TopicResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    thought_count: int = 0
    knowledge_item_count: int = 0
    total_count: int = 0

    class Config:
        from_attributes = True


class ThoughtCreate(BaseModel):
    title: Optional[str] = None
    content: str
    summary: Optional[str] = None
    link: Optional[str] = None
    thought_type: Optional[str] = None
    priority: Optional[str] = None
    topic_ids: list[int] = []


class ThoughtResponse(BaseModel):
    id: int
    title: Optional[str] = None
    content: str
    summary: Optional[str] = None
    link: Optional[str] = None
    thought_type: Optional[str] = None
    priority: Optional[str] = None
    topics: list[TopicResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class GlossaryAttachment(BaseModel):
    name: str
    url: str
    content_type: Optional[str] = None
    kind: Optional[str] = None


class MediaLink(BaseModel):
    label: str
    url: str
    media_type: Optional[str] = None
    notes: Optional[str] = None
    ai_title: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_key_points: list[str] = []
    ai_last_analyzed_at: Optional[datetime] = None
    ai_source_kind: Optional[str] = None
    ai_transcript_used: Optional[bool] = None


class KnowledgeItemCreate(BaseModel):
    title: Optional[str] = None
    url: str
    personal_note: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    topic_ids: list[int] = []
    attachments: list["GlossaryAttachment"] = []
    media_links: list["MediaLink"] = []


class KnowledgeItemResponse(BaseModel):
    id: int
    title: Optional[str] = None
    url: str
    personal_note: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    topics: list[TopicResponse] = []
    attachments: list["GlossaryAttachment"] = []
    media_links: list["MediaLink"] = []
    created_at: datetime

    class Config:
        from_attributes = True


class BusinessIdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    problem: Optional[str] = None
    audience: Optional[str] = None
    priority: Optional[str] = None
    next_steps: Optional[str] = None
    topic_ids: list[int] = []
    attachments: list[GlossaryAttachment] = []


class BusinessIdeaResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    problem: Optional[str] = None
    audience: Optional[str] = None
    priority: Optional[str] = None
    next_steps: Optional[str] = None
    topics: list[TopicResponse] = []
    attachments: list[GlossaryAttachment] = []
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteCreate(BaseModel):
    book_title: str
    book_type: Optional[str] = None
    quote_text: str
    page: Optional[str] = None
    thoughts: Optional[str] = None
    attachments: list["GlossaryAttachment"] = []


class QuoteResponse(BaseModel):
    id: int
    book_title: str
    book_type: Optional[str] = None
    quote_text: str
    page: Optional[str] = None
    thoughts: Optional[str] = None
    attachments: list["GlossaryAttachment"] = []
    created_at: datetime

    class Config:
        from_attributes = True


class WorkIdeaCreate(BaseModel):
    title: str
    goal: Optional[str] = None
    summary: Optional[str] = None
    context: Optional[str] = None
    application_category: Optional[str] = None
    priority: Optional[str] = None
    timeline: Optional[str] = None
    execution_mode: Optional[str] = None
    topic_ids: list[int] = []
    attachments: list[GlossaryAttachment] = []


class WorkIdeaResponse(BaseModel):
    id: int
    title: str
    goal: Optional[str] = None
    summary: Optional[str] = None
    context: Optional[str] = None
    application_category: Optional[str] = None
    priority: Optional[str] = None
    timeline: Optional[str] = None
    execution_mode: Optional[str] = None
    topics: list[TopicResponse] = []
    attachments: list[GlossaryAttachment] = []
    created_at: datetime

    class Config:
        from_attributes = True


class PersonalIdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    goal: Optional[str] = None
    attachments: list["GlossaryAttachment"] = []


class PersonalIdeaResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    goal: Optional[str] = None
    attachments: list["GlossaryAttachment"] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectionCreate(BaseModel):
    source_type: str
    source_id: int
    target_type: str
    target_id: int
    relationship_type: Optional[str] = None
    notes: Optional[str] = None


class ConnectionResponse(BaseModel):
    id: int
    source_type: str
    source_id: int
    source_label: str
    target_type: str
    target_id: int
    target_label: str
    relationship_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GlossaryTermCreate(BaseModel):
    term: str
    definition: str
    term_type: Optional[str] = None
    aliases: list[str] = []
    tags: list[str] = []
    links: list[str] = []
    attachments: list[GlossaryAttachment] = []


class GlossaryTermResponse(BaseModel):
    id: int
    term: str
    definition: str
    term_type: Optional[str] = None
    aliases: list[str] = []
    tags: list[str] = []
    links: list[str] = []
    attachments: list[GlossaryAttachment] = []
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    name: str
    url: str
    content_type: Optional[str] = None
    kind: Optional[str] = None


class WatchlistSourceCreate(BaseModel):
    name: str
    url: str
    source_type: Optional[str] = None
    rss_url: Optional[str] = None


class WatchlistSourceResponse(BaseModel):
    id: int
    watchlist_id: int
    name: str
    url: str
    source_type: Optional[str] = None
    rss_url: Optional[str] = None
    active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class WatchlistCreate(BaseModel):
    name: str
    topic: str
    frequency: str = "daily"
    interval_days: Optional[int] = None
    description: Optional[str] = None
    sources: list[WatchlistSourceCreate] = []


class WatchlistUpdate(BaseModel):
    name: Optional[str] = None
    topic: Optional[str] = None
    frequency: Optional[str] = None
    interval_days: Optional[int] = None
    description: Optional[str] = None


class WatchlistResponse(BaseModel):
    id: int
    name: str
    topic: str
    frequency: str
    interval_days: Optional[int] = None
    description: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    sources: list[WatchlistSourceResponse] = []

    class Config:
        from_attributes = True


class DiscoveryItemResponse(BaseModel):
    id: int
    watchlist_id: int
    source_id: Optional[int] = None
    title: str
    summary: Optional[str] = None
    url: str
    topic: Optional[str] = None
    source_name: Optional[str] = None
    published_at: Optional[datetime] = None
    saved_to_library: bool = False
    saved_in_discovery: bool = False
    dismissed: bool = False
    assigned_topic: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiscoveryItemUpdate(BaseModel):
    saved_in_discovery: Optional[bool] = None
    dismissed: Optional[bool] = None
    assigned_topic: Optional[str] = None


class SourceSuggestionResponse(BaseModel):
    name: str
    url: str
    source_type: Optional[str] = None
    rss_url: Optional[str] = None
    reason: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    email: str
    password: str
    nickname: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    workspace_id: Optional[int] = None
    is_admin: bool = False
    is_active: bool = True
    nickname: str
    full_name: Optional[str] = None
    avatar_data_url: Optional[str] = None
    tone: Optional[str] = None
    default_capture_type: Optional[str] = None
    ai_name: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    workspace: Optional[WorkspaceResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    full_name: Optional[str] = None
    avatar_data_url: Optional[str] = None
    tone: Optional[str] = None
    default_capture_type: Optional[str] = None
    ai_name: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


class AdminUserCreate(BaseModel):
    email: str
    password: str
    nickname: str
    full_name: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    nickname: Optional[str] = None
    full_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


class AISuggestedTopic(BaseModel):
    topic_id: int
    topic_name: str
    score: int
    explanation: str


class AISuggestedEntity(BaseModel):
    entity_type: str
    entity_id: int
    label: str
    score: int
    explanation: str


class AISuggestionsResponse(BaseModel):
    entity_type: str
    entity_id: int
    explanation: str
    suggested_topics: list[AISuggestedTopic]
    suggested_related_entities: list[AISuggestedEntity]


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: list[AIChatMessage] = []


class AIChatCitation(BaseModel):
    entity_type: str
    entity_id: int
    label: str
    score: Optional[int] = None
    url: Optional[str] = None
    parent_entity_type: Optional[str] = None
    parent_entity_id: Optional[int] = None
    parent_label: Optional[str] = None


class AIChatResponse(BaseModel):
    answer: str
    citations: list[AIChatCitation] = []


class AISummaryRequest(BaseModel):
    entity_type: str
    entity_id: int


class AISummaryResponse(BaseModel):
    entity_type: str
    entity_id: int
    title: str
    summary: str


class AIDiscoveryTriageRequest(BaseModel):
    discovery_item_id: int


class AIDiscoveryTriageResponse(BaseModel):
    discovery_item_id: int
    relevance_score: int
    recommended_action: str
    suggested_topic: Optional[str] = None
    explanation: str


class AIMediaInsightsRequest(BaseModel):
    knowledge_item_id: int
    media_url: str
    media_type: Optional[str] = None
    label: Optional[str] = None
    notes: Optional[str] = None


class AIMediaInsightsResponse(BaseModel):
    knowledge_item_id: int
    media_url: str
    media_type: Optional[str] = None
    title: str
    summary: str
    key_points: list[str] = []
    transcript_used: bool = False
    source_kind: str
    analyzed_at: datetime


class AIApplyThoughtConversionRequest(BaseModel):
    thought_id: int
    target_type: str


class AIApplyThoughtConversionResponse(BaseModel):
    action_type: str
    target_type: str
    target_id: int
    target_path: str
    title: str
    suggested_next_steps: str


class AIApplyDiscoveryActionRequest(BaseModel):
    discovery_item_id: int


class AIApplyDiscoveryActionResponse(BaseModel):
    action_type: str
    discovery_item_id: int
    recommended_action: str
    target_path: str
    suggested_topic: Optional[str] = None
    explanation: str


class AIActionHistoryResponse(BaseModel):
    id: int
    action_type: str
    source_entity_type: str
    source_entity_id: int
    target_entity_type: Optional[str] = None
    target_entity_id: Optional[int] = None
    summary: Optional[str] = None
    details: Optional[str] = None
    rolled_back_at: Optional[datetime] = None
    rollback_details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AIActionRollbackResponse(BaseModel):
    message: str
    history_entry_id: int


class AuthResponse(BaseModel):
    user: UserResponse
