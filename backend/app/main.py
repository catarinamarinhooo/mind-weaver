from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, status, Response, Cookie, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
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
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from urllib.request import urlopen, Request as URLRequest
from xml.etree import ElementTree

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
    UploadResponse,
    WatchlistCreate,
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
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.db import engine, test_db, Base, SessionLocal, ensure_mvp_schema
import app.models as models

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SESSION_COOKIE_NAME = "cortexknows_session"
SESSION_COOKIE_SECURE = False
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
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".txt"}
SAFE_INLINE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
RATE_LIMIT_STORAGE: dict[str, list[float]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
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
        samesite="lax",
        secure=SESSION_COOKIE_SECURE,
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=SESSION_COOKIE_SECURE,
        path="/",
    )


def hash_reset_token(token: str):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def enforce_rate_limit(key: str, limit: int, window_seconds: int):
    now = time.time()
    current = [entry for entry in RATE_LIMIT_STORAGE.get(key, []) if now - entry < window_seconds]
    if len(current) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    current.append(now)
    RATE_LIMIT_STORAGE[key] = current


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
            id=user.workspace.id if hasattr(user, "workspace") and user.workspace else user.workspace_id,
            name=user.workspace.name if hasattr(user, "workspace") and user.workspace else "Workspace",
            slug=user.workspace.slug if hasattr(user, "workspace") and user.workspace else "workspace",
            created_at=user.workspace.created_at if hasattr(user, "workspace") and user.workspace else user.created_at,
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        workspace_id=user.workspace_id,
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
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = get_session_token_from_request(authorization, session_cookie)
    session = db.query(models.Session).filter(models.Session.token == token).first()
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

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for this session",
        )
    return user


