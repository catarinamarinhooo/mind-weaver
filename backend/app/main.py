from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, status, Response, Cookie, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
import os
import json
import shutil
import uuid
import threading
import time
import hashlib
import hmac
import secrets
import socket
import mimetypes
import ipaddress
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from urllib.request import urlopen, Request as URLRequest
from xml.etree import ElementTree
from openai import OpenAI
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except Exception:
    YouTubeTranscriptApi = None

from app.schemas import (
    TopicCreate,
    TopicResponse,
    ThoughtCreate,
    ThoughtResponse,
    KnowledgeItemCreate,
    KnowledgeItemResponse,
    BusinessIdeaCreate,
    BusinessIdeaResponse,
    QuoteCreate,
    QuoteResponse,
    WorkIdeaCreate,
    WorkIdeaResponse,
    PersonalIdeaCreate,
    PersonalIdeaResponse,
    ConnectionCreate,
    ConnectionResponse,
    GlossaryTermCreate,
    GlossaryTermResponse,
    GlossaryAttachment,
    MediaLink,
    UploadResponse,
    WatchlistCreate,
    WatchlistUpdate,
    WatchlistResponse,
    WatchlistSourceCreate,
    WatchlistSourceResponse,
    DiscoveryItemResponse,
    DiscoveryItemUpdate,
    SourceSuggestionResponse,
    UserRegister,
    UserLogin,
    UserResponse,
    UserUpdate,
    AuthResponse,
    WorkspaceResponse,
    AdminUserCreate,
    AdminUserUpdate,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
    AISuggestedTopic,
    AISuggestedEntity,
    AISuggestionsResponse,
    AIChatMessage,
    AIChatRequest,
    AIChatCitation,
    AIChatResponse,
    AISummaryRequest,
    AISummaryResponse,
    AIDiscoveryTriageRequest,
    AIDiscoveryTriageResponse,
    AIMediaInsightsRequest,
    AIMediaInsightsResponse,
    AIApplyThoughtConversionRequest,
    AIApplyThoughtConversionResponse,
    AIApplyDiscoveryActionRequest,
    AIApplyDiscoveryActionResponse,
    AIActionHistoryResponse,
    AIActionRollbackResponse,
)
from app.db import engine, test_db, Base, SessionLocal, ensure_mvp_schema
import app.models as models

app = FastAPI()
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(BACKEND_DIR / "uploads")))
FRONTEND_DIST_DIR = PROJECT_ROOT / "dist"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SESSION_COOKIE_NAME = "cortexknows_session"
SESSION_COOKIE_SECURE = (
    os.getenv("SESSION_COOKIE_SECURE", "false").strip().lower() == "true"
)
SESSION_COOKIE_SAMESITE = "none" if SESSION_COOKIE_SECURE else "lax"
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
ADMIN_NICKNAME = os.getenv("ADMIN_NICKNAME", "Admin").strip() or "Admin"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini").strip() or "gpt-5-mini"
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
SESSION_TTL = timedelta(days=30)
RESET_TOKEN_TTL = timedelta(hours=1)
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
}
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg",
                             ".png", ".webp", ".gif", ".pdf", ".txt"}
SAFE_INLINE_CONTENT_TYPES = {"image/jpeg",
                             "image/png", "image/webp", "image/gif"}
RATE_LIMIT_STORAGE: dict[str, list[float]] = {}
AI_TIMEOUT_SECONDS = 20
AI_MAX_INPUT_CHARS = 4000
AI_MAX_OUTPUT_CHARS = 2500
AI_STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "your",
    "about",
    "have",
    "will",
    "been",
    "como",
    "para",
    "com",
    "uma",
    "mais",
    "isso",
    "este",
    "essa",
    "http",
    "https",
    "www",
}
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

allowed_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
ensure_mvp_schema()
app.state.scheduler_stop_event = threading.Event()
app.state.scheduler_thread = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str):
    try:
        salt, stored_digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return hmac.compare_digest(digest, stored_digest)


def create_session_token():
    return secrets.token_urlsafe(32)


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
        secure=SESSION_COOKIE_SECURE,
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
        secure=SESSION_COOKIE_SECURE,
        path="/",
    )


def hash_reset_token(token: str):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def enforce_rate_limit(key: str, limit: int, window_seconds: int):
    now = time.time()
    current = [entry for entry in RATE_LIMIT_STORAGE.get(
        key, []) if now - entry < window_seconds]
    if len(current) >= limit:
        raise HTTPException(
            status_code=429, detail="Too many requests. Please try again later.")
    current.append(now)
    RATE_LIMIT_STORAGE[key] = current


def ai_normalize_text(value: str):
    return (
        value.lower()
        .replace("á", "a")
        .replace("à", "a")
        .replace("ã", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )


def ai_tokenize(value: str):
    normalized = ai_normalize_text(value)
    for char in [".", ",", ";", ":", "!", "?", "(", ")", "[", "]", "{", "}", "/", "\\", "-", "_", "\"", "'"]:
        normalized = normalized.replace(char, " ")
    tokens = {
        token.strip()
        for token in normalized.split()
        if len(token.strip()) >= 3 and token.strip() not in AI_STOP_WORDS
    }
    return tokens


def get_thought_source_entity(thought: models.Thought):
    return {
        "entity_type": "thought",
        "entity_id": thought.id,
        "label": thought.title or (thought.content[:80] if thought.content else f"Thought {thought.id}"),
        "text": " ".join(
            value
            for value in [
                thought.title,
                thought.content,
                thought.summary,
                thought.link,
                thought.thought_type,
                thought.priority,
            ]
            if value
        ),
        "topics": thought.topics,
    }


def get_knowledge_source_entity(item: models.KnowledgeItem):
    media_link_text = " ".join(
        " ".join(
            value
            for value in [
                media_link.get("label"),
                media_link.get("url"),
                media_link.get("media_type"),
                media_link.get("notes"),
                media_link.get("ai_title"),
                media_link.get("ai_summary"),
                " ".join(media_link.get("ai_key_points", [])),
            ]
            if value
        )
        for media_link in parse_json_list(item.media_links_json)
    )
    return {
        "entity_type": "knowledge",
        "entity_id": item.id,
        "label": item.title or item.url,
        "text": " ".join(
            value
            for value in [
                item.title,
                item.url,
                item.description,
                item.personal_note,
                item.source,
                media_link_text,
            ]
            if value
        ),
        "topics": item.topics,
    }


def get_business_idea_source_entity(item: models.BusinessIdea):
    return {
        "entity_type": "business_idea",
        "entity_id": item.id,
        "label": item.title,
        "text": " ".join(
            value
            for value in [
                item.title,
                item.description,
                item.problem,
                item.audience,
                item.priority,
                item.next_steps,
            ]
            if value
        ),
        "topics": item.topics,
    }


def get_work_idea_source_entity(item: models.WorkIdea):
    return {
        "entity_type": "work_idea",
        "entity_id": item.id,
        "label": item.title,
        "text": " ".join(
            value
            for value in [
                item.title,
                item.goal,
                item.summary,
                item.context,
                item.application_category,
                item.priority,
                item.timeline,
                item.execution_mode,
            ]
            if value
        ),
        "topics": item.topics,
    }


def get_personal_idea_source_entity(item: models.PersonalIdea):
    return {
        "entity_type": "personal_idea",
        "entity_id": item.id,
        "label": item.title,
        "text": " ".join(
            value
            for value in [item.title, item.description, item.category, item.priority, item.goal]
            if value
        ),
        "topics": [],
    }


def get_quote_source_entity(item: models.Quote):
    return {
        "entity_type": "quote",
        "entity_id": item.id,
        "label": item.book_title,
        "text": " ".join(
            value
            for value in [item.book_title, item.book_type, item.quote_text, item.page, item.thoughts]
            if value
        ),
        "topics": [],
    }


def get_candidate_entities_for_ai(current_user: models.User, db: Session):
    thoughts = (
        db.query(models.Thought)
        .filter(models.Thought.user_id == current_user.id)
        .order_by(models.Thought.created_at.desc())
        .all()
    )
    knowledge_items = (
        db.query(models.KnowledgeItem)
        .filter(models.KnowledgeItem.user_id == current_user.id)
        .order_by(models.KnowledgeItem.created_at.desc())
        .all()
    )
    business_ideas = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.user_id == current_user.id)
        .order_by(models.BusinessIdea.created_at.desc())
        .all()
    )
    work_ideas = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.user_id == current_user.id)
        .order_by(models.WorkIdea.created_at.desc())
        .all()
    )
    personal_ideas = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.user_id == current_user.id)
        .order_by(models.PersonalIdea.created_at.desc())
        .all()
    )
    quotes = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id)
        .order_by(models.Quote.created_at.desc())
        .all()
    )
    topics = (
        db.query(models.Topic)
        .filter(models.Topic.user_id == current_user.id)
        .order_by(models.Topic.created_at.desc())
        .all()
    )

    candidates = [get_thought_source_entity(item) for item in thoughts]
    candidates.extend(get_knowledge_source_entity(item)
                      for item in knowledge_items)
    candidates.extend(get_business_idea_source_entity(item)
                      for item in business_ideas)
    candidates.extend(get_work_idea_source_entity(item) for item in work_ideas)
    candidates.extend(get_personal_idea_source_entity(item)
                      for item in personal_ideas)
    candidates.extend(get_quote_source_entity(item) for item in quotes)
    candidates.extend(
        {
            "entity_type": "topic",
            "entity_id": topic.id,
            "label": topic.name,
            "text": " ".join(value for value in [topic.name, topic.description] if value),
            "topics": [],
        }
        for topic in topics
    )
    return candidates, topics


def build_ai_suggestions(
    source_entity: dict,
    candidates: list[dict],
    topics: list[models.Topic],
    existing_connections: list[models.Connection],
):
    source_tokens = ai_tokenize(
        source_entity["label"] + " " + source_entity["text"])
    source_topic_names = {
        topic.name.lower() for topic in source_entity.get("topics", []) if getattr(topic, "name", None)
    }
    connected_pairs = {
        f"{connection.target_type}:{connection.target_id}"
        for connection in existing_connections
    }

    suggested_topics: list[AISuggestedTopic] = []
    for topic in topics:
        score = 0
        reasons: list[str] = []
        topic_name = topic.name.lower()
        if topic_name in source_topic_names:
            score += 8
            reasons.append("already appears in current topics")
        if topic_name in source_tokens:
            score += 6
            reasons.append("topic name appears directly in the text")
        topic_desc_tokens = ai_tokenize(
            " ".join(value for value in [topic.name, topic.description or ""] if value))
        overlap = sorted(source_tokens.intersection(topic_desc_tokens))
        if overlap:
            score += min(len(overlap), 3) * 2
            reasons.append(f"shared keywords: {', '.join(overlap[:3])}")
        if score > 0:
            suggested_topics.append(
                AISuggestedTopic(
                    topic_id=topic.id,
                    topic_name=topic.name,
                    score=score,
                    explanation="; ".join(reasons),
                )
            )

    suggested_topics.sort(
        key=lambda item: (-item.score, item.topic_name.lower()))

    related_entities: list[AISuggestedEntity] = []
    for candidate in candidates:
        if (
            candidate["entity_type"] == source_entity["entity_type"]
            and candidate["entity_id"] == source_entity["entity_id"]
        ):
            continue
        if f"{candidate['entity_type']}:{candidate['entity_id']}" in connected_pairs:
            continue

        score = 0
        reasons: list[str] = []
        candidate_tokens = ai_tokenize(
            candidate["label"] + " " + candidate["text"])
        overlap = sorted(source_tokens.intersection(candidate_tokens))
        if overlap:
            score += min(len(overlap), 4) * 2
            reasons.append(f"shared keywords: {', '.join(overlap[:4])}")

        candidate_topic_names = {
            topic.name.lower()
            for topic in candidate.get("topics", [])
            if getattr(topic, "name", None)
        }
        shared_topics = sorted(
            source_topic_names.intersection(candidate_topic_names))
        if shared_topics:
            score += len(shared_topics) * 4
            reasons.append(f"shared topics: {', '.join(shared_topics[:3])}")

        if candidate["entity_type"] == "topic" and candidate["label"].lower() in source_tokens:
            score += 5
            reasons.append("topic is mentioned directly in the source")

        if score > 0:
            related_entities.append(
                AISuggestedEntity(
                    entity_type=candidate["entity_type"],
                    entity_id=candidate["entity_id"],
                    label=candidate["label"],
                    score=score,
                    explanation="; ".join(reasons),
                )
            )

    related_entities.sort(key=lambda item: (-item.score, item.label.lower()))

    explanation_parts = []
    if suggested_topics:
        explanation_parts.append(
            f"Top topic signal: {suggested_topics[0].topic_name}"
        )
    if related_entities:
        explanation_parts.append(
            f"Strongest related entity: {related_entities[0].label}"
        )
    if not explanation_parts:
        explanation_parts.append(
            "Not enough signal yet. Add richer text, links, or topics.")

    return AISuggestionsResponse(
        entity_type=source_entity["entity_type"],
        entity_id=source_entity["entity_id"],
        explanation=" ".join(explanation_parts),
        suggested_topics=suggested_topics[:5],
        suggested_related_entities=related_entities[:5],
    )


def serialize_candidates_for_llm(candidates: list[dict], limit: int = 40):
    serialized = []
    for candidate in candidates[:limit]:
        serialized.append(
            {
                "entity_type": candidate["entity_type"],
                "entity_id": candidate["entity_id"],
                "label": candidate["label"],
                "text": candidate["text"][:600],
                "topics": [
                    topic.name for topic in candidate.get("topics", []) if getattr(topic, "name", None)
                ],
            }
        )
    return serialized


