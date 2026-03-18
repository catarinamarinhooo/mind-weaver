from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean
from datetime import datetime
from app.db import Base
from sqlalchemy.orm import relationship


thought_topics = Table(
    "thought_topics",
    Base.metadata,
    Column("thought_id", Integer, ForeignKey("thoughts.id"), primary_key=True),
    Column("topic_id", Integer, ForeignKey("topics.id"), primary_key=True),
)


knowledge_item_topics = Table(
    "knowledge_item_topics",
    Base.metadata,
    Column(
        "knowledge_item_id",
        Integer,
        ForeignKey("knowledge_items.id"),
        primary_key=True,
    ),
    Column("topic_id", Integer, ForeignKey("topics.id"), primary_key=True),
)


business_idea_topics = Table(
    "business_idea_topics",
    Base.metadata,
    Column(
        "business_idea_id",
        Integer,
        ForeignKey("business_ideas.id"),
        primary_key=True,
    ),
    Column("topic_id", Integer, ForeignKey("topics.id"), primary_key=True),
)


work_idea_topics = Table(
    "work_idea_topics",
    Base.metadata,
    Column("work_idea_id", Integer, ForeignKey("work_ideas.id"), primary_key=True),
    Column("topic_id", Integer, ForeignKey("topics.id"), primary_key=True),
)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    thoughts = relationship("Thought", secondary=thought_topics, back_populates="topics")
    knowledge_items = relationship(
        "KnowledgeItem", secondary=knowledge_item_topics, back_populates="topics"
    )
    business_ideas = relationship(
        "BusinessIdea", secondary=business_idea_topics, back_populates="topics"
    )
    work_ideas = relationship(
        "WorkIdea", secondary=work_idea_topics, back_populates="topics"
    )


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(Text)
    source = Column(String)
    url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ItemTopic(Base):
    __tablename__ = "item_topics"

    item_id = Column(Integer, ForeignKey("items.id"), primary_key=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), primary_key=True)


class Thought(Base):
    __tablename__ = "thoughts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    link = Column(String, nullable=True)
    thought_type = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    topics = relationship("Topic", secondary=thought_topics, back_populates="thoughts")


class KnowledgeItem(Base):
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=True)
    url = Column(String, nullable=False)
    personal_note = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    attachments_json = Column(Text, nullable=True)
    media_links_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    topics = relationship(
        "Topic", secondary=knowledge_item_topics, back_populates="knowledge_items"
    )


class BusinessIdea(Base):
    __tablename__ = "business_ideas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    problem = Column(Text, nullable=True)
    audience = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    next_steps = Column(Text, nullable=True)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    topics = relationship(
        "Topic", secondary=business_idea_topics, back_populates="business_ideas"
    )


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    book_title = Column(String, nullable=False)
    book_type = Column(String, nullable=True)
    quote_text = Column(Text, nullable=False)
    page = Column(String, nullable=True)
    thoughts = Column(Text, nullable=True)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkIdea(Base):
    __tablename__ = "work_ideas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    goal = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    context = Column(Text, nullable=True)
    application_category = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    timeline = Column(String, nullable=True)
    execution_mode = Column(String, nullable=True)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    topics = relationship(
        "Topic", secondary=work_idea_topics, back_populates="work_ideas"
    )


class PersonalIdea(Base):
    __tablename__ = "personal_ideas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    goal = Column(Text, nullable=True)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    source_type = Column(String, nullable=False)
    source_id = Column(Integer, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=False)
    relationship_type = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    term = Column(String, nullable=False)
    definition = Column(Text, nullable=False)
    term_type = Column(String, nullable=True)
    aliases_json = Column(Text, nullable=True)
    tags_json = Column(Text, nullable=True)
    links_json = Column(Text, nullable=True)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    frequency = Column(String, nullable=False, default="daily")
    interval_days = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WatchlistSource(Base):
    __tablename__ = "watchlist_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    source_type = Column(String, nullable=True)
    rss_url = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DiscoveryItem(Base):
    __tablename__ = "discovery_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    source_id = Column(Integer, ForeignKey("watchlist_sources.id"), nullable=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    source_name = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)
    raw_guid = Column(String, nullable=True, unique=True)
    saved_to_library = Column(Boolean, default=False)
    saved_in_discovery = Column(Boolean, default=False)
    dismissed = Column(Boolean, default=False)
    assigned_topic = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIActionHistory(Base):
    __tablename__ = "ai_action_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    action_type = Column(String, nullable=False)
    source_entity_type = Column(String, nullable=False)
    source_entity_id = Column(Integer, nullable=False)
    target_entity_type = Column(String, nullable=True)
    target_entity_id = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    rolled_back_at = Column(DateTime, nullable=True)
    rollback_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    nickname = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_data_url = Column(Text, nullable=True)
    tone = Column(String, nullable=True)
    default_capture_type = Column(String, nullable=True)
    ai_name = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    language = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    workspace = relationship("Workspace", foreign_keys=[workspace_id], uselist=False)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
