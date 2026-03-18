---
title: CortexKnows
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# CortexKnows

## Overview

CortexKnows is a personal AI-powered knowledge and ideas operating system.

The goal of the application is to help a user capture, organize, relate, revisit, and later intelligently process information such as:

- thoughts and reflections
- knowledge items and links
- business ideas
- work ideas
- personal ideas
- quotes
- glossary terms
- topics
- watchlists of external sources
- discovery items collected from those sources

Conceptually, the project is building toward a "second brain" experience:

- capture information quickly
- structure it into meaningful entities
- connect related ideas
- monitor external sources
- surface recent updates
- prepare the data layer for future AI reasoning, suggestion, and semantic search

This repository already contains a working MVP with real frontend, backend, database, authentication, and multi-user isolation foundations.

---

## Academic Context

This project is not just a UI prototype. It is a full-stack application that explores:

- knowledge management systems
- AI product architecture
- relational data modelling
- user authentication and session management
- content organization and retrieval
- watchlist-driven discovery workflows
- preparation for future LLM and semantic search integrations

The system is intentionally designed in phases:

1. Build a usable MVP with real CRUD and structured backend persistence.
2. Add user accounts, isolation, security controls, and operational workflows.
3. Prepare the architecture for future AI features such as summarization, suggestion, semantic retrieval, and automated relation generation.

---

## Product Vision

CortexKnows is meant to become a personal knowledge hub and idea operating system.

In practical terms, the user should be able to:

- capture new information from one central place
- classify it into the right type
- assign topics
- connect related entities
- maintain a personal glossary
- monitor curated online sources through watchlists
- review latest discoveries
- save useful discoveries back into the personal library

In the longer term, the application is designed to support:

- AI-assisted summarization
- automatic topic suggestions
- automatic relation generation
- semantic search
- recommendation of related content
- richer graph-based knowledge navigation

---

## Main User Flows

### 1. Capture

The user opens the Capture page and creates one of several entity types:

- Thought
- Knowledge Item
- Business Idea
- Work Idea
- Personal Idea
- Quote
- Glossary Term

The Capture page is the main entry point for new information.

### 2. Organize

After capture, data can be:

- assigned to topics
- edited
- deleted
- filtered
- connected to other entities

### 3. Explore

The user can browse and manage dedicated sections:

- Thoughts
- Library
- Business Ideas
- Work Ideas
- Personal Ideas
- Quotes
- Topics
- Glossary

### 4. Monitor External Sources

The user creates watchlists for areas such as:

- SaaS
- machine learning
- product
- AI
- finance

Each watchlist can include sources such as blogs, feeds, newsletters, or websites.

### 5. Discovery

Watchlists are refreshed manually and by a backend scheduler. New content is collected into Discovery, where the user can:

- read the title and summary
- open the original source
- save to Library
- save inside Discovery
- dismiss content
- assign a topic

### 6. Review Updates

The TopBar bell icon and Updates page summarize recent activity across the workspace:

- fresh discovery items
- recent captures
- recent glossary entries
- recent topics
- recent watchlist activity

### 7. Authentication and Personal Workspace

Each user has:

- an account
- a personal workspace
- a profile
- an avatar
- a nickname
- preferences used by the application and future AI flows

---

## Current MVP Features

### Core Content

- Create, list, edit, view, and delete Thoughts
- Create, list, edit, view, and delete Knowledge Items
- Create, list, edit, and delete Business Ideas
- Create, list, edit, and delete Work Ideas
- Create, list, edit, and delete Personal Ideas
- Create, list, edit, and delete Quotes
- Create, list, edit, view, and delete Glossary Terms
- Create, list, edit, and delete Topics

### Organization

- Search and filtering
- Sort by recency
- Topic assignment
- Cross-entity connections
- Heuristic connection suggestions

### Discovery

- Watchlists
- Source suggestions
- Feed refresh
- Scheduler for recurring refresh
- Discovery stream
- Save discovery items back into Library

### User and Security