def sanitize_ai_text(value: str | None, max_length: int = AI_MAX_OUTPUT_CHARS):
    if not value:
        return ""
    sanitized = "".join(
        char for char in str(value) if char.isprintable() or char in {"\n", "\t"}
    )
    sanitized = sanitized.replace("\r", "").strip()
    return sanitized[:max_length]


def clamp_ai_input(value: str | None, max_length: int = AI_MAX_INPUT_CHARS):
    return sanitize_ai_text(value or "", max_length=max_length)


def enforce_ai_access(
    current_user: models.User,
    request: FastAPIRequest,
    action: str,
    payload_size: int = 1,
):
    request_host = request.client.host if request.client else "unknown"
    enforce_rate_limit(f"ai-ip:{action}:{request_host}", 40, 300)
    enforce_rate_limit(f"ai-user:{action}:{current_user.id}", 30, 300)
    if payload_size > AI_MAX_INPUT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"AI input is too large. Maximum size is {AI_MAX_INPUT_CHARS} characters.",
        )


def call_openai_json(system_prompt: str, user_payload: dict):
    if not openai_client:
        return None

    response = openai_client.responses.create(
        model=OPENAI_MODEL,
        timeout=AI_TIMEOUT_SECONDS,
        input=[
            {"role": "system", "content": sanitize_ai_text(
                system_prompt, 4000)},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
    )
    raw_text = getattr(response, "output_text", "") or ""
    return json.loads(raw_text)


def get_entity_path(entity_type: str, entity_id: int):
    normalized = sanitize_ai_text(entity_type, 40)
    if normalized == "thought":
        return f"/thoughts/{entity_id}"
    if normalized == "knowledge":
        return f"/library/{entity_id}"
    if normalized == "business_idea":
        return "/business-ideas"
    if normalized == "work_idea":
        return "/work-ideas"
    if normalized == "personal_idea":
        return "/personal-ideas"
    if normalized == "quote":
        return "/quotes"
    if normalized == "topic":
        return "/topics"
    if normalized == "glossary_term":
        return "/glossary"
    return "/"


def log_ai_action(
    db: Session,
    current_user: models.User,
    action_type: str,
    source_entity_type: str,
    source_entity_id: int,
    target_entity_type: str | None = None,
    target_entity_id: int | None = None,
    summary: str | None = None,
    details: str | None = None,
):
    entry = models.AIActionHistory(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        action_type=sanitize_ai_text(action_type, 80),
        source_entity_type=sanitize_ai_text(source_entity_type, 40),
        source_entity_id=source_entity_id,
        target_entity_type=sanitize_ai_text(target_entity_type, 40) or None,
        target_entity_id=target_entity_id,
        summary=sanitize_ai_text(summary, 300) or None,
        details=sanitize_ai_text(details, 2000) or None,
    )
    db.add(entry)
    return entry


def fallback_conversion_next_steps(
    thought: models.Thought, target_type: str
):
    title = thought.title or f"Thought {thought.id}"
    if target_type == "business":
        return "\n".join(
            [
                f"Clarify the problem this idea solves based on '{title}'.",
                "Define the target user or customer segment.",
                "List one fast validation experiment for this week.",
            ]
        )
    if target_type == "work":
        return "\n".join(
            [
                f"Define the concrete work outcome for '{title}'.",
                "Break it into 2 or 3 execution steps.",
                "Set a simple owner, timeline, and first checkpoint.",
            ]
        )
    return "\n".join(
        [
            f"Write why '{title}' matters to you personally.",
            "Define one small next action you can do this week.",
            "Describe what success would look like after the first step.",
        ]
    )


def generate_conversion_next_steps(
    thought: models.Thought, target_type: str
):
    fallback_text = fallback_conversion_next_steps(thought, target_type)
    if not openai_client:
        return fallback_text

    system_prompt = """
You create practical next steps for converting a thought into a structured idea.
Use only the provided thought content.
Return only valid JSON:
{"next_steps": string}
Make the next steps concrete, short, and actionable.
""".strip()

    try:
        parsed = call_openai_json(
            system_prompt,
            {
                "target_type": sanitize_ai_text(target_type, 40),
                "thought": {
                    "title": clamp_ai_input(thought.title, 200),
                    "content": clamp_ai_input(thought.content, 1800),
                    "summary": clamp_ai_input(thought.summary, 800),
                    "thought_type": clamp_ai_input(thought.thought_type, 120),
                    "priority": clamp_ai_input(thought.priority, 40),
                    "topics": [topic.name for topic in thought.topics],
                },
            },
        )
        if not parsed:
            return fallback_text
        return sanitize_ai_text(str(parsed.get("next_steps") or fallback_text), 1200)
    except Exception:
        return fallback_text


def build_workspace_ai_context(current_user: models.User, db: Session):
    thoughts = (
        db.query(models.Thought)
        .filter(models.Thought.user_id == current_user.id)
        .order_by(models.Thought.created_at.desc())
        .all()
    )
    knowledge_items = (
        db.query(models.KnowledgeItem)
        .filter(models.KnowledgeItem.user_id == current_user.id)
        .order_by(models.KnowledgeItem.created_at.desc())
        .all()
    )
    business_ideas = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.user_id == current_user.id)
        .order_by(models.BusinessIdea.created_at.desc())
        .all()
    )
    work_ideas = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.user_id == current_user.id)
        .order_by(models.WorkIdea.created_at.desc())
        .all()
    )
    personal_ideas = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.user_id == current_user.id)
        .order_by(models.PersonalIdea.created_at.desc())
        .all()
    )
    quotes = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id)
        .order_by(models.Quote.created_at.desc())
        .all()
    )
    glossary_terms = (
        db.query(models.GlossaryTerm)
        .filter(models.GlossaryTerm.user_id == current_user.id)
        .order_by(models.GlossaryTerm.created_at.desc())
        .all()
    )
    topics = (
        db.query(models.Topic)
        .filter(models.Topic.user_id == current_user.id)
        .order_by(models.Topic.created_at.desc())
        .all()
    )
    discovery_items = (
        db.query(models.DiscoveryItem)
        .filter(models.DiscoveryItem.user_id == current_user.id)
        .order_by(models.DiscoveryItem.created_at.desc())
        .all()
    )

    entities = [
        *[
            {
                "entity_type": "thought",
                "entity_id": item.id,
                "label": item.title or item.content[:80],
                "text": " ".join(
                    value
                    for value in [item.title, item.content, item.summary, item.link]
                    if value
                ),
            }
            for item in thoughts
        ],
        *[
            {
                "entity_type": "knowledge",
                "entity_id": item.id,
                "label": item.title or item.url,
                "text": " ".join(
                    value
                    for value in [
                        item.title,
                        item.url,
                        item.description,
                        item.personal_note,
                        item.source,
                        " ".join(
                            " ".join(
                                value
                                for value in [
                                    media_link.get("label"),
                                    media_link.get("url"),
                                    media_link.get("media_type"),
                                    media_link.get("notes"),
                                    media_link.get("ai_title"),
                                    media_link.get("ai_summary"),
                                    " ".join(media_link.get(
                                        "ai_key_points", [])),
                                ]
                                if value
                            )
                            for media_link in parse_json_list(item.media_links_json)
                        ),
                    ]
                    if value
                ),
            }
            for item in knowledge_items
        ],
        *[
            {
                "entity_type": "knowledge_media",
                "entity_id": item.id,
                "label": sanitize_ai_text(str(media_link.get("label") or item.title or item.url), 200),
                "text": " ".join(
                    value
                    for value in [
                        item.title,
                        item.url,
                        media_link.get("label"),
                        media_link.get("url"),
                        media_link.get("media_type"),
                        media_link.get("notes"),
                        media_link.get("ai_title"),
                        media_link.get("ai_summary"),
                        " ".join(media_link.get("ai_key_points", [])),
                    ]
                    if value
                ),
                "url": sanitize_ai_text(str(media_link.get("url") or ""), 500),
                "parent_entity_type": "knowledge",
                "parent_entity_id": item.id,
                "parent_label": item.title or item.url,
            }
            for item in knowledge_items
            for media_link in parse_json_list(item.media_links_json)
            if any(
                media_link.get(field)
                for field in ["notes", "ai_title", "ai_summary", "ai_key_points"]
            )
        ],
        *[
            {
                "entity_type": "business_idea",
                "entity_id": item.id,
                "label": item.title,
                "text": " ".join(
                    value
                    for value in [
                        item.title,
                        item.description,
                        item.problem,
                        item.audience,
                        item.next_steps,
                    ]
                    if value
                ),
            }
            for item in business_ideas
        ],
        *[
            {
                "entity_type": "work_idea",
                "entity_id": item.id,
                "label": item.title,
                "text": " ".join(
                    value
                    for value in [
                        item.title,
                        item.goal,
                        item.summary,
                        item.context,
                        item.application_category,
                    ]
                    if value
                ),
            }
            for item in work_ideas
        ],
        *[
            {
                "entity_type": "personal_idea",
                "entity_id": item.id,
                "label": item.title,
                "text": " ".join(
                    value
                    for value in [item.title, item.description, item.category, item.goal]
                    if value
                ),
            }
            for item in personal_ideas
        ],
        *[
            {
                "entity_type": "quote",
                "entity_id": item.id,
                "label": item.book_title,
                "text": " ".join(
                    value
                    for value in [item.book_title, item.book_type, item.quote_text, item.page, item.thoughts]
                    if value
                ),
            }
            for item in quotes
        ],
        *[
            {
                "entity_type": "glossary_term",
                "entity_id": item.id,
                "label": item.term,
                "text": " ".join(
                    [item.term, item.definition, item.term_type or ""]
                    + json.loads(item.aliases_json or "[]")
                    + json.loads(item.tags_json or "[]")
                ),
            }
            for item in glossary_terms
        ],
        *[
            {
                "entity_type": "topic",
                "entity_id": item.id,
                "label": item.name,
                "text": " ".join(value for value in [item.name, item.description] if value),
            }
            for item in topics
        ],
    ]

    return {
        "entities": entities,
        "topics": topics,
        "discovery_items": discovery_items,
    }


def rank_relevant_entities(question: str, entities: list[dict], limit: int = 8):
    question_tokens = ai_tokenize(question)
    scored = []
    for entity in entities:
        entity_tokens = ai_tokenize(f"{entity['label']} {entity['text']}")
        overlap = sorted(question_tokens.intersection(entity_tokens))
        score = len(overlap)
        if score > 0:
            scored.append((score, overlap, entity))
    scored.sort(key=lambda item: (-item[0], item[2]["label"].lower()))
    return scored[:limit]


def fallback_chat_answer(message: str, entities: list[dict]):
    ranked = rank_relevant_entities(message, entities, limit=5)
    if not ranked:
        return AIChatResponse(
            answer="I could not find strong matches yet. Try asking about a specific topic, thought, idea, or knowledge item already saved in your workspace.",
            citations=[],
        )

    lines = ["Here are the most relevant matches I found in your workspace:"]
    citations: list[AIChatCitation] = []
    for score, overlap, entity in ranked:
        lines.append(
            f"- {entity['label']} ({entity['entity_type'].replace('_', ' ')}): matched on {', '.join(overlap[:4])}"
        )
        citations.append(
            AIChatCitation(
                entity_type=entity["entity_type"],
                entity_id=entity["entity_id"],
                label=entity["label"],
                score=score,
                url=sanitize_ai_text(entity.get("url"), 500) or None,
                parent_entity_type=sanitize_ai_text(
                    entity.get("parent_entity_type"), 40) or None,
                parent_entity_id=entity.get("parent_entity_id"),
                parent_label=sanitize_ai_text(
                    entity.get("parent_label"), 160) or None,
            )
        )

    return AIChatResponse(
        answer=sanitize_ai_text("\n".join(lines)),
        citations=citations,
    )