def get_current_session(
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    token = get_session_token_from_request(authorization, session_cookie)
    session = db.query(models.Session).filter(models.Session.token == token).first()
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
        total_count=thought_count + knowledge_item_count + business_idea_count + work_idea_count,
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
        raise HTTPException(status_code=400, detail=f"Invalid or inaccessible {entity_type} target")
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
                    entry.findtext("atom:summary", default="", namespaces=namespace)
                    or entry.findtext("atom:content", default="", namespaces=namespace)
                    or ""
                ).strip(),
                "url": (link_node.attrib.get("href") if link_node is not None else "").strip(),
                "guid": (
                    entry.findtext("atom:id", default="", namespaces=namespace)
                    or (link_node.attrib.get("href") if link_node is not None else "")
                ).strip(),
                "published_at": (
                    entry.findtext("atom:updated", default="", namespaces=namespace)
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
        raise HTTPException(status_code=400, detail="Invalid URL format") from exc

    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Only http and https URLs are allowed")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="URL hostname is required")

    normalized_host = hostname.strip().lower()
    if normalized_host in {"localhost"} or normalized_host.endswith(".local"):
        raise HTTPException(status_code=400, detail="Local network URLs are not allowed")

    try:
        addr_info = socket.getaddrinfo(normalized_host, parsed.port or None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="Could not resolve URL hostname") from exc

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
            raise HTTPException(status_code=400, detail="Private or unsafe network targets are not allowed")

    return raw_url.strip()


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
            watchlists = db.query(models.Watchlist).filter(models.Watchlist.user_id.is_not(None)).all()
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
    enforce_rate_limit(f"register:{request.client.host if request.client else 'unknown'}", 10, 300)
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    workspace = models.Workspace(
        name=f"{user_data.nickname.strip()}'s Workspace",
        slug=slugify_workspace_name(user_data.nickname.strip()),
    )
    db.add(workspace)
    db.flush()

    user = models.User(
        email=user_data.email.strip().lower(),
        password_hash=hash_password(user_data.password),
        workspace_id=workspace.id,
        nickname=user_data.nickname.strip(),
        full_name=(user_data.full_name or "").strip() or user_data.nickname.strip(),
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
    enforce_rate_limit(f"login-email:{user_data.email.strip().lower()}", 10, 300)
    user = (
        db.query(models.User)
        .filter(models.User.email == user_data.email.strip().lower())
        .first()
    )
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

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


@app.post("/auth/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    current_user: models.User = Depends(get_current_user),
    current_session: models.Session = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password.strip()) < 8:
        raise HTTPException(status_code=400, detail="New password must have at least 8 characters")

    current_user.password_hash = hash_password(payload.new_password.strip())
    db.query(models.Session).filter(models.Session.user_id == current_user.id).delete()
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
    enforce_rate_limit(f"forgot-ip:{request.client.host if request.client else 'unknown'}", 10, 900)
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
            models.PasswordResetToken.token == hash_reset_token(payload.token.strip()),
            models.PasswordResetToken.used_at.is_(None),
        )
        .first()
    )
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if token_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    if len(payload.new_password.strip()) < 8:
        raise HTTPException(status_code=400, detail="New password must have at least 8 characters")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password.strip())
    token_record.used_at = datetime.utcnow()
    db.query(models.Session).filter(models.Session.user_id == user.id).delete()
    db.commit()

    return MessageResponse(message="Password reset successfully. Please log in with your new password.")


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
        raise HTTPException(status_code=400, detail="Topic name already exists")

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
        raise HTTPException(status_code=400, detail="Topic name already exists")

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
    ensure_entity_owned_by_user(db, item.source_type, item.source_id, current_user.id)
    ensure_entity_owned_by_user(db, item.target_type, item.target_id, current_user.id)
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
    query = db.query(models.Connection).filter(models.Connection.user_id == current_user.id)

    if entity_type and entity_id is not None:
        query = query.filter(
            ((models.Connection.source_type == entity_type) & (models.Connection.source_id == entity_id))
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
    thought.topics = get_topics_by_ids(db, thought_data.topic_ids, current_user.id)

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
    return QuoteResponse(
        id=new_item.id,
        book_title=new_item.book_title,
        quote_text=new_item.quote_text,
        page=new_item.page,
        thoughts=new_item.thoughts,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(new_item.attachments_json)
        ],
        created_at=new_item.created_at,
    )


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
    return [
        QuoteResponse(
            id=item.id,
            book_title=item.book_title,
            quote_text=item.quote_text,
            page=item.page,
            thoughts=item.thoughts,
            attachments=[
                GlossaryAttachment(**attachment)
                for attachment in parse_json_list(item.attachments_json)
            ],
            created_at=item.created_at,
        )
        for item in items
    ]


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

    return QuoteResponse(
        id=item.id,
        book_title=item.book_title,
        quote_text=item.quote_text,
        page=item.page,
        thoughts=item.thoughts,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


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
    item.quote_text = payload["quote_text"]
    item.page = payload["page"]
    item.thoughts = payload["thoughts"]
    item.attachments_json = json.dumps(
        [attachment.model_dump() for attachment in item_data.attachments]
    )

    db.commit()
    db.refresh(item)
    return QuoteResponse(
        id=item.id,
        book_title=item.book_title,
        quote_text=item.quote_text,
        page=item.page,
        thoughts=item.thoughts,
        attachments=[
            GlossaryAttachment(**attachment)
            for attachment in parse_json_list(item.attachments_json)
        ],
        created_at=item.created_at,
    )


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
        raise HTTPException(status_code=400, detail="This file type is not allowed")

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
                raise HTTPException(status_code=400, detail="File exceeds the 10MB upload limit")
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
        raise HTTPException(status_code=400, detail="Glossary term already exists")

    new_item = models.GlossaryTerm(
        user_id=current_user.id,
        workspace_id=current_user.workspace_id,
        term=normalized_term,
        definition=item.definition,
        term_type=item.term_type,
        aliases_json=json.dumps(item.aliases),
        tags_json=json.dumps(item.tags),
        links_json=json.dumps(item.links),
        attachments_json=json.dumps([attachment.model_dump() for attachment in item.attachments]),
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
            func.lower(models.GlossaryTerm.term) == item_data.term.strip().lower(),
            models.GlossaryTerm.id != item_id,
            models.GlossaryTerm.user_id == current_user.id,
        )
        .first()
    )
    if existing_item:
        raise HTTPException(status_code=400, detail="Glossary term already exists")

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
                rss_url=validate_outbound_url(source.rss_url) if source.rss_url else None,
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
        raise HTTPException(status_code=404, detail="Watchlist source not found")
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
    query = db.query(models.DiscoveryItem).filter(models.DiscoveryItem.user_id == current_user.id)
    if not include_dismissed:
        query = query.filter(models.DiscoveryItem.dismissed == False)
    if saved_only:
        query = query.filter(models.DiscoveryItem.saved_in_discovery == True)
    items = query.order_by(models.DiscoveryItem.published_at.desc().nullslast(), models.DiscoveryItem.created_at.desc()).all()
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
