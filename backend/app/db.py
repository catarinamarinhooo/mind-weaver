from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Base = declarative_base()


def ensure_mvp_schema():
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS link VARCHAR")
        )
        conn.execute(
            text(
                "ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS attachments_json TEXT"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS media_links_json TEXT"
            )
        )
        conn.execute(
            text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS attachments_json TEXT")
        )
        conn.execute(
            text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS book_type VARCHAR")
        )
        conn.execute(
            text(
                "ALTER TABLE personal_ideas ADD COLUMN IF NOT EXISTS attachments_json TEXT"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE business_ideas ADD COLUMN IF NOT EXISTS attachments_json TEXT"
            )
        )
        conn.execute(
            text("ALTER TABLE work_ideas ADD COLUMN IF NOT EXISTS attachments_json TEXT")
        )
        conn.execute(
            text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text(
                "ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE business_ideas ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE business_ideas ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE work_ideas ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE work_ideas ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE personal_ideas ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE personal_ideas ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE glossary_terms ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE glossary_terms ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE watchlist_sources ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text(
                "ALTER TABLE watchlist_sources ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE discovery_items ADD COLUMN IF NOT EXISTS user_id INTEGER")
        )
        conn.execute(
            text(
                "ALTER TABLE discovery_items ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS ai_action_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    workspace_id INTEGER,
                    action_type VARCHAR NOT NULL,
                    source_entity_type VARCHAR NOT NULL,
                    source_entity_id INTEGER NOT NULL,
                    target_entity_type VARCHAR NULL,
                    target_entity_id INTEGER NULL,
                    summary TEXT NULL,
                    details TEXT NULL,
                    rolled_back_at TIMESTAMP NULL,
                    rollback_details TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
        )
        conn.execute(
            text("ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_name_key"))
        conn.execute(
            text(
                "ALTER TABLE glossary_terms DROP CONSTRAINT IF EXISTS glossary_terms_term_key")
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_topics_workspace_name_unique ON topics (user_id, name)"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_glossary_terms_user_term_unique ON glossary_terms (user_id, term)"
            )
        )


def test_db():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.scalar()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