def get_entity_for_summary(entity_type: str, entity_id: int, current_user: models.User, db: Session):
    normalized_type = entity_type.strip().lower()
    if normalized_type == "thought":
        item = (
            db.query(models.Thought)
            .filter(models.Thought.id == entity_id, models.Thought.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Thought not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.title or f"Thought {item.id}",
            "text": " ".join(value for value in [item.title, item.content, item.summary] if value),
        }
    if normalized_type == "knowledge":
        item = (
            db.query(models.KnowledgeItem)
            .filter(models.KnowledgeItem.id == entity_id, models.KnowledgeItem.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(
                status_code=404, detail="Knowledge item not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.title or item.url,
            "text": " ".join(
                value
                for value in [
                    item.title,
                    item.description,
                    item.personal_note,
                    item.url,
                    " ".join(
                        " ".join(
                            link_value
                            for link_value in [
                                media_link.get("label"),
                                media_link.get("url"),
                                media_link.get("media_type"),
                                media_link.get("notes"),
                                media_link.get("ai_title"),
                                media_link.get("ai_summary"),
                                " ".join(media_link.get("ai_key_points", [])),
                            ]
                            if link_value
                        )
                        for media_link in parse_json_list(item.media_links_json)
                    ),
                ]
                if value
            ),
        }
    if normalized_type == "business_idea":
        item = (
            db.query(models.BusinessIdea)
            .filter(models.BusinessIdea.id == entity_id, models.BusinessIdea.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(
                status_code=404, detail="Business idea not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.title,
            "text": " ".join(
                value
                for value in [item.title, item.description, item.problem, item.audience, item.next_steps]
                if value
            ),
        }
    if normalized_type == "work_idea":
        item = (
            db.query(models.WorkIdea)
            .filter(models.WorkIdea.id == entity_id, models.WorkIdea.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Work idea not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.title,
            "text": " ".join(
                value
                for value in [
                    item.title,
                    item.goal,
                    item.summary,
                    item.context,
                    item.application_category,
                    item.timeline,
                    item.execution_mode,
                ]
                if value
            ),
        }
    if normalized_type == "personal_idea":
        item = (
            db.query(models.PersonalIdea)
            .filter(models.PersonalIdea.id == entity_id, models.PersonalIdea.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(
                status_code=404, detail="Personal idea not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.title,
            "text": " ".join(
                value for value in [item.title, item.description, item.category, item.goal] if value
            ),
        }
    if normalized_type == "quote":
        item = (
            db.query(models.Quote)
            .filter(models.Quote.id == entity_id, models.Quote.user_id == current_user.id)
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Quote not found")
        return {
            "entity_type": normalized_type,
            "entity_id": item.id,
            "title": item.book_title,
            "text": " ".join(
                value for value in [item.book_title, item.book_type, item.quote_text, item.page, item.thoughts] if value
            ),
        }
    raise HTTPException(
        status_code=400,
        detail="Summaries currently support thought, knowledge, business idea, work idea, personal idea, and quote.",
    )


def fallback_summary(entity: dict):
    text = entity["text"].strip()
    if not text:
        summary = "There is not enough content to summarize yet."
    else:
        summary = text[:320]
        if len(text) > 320:
            summary += "..."
    return AISummaryResponse(
        entity_type=entity["entity_type"],
        entity_id=entity["entity_id"],
        title=entity["title"],
        summary=sanitize_ai_text(summary, 600),
    )


def fallback_discovery_triage(discovery_item: models.DiscoveryItem, topics: list[models.Topic]):
    text = " ".join(
        value
        for value in [
            discovery_item.title,
            discovery_item.summary,
            discovery_item.topic,
            discovery_item.assigned_topic,
        ]
        if value
    )
    item_tokens = ai_tokenize(text)
    scored_topic = None
    best_score = 0
    for topic in topics:
        topic_tokens = ai_tokenize(
            " ".join(value for value in [topic.name, topic.description or ""] if value))
        score = len(item_tokens.intersection(topic_tokens))
        if score > best_score:
            best_score = score
            scored_topic = topic.name

    relevance_score = min(10, max(1, 3 + best_score * 2))
    if relevance_score >= 8:
        action = "save_to_library"
    elif relevance_score >= 5:
        action = "save_in_discovery"
    else:
        action = "dismiss"

    return AIDiscoveryTriageResponse(
        discovery_item_id=discovery_item.id,
        relevance_score=relevance_score,
        recommended_action=action,
        suggested_topic=scored_topic,
        explanation=sanitize_ai_text(
            f"Matched against your workspace topics with score {best_score}. Recommended action: {action.replace('_', ' ')}.",
            400,
        ),
    )


def call_llm_ai_suggestions(
    source_entity: dict,
    candidates: list[dict],
    topics: list[models.Topic],
    heuristic_result: AISuggestionsResponse,
):
    if not openai_client:
        return heuristic_result

    available_topics = [
        {"topic_id": topic.id, "topic_name": topic.name,
            "description": topic.description or ""}
        for topic in topics
    ]
    prompt_payload = {
        "source_entity": {
            "entity_type": source_entity["entity_type"],
            "entity_id": source_entity["entity_id"],
            "label": source_entity["label"],
            "text": source_entity["text"][:2000],
            "topics": [
                topic.name for topic in source_entity.get("topics", []) if getattr(topic, "name", None)
            ],
        },
        "available_topics": available_topics,
        "candidate_entities": serialize_candidates_for_llm(candidates),
        "heuristic_baseline": {
            "explanation": heuristic_result.explanation,
            "suggested_topics": [item.model_dump() for item in heuristic_result.suggested_topics],
            "suggested_related_entities": [
                item.model_dump() for item in heuristic_result.suggested_related_entities
            ],
        },
    }

    system_prompt = """
You are helping a knowledge system suggest meaningful relations.
Return only valid JSON with this exact shape:
{
  "explanation": string,
  "suggested_topics": [
    {"topic_id": number, "topic_name": string, "score": number, "explanation": string}
  ],
  "suggested_related_entities": [
    {"entity_type": string, "entity_id": number, "label": string, "score": number, "explanation": string}
  ]
}

Rules:
- Use only topics from available_topics.
- Use only related entities from candidate_entities.
- Keep scores between 1 and 10.
- Prefer high precision over quantity.
- Return at most 5 suggested_topics and 5 suggested_related_entities.
""".strip()

    parsed = call_openai_json(system_prompt, prompt_payload)
    if not parsed:
        return heuristic_result
    return AISuggestionsResponse(
        entity_type=source_entity["entity_type"],
        entity_id=source_entity["entity_id"],
        explanation=sanitize_ai_text(
            str(parsed.get("explanation") or heuristic_result.explanation), 500),
        suggested_topics=[
            AISuggestedTopic(
                topic_id=int(item["topic_id"]),
                topic_name=sanitize_ai_text(str(item["topic_name"]), 120),
                score=max(1, min(10, int(item["score"]))),
                explanation=sanitize_ai_text(str(item["explanation"]), 300),
            )
            for item in parsed.get("suggested_topics", [])[:5]
        ],
        suggested_related_entities=[
            AISuggestedEntity(
                entity_type=str(item["entity_type"]),
                entity_id=int(item["entity_id"]),
                label=sanitize_ai_text(str(item["label"]), 160),
                score=max(1, min(10, int(item["score"]))),
                explanation=sanitize_ai_text(str(item["explanation"]), 300),
            )
            for item in parsed.get("suggested_related_entities", [])[:5]
        ],
    )


def get_session_token_from_request(
    authorization: str | None,
    session_cookie: str | None,
):
    if authorization and authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "", 1).strip()
    if session_cookie:
        return session_cookie.strip()
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


def serialize_user(user: models.User):
    workspace = None
    if user.workspace_id:
        workspace = WorkspaceResponse(
            id=user.workspace.id if hasattr(
                user, "workspace") and user.workspace else user.workspace_id,
            name=user.workspace.name if hasattr(
                user, "workspace") and user.workspace else "Workspace",
            slug=user.workspace.slug if hasattr(
                user, "workspace") and user.workspace else "workspace",
            created_at=user.workspace.created_at if hasattr(
                user, "workspace") and user.workspace else user.created_at,
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        workspace_id=user.workspace_id,
        is_admin=bool(user.is_admin),
        is_active=bool(user.is_active),
        nickname=user.nickname,
        full_name=user.full_name,
        avatar_data_url=user.avatar_data_url,
        tone=user.tone,
        default_capture_type=user.default_capture_type,
        ai_name=user.ai_name,
        timezone=user.timezone,
        language=user.language,
        workspace=workspace,
        created_at=user.created_at,
    )


def slugify_workspace_name(value: str):
    base = "-".join(value.strip().lower().split()) or "workspace"
    return f"{base}-{uuid.uuid4().hex[:8]}"


def get_current_user(
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(
        default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = get_session_token_from_request(authorization, session_cookie)
    session = db.query(models.Session).filter(
        models.Session.token == token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    if session.created_at and session.created_at < datetime.utcnow() - SESSION_TTL:
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    user = db.query(models.User).filter(
        models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for this session",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )
    return user


def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403, detail="Administrator access required")
    return current_user


def get_current_session(
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(
        default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = get_session_token_from_request(authorization, session_cookie)
    session = db.query(models.Session).filter(
        models.Session.token == token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )
    if session.created_at and session.created_at < datetime.utcnow() - SESSION_TTL:
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )
    return session


def ensure_admin_user():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        return

    db = SessionLocal()
    try:
        existing_admin = (
            db.query(models.User)
            .filter(models.User.email == ADMIN_EMAIL)
            .first()
        )
        if existing_admin:
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
            if not existing_admin.is_active:
                existing_admin.is_active = True
            db.commit()
            return

        workspace = models.Workspace(
            name="CortexKnows Admin Workspace",
            slug=slugify_workspace_name("cortexknows admin"),
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

        admin_user = models.User(
            email=ADMIN_EMAIL,
            workspace_id=workspace.id,
            password_hash=hash_password(ADMIN_PASSWORD),
            is_admin=True,
            is_active=True,
            nickname=ADMIN_NICKNAME,
            full_name=ADMIN_NICKNAME,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        workspace.owner_user_id = admin_user.id
        db.commit()
    finally:
        db.close()


def serialize_topic(topic: models.Topic):
    thought_count = len(topic.thoughts)
    knowledge_item_count = len(topic.knowledge_items)
    business_idea_count = len(topic.business_ideas)
    work_idea_count = len(topic.work_ideas)
    return TopicResponse(
        id=topic.id,
        name=topic.name,
        description=topic.description,
        created_at=topic.created_at,
        thought_count=thought_count,
        knowledge_item_count=knowledge_item_count,
        total_count=thought_count + knowledge_item_count +
        business_idea_count + work_idea_count,
    )


def serialize_thought(thought: models.Thought):
    return ThoughtResponse(
        id=thought.id,
        title=thought.title,
        content=thought.content,
        summary=thought.summary,
        link=thought.link,
        thought_type=thought.thought_type,
        priority=thought.priority,
        topics=[serialize_topic(topic) for topic in thought.topics],
        created_at=thought.created_at,
    )


def serialize_knowledge_item(item: models.KnowledgeItem):
    return KnowledgeItemResponse(
        id=item.id,
        title=item.title,
        url=item.url,
        personal_note=item.personal_note,
        source=item.source,
        description=item.description,
        topics=[serialize_topic(topic) for topic in item.topics],
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        media_links=[
            MediaLink(**media_link)
            for media_link in parse_json_list(item.media_links_json)
        ],
        created_at=item.created_at,
    )


def serialize_business_idea(item: models.BusinessIdea):
    return BusinessIdeaResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        problem=item.problem,
        audience=item.audience,
        priority=item.priority,
        next_steps=item.next_steps,
        topics=[serialize_topic(topic) for topic in item.topics],
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


def serialize_quote(item: models.Quote):
    return QuoteResponse(
        id=item.id,
        book_title=item.book_title,
        book_type=item.book_type,
        quote_text=item.quote_text,
        page=item.page,
        thoughts=item.thoughts,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


def serialize_work_idea(item: models.WorkIdea):
    return WorkIdeaResponse(
        id=item.id,
        title=item.title,
        goal=item.goal,
        summary=item.summary,
        context=item.context,
        application_category=item.application_category,
        priority=item.priority,
        timeline=item.timeline,
        execution_mode=item.execution_mode,
        topics=[serialize_topic(topic) for topic in item.topics],
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


def get_topics_by_ids(db: Session, topic_ids: list[int], user_id: int | None = None):
    if not topic_ids:
        return []

    query = db.query(models.Topic).filter(models.Topic.id.in_(topic_ids))
    if user_id is not None:
        query = query.filter(models.Topic.user_id == user_id)
    return query.all()


def get_entity_label(db: Session, entity_type: str, entity_id: int):
    return get_entity_label_for_user(db, entity_type, entity_id, None)


def get_entity_label_for_user(
    db: Session,
    entity_type: str,
    entity_id: int,
    user_id: int | None,
):
    model_map = {
        "thought": models.Thought,
        "knowledge": models.KnowledgeItem,
        "business_idea": models.BusinessIdea,
        "work_idea": models.WorkIdea,
        "personal_idea": models.PersonalIdea,
        "quote": models.Quote,
        "topic": models.Topic,
        "glossary_term": models.GlossaryTerm,
    }

    model = model_map.get(entity_type)
    if not model:
        return f"{entity_type}:{entity_id}"

    query = db.query(model).filter(model.id == entity_id)
    if user_id is not None and hasattr(model, "user_id"):
        query = query.filter(model.user_id == user_id)
    item = query.first()
    if not item:
        return f"{entity_type}:{entity_id}"

    if entity_type == "thought":
        return item.title or item.content[:60]
    if entity_type == "knowledge":
        return item.title or item.url
    if entity_type == "business_idea":
        return item.title
    if entity_type == "work_idea":
        return item.title
    if entity_type == "personal_idea":
        return item.title
    if entity_type == "quote":
        return item.book_title
    if entity_type == "topic":
        return item.name
    if entity_type == "glossary_term":
        return item.term

    return f"{entity_type}:{entity_id}"


def ensure_entity_owned_by_user(
    db: Session,
    entity_type: str,
    entity_id: int,
    user_id: int,
):
    label = get_entity_label_for_user(db, entity_type, entity_id, user_id)
    if label == f"{entity_type}:{entity_id}":
        raise HTTPException(
            status_code=400, detail=f"Invalid or inaccessible {entity_type} target")
    return label


def serialize_connection(db: Session, connection: models.Connection):
    return ConnectionResponse(
        id=connection.id,
        source_type=connection.source_type,
        source_id=connection.source_id,
        source_label=get_entity_label_for_user(
            db, connection.source_type, connection.source_id, connection.user_id
        ),
        target_type=connection.target_type,
        target_id=connection.target_id,
        target_label=get_entity_label_for_user(
            db, connection.target_type, connection.target_id, connection.user_id
        ),
        relationship_type=connection.relationship_type,
        notes=connection.notes,
        created_at=connection.created_at,
    )


def parse_json_list(raw_value: str | None):
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def serialize_glossary_term(term: models.GlossaryTerm):
    return GlossaryTermResponse(
        id=term.id,
        term=term.term,
        definition=term.definition,
        term_type=term.term_type,
        aliases=parse_json_list(term.aliases_json),
        tags=parse_json_list(term.tags_json),
        links=parse_json_list(term.links_json),
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(term.attachments_json)
        ],
        created_at=term.created_at,
    )


def serialize_watchlist_source(source: models.WatchlistSource):
    return WatchlistSourceResponse(
        id=source.id,
        watchlist_id=source.watchlist_id,
        name=source.name,
        url=source.url,
        source_type=source.source_type,
        rss_url=source.rss_url,
        active=source.active,
        created_at=source.created_at,
    )


def serialize_watchlist(
    watchlist: models.Watchlist, sources: list[models.WatchlistSource]
):
    return WatchlistResponse(
        id=watchlist.id,
        name=watchlist.name,
        topic=watchlist.topic,
        frequency=watchlist.frequency,
        interval_days=watchlist.interval_days,
        description=watchlist.description,
        last_checked_at=watchlist.last_checked_at,
        created_at=watchlist.created_at,
        sources=[serialize_watchlist_source(source) for source in sources],
    )


def serialize_discovery_item(item: models.DiscoveryItem):
    return DiscoveryItemResponse(
        id=item.id,
        watchlist_id=item.watchlist_id,
        source_id=item.source_id,
        title=item.title,
        summary=item.summary,
        url=item.url,
        topic=item.topic,
        source_name=item.source_name,
        published_at=item.published_at,
        saved_to_library=item.saved_to_library,
        saved_in_discovery=item.saved_in_discovery,
        dismissed=item.dismissed,
        assigned_topic=item.assigned_topic,
        created_at=item.created_at,
    )


def parse_rss_or_atom(feed_url: str):
    request = URLRequest(feed_url, headers={"User-Agent": "CortexKnows/1.0"})
    with urlopen(request, timeout=15) as response:
        raw = response.read()

    root = ElementTree.fromstring(raw)
    items = []

    if root.tag.endswith("rss") or root.find("channel") is not None:
        channel = root.find("channel")
        if channel is None:
            return []
        for item in channel.findall("item"):
            items.append(
                {
                    "title": (item.findtext("title") or "").strip(),
                    "summary": (item.findtext("description") or "").strip(),
                    "url": (item.findtext("link") or "").strip(),
                    "guid": (item.findtext("guid") or item.findtext("link") or "").strip(),
                    "published_at": (item.findtext("pubDate") or "").strip(),
                }
            )
        return items

    namespace = {"atom": "http://www.w3.org/2005/Atom"}
    for entry in root.findall("atom:entry", namespace):
        link_node = entry.find("atom:link", namespace)
        items.append(
            {
                "title": (entry.findtext("atom:title", default="", namespaces=namespace) or "").strip(),
                "summary": (
                    entry.findtext("atom:summary", default="",
                                   namespaces=namespace)
                    or entry.findtext("atom:content", default="", namespaces=namespace)
                    or ""
                ).strip(),
                "url": (link_node.attrib.get("href") if link_node is not None else "").strip(),
                "guid": (
                    entry.findtext("atom:id", default="", namespaces=namespace)
                    or (link_node.attrib.get("href") if link_node is not None else "")
                ).strip(),
                "published_at": (
                    entry.findtext("atom:updated", default="",
                                   namespaces=namespace)
                    or entry.findtext("atom:published", default="", namespaces=namespace)
                    or ""
                ).strip(),
            }
        )
    return items


def validate_outbound_url(raw_url: str):
    try:
        parsed = urlparse(raw_url.strip())
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail="Invalid URL format") from exc

    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(
            status_code=400, detail="Only http and https URLs are allowed")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL hostname is required")

    normalized_host = hostname.strip().lower()
    if normalized_host in {"localhost"} or normalized_host.endswith(".local"):
        raise HTTPException(
            status_code=400, detail="Local network URLs are not allowed")

    try:
        addr_info = socket.getaddrinfo(
            normalized_host, parsed.port or None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise HTTPException(
            status_code=400, detail="Could not resolve URL hostname") from exc

    for entry in addr_info:
        ip_text = entry[4][0]
        ip_obj = ipaddress.ip_address(ip_text)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            raise HTTPException(
                status_code=400, detail="Private or unsafe network targets are not allowed")

    return raw_url.strip()


def extract_youtube_video_id(raw_url: str):
    parsed = urlparse(raw_url)
    hostname = (parsed.hostname or "").lower()
    if hostname in {"youtu.be"}:
        video_id = parsed.path.strip("/")
        return video_id or None
    if "youtube.com" in hostname:
        if parsed.path == "/watch":
            query = parsed.query or ""
            for part in query.split("&"):
                if part.startswith("v="):
                    return part.split("=", 1)[1] or None
        if parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/"):
            parts = [part for part in parsed.path.split("/") if part]
            return parts[-1] if parts else None
    return None


def strip_html_to_text(raw_html: str):
    text = re.sub(r"<script.*?>.*?</script>", " ",
                  raw_html, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<style.*?>.*?</style>", " ", text,
                  flags=re.IGNORECASE | re.DOTALL)
    title_match = re.search(
        r"<title[^>]*>(.*?)</title>", raw_html, flags=re.IGNORECASE | re.DOTALL)
    meta_description_match = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']',
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    ) or re.search(
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\'](.*?)["\']',
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    body_text = re.sub(r"<[^>]+>", " ", text)
    body_text = re.sub(r"\s+", " ", body_text).strip()
    title = sanitize_ai_text(title_match.group(1) if title_match else "", 200)
    description = sanitize_ai_text(
        meta_description_match.group(1) if meta_description_match else "",
        1000,
    )
    return title, description, sanitize_ai_text(body_text, 6000)


def fetch_remote_page_preview(raw_url: str):
    validated_url = validate_outbound_url(raw_url)
    request = URLRequest(
        validated_url,
        headers={"User-Agent": "CortexKnows/1.0",
                 "Accept": "text/html,application/xhtml+xml"},
    )
    with urlopen(request, timeout=15) as response:
        content_type = (response.headers.get("Content-Type") or "").lower()
        if "text/html" not in content_type and "xml" not in content_type and "text/plain" not in content_type:
            return "", "", ""
        raw = response.read(200_000)
        decoded = raw.decode("utf-8", errors="ignore")
    return strip_html_to_text(decoded)


def fetch_youtube_transcript(raw_url: str):
    if not YouTubeTranscriptApi:
        return "", False
    video_id = extract_youtube_video_id(raw_url)
    if not video_id:
        return "", False
    try:
        transcript_items = YouTubeTranscriptApi.get_transcript(
            video_id, languages=["en", "en-US", "pt", "pt-PT"])
        transcript_text = " ".join(item.get("text", "")
                                   for item in transcript_items)
        return sanitize_ai_text(transcript_text, 12000), True
    except Exception:
        return "", False


def fallback_media_insights(title: str, label: str, media_type: str | None, transcript_text: str, page_text: str, notes: str):
    source_text = transcript_text or page_text or notes or label or title
    clean_source = sanitize_ai_text(source_text, 2500)
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", clean_source)
        if sentence.strip()
    ]
    summary = " ".join(sentences[:3]).strip(
    ) or "Not enough source material yet. Add notes to improve the AI summary."
    key_points = sentences[:4] if sentences else []
    resolved_title = title or label or "Media insight"
    return {
        "title": sanitize_ai_text(resolved_title, 200),
        "summary": sanitize_ai_text(summary, 1200),
        "key_points": [sanitize_ai_text(item, 280) for item in key_points[:4]],
        "transcript_used": bool(transcript_text),
        "source_kind": "transcript" if transcript_text else ("page" if page_text else "notes"),
    }


def generate_media_insights(label: str, media_url: str, media_type: str | None, notes: str | None):
    safe_url = validate_outbound_url(media_url)
    transcript_text = ""
    transcript_used = False
    if (media_type or "").lower() == "youtube" or "youtube.com" in safe_url or "youtu.be" in safe_url:
        transcript_text, transcript_used = fetch_youtube_transcript(safe_url)

    page_title, page_description, page_text = fetch_remote_page_preview(
        safe_url)
    prompt_payload = {
        "label": sanitize_ai_text(label, 160),
        "media_url": safe_url,
        "media_type": sanitize_ai_text(media_type or "", 40),
        "notes": sanitize_ai_text(notes or "", 1200),
        "page_title": page_title,
        "page_description": page_description,
        "page_text": sanitize_ai_text(page_text, 5000),
        "transcript_text": sanitize_ai_text(transcript_text, 8000),
    }

    fallback_result = fallback_media_insights(
        page_title,
        label,
        media_type,
        transcript_text,
        page_description or page_text,
        notes or "",
    )

    if not openai_client:
        return fallback_result

    system_prompt = """
You analyze media links for a personal knowledge system.
Return only valid JSON with this exact shape:
{
  "title": string,
  "summary": string,
  "key_points": [string],
  "transcript_used": boolean,
  "source_kind": string
}

Rules:
- Use transcript_text when available.
- If transcript_text is missing, rely on page_title, page_description, page_text, and notes.
- Keep the summary concise and practical.
- Return at most 5 key points.
""".strip()

    try:
        parsed = call_openai_json(system_prompt, prompt_payload)
        if not parsed:
            return fallback_result
        return {
            "title": sanitize_ai_text(str(parsed.get("title") or fallback_result["title"]), 200),
            "summary": sanitize_ai_text(str(parsed.get("summary") or fallback_result["summary"]), 1200),
            "key_points": [
                sanitize_ai_text(str(item), 280)
                for item in parsed.get("key_points", [])[:5]
                if sanitize_ai_text(str(item), 280)
            ] or fallback_result["key_points"],
            "transcript_used": bool(parsed.get("transcript_used", transcript_used)),
            "source_kind": sanitize_ai_text(str(parsed.get("source_kind") or fallback_result["source_kind"]), 40),
        }
    except Exception:
        return fallback_result


def get_frequency_interval_seconds(watchlist: models.Watchlist):
    if watchlist.interval_days and watchlist.interval_days > 0:
        return watchlist.interval_days * 86400

    normalized_frequency = (watchlist.frequency or "daily").strip().lower()
    if normalized_frequency == "daily":
        return 86400
    if normalized_frequency == "weekly":
        return 7 * 86400
    if normalized_frequency.startswith("every "):
        parts = normalized_frequency.split()
        if len(parts) >= 2 and parts[1].isdigit():
            return int(parts[1]) * 86400
    if normalized_frequency.endswith(" days"):
        prefix = normalized_frequency.replace(" days", "").strip()
        if prefix.isdigit():
            return int(prefix) * 86400
    return 86400


def is_watchlist_due(watchlist: models.Watchlist):
    last_run = watchlist.last_checked_at or watchlist.created_at
    if not last_run:
        return True
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=timezone.utc)
    next_run_at = last_run.timestamp() + get_frequency_interval_seconds(watchlist)
    return time.time() >= next_run_at


def refresh_watchlist_data(db: Session, watchlist: models.Watchlist):
    sources = (
        db.query(models.WatchlistSource)
        .filter(
            models.WatchlistSource.watchlist_id == watchlist.id,
            models.WatchlistSource.active == True,
        )
        .all()
    )

    created_items: list[models.DiscoveryItem] = []

    for source in sources:
        try:
            feed_url = validate_outbound_url(source.rss_url or source.url)
        except HTTPException:
            continue
        if not feed_url:
            continue
        try:
            entries = parse_rss_or_atom(feed_url)
        except Exception:
            continue

        for entry in entries[:15]:
            if not entry.get("title") or not entry.get("url"):
                continue
            guid = entry.get("guid") or entry.get("url")
            existing = (
                db.query(models.DiscoveryItem)
                .filter(models.DiscoveryItem.raw_guid == guid)
                .first()
            )
            if existing:
                continue

            published_at = None
            if entry.get("published_at"):
                try:
                    published_at = datetime.fromisoformat(
                        entry["published_at"].replace("Z", "+00:00")
                    )
                except ValueError:
                    published_at = None

            discovery_item = models.DiscoveryItem(
                user_id=watchlist.user_id,
                workspace_id=watchlist.workspace_id,
                watchlist_id=watchlist.id,
                source_id=source.id,
                title=entry["title"][:500],
                summary=(entry.get("summary") or "")[:4000],
                url=entry["url"][:1000],
                topic=watchlist.topic,
                source_name=source.name,
                published_at=published_at,
                raw_guid=guid[:1000],
            )
            db.add(discovery_item)
            created_items.append(discovery_item)

    watchlist.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    for item in created_items:
        db.refresh(item)
    return created_items


def scheduler_loop(stop_event: threading.Event):
    while not stop_event.is_set():
        db = SessionLocal()
        try:
            watchlists = db.query(models.Watchlist).filter(
                models.Watchlist.user_id.is_not(None)).all()
            for watchlist in watchlists:
                if is_watchlist_due(watchlist):
                    refresh_watchlist_data(db, watchlist)
        except Exception:
            db.rollback()
        finally:
            db.close()

        stop_event.wait(300)


@app.on_event("startup")
def start_scheduler():
    ensure_admin_user()
    if app.state.scheduler_thread and app.state.scheduler_thread.is_alive():
        return
    app.state.scheduler_stop_event.clear()
    thread = threading.Thread(
        target=scheduler_loop,
        args=(app.state.scheduler_stop_event,),
        daemon=True,
        name="watchlist-scheduler",
    )
    thread.start()
    app.state.scheduler_thread = thread


@app.on_event("shutdown")
def stop_scheduler():
    app.state.scheduler_stop_event.set()


@app.get("/")
def read_root():
    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "CortexKnows backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    try:
        result = test_db()
        return {"db": "connected", "result": result}
    except Exception as e:
        return {"db": "error", "details": str(e)}


@app.get("/health/scheduler")
def health_scheduler():
    scheduler_thread = app.state.scheduler_thread
    return {
        "scheduler_running": bool(scheduler_thread and scheduler_thread.is_alive()),
        "interval_seconds": 300,
    }


@app.post("/auth/register", response_model=AuthResponse)
def register(
    user_data: UserRegister,
    response: Response,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(
        f"register:{request.client.host if request.client else 'unknown'}", 10, 300)
    normalized_email = user_data.email.strip().lower()
    existing_user = db.query(models.User).filter(
        models.User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    workspace = models.Workspace(
        name=f"{user_data.nickname.strip()}'s Workspace",
        slug=slugify_workspace_name(user_data.nickname.strip()),
    )
    db.add(workspace)
    db.flush()

    user = models.User(
        email=normalized_email,
        password_hash=hash_password(user_data.password),
        workspace_id=workspace.id,
        nickname=user_data.nickname.strip(),
        full_name=(user_data.full_name or "").strip(
        ) or user_data.nickname.strip(),
        tone="clear and practical",
        default_capture_type="knowledge",
        ai_name="Cortex",
        timezone="Europe/London",
        language="en",
    )
    db.add(user)
    db.flush()
    workspace.owner_user_id = user.id
    db.commit()
    db.refresh(user)

    token = create_session_token()
    session = models.Session(user_id=user.id, token=token)
    db.add(session)
    db.commit()
    set_session_cookie(response, token)

    return AuthResponse(user=serialize_user(user))


@app.post("/auth/login", response_model=AuthResponse)
def login(
    user_data: UserLogin,
    response: Response,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
):
    request_host = request.client.host if request.client else "unknown"
    enforce_rate_limit(f"login:{request_host}", 20, 300)
    enforce_rate_limit(
        f"login-email:{user_data.email.strip().lower()}", 10, 300)
    user = (
        db.query(models.User)
        .filter(models.User.email == user_data.email.strip().lower())
        .first()
    )
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive")

    token = create_session_token()
    session = models.Session(user_id=user.id, token=token)
    db.add(session)
    db.commit()
    set_session_cookie(response, token)

    return AuthResponse(user=serialize_user(user))


@app.post("/auth/logout")
def logout(
    current_session: models.Session = Depends(get_current_session),
    response: Response = None,
    db: Session = Depends(get_db),
):
    db.delete(current_session)
    db.commit()
    if response is not None:
        clear_session_cookie(response)
    return {"message": "Logged out successfully"}


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return serialize_user(current_user)


@app.put("/auth/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = user_data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


@app.get("/admin/users", response_model=list[UserResponse])
def admin_list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [serialize_user(user) for user in users]


@app.post("/admin/users", response_model=UserResponse)
def admin_create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    normalized_email = payload.email.strip().lower()
    existing_user = db.query(models.User).filter(
        models.User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    workspace = models.Workspace(
        name=f"{payload.nickname.strip()}'s Workspace",
        slug=slugify_workspace_name(payload.nickname.strip()),
    )
    db.add(workspace)
    db.flush()

    user = models.User(
        email=normalized_email,
        workspace_id=workspace.id,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_active=payload.is_active,
        nickname=payload.nickname.strip(),
        full_name=(payload.full_name or "").strip(
        ) or payload.nickname.strip(),
        tone="clear and practical",
        default_capture_type="knowledge",
        ai_name="Cortex",
        timezone="Europe/London",
        language="en",
    )
    db.add(user)
    db.flush()
    workspace.owner_user_id = user.id
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@app.put("/admin/users/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    if "nickname" in data and data["nickname"] is not None:
        normalized_nickname = data["nickname"].strip()
        if normalized_nickname:
            user.nickname = normalized_nickname
    if "full_name" in data:
        user.full_name = (data["full_name"] or "").strip() or user.full_name
    if "is_admin" in data and data["is_admin"] is not None:
        user.is_admin = data["is_admin"]
    if "is_active" in data and data["is_active"] is not None:
        user.is_active = data["is_active"]
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data["password"].strip())

    db.commit()
    db.refresh(user)
    return serialize_user(user)


@app.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=400, detail="Admin cannot delete the current session user")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(models.Session).filter(models.Session.user_id == user_id).delete()
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.post("/auth/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    current_user: models.User = Depends(get_current_user),
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="Current password is incorrect")
    if len(payload.new_password.strip()) < 8:
        raise HTTPException(
            status_code=400, detail="New password must have at least 8 characters")

    current_user.password_hash = hash_password(payload.new_password.strip())
    db.query(models.Session).filter(
        models.Session.user_id == current_user.id).delete()
    new_token = create_session_token()
    db.add(models.Session(user_id=current_user.id, token=new_token))
    db.commit()
    set_session_cookie(response, new_token)
    return MessageResponse(message="Password updated successfully")


@app.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
):
    normalized_email = payload.email.strip().lower()
    enforce_rate_limit(
        f"forgot-ip:{request.client.host if request.client else 'unknown'}", 10, 900)
    enforce_rate_limit(f"forgot:{normalized_email}", 5, 900)
    user = (
        db.query(models.User)
        .filter(models.User.email == normalized_email)
        .first()
    )
    if not user:
        return MessageResponse(
            message="If the account exists, a password reset token has been generated."
        )

    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used_at.is_(None),
    ).delete()

    reset_token = secrets.token_urlsafe(24)
    token_record = models.PasswordResetToken(
        user_id=user.id,
        token=hash_reset_token(reset_token),
        expires_at=datetime.utcnow() + RESET_TOKEN_TTL,
    )
    db.add(token_record)
    db.commit()

    return MessageResponse(
        message="If the account exists, a password reset email will be sent when email delivery is configured.",
    )


@app.post("/auth/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_record = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token == hash_reset_token(
                payload.token.strip()),
            models.PasswordResetToken.used_at.is_(None),
        )
        .first()
    )
    if not token_record:
        raise HTTPException(
            status_code=400, detail="Invalid or expired reset token")
    if token_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if len(payload.new_password.strip()) < 8:
        raise HTTPException(
            status_code=400, detail="New password must have at least 8 characters")

    user = db.query(models.User).filter(
        models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password.strip())
    token_record.used_at = datetime.utcnow()
    db.query(models.Session).filter(models.Session.user_id == user.id).delete()
    db.commit()

    return MessageResponse(message="Password reset successfully. Please log in with your new password.")


@app.get("/ai/suggest-connections", response_model=AISuggestionsResponse)
def ai_suggest_connections(
    entity_type: str,
    entity_id: int,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="suggest-connections",
        payload_size=len(entity_type) + len(str(entity_id)),
    )
    normalized_type = entity_type.strip().lower()
    if normalized_type not in {"thought", "knowledge", "business_idea", "work_idea", "personal_idea", "quote"}:
        raise HTTPException(
            status_code=400,
            detail="AI suggestions currently support thought, knowledge, business idea, work idea, personal idea, and quote entities.",
        )

    if normalized_type == "thought":
        source = (
            db.query(models.Thought)
            .filter(models.Thought.id == entity_id, models.Thought.user_id == current_user.id)
            .first()
        )
        if not source:
            raise HTTPException(status_code=404, detail="Thought not found")
        source_entity = get_thought_source_entity(source)
    elif normalized_type == "knowledge":
        source = (
            db.query(models.KnowledgeItem)
            .filter(
                models.KnowledgeItem.id == entity_id,
                models.KnowledgeItem.user_id == current_user.id,
            )
            .first()
        )
        if not source:
            raise HTTPException(
                status_code=404, detail="Knowledge item not found")
        source_entity = get_knowledge_source_entity(source)
    elif normalized_type == "business_idea":
        source = (
            db.query(models.BusinessIdea)
            .filter(
                models.BusinessIdea.id == entity_id,
                models.BusinessIdea.user_id == current_user.id,
            )
            .first()
        )
        if not source:
            raise HTTPException(
                status_code=404, detail="Business idea not found")
        source_entity = get_business_idea_source_entity(source)
    elif normalized_type == "work_idea":
        source = (
            db.query(models.WorkIdea)
            .filter(
                models.WorkIdea.id == entity_id,
                models.WorkIdea.user_id == current_user.id,
            )
            .first()
        )
        if not source:
            raise HTTPException(status_code=404, detail="Work idea not found")
        source_entity = get_work_idea_source_entity(source)
    elif normalized_type == "personal_idea":
        source = (
            db.query(models.PersonalIdea)
            .filter(
                models.PersonalIdea.id == entity_id,
                models.PersonalIdea.user_id == current_user.id,
            )
            .first()
        )
        if not source:
            raise HTTPException(
                status_code=404, detail="Personal idea not found")
        source_entity = get_personal_idea_source_entity(source)
    else:
        source = (
            db.query(models.Quote)
            .filter(
                models.Quote.id == entity_id,
                models.Quote.user_id == current_user.id,
            )
            .first()
        )
        if not source:
            raise HTTPException(status_code=404, detail="Quote not found")
        source_entity = get_quote_source_entity(source)

    existing_connections = (
        db.query(models.Connection)
        .filter(
            models.Connection.user_id == current_user.id,
            models.Connection.source_type == normalized_type,
            models.Connection.source_id == entity_id,
        )
        .all()
    )
    candidates, topics = get_candidate_entities_for_ai(current_user, db)
    heuristic_result = build_ai_suggestions(
        source_entity, candidates, topics, existing_connections
    )

    try:
        return call_llm_ai_suggestions(
            source_entity=source_entity,
            candidates=candidates,
            topics=topics,
            heuristic_result=heuristic_result,
        )
    except Exception:
        return heuristic_result


@app.post("/ai/chat", response_model=AIChatResponse)
def ai_chat(
    payload: AIChatRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    message = clamp_ai_input(payload.message)
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    history_chars = sum(len(clamp_ai_input(item.content, 1000))
                        for item in payload.history[:8])
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="chat",
        payload_size=len(message) + history_chars,
    )

    workspace_context = build_workspace_ai_context(current_user, db)
    ranked = rank_relevant_entities(
        message, workspace_context["entities"], limit=8)
    candidate_context = [
        {
            "entity_type": entity["entity_type"],
            "entity_id": entity["entity_id"],
            "label": entity["label"],
            "text": clamp_ai_input(entity["text"], 500),
            "url": sanitize_ai_text(entity.get("url"), 500) or None,
            "parent_entity_type": sanitize_ai_text(entity.get("parent_entity_type"), 40) or None,
            "parent_entity_id": entity.get("parent_entity_id"),
            "parent_label": sanitize_ai_text(entity.get("parent_label"), 160) or None,
            "matched_keywords": overlap[:5],
            "score": score,
        }
        for score, overlap, entity in ranked
    ]

    fallback_response = fallback_chat_answer(
        message, workspace_context["entities"])
    if not openai_client:
        return fallback_response

    system_prompt = """
You are Cortex, the AI layer inside CortexKnows.
Answer only from the authenticated user's workspace context provided.
Do not invent private data, accounts, passwords, secrets, or content not included in the context.
Be concise, practical, and explicit when the context is weak.
Return only valid JSON:
{
  "answer": string,
  "citations": [{
    "entity_type": string,
    "entity_id": number,
    "label": string,
    "score": number | null,
    "url": string | null,
    "parent_entity_type": string | null,
    "parent_entity_id": number | null,
    "parent_label": string | null
  }]
}
At most 5 citations.
""".strip()

    user_payload = {
        "user_message": message,
        "conversation_history": [
            {
                "role": sanitize_ai_text(item.role, 20),
                "content": clamp_ai_input(item.content, 1000),
            }
            for item in payload.history[-8:]
        ],
        "workspace_candidates": candidate_context,
        "available_topics": [topic.name for topic in workspace_context["topics"][:40]],
    }

    try:
        parsed = call_openai_json(system_prompt, user_payload)
        if not parsed:
            return fallback_response
        return AIChatResponse(
            answer=sanitize_ai_text(
                str(parsed.get("answer") or fallback_response.answer)),
            citations=[
                AIChatCitation(
                    entity_type=sanitize_ai_text(str(item["entity_type"]), 40),
                    entity_id=int(item["entity_id"]),
                    label=sanitize_ai_text(str(item["label"]), 160),
                    score=max(1, min(10, int(item.get("score") or 1))),
                    url=sanitize_ai_text(
                        str(item.get("url") or ""), 500) or None,
                    parent_entity_type=sanitize_ai_text(
                        str(item.get("parent_entity_type") or ""), 40) or None,
                    parent_entity_id=int(item["parent_entity_id"]) if item.get(
                        "parent_entity_id") is not None else None,
                    parent_label=sanitize_ai_text(
                        str(item.get("parent_label") or ""), 160) or None,
                )
                for item in parsed.get("citations", [])[:5]
            ],
        )
    except Exception:
        return fallback_response


@app.post("/ai/summarize", response_model=AISummaryResponse)
def ai_summarize(
    payload: AISummaryRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="summarize",
        payload_size=len(payload.entity_type) + len(str(payload.entity_id)),
    )
    entity = get_entity_for_summary(
        payload.entity_type, payload.entity_id, current_user, db)
    fallback_response = fallback_summary(entity)
    if not openai_client:
        return fallback_response

    system_prompt = """
You summarize workspace content for the authenticated owner.
Use only the provided content. Do not invent facts.
Return only valid JSON:
{"summary": string}
Keep the summary short, clear, and actionable.
""".strip()

    try:
        parsed = call_openai_json(
            system_prompt,
            {
                "entity_type": entity["entity_type"],
                "title": entity["title"],
                "content": clamp_ai_input(entity["text"]),
            },
        )
        if not parsed:
            return fallback_response
        return AISummaryResponse(
            entity_type=entity["entity_type"],
            entity_id=entity["entity_id"],
            title=entity["title"],
            summary=sanitize_ai_text(
                str(parsed.get("summary") or fallback_response.summary), 800),
        )
    except Exception:
        return fallback_response


@app.post("/ai/discovery-triage", response_model=AIDiscoveryTriageResponse)
def ai_discovery_triage(
    payload: AIDiscoveryTriageRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="discovery-triage",
        payload_size=len(str(payload.discovery_item_id)),
    )
    discovery_item = (
        db.query(models.DiscoveryItem)
        .filter(
            models.DiscoveryItem.id == payload.discovery_item_id,
            models.DiscoveryItem.user_id == current_user.id,
        )
        .first()
    )
    if not discovery_item:
        raise HTTPException(status_code=404, detail="Discovery item not found")

    topics = (
        db.query(models.Topic)
        .filter(models.Topic.user_id == current_user.id)
        .order_by(models.Topic.created_at.desc())
        .all()
    )
    fallback_response = fallback_discovery_triage(discovery_item, topics)
    if not openai_client:
        return fallback_response

    system_prompt = """
You triage discovery feed items for the authenticated user.
Use only the provided item and topic list.
Return only valid JSON:
{
  "relevance_score": number,
  "recommended_action": "save_to_library" | "save_in_discovery" | "dismiss",
  "suggested_topic": string | null,
  "explanation": string
}
Keep relevance_score between 1 and 10.
Only suggest a topic that exists in the provided topics list.
""".strip()

    try:
        parsed = call_openai_json(
            system_prompt,
            {
                "discovery_item": {
                    "id": discovery_item.id,
                    "title": clamp_ai_input(discovery_item.title, 400),
                    "summary": clamp_ai_input(discovery_item.summary, 1200),
                    "topic": clamp_ai_input(discovery_item.topic, 120),
                    "source_name": clamp_ai_input(discovery_item.source_name, 120),
                    "url": clamp_ai_input(discovery_item.url, 300),
                },
                "workspace_topics": [topic.name for topic in topics[:60]],
            },
        )
        if not parsed:
            return fallback_response
        suggested_topic = sanitize_ai_text(
            parsed.get("suggested_topic"), 120) or None
        if suggested_topic and suggested_topic not in {topic.name for topic in topics}:
            suggested_topic = fallback_response.suggested_topic
        return AIDiscoveryTriageResponse(
            discovery_item_id=discovery_item.id,
            relevance_score=max(1, min(
                10, int(parsed.get("relevance_score") or fallback_response.relevance_score))),
            recommended_action=sanitize_ai_text(
                str(parsed.get("recommended_action")
                    or fallback_response.recommended_action),
                40,
            ),
            suggested_topic=suggested_topic,
            explanation=sanitize_ai_text(
                str(parsed.get("explanation") or fallback_response.explanation),
                500,
            ),
        )
    except Exception:
        return fallback_response


@app.post("/ai/media-insights", response_model=AIMediaInsightsResponse)
def ai_media_insights(
    payload: AIMediaInsightsRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notes = clamp_ai_input(payload.notes, 1200)
    label = sanitize_ai_text(payload.label or "Media link", 160)
    media_type = sanitize_ai_text(payload.media_type or "", 40) or None
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="media-insights",
        payload_size=len(payload.media_url) + len(notes) + len(label),
    )

    knowledge_item = (
        db.query(models.KnowledgeItem)
        .filter(
            models.KnowledgeItem.id == payload.knowledge_item_id,
            models.KnowledgeItem.user_id == current_user.id,
        )
        .first()
    )
    if not knowledge_item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    stored_media_links = parse_json_list(knowledge_item.media_links_json)
    stored_media_link = next(
        (media_link for media_link in stored_media_links if media_link.get(
            "url") == payload.media_url),
        None,
    )
    if not stored_media_link:
        raise HTTPException(
            status_code=404, detail="Media link not found in this knowledge item")

    resolved_label = label or sanitize_ai_text(
        str(stored_media_link.get("label") or "Media link"), 160)
    resolved_media_type = media_type or sanitize_ai_text(
        str(stored_media_link.get("media_type") or ""), 40) or None
    resolved_notes = notes or sanitize_ai_text(
        str(stored_media_link.get("notes") or ""), 1200)

    insights = generate_media_insights(
        label=resolved_label,
        media_url=payload.media_url,
        media_type=resolved_media_type,
        notes=resolved_notes,
    )
    analyzed_at = datetime.utcnow()
    updated_media_links = []
    for media_link in stored_media_links:
        if media_link.get("url") == payload.media_url:
            updated_media_link = dict(media_link)
            updated_media_link["ai_title"] = insights["title"]
            updated_media_link["ai_summary"] = insights["summary"]
            updated_media_link["ai_key_points"] = insights["key_points"]
            updated_media_link["ai_last_analyzed_at"] = analyzed_at.isoformat()
            updated_media_link["ai_source_kind"] = insights["source_kind"]
            updated_media_link["ai_transcript_used"] = bool(
                insights["transcript_used"])
            if resolved_notes:
                updated_media_link["notes"] = resolved_notes
            updated_media_links.append(updated_media_link)
        else:
            updated_media_links.append(media_link)

    knowledge_item.media_links_json = json.dumps(updated_media_links)
    db.commit()
    return AIMediaInsightsResponse(
        knowledge_item_id=knowledge_item.id,
        media_url=payload.media_url,
        media_type=resolved_media_type,
        title=insights["title"],
        summary=insights["summary"],
        key_points=insights["key_points"],
        transcript_used=bool(insights["transcript_used"]),
        source_kind=insights["source_kind"],
        analyzed_at=analyzed_at,
    )


@app.post("/ai/apply-thought-conversion", response_model=AIApplyThoughtConversionResponse)
def ai_apply_thought_conversion(
    payload: AIApplyThoughtConversionRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target_type = sanitize_ai_text(payload.target_type, 40).lower()
    if target_type not in {"business", "work", "personal"}:
        raise HTTPException(
            status_code=400, detail="Unsupported conversion target type.")

    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="apply-thought-conversion",
        payload_size=len(str(payload.thought_id)) + len(target_type),
    )

    thought = (
        db.query(models.Thought)
        .filter(
            models.Thought.id == payload.thought_id,
            models.Thought.user_id == current_user.id,
        )
        .first()
    )
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    next_steps = generate_conversion_next_steps(thought, target_type)
    created_id = None
    created_title = thought.title or f"Converted from thought #{thought.id}"
    created_entity_type = ""

    if target_type == "business":
        item = models.BusinessIdea(
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            title=created_title,
            description=thought.content,
            problem=thought.summary or thought.content[:220],
            audience=None,
            priority=thought.priority,
            next_steps=next_steps,
            attachments_json=json.dumps([]),
        )
        item.topics = thought.topics
        db.add(item)
        db.flush()
        created_id = item.id
        created_title = item.title
        created_entity_type = "business_idea"
    elif target_type == "work":
        item = models.WorkIdea(
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            title=created_title,
            goal=thought.summary or thought.content[:180],
            summary=thought.content,
            context=thought.link,
            application_category=thought.thought_type,
            priority=thought.priority,
            timeline=None,
            execution_mode="solo",
            attachments_json=json.dumps([]),
        )
        item.topics = thought.topics
        db.add(item)
        db.flush()
        created_id = item.id
        created_title = item.title
        created_entity_type = "work_idea"
    else:
        item = models.PersonalIdea(
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            title=created_title,
            description=thought.content,
            category=thought.thought_type,
            priority=thought.priority,
            goal=next_steps,
            attachments_json=json.dumps([]),
        )
        db.add(item)
        db.flush()
        created_id = item.id
        created_title = item.title
        created_entity_type = "personal_idea"

    log_ai_action(
        db=db,
        current_user=current_user,
        action_type="thought_conversion",
        source_entity_type="thought",
        source_entity_id=thought.id,
        target_entity_type=created_entity_type,
        target_entity_id=created_id,
        summary=f"Converted thought '{thought.title or thought.id}' into {created_entity_type.replace('_', ' ')}.",
        details=next_steps,
    )
    db.commit()

    return AIApplyThoughtConversionResponse(
        action_type="thought_conversion",
        target_type=created_entity_type,
        target_id=created_id,
        target_path=get_entity_path(created_entity_type, created_id),
        title=created_title,
        suggested_next_steps=next_steps,
    )


@app.post("/ai/apply-discovery-action", response_model=AIApplyDiscoveryActionResponse)
def ai_apply_discovery_action(
    payload: AIApplyDiscoveryActionRequest,
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    enforce_ai_access(
        current_user=current_user,
        request=request,
        action="apply-discovery-action",
        payload_size=len(str(payload.discovery_item_id)),
    )

    discovery_item = (
        db.query(models.DiscoveryItem)
        .filter(
            models.DiscoveryItem.id == payload.discovery_item_id,
            models.DiscoveryItem.user_id == current_user.id,
        )
        .first()
    )
    if not discovery_item:
        raise HTTPException(status_code=404, detail="Discovery item not found")

    topics = (
        db.query(models.Topic)
        .filter(models.Topic.user_id == current_user.id)
        .order_by(models.Topic.created_at.desc())
        .all()
    )
    triage = ai_discovery_triage(
        AIDiscoveryTriageRequest(discovery_item_id=payload.discovery_item_id),
        request,
        db,
        current_user,
    )

    if triage.suggested_topic:
        discovery_item.assigned_topic = triage.suggested_topic

    target_path = "/discovery"
    if triage.recommended_action == "save_to_library":
        knowledge_item = models.KnowledgeItem(
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            title=discovery_item.title,
            url=discovery_item.url,
            personal_note=discovery_item.summary,
            source=discovery_item.source_name,
            description=discovery_item.summary,
            attachments_json=json.dumps([]),
        )
        if triage.suggested_topic:
            matched_topic = next(
                (topic for topic in topics if topic.name == triage.suggested_topic), None)
            if matched_topic:
                knowledge_item.topics = [matched_topic]
        db.add(knowledge_item)
        db.flush()
        discovery_item.saved_to_library = True
        discovery_item.saved_in_discovery = True
        target_path = get_entity_path("knowledge", knowledge_item.id)
        target_entity_type = "knowledge"
        target_entity_id = knowledge_item.id
    elif triage.recommended_action == "save_in_discovery":
        discovery_item.saved_in_discovery = True
        target_entity_type = "discovery_item"
        target_entity_id = discovery_item.id
    else:
        discovery_item.dismissed = True
        target_entity_type = "discovery_item"
        target_entity_id = discovery_item.id

    log_ai_action(
        db=db,
        current_user=current_user,
        action_type="discovery_triage_apply",
        source_entity_type="discovery_item",
        source_entity_id=discovery_item.id,
        target_entity_type=target_entity_type,
        target_entity_id=target_entity_id,
        summary=f"Applied AI triage to discovery item '{discovery_item.title}'.",
        details=triage.explanation,
    )
    db.commit()

    return AIApplyDiscoveryActionResponse(
        action_type="discovery_triage_apply",
        discovery_item_id=discovery_item.id,
        recommended_action=triage.recommended_action,
        target_path=target_path,
        suggested_topic=triage.suggested_topic,
        explanation=triage.explanation,
    )


@app.get("/ai/action-history", response_model=list[AIActionHistoryResponse])
def list_ai_action_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entries = (
        db.query(models.AIActionHistory)
        .filter(models.AIActionHistory.user_id == current_user.id)
        .order_by(models.AIActionHistory.created_at.desc())
        .limit(50)
        .all()
    )
    return entries


@app.post("/ai/action-history/{history_id}/rollback", response_model=AIActionRollbackResponse)
def rollback_ai_action(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.AIActionHistory)
        .filter(
            models.AIActionHistory.id == history_id,
            models.AIActionHistory.user_id == current_user.id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=404, detail="AI history entry not found")
    if entry.rolled_back_at:
        raise HTTPException(
            status_code=400, detail="This AI action has already been rolled back.")

    rollback_details = ""

    if entry.action_type == "thought_conversion":
        if entry.target_entity_type == "business_idea":
            target = (
                db.query(models.BusinessIdea)
                .filter(
                    models.BusinessIdea.id == entry.target_entity_id,
                    models.BusinessIdea.user_id == current_user.id,
                )
                .first()
            )
        elif entry.target_entity_type == "work_idea":
            target = (
                db.query(models.WorkIdea)
                .filter(
                    models.WorkIdea.id == entry.target_entity_id,
                    models.WorkIdea.user_id == current_user.id,
                )
                .first()
            )
        elif entry.target_entity_type == "personal_idea":
            target = (
                db.query(models.PersonalIdea)
                .filter(
                    models.PersonalIdea.id == entry.target_entity_id,
                    models.PersonalIdea.user_id == current_user.id,
                )
                .first()
            )
        else:
            target = None

        if not target:
            raise HTTPException(
                status_code=404, detail="Converted target item not found for rollback")
        db.delete(target)
        rollback_details = "Deleted AI-created converted item."

    elif entry.action_type == "discovery_triage_apply":
        discovery_item = (
            db.query(models.DiscoveryItem)
            .filter(
                models.DiscoveryItem.id == entry.source_entity_id,
                models.DiscoveryItem.user_id == current_user.id,
            )
            .first()
        )
        if not discovery_item:
            raise HTTPException(
                status_code=404, detail="Discovery item not found for rollback")

        discovery_item.saved_in_discovery = False
        discovery_item.dismissed = False
        discovery_item.assigned_topic = None

        if entry.target_entity_type == "knowledge" and entry.target_entity_id:
            target = (
                db.query(models.KnowledgeItem)
                .filter(
                    models.KnowledgeItem.id == entry.target_entity_id,
                    models.KnowledgeItem.user_id == current_user.id,
                )
                .first()
            )
            if target:
                db.delete(target)
            discovery_item.saved_to_library = False
            rollback_details = "Removed AI-created library item and reset discovery item state."
        else:
            rollback_details = "Reset discovery item state."
    else:
        raise HTTPException(
            status_code=400, detail="Rollback is not supported for this AI action type yet.")

    entry.rolled_back_at = datetime.utcnow()
    entry.rollback_details = rollback_details
    log_ai_action(
        db=db,
        current_user=current_user,
        action_type="ai_rollback",
        source_entity_type=entry.source_entity_type,
        source_entity_id=entry.source_entity_id,
        target_entity_type=entry.target_entity_type,
        target_entity_id=entry.target_entity_id,
        summary=f"Rolled back AI action {entry.action_type}.",
        details=rollback_details,
    )
    db.commit()
    return AIActionRollbackResponse(
        message="AI action rolled back successfully.",
        history_entry_id=entry.id,
    )


@app.post("/topics", response_model=TopicResponse)
def create_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    normalized_name = topic.name.strip()
    existing_topic = (
        db.query(models.Topic)
        .filter(
            func.lower(models.Topic.name) == normalized_name.lower(),
            models.Topic.user_id == current_user.id,
        )
        .first()
    )
    if existing_topic:
        raise HTTPException(
            status_code=400, detail="Topic name already exists")

    new_topic = models.Topic(
        name=normalized_name,
        description=topic.description,
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return serialize_topic(new_topic)


@app.get("/topics", response_model=list[TopicResponse])
def list_topics(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    topics = (
        db.query(models.Topic)
        .filter(models.Topic.user_id == current_user.id)
        .order_by(models.Topic.name.asc())
        .all()
    )
    return [serialize_topic(topic) for topic in topics]


@app.get("/topics/{topic_id}", response_model=TopicResponse)
def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    topic = (
        db.query(models.Topic)
        .filter(models.Topic.id == topic_id, models.Topic.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return serialize_topic(topic)


@app.put("/topics/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: int,
    topic_data: TopicCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    normalized_name = topic_data.name.strip()
    topic = (
        db.query(models.Topic)
        .filter(models.Topic.id == topic_id, models.Topic.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    existing_topic = (
        db.query(models.Topic)
        .filter(
            func.lower(models.Topic.name) == normalized_name.lower(),
            models.Topic.id != topic_id,
            models.Topic.user_id == current_user.id,
        )
        .first()
    )
    if existing_topic:
        raise HTTPException(
            status_code=400, detail="Topic name already exists")

    topic.name = normalized_name
    topic.description = topic_data.description
    db.commit()
    db.refresh(topic)
    return serialize_topic(topic)


@app.delete("/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    topic = (
        db.query(models.Topic)
        .filter(models.Topic.id == topic_id, models.Topic.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}


@app.post("/connections", response_model=ConnectionResponse)
def create_connection(
    item: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_entity_owned_by_user(
        db, item.source_type, item.source_id, current_user.id)
    ensure_entity_owned_by_user(
        db, item.target_type, item.target_id, current_user.id)
    new_connection = models.Connection(
        **item.model_dump(),
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
    )
    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)
    return serialize_connection(db, new_connection)


@app.get("/connections", response_model=list[ConnectionResponse])
def list_connections(
    entity_type: str | None = None,
    entity_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Connection).filter(
        models.Connection.user_id == current_user.id)

    if entity_type and entity_id is not None:
        query = query.filter(
            ((models.Connection.source_type == entity_type)
             & (models.Connection.source_id == entity_id))
            | ((models.Connection.target_type == entity_type) & (models.Connection.target_id == entity_id))
        )

    connections = query.order_by(models.Connection.created_at.desc()).all()
    return [serialize_connection(db, connection) for connection in connections]


@app.delete("/connections/{connection_id}")
def delete_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    connection = (
        db.query(models.Connection)
        .filter(
            models.Connection.id == connection_id,
            models.Connection.user_id == current_user.id,
        )
        .first()
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    db.delete(connection)
    db.commit()
    return {"message": "Connection deleted successfully"}


@app.post("/thoughts", response_model=ThoughtResponse)
def create_thought(
    thought: ThoughtCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    selected_topics = get_topics_by_ids(db, thought.topic_ids, current_user.id)
    new_thought = models.Thought(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title=thought.title,
        content=thought.content,
        summary=thought.summary,
        link=thought.link,
        thought_type=thought.thought_type,
        priority=thought.priority,
    )
    new_thought.topics = selected_topics
    db.add(new_thought)
    db.commit()
    db.refresh(new_thought)
    return serialize_thought(new_thought)


@app.get("/thoughts", response_model=list[ThoughtResponse])
def list_thoughts(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    thoughts = (
        db.query(models.Thought)
        .filter(models.Thought.user_id == current_user.id)
        .order_by(models.Thought.created_at.desc())
        .all()
    )
    return [serialize_thought(thought) for thought in thoughts]


@app.get("/thoughts/{thought_id}", response_model=ThoughtResponse)
def get_thought(
    thought_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    thought = (
        db.query(models.Thought)
        .filter(models.Thought.id == thought_id, models.Thought.user_id == current_user.id)
        .first()
    )

    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    return serialize_thought(thought)


@app.put("/thoughts/{thought_id}", response_model=ThoughtResponse)
def update_thought(
    thought_id: int,
    thought_data: ThoughtCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    thought = (
        db.query(models.Thought)
        .filter(models.Thought.id == thought_id, models.Thought.user_id == current_user.id)
        .first()
    )

    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    thought.title = thought_data.title
    thought.content = thought_data.content
    thought.summary = thought_data.summary
    thought.link = thought_data.link
    thought.thought_type = thought_data.thought_type
    thought.priority = thought_data.priority
    thought.topics = get_topics_by_ids(
        db, thought_data.topic_ids, current_user.id)

    db.commit()
    db.refresh(thought)

    return serialize_thought(thought)


@app.delete("/thoughts/{thought_id}")
def delete_thought(
    thought_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    thought = (
        db.query(models.Thought)
        .filter(models.Thought.id == thought_id, models.Thought.user_id == current_user.id)
        .first()
    )

    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")

    db.delete(thought)
    db.commit()

    return {"message": "Thought deleted successfully"}


@app.post("/knowledge-items", response_model=KnowledgeItemResponse)
def create_knowledge_item(
    item: KnowledgeItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    selected_topics = get_topics_by_ids(db, item.topic_ids, current_user.id)
    new_item = models.KnowledgeItem(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title=item.title,
        url=item.url,
        personal_note=item.personal_note,
        source=item.source,
        description=item.description,
        attachments_json=json.dumps(
            [attachment.model_dump() for attachment in item.attachments]
        ),
        media_links_json=json.dumps(
            [media_link.model_dump() for media_link in item.media_links]
        ),
    )
    new_item.topics = selected_topics
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_knowledge_item(new_item)


@app.get("/knowledge-items", response_model=list[KnowledgeItemResponse])
def list_knowledge_items(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.KnowledgeItem)
        .filter(models.KnowledgeItem.user_id == current_user.id)
        .order_by(models.KnowledgeItem.created_at.desc())
        .all()
    )
    return [serialize_knowledge_item(item) for item in items]


@app.get("/knowledge-items/{item_id}", response_model=KnowledgeItemResponse)
def get_knowledge_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.KnowledgeItem)
        .filter(
            models.KnowledgeItem.id == item_id,
            models.KnowledgeItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    return serialize_knowledge_item(item)


@app.put("/knowledge-items/{item_id}", response_model=KnowledgeItemResponse)
def update_knowledge_item(
    item_id: int,
    item_data: KnowledgeItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.KnowledgeItem)
        .filter(
            models.KnowledgeItem.id == item_id,
            models.KnowledgeItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    item.title = item_data.title
    item.url = item_data.url
    item.personal_note = item_data.personal_note
    item.source = item_data.source
    item.description = item_data.description
    item.topics = get_topics_by_ids(db, item_data.topic_ids, current_user.id)
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )
    item.media_links_json = json.dumps(
        [media_link.model_dump() for media_link in item_data.media_links]
    )

    db.commit()
    db.refresh(item)

    return serialize_knowledge_item(item)


@app.delete("/knowledge-items/{item_id}")
def delete_knowledge_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.KnowledgeItem)
        .filter(
            models.KnowledgeItem.id == item_id,
            models.KnowledgeItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    db.delete(item)
    db.commit()

    return {"message": "Knowledge item deleted successfully"}


@app.post("/business-ideas", response_model=BusinessIdeaResponse)
def create_business_idea(
    item: BusinessIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_item = models.BusinessIdea(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title=item.title,
        description=item.description,
        problem=item.problem,
        audience=item.audience,
        priority=item.priority,
        next_steps=item.next_steps,
        attachments_json=json.dumps(
            [attachment.model_dump() for attachment in item.attachments]
        ),
    )
    new_item.topics = get_topics_by_ids(db, item.topic_ids, current_user.id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_business_idea(new_item)


@app.get("/business-ideas", response_model=list[BusinessIdeaResponse])
def list_business_ideas(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.user_id == current_user.id)
        .order_by(models.BusinessIdea.created_at.desc())
        .all()
    )
    return [serialize_business_idea(item) for item in items]


@app.get("/business-ideas/{item_id}", response_model=BusinessIdeaResponse)
def get_business_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.id == item_id, models.BusinessIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Business idea not found")

    return serialize_business_idea(item)


@app.put("/business-ideas/{item_id}", response_model=BusinessIdeaResponse)
def update_business_idea(
    item_id: int,
    item_data: BusinessIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.id == item_id, models.BusinessIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Business idea not found")

    item.title = item_data.title
    item.description = item_data.description
    item.problem = item_data.problem
    item.audience = item_data.audience
    item.priority = item_data.priority
    item.next_steps = item_data.next_steps
    item.topics = get_topics_by_ids(db, item_data.topic_ids, current_user.id)
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )

    db.commit()
    db.refresh(item)
    return serialize_business_idea(item)


@app.delete("/business-ideas/{item_id}")
def delete_business_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.BusinessIdea)
        .filter(models.BusinessIdea.id == item_id, models.BusinessIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Business idea not found")

    db.delete(item)
    db.commit()
    return {"message": "Business idea deleted successfully"}


@app.post("/quotes", response_model=QuoteResponse)
def create_quote(
    item: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payload = item.model_dump()
    payload["user_id"] = current_user.id
    payload["workspace_id"] = current_user.workspace_id
    payload["attachments_json"] = json.dumps(
        [attachment.model_dump() for attachment in item.attachments]
    )
    payload.pop("attachments", None)
    new_item = models.Quote(**payload)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_quote(new_item)


@app.get("/quotes", response_model=list[QuoteResponse])
def list_quotes(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.Quote)
        .filter(models.Quote.user_id == current_user.id)
        .order_by(models.Quote.created_at.desc())
        .all()
    )
    return [serialize_quote(item) for item in items]


@app.get("/quotes/{item_id}", response_model=QuoteResponse)
def get_quote(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.Quote)
        .filter(models.Quote.id == item_id, models.Quote.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Quote not found")

    return serialize_quote(item)


@app.put("/quotes/{item_id}", response_model=QuoteResponse)
def update_quote(
    item_id: int,
    item_data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.Quote)
        .filter(models.Quote.id == item_id, models.Quote.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Quote not found")

    payload = item_data.model_dump()
    item.book_title = payload["book_title"]
    item.book_type = payload["book_type"]
    item.quote_text = payload["quote_text"]
    item.page = payload["page"]
    item.thoughts = payload["thoughts"]
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )

    db.commit()
    db.refresh(item)
    return serialize_quote(item)


@app.delete("/quotes/{item_id}")
def delete_quote(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.Quote)
        .filter(models.Quote.id == item_id, models.Quote.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Quote not found")

    db.delete(item)
    db.commit()
    return {"message": "Quote deleted successfully"}


@app.post("/work-ideas", response_model=WorkIdeaResponse)
def create_work_idea(
    item: WorkIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_item = models.WorkIdea(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title=item.title,
        goal=item.goal,
        summary=item.summary,
        context=item.context,
        application_category=item.application_category,
        priority=item.priority,
        timeline=item.timeline,
        execution_mode=item.execution_mode,
        attachments_json=json.dumps(
            [attachment.model_dump() for attachment in item.attachments]
        ),
    )
    new_item.topics = get_topics_by_ids(db, item.topic_ids, current_user.id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_work_idea(new_item)


@app.get("/work-ideas", response_model=list[WorkIdeaResponse])
def list_work_ideas(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.user_id == current_user.id)
        .order_by(models.WorkIdea.created_at.desc())
        .all()
    )
    return [serialize_work_idea(item) for item in items]


@app.get("/work-ideas/{item_id}", response_model=WorkIdeaResponse)
def get_work_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.id == item_id, models.WorkIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Work idea not found")

    return serialize_work_idea(item)


@app.put("/work-ideas/{item_id}", response_model=WorkIdeaResponse)
def update_work_idea(
    item_id: int,
    item_data: WorkIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.id == item_id, models.WorkIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Work idea not found")

    item.title = item_data.title
    item.goal = item_data.goal
    item.summary = item_data.summary
    item.context = item_data.context
    item.application_category = item_data.application_category
    item.priority = item_data.priority
    item.timeline = item_data.timeline
    item.execution_mode = item_data.execution_mode
    item.topics = get_topics_by_ids(db, item_data.topic_ids, current_user.id)
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )

    db.commit()
    db.refresh(item)
    return serialize_work_idea(item)


@app.delete("/work-ideas/{item_id}")
def delete_work_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.WorkIdea)
        .filter(models.WorkIdea.id == item_id, models.WorkIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Work idea not found")

    db.delete(item)
    db.commit()
    return {"message": "Work idea deleted successfully"}


@app.post("/personal-ideas", response_model=PersonalIdeaResponse)
def create_personal_idea(
    item: PersonalIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payload = item.model_dump()
    payload["user_id"] = current_user.id
    payload["workspace_id"] = current_user.workspace_id
    payload["attachments_json"] = json.dumps(
        [attachment.model_dump() for attachment in item.attachments]
    )
    payload.pop("attachments", None)
    new_item = models.PersonalIdea(**payload)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return PersonalIdeaResponse(
        id=new_item.id,
        title=new_item.title,
        description=new_item.description,
        category=new_item.category,
        priority=new_item.priority,
        goal=new_item.goal,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(new_item.attachments_json)
        ],
        created_at=new_item.created_at,
    )


@app.get("/personal-ideas", response_model=list[PersonalIdeaResponse])
def list_personal_ideas(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.user_id == current_user.id)
        .order_by(models.PersonalIdea.created_at.desc())
        .all()
    )
    return [
        PersonalIdeaResponse(
            id=item.id,
            title=item.title,
            description=item.description,
            category=item.category,
            priority=item.priority,
            goal=item.goal,
            attachments=[
                GlossaryAttachment(**attachment)
                for attachment in parse_json_list(item.attachments_json)
            ],
            created_at=item.created_at,
        )
        for item in items
    ]


@app.get("/personal-ideas/{item_id}", response_model=PersonalIdeaResponse)
def get_personal_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.id == item_id, models.PersonalIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Personal idea not found")

    return PersonalIdeaResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        category=item.category,
        priority=item.priority,
        goal=item.goal,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


@app.put("/personal-ideas/{item_id}", response_model=PersonalIdeaResponse)
def update_personal_idea(
    item_id: int,
    item_data: PersonalIdeaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.id == item_id, models.PersonalIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Personal idea not found")

    payload = item_data.model_dump()
    item.title = payload["title"]
    item.description = payload["description"]
    item.category = payload["category"]
    item.priority = payload["priority"]
    item.goal = payload["goal"]
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )

    db.commit()
    db.refresh(item)
    return PersonalIdeaResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        category=item.category,
        priority=item.priority,
        goal=item.goal,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


@app.delete("/personal-ideas/{item_id}")
def delete_personal_idea(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.PersonalIdea)
        .filter(models.PersonalIdea.id == item_id, models.PersonalIdea.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Personal idea not found")

    db.delete(item)
    db.commit()
    return {"message": "Personal idea deleted successfully"}


@app.post("/uploads", response_model=UploadResponse)
def upload_file(
    file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)
):
    file_extension = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").lower()
    if file_extension not in ALLOWED_UPLOAD_EXTENSIONS or content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail="This file type is not allowed")

    safe_name = f"{uuid.uuid4().hex}{file_extension}"
    destination = UPLOADS_DIR / safe_name

    total_bytes = 0
    with destination.open("wb") as buffer:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400, detail="File exceeds the 10MB upload limit")
            buffer.write(chunk)

    kind = "image" if content_type.startswith("image/") else "file"
    return UploadResponse(
        name=file.filename or safe_name,
        url=f"/uploads/{safe_name}",
        content_type=content_type,
        kind=kind,
    )


@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str, current_user: models.User = Depends(get_current_user)):
    safe_filename = Path(filename).name
    file_path = UPLOADS_DIR / safe_filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    media_type, _ = mimetypes.guess_type(file_path.name)
    resolved_media_type = media_type or "application/octet-stream"
    disposition = "inline" if resolved_media_type in SAFE_INLINE_CONTENT_TYPES else "attachment"
    return FileResponse(
        path=file_path,
        media_type=resolved_media_type,
        filename=file_path.name,
        content_disposition_type=disposition,
    )


@app.post("/glossary-terms", response_model=GlossaryTermResponse)
def create_glossary_term(
    item: GlossaryTermCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    normalized_term = item.term.strip()
    existing_item = (
        db.query(models.GlossaryTerm)
        .filter(
            func.lower(models.GlossaryTerm.term) == normalized_term.lower(),
            models.GlossaryTerm.user_id == current_user.id,
        )
        .first()
    )
    if existing_item:
        raise HTTPException(
            status_code=400, detail="Glossary term already exists")

    new_item = models.GlossaryTerm(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        term=normalized_term,
        definition=item.definition,
        term_type=item.term_type,
        aliases_json=json.dumps(item.aliases),
        tags_json=json.dumps(item.tags),
        links_json=json.dumps(item.links),
        attachments_json=json.dumps(
            [attachment.model_dump() for attachment in item.attachments]),
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_glossary_term(new_item)


@app.get("/glossary-terms", response_model=list[GlossaryTermResponse])
def list_glossary_terms(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    items = (
        db.query(models.GlossaryTerm)
        .filter(models.GlossaryTerm.user_id == current_user.id)
        .order_by(models.GlossaryTerm.term.asc())
        .all()
    )
    return [serialize_glossary_term(item) for item in items]


@app.get("/glossary-terms/{item_id}", response_model=GlossaryTermResponse)
def get_glossary_term(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.GlossaryTerm)
        .filter(models.GlossaryTerm.id == item_id, models.GlossaryTerm.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    return serialize_glossary_term(item)


@app.put("/glossary-terms/{item_id}", response_model=GlossaryTermResponse)
def update_glossary_term(
    item_id: int,
    item_data: GlossaryTermCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.GlossaryTerm)
        .filter(models.GlossaryTerm.id == item_id, models.GlossaryTerm.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    existing_item = (
        db.query(models.GlossaryTerm)
        .filter(
            func.lower(
                models.GlossaryTerm.term) == item_data.term.strip().lower(),
            models.GlossaryTerm.id != item_id,
            models.GlossaryTerm.user_id == current_user.id,
        )
        .first()
    )
    if existing_item:
        raise HTTPException(
            status_code=400, detail="Glossary term already exists")

    item.term = item_data.term.strip()
    item.definition = item_data.definition
    item.term_type = item_data.term_type
    item.aliases_json = json.dumps(item_data.aliases)
    item.tags_json = json.dumps(item_data.tags)
    item.links_json = json.dumps(item_data.links)
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )
    db.commit()
    db.refresh(item)
    return serialize_glossary_term(item)


@app.delete("/glossary-terms/{item_id}")
def delete_glossary_term(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.GlossaryTerm)
        .filter(models.GlossaryTerm.id == item_id, models.GlossaryTerm.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Glossary term not found")

    db.delete(item)
    db.commit()
    return {"message": "Glossary term deleted successfully"}


WATCHLIST_SOURCE_SUGGESTIONS = {
    "machine learning": [
        {
            "name": "Hugging Face Blog",
            "url": "https://huggingface.co/blog",
            "source_type": "blog",
            "rss_url": "https://huggingface.co/blog/feed.xml",
            "reason": "Good source for applied ML and model ecosystem updates.",
        },
        {
            "name": "Import AI",
            "url": "https://www.importai.com",
            "source_type": "newsletter",
            "rss_url": None,
            "reason": "Useful for AI industry and research commentary.",
        },
    ],
    "saas": [
        {
            "name": "SaaStr",
            "url": "https://www.saastr.com",
            "source_type": "blog",
            "rss_url": "https://www.saastr.com/feed/",
            "reason": "Strong signal for SaaS growth and GTM lessons.",
        },
        {
            "name": "Lenny's Newsletter",
            "url": "https://www.lennysnewsletter.com",
            "source_type": "newsletter",
            "rss_url": None,
            "reason": "Good for product and SaaS operator insights.",
        },
    ],
}


@app.post("/watchlists", response_model=WatchlistResponse)
def create_watchlist(
    item: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    validated_sources: list[WatchlistSourceCreate] = []
    for source in item.sources:
        validated_sources.append(
            WatchlistSourceCreate(
                name=source.name,
                url=validate_outbound_url(source.url),
                source_type=source.source_type,
                rss_url=validate_outbound_url(
                    source.rss_url) if source.rss_url else None,
            )
        )

    watchlist = models.Watchlist(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        name=item.name,
        topic=item.topic,
        frequency=item.frequency,
        interval_days=item.interval_days,
        description=item.description,
    )
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)

    created_sources = []
    for source in validated_sources:
        new_source = models.WatchlistSource(
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            watchlist_id=watchlist.id,
            name=source.name,
            url=source.url,
            source_type=source.source_type,
            rss_url=source.rss_url,
        )
        db.add(new_source)
        created_sources.append(new_source)

    db.commit()
    for source in created_sources:
        db.refresh(source)

    return serialize_watchlist(watchlist, created_sources)


@app.get("/watchlists", response_model=list[WatchlistResponse])
def list_watchlists(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    watchlists = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.user_id == current_user.id)
        .order_by(models.Watchlist.created_at.desc())
        .all()
    )
    return [
        serialize_watchlist(
            watchlist,
            db.query(models.WatchlistSource)
            .filter(
                models.WatchlistSource.watchlist_id == watchlist.id,
                models.WatchlistSource.user_id == current_user.id,
            )
            .order_by(models.WatchlistSource.created_at.asc())
            .all(),
        )
        for watchlist in watchlists
    ]


@app.put("/watchlists/{watchlist_id}", response_model=WatchlistResponse)
def update_watchlist(
    watchlist_id: int,
    item: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    watchlist = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == current_user.id)
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    payload = item.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"] is not None:
        normalized_name = payload["name"].strip()
        if not normalized_name:
            raise HTTPException(
                status_code=400, detail="Watchlist name cannot be empty")
        watchlist.name = normalized_name
    if "topic" in payload and payload["topic"] is not None:
        normalized_topic = payload["topic"].strip()
        if not normalized_topic:
            raise HTTPException(
                status_code=400, detail="Watchlist topic cannot be empty")
        watchlist.topic = normalized_topic
    if "frequency" in payload and payload["frequency"] is not None:
        normalized_frequency = payload["frequency"].strip()
        if not normalized_frequency:
            raise HTTPException(
                status_code=400, detail="Watchlist frequency cannot be empty")
        watchlist.frequency = normalized_frequency
    if "description" in payload:
        watchlist.description = (payload["description"] or "").strip() or None
    if "interval_days" in payload:
        interval_days = payload["interval_days"]
        watchlist.interval_days = interval_days if interval_days and interval_days > 0 else None

    db.commit()
    db.refresh(watchlist)

    sources = (
        db.query(models.WatchlistSource)
        .filter(
            models.WatchlistSource.watchlist_id == watchlist.id,
            models.WatchlistSource.user_id == current_user.id,
        )
        .order_by(models.WatchlistSource.created_at.asc())
        .all()
    )
    return serialize_watchlist(watchlist, sources)


@app.get("/watchlists/source-suggestions", response_model=list[SourceSuggestionResponse])
def get_watchlist_source_suggestions(topic: str):
    normalized_topic = topic.strip().lower()
    suggestions = []
    for key, value in WATCHLIST_SOURCE_SUGGESTIONS.items():
        if key in normalized_topic or normalized_topic in key:
            suggestions.extend(value)
    return [SourceSuggestionResponse(**item) for item in suggestions]


@app.post("/watchlists/{watchlist_id}/sources", response_model=WatchlistSourceResponse)
def add_watchlist_source(
    watchlist_id: int,
    item: WatchlistSourceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    watchlist = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == current_user.id)
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    source = models.WatchlistSource(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        watchlist_id=watchlist_id,
        name=item.name,
        url=validate_outbound_url(item.url),
        source_type=item.source_type,
        rss_url=validate_outbound_url(item.rss_url) if item.rss_url else None,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return serialize_watchlist_source(source)


@app.delete("/watchlists/sources/{source_id}")
def delete_watchlist_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    source = (
        db.query(models.WatchlistSource)
        .filter(
            models.WatchlistSource.id == source_id,
            models.WatchlistSource.user_id == current_user.id,
        )
        .first()
    )
    if not source:
        raise HTTPException(
            status_code=404, detail="Watchlist source not found")
    db.delete(source)
    db.commit()
    return {"message": "Watchlist source deleted successfully"}


@app.delete("/watchlists/{watchlist_id}")
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    watchlist = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == current_user.id)
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db.query(models.WatchlistSource).filter(
        models.WatchlistSource.watchlist_id == watchlist_id,
        models.WatchlistSource.user_id == current_user.id,
    ).delete()
    db.query(models.DiscoveryItem).filter(
        models.DiscoveryItem.watchlist_id == watchlist_id,
        models.DiscoveryItem.user_id == current_user.id,
    ).delete()
    db.delete(watchlist)
    db.commit()
    return {"message": "Watchlist deleted successfully"}


@app.post("/watchlists/{watchlist_id}/refresh", response_model=list[DiscoveryItemResponse])
def refresh_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    watchlist = (
        db.query(models.Watchlist)
        .filter(models.Watchlist.id == watchlist_id, models.Watchlist.user_id == current_user.id)
        .first()
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    created_items = refresh_watchlist_data(db, watchlist)
    return [serialize_discovery_item(item) for item in created_items]


@app.get("/discovery-items", response_model=list[DiscoveryItemResponse])
def list_discovery_items(
    include_dismissed: bool = False,
    saved_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.DiscoveryItem).filter(
        models.DiscoveryItem.user_id == current_user.id)
    if not include_dismissed:
        query = query.filter(models.DiscoveryItem.dismissed == False)
    if saved_only:
        query = query.filter(models.DiscoveryItem.saved_in_discovery == True)
    items = query.order_by(models.DiscoveryItem.published_at.desc(
    ).nullslast(), models.DiscoveryItem.created_at.desc()).all()
    return [serialize_discovery_item(item) for item in items]


@app.put("/discovery-items/{item_id}", response_model=DiscoveryItemResponse)
def update_discovery_item(
    item_id: int,
    item_data: DiscoveryItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.DiscoveryItem)
        .filter(models.DiscoveryItem.id == item_id, models.DiscoveryItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Discovery item not found")
    payload = item_data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return serialize_discovery_item(item)


@app.post("/discovery-items/{item_id}/save-to-library", response_model=KnowledgeItemResponse)
def save_discovery_item_to_library(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.DiscoveryItem)
        .filter(models.DiscoveryItem.id == item_id, models.DiscoveryItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Discovery item not found")

    knowledge_item = models.KnowledgeItem(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        title=item.title,
        url=item.url,
        source=item.source_name,
        description=item.summary,
        personal_note=f"Saved from Discovery - topic: {item.topic or 'general'}",
    )
    db.add(knowledge_item)
    item.saved_to_library = True
    db.commit()
    db.refresh(knowledge_item)
    return serialize_knowledge_item(knowledge_item)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if not FRONTEND_DIST_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_path = (FRONTEND_DIST_DIR / full_path).resolve()
    dist_root = FRONTEND_DIST_DIR.resolve()

    if dist_root in requested_path.parents and requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    raise HTTPException(
        status_code=404, detail="Frontend entrypoint not found")
