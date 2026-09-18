# Xpense AI — Backend

FastAPI + SQLAlchemy (async) + a LangChain retrieval layer over ChromaDB.

## Setup

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
cp .env.example .env           # then fill in GROQ_API_KEY
```

Environment variables are documented in `.env.example`; the names there match
`app/core/config.py` exactly. Anything not listed is ignored.

The only value you must set is `GROQ_API_KEY` (the advisor and OCR both use
it). `DATABASE_URL` is optional — leaving it unset uses a local SQLite file,
and if a configured PostgreSQL URL is unreachable the app falls back to SQLite
rather than refusing to start.

## Running

```bash
uvicorn app.main:app --reload
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

## Tests

```bash
pytest
```

The suite runs against in-memory SQLite and makes no network calls. Tests that
need the vector store skip themselves when `chromadb` is not installed.

## Retrieval (RAG)

The advisor answers with retrieved context. The stack lives in `app/rag/`:

| Module | Role |
| --- | --- |
| `documents/*.md` | The knowledge corpus — one markdown file per topic |
| `doc_loader.py` | Frontmatter parsing and section splitting for those files |
| `knowledge.py` | Short seed facts, tagged by topic |
| `runtime.py` | Picks a retrieval backend that fits the host's memory |
| `embeddings.py` | Chroma's ONNX MiniLM model, with a hashing fallback |
| `vector_store.py` | A LangChain `VectorStore` backed by a persistent Chroma collection |
| `lite_store.py` | In-memory BM25 — no chromadb, no onnxruntime |
| `knowledge_base.py` | Chunking, seeding, indexing, persona-aware retrieval |
| `chain.py` | The LCEL chain: retrieve → prompt → LLM → text |

### Two backends, and why

`chroma` embeds each chunk with a local ONNX MiniLM model and searches by
cosine similarity. It matches on meaning, so "how do I pay less tax" finds a
passage that only says "deduction". It also needs roughly 1.5 GB: `chromadb`,
`onnxruntime` and an 80 MB model that re-downloads on every boot if the
filesystem is ephemeral.

`lite` is Okapi BM25 held in memory — a few hundred kilobytes and no model. On
a corpus this size it is a strong retriever, not a token fallback, because the
useful signal in these questions is specific vocabulary: *80C*, *ELSS*, *HRA*,
*moat*. What it gives up is synonymy.

`RAG_BACKEND` selects one. The default, `auto`, reads the cgroup memory limit —
the number that actually gets the process OOM-killed — and picks `lite` below
1.5 GB. If there is no cgroup limit but an environment variable marks a managed
host (Render, Fly, Heroku, Cloud Run), it also picks `lite`, because host RAM
there says far more than the instance may use. A failure to build the chosen
backend falls back to `lite`, then to a plain keyword scan.

**On a 512 MB instance, leave it on `auto` or set `lite` explicitly.** Setting
`chroma` there will OOM on boot.

`GET /api/v1/advisor/knowledge/status` reports which backend is live, why it
was chosen, and the memory limit that was detected.

### Adding knowledge

Drop a markdown file into `app/rag/documents/` with frontmatter:

```markdown
---
title: Section 80C (now Section 123) — The ₹1.5 Lakh Deduction
topic: indian_tax
persona: indian_finance
tags: [80C, ELSS, PPF]
as_of: 2026-09-18
---

## What it is

...
```

`persona` is one of `warren_buffett`, `ramit_sethi`, `indian_finance`, or `all`
for material every persona should see. Documents are split at `##` headings, so
a retrieved passage is a coherent section and can be cited as
*document › section*.

No Python change is needed and no migration: IDs are content hashes, so
restarting re-indexes edited documents and adds new ones without duplicating
anything.

### Persona routing

Retrieval is blended. The persona's own material and anything tagged `all` is
searched alongside an unfiltered search; persona hits get a small score boost
and the merged list is truncated to `RAG_TOP_K`. So Buffett leads with
value-investing passages but can still cite an emergency-fund rule, and a tax
question reaches the tax documents whoever is asked.

Under `chroma`, the first run downloads the embedding model (~80 MB) and
indexes the corpus into `chroma_db/`; both are cached afterwards. Under `lite`
the index is rebuilt at startup, which takes milliseconds. Seeding is
idempotent either way — document IDs are content hashes, so editing a document
and restarting updates the changed entries instead of duplicating them.

If `langchain-core` cannot be loaded, retrieval degrades to a keyword search
over the corpus and the API keeps working. Check which path is active:

```
GET /api/v1/advisor/knowledge/status
GET /api/v1/advisor/knowledge/search?q=section+80C&persona=indian_finance
```

## Tax planning

`POST /api/v1/advisor/tax-plan` estimates the user's position for
**FY 2026-27 (AY 2027-28)** under both regimes and has the selected persona
explain it, grounded in the tax documents.

```json
{ "annual_income": 1800000, "declared_deductions": 450000, "persona": "indian_finance" }
```

Every field is optional. Income defaults to the profile's monthly income × 12;
deductions default to an estimate inferred from transactions categorised
Investments and Healthcare. `"explain": false` returns the numbers without
calling the LLM.

The response carries both regimes broken down (taxable income, rebate,
surcharge, cess), per-section deduction headroom, the assumptions the estimate
made, and the citations behind the explanation.

The statutory constants live at the top of `app/services/tax_service.py` — a
Finance Act change is one edit there. This is an estimate, not a filing
computation; it has no view of Form 16, capital gains, or other income heads.

`app/services/rag_service.py` remains as a thin facade over `app/rag/` so older
imports (`query_knowledge_base`, `index_document`, `reset_collection`) still
work.

## Layout

```
app/
├── agent/       LLM transport (Groq → Anthropic), reasoning-block filtering
├── api/v1/      Route handlers
├── core/        Settings, security, declarative base
├── db/          Async engine, session dependency, startup schema sync
├── models/      SQLAlchemy ORM models
├── rag/         Retrieval-augmented generation stack
├── schemas/     Pydantic request/response models
└── services/    Business logic
```