- Register and login
- Session cookies
- User profile and preferences
- Change password
- Forgot/reset password backend flow
- User-specific data isolation
- Workspace model foundation

---

## Architecture

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router

Frontend responsibilities:

- rendering application pages
- managing user interactions
- calling backend endpoints
- showing loading, error, and success states
- handling protected routes

### Backend

- FastAPI
- SQLAlchemy
- Python

Backend responsibilities:

- exposing REST API endpoints
- handling authentication and session validation
- applying business logic
- validating ownership and isolation
- ingesting watchlist feeds
- serving uploaded files safely

### Database

- PostgreSQL on Neon

Database responsibilities:

- persistence of entities
- user and workspace records
- sessions
- password reset tokens
- watchlists and discovery items
- relationships between content types

---

## High-Level Architecture Flow

```text
Frontend (React + Vite)
        |
        v
Backend API (FastAPI)
        |
        v
Database (Neon PostgreSQL)
```

Additional backend responsibilities:

```text
Watchlist Sources -> Feed Fetching -> Discovery Items -> User Review -> Save to Library
```

---

## Data Model Concept

The application uses multiple structured entities rather than storing everything as generic notes.

Main entities:

- User
- Workspace
- Session
- PasswordResetToken
- Thought
- KnowledgeItem
- BusinessIdea
- WorkIdea
- PersonalIdea
- Quote
- GlossaryTerm
- Topic
- Connection
- Watchlist
- WatchlistSource
- DiscoveryItem

This is important because future AI features work better when the data is already semantically structured.

---

## Security and Isolation

Security is a relevant part of this project and has already been improved significantly.

Current protections include:

- session cookies instead of browser-stored bearer tokens
- password hashing
- password reset tokens stored hashed
- rate limiting on sensitive auth endpoints
- user-level data ownership
- workspace foundation
- SSRF protection for watchlist fetch targets
- upload type and size restrictions
- ownership validation on connections

This means the project is not only a product prototype but also an example of applying secure full-stack development practices.

---

## Pages and Responsibilities

### Dashboard

Shows a high-level overview of the workspace, counts, and recent activity.

### Capture

Main entry point for creating new structured content.

### Thoughts

Used for reflections, hypotheses, notes, observations, and idea fragments.

### Library

Stores knowledge items such as articles, resources, links, and notes.

### Business Ideas / Work Ideas / Personal Ideas

Separate spaces for different categories of ideation.

### Quotes

Stores selected passages, references, and reflections.

### Topics

Used to organize content semantically across the system.

### Glossary

Stores terms, definitions, aliases, tags, links, and attachments.

### Watchlists

Used to monitor curated external sources by topic or area.

### Discovery

Aggregates new content retrieved from watchlists.

### Connections

Shows relations between entities in one place.

### Search

Provides global search across multiple entity types.

### Updates

Provides a recent activity and alert center for the whole workspace.

### User Area

Stores personal profile, preferences, and account settings.

---

## AI Positioning

Although CortexKnows is already useful without AI, its architecture is intentionally prepared for AI extensions.

Future AI-facing opportunities:

- summarize new captures
- propose topics
- propose connections automatically
- suggest related library items or thoughts
- recommend new watchlist sources
- support semantic search with embeddings
- answer questions over the personal knowledge base

The current system already creates the structured foundation needed for these future capabilities.

---

## Current State of the Project

The application is in a strong MVP stage.

It already supports:

- real backend persistence
- real user auth
- multi-user data separation
- topic assignment
- connections
- watchlists and discovery
- glossary
- uploads
- recent updates

It is not yet a final production system, but it is already a real working full-stack product with an extensible architecture.

---

## How to Run the Project

### Frontend

```bash
npm install
npm run dev
```

Default local frontend URL:

```text
http://localhost:8080
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Default local backend URL:

```text
http://localhost:8000
```

### Environment

The backend expects a `.env` file with a valid `DATABASE_URL`.

The project is configured to use Neon PostgreSQL.

---

## Deployment

The project is prepared for a simple production deployment using a single Docker-based web service.

Recommended deployment approach:

- Neon PostgreSQL for the database
- Render Web Service for the application
- one service serving both frontend and backend from the same domain

This approach was chosen because:

- authentication uses secure session cookies
- serving frontend and backend from the same origin avoids cross-site cookie issues
- deployment is simpler than managing separate frontend and backend hosts
- the backend scheduler can run inside the same service

Deployment-related files included in this repository:

- [`Dockerfile`](/c:/Users/icmarinho/Desktop/projectos-github/Mindweaver%20-%20Lovable/mind-weaver/Dockerfile)
- [`.dockerignore`](/c:/Users/icmarinho/Desktop/projectos-github/Mindweaver%20-%20Lovable/mind-weaver/.dockerignore)
- [`render.yaml`](/c:/Users/icmarinho/Desktop/projectos-github/Mindweaver%20-%20Lovable/mind-weaver/render.yaml)
- [`backend/.env.example`](/c:/Users/icmarinho/Desktop/projectos-github/Mindweaver%20-%20Lovable/mind-weaver/backend/.env.example)

Important production environment variables:

- `DATABASE_URL`
- `FRONTEND_URL`
- `SESSION_COOKIE_SECURE=true`

Important note about uploads:

- this MVP currently stores uploads on the application filesystem
- for stronger production durability, a persistent disk or object storage solution should be used later

Free deployment alternative:

- Hugging Face Spaces using Docker

This is a good zero-cost option for demos and academic presentation because the whole application can run as a single container.

Quick Hugging Face Spaces setup:

1. Create a new Space
2. Choose `Docker` as the SDK
3. Push this repository content to the Space repository
4. Add these Space secrets or variables:
   - `DATABASE_URL`
   - `FRONTEND_URL`
   - `SESSION_COOKIE_SECURE=true`
   - `UPLOADS_DIR=/app/backend/uploads`

Security notes for Hugging Face Spaces:

- Never commit `backend/.env` or any real secret into the repository.
- Store `DATABASE_URL`, `OPENAI_API_KEY`, and admin credentials only in Space secrets/variables.
- This repository now excludes local env files from Docker and Hugging Face upload contexts via `.dockerignore` and `.hfignore`.
- Rotate any key that has ever been stored in a local file, shared screenshot, terminal history, or commit.
- Use a dedicated low-privilege database user for production instead of reusing development credentials.
- Keep `SESSION_COOKIE_SECURE=true` in public HTTPS deployments.

---

## Suggested Demo Flow for a Professor

If someone wants to understand the system quickly, this is the best path:

1. Register a user and enter the app.
2. Open Capture and create a Thought.
3. Create a Knowledge Item and assign a Topic.
4. Open Glossary and create a term.
5. Open Connections and show how entities can be related.
6. Open Watchlists and add a source.
7. Refresh Discovery and save an item into Library.
8. Open Updates and show recent activity across the workspace.
9. Open User Area and show account/profile settings.

This sequence demonstrates product vision, architecture, structured data, user isolation, and extensibility.

---

## What Makes This Project Interesting

From a software engineering perspective, CortexKnows is interesting because it combines:

- product design
- frontend architecture
- backend API design
- relational modelling
- authentication
- secure session handling
- ingestion workflows
- knowledge management concepts
- preparation for AI integration

From an academic perspective, it demonstrates how a concept can be translated into a concrete full-stack system with clear domain modelling and incremental architecture evolution.

---

## Future Roadmap

Likely next steps:

- workspace membership and shared workspaces
- email-based password reset delivery
- stronger notification system
- AI-generated connection suggestions
- semantic search and embeddings
- richer graph navigation
- automated topic and entity extraction
- recommendation engine for discovery sources

---

## Final Summary

CortexKnows is a personal AI-ready second brain platform built as a structured, secure, full-stack MVP.

It is designed to help a user:

- capture information
- organize it meaningfully
- connect related knowledge
- monitor external sources
- discover relevant updates
- prepare their data for future AI-powered assistance

This repository represents both a working application and a strong architectural foundation for future AI product development.
