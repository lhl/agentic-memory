---
title: "Supermemory — Memory API for AI Agents"
author: Dhravya Shah / supermemoryai
date: 2026-03-28
type: reference
tags:
  - memory-service
  - knowledge-graph
  - versioned-memory
  - user-profiles
  - industry
  - startup
source: https://supermemory.ai/docs
source_repo: https://github.com/supermemoryai/supermemory
local_clone: ../vendor/supermemory
version: v4 API (as of 2026-03-28)
context: "VC-backed startup (Y Combinator-adjacent); commercial API with free/paid tiers. Open-source repo is MIT but core engine is proprietary backend."
related:
  - chhikara-mem0.md
  - rasmussen-zep.md
  - ANALYSIS-supermemory.md
---

# Supermemory — Memory API for AI Agents

## TL;DR

- **Memory-as-a-service** startup (supermemoryai) building a "memory and context layer for AI agents." Commercial API at `api.supermemory.ai` with SDKs, MCP server, browser extension.
- **Data model** distinguishes **Documents** (raw content, 6-stage processing pipeline), **Chunks** (embedded segments), **Memories** (extracted facts with versioning + relationships), and **Spaces** (container-tag isolation).
- **Memory versioning**: linked-list version chains via `parentMemoryId`/`rootMemoryId`/`isLatest` fields. Three relationship types: `updates` (supersedes), `extends` (enriches), `derives` (inferred).
- **Temporal forgetting**: `forgetAfter` date + `isForgotten` flag + `forgetReason` — memories can expire.
- **User profiles**: dynamically generated from memories — split into **static** (permanent facts: name, role) and **dynamic** (recent context: current projects).
- **Self-reported benchmark claims**: #1 on LongMemEval (81.6%), LoCoMo, ConvoMem. Published MemoryBench framework for running benchmarks. **No peer-reviewed paper.**
- **Critical caveat**: the open-source repo contains **only frontend UI, SDK clients, and type definitions**. All core engine logic (versioning, relationship traversal, search, document processing, forgetting, profile generation) is in the **proprietary hosted backend**. Cannot verify implementation quality.

## What's Novel / Different

1. **Memory relationship ontology** (`updates`/`extends`/`derives`) — richer than Mem0's `ADD/UPDATE/DELETE` ops; closer to MIRA-OSS's typed relationship links (`supersedes`/`conflicts`/`supports`/`refines`/`precedes`/`contextualizes`) but simpler (3 types vs 6).
2. **Version chains** as linked list (parent→child with `isLatest`) — not event-sourced like Gigabrain's append-only events, but supports querying specific versions or full history.
3. **Static vs dynamic profile synthesis** — automatic partitioning of memories into permanent facts vs recent context. Profiles served at ~50ms (claimed). No other system in our survey does this as a first-class API.
4. **Time-based forgetting** with explicit reason tracking — most systems don't forget (or use decay scores without hard deletion). `forgetAfter` + `forgetReason` is explicit TTL with auditability.
5. **Multi-model embedding storage** — schema supports multiple embedding columns (`memoryEmbedding`, `memoryEmbeddingNew`, `matryokshaEmbedding`) per memory, enabling model migration without full reindex.
6. **MemoryBench** — open-source benchmarking framework for comparing memory systems across LongMemEval/LoCoMo/ConvoMem with a composite MemScore metric (quality% + latency + context tokens).

## Data Model

### Core entities (from `packages/validation/schemas.ts`)

**Document**: Raw content source. Fields: `id`, `title`, `content`, `summary`, `url`, `type` (text/pdf/image/video/...), `status` (queued→extracting→chunking→embedding→indexing→done), `tokenCount`, `chunkCount`, `summaryEmbedding` (+ `summaryEmbeddingNew` for model migration), `processingMetadata` (step-by-step tracking).

**Chunk**: Segment of a document. Fields: `id`, `documentId`, `content`, `type` (text/image), `position`, `embedding` (+ `embeddingNew`, `matryokshaEmbedding` for multi-model).

**MemoryEntry**: Extracted semantic memory. Fields: `id`, `memory` (text), `spaceId`, `version`, `isLatest`, `parentMemoryId`, `rootMemoryId`, `memoryRelations` (record of `updates`/`extends`/`derives`), `isStatic`, `isForgotten`, `forgetAfter`, `forgetReason`, `isInference`, `sourceCount`, `memoryEmbedding` (+ multi-model variants).

**Space**: Isolation container. Fields: `id`, `name`, `containerTag`, `visibility` (public/private/unlisted), `contentTextIndex`. Role-based access (owner/admin/editor/viewer).

**MemoryDocumentSource**: Join table linking memories back to source documents with `relevanceScore`.

### Relationships

Three relationship types in `MemoryRelationEnum`:
- `updates` — new information supersedes old (triggers version chain)
- `extends` — new information enriches existing memory
- `derives` — inferred connection from pattern analysis

Relationships are stored as a `Record<string, MemoryRelation>` on each MemoryEntry. Search API returns `context.parents[]` and `context.children[]` arrays with relation type, version distance, and memory content.

## Write Path (claimed)

1. Content submitted via `POST /v3/documents` (text, URL, PDF, image, video)
2. 6-stage pipeline: queued → extracting (format-specific) → chunking (semantic boundaries) → embedding → indexing (relationship discovery) → done
3. Memories extracted from chunks and linked to source documents via `MemoryDocumentSource`
4. Relationship indexing: system identifies `updates`/`extends`/`derives` connections to existing memories
5. Version chains maintained: old memory gets `isLatest: false`, new memory linked via `parentMemoryId`

**Note:** All write-path logic is in the proprietary backend. Open-source code only submits content and polls status.

## Read Path / Retrieval (claimed)

1. Query embedded → cosine similarity against indexed vectors (HNSW in Postgres/pgvector)
2. Threshold filtering (adjustable `chunkThreshold` 0–1)
3. Relationship expansion (follow updates/extends/derives edges)
4. Ranking: similarity score + recency + static/dynamic priority + relationship strength + metadata matches
5. Optional: reranking (`rerank: true`), query rewriting (`rewriteQuery: true`, +400ms)
6. Metadata filtering with AND/OR logic, numeric comparisons, array contains

**Profile endpoint** (`POST /v4/profile`): returns `{ profile: { static[], dynamic[] }, searchResults }` — combines user model with query-relevant memories.

## Infrastructure

- **Compute**: Cloudflare Workers (serverless edge)
- **Database**: PostgreSQL via Cloudflare Hyperdrive (connection pooling) + pgvector for HNSW indexing
- **State**: Cloudflare Durable Objects (MCP server sessions) + KV (cache) + R2 (object storage)
- **No separate vector DB** — embeddings stored in Postgres alongside metadata
- **Auth**: Better Auth (user/org management)
- **Monitoring**: Sentry + PostHog

## Framework Integrations

- TypeScript SDK (`supermemory` npm package)
- Vercel AI SDK (`@supermemory/ai-sdk` — `withSupermemory()` middleware)
- LangChain, LangGraph, Mastra, OpenAI Agents SDK tools
- Python: agent-framework, pipecat SDK, OpenAI SDK integration
- MCP server (memory/recall/whoAmI/listProjects tools + profile/projects resources)
- Browser extension (Chrome/Firefox — save tabs, auto-capture prompts)
- Connectors: Google Drive, Gmail, Notion, OneDrive, GitHub, S3

## Metrics (self-reported)

- 20k GitHub stars, 1.8k forks, 30 contributors
- Search latency: <50ms p95 (claimed)
- Processing throughput: 10,000 documents/hour (claimed)
- LongMemEval: 81.6% (claimed #1)
- LoCoMo, ConvoMem: claimed #1 (no specific scores published)

## Open Questions / Risks

- **Core engine is proprietary** — cannot verify versioning, relationship traversal, forgetting, or search quality. Schema definitions exist but implementation is behind `api.supermemory.ai`.
- **Benchmark claims are self-reported** — no peer-reviewed paper, no reproducible results in repo. MemoryBench framework exists but no committed baseline results.
- **Forgetting logic unverifiable** — `forgetAfter`/`isForgotten` fields defined but no processing code in open source.
- **Version chain write semantics unclear** — how are `updates`/`extends`/`derives` relationships detected? LLM-driven? Rule-based? Not documented.
- **No write gating / governance** — no evidence of junk filtering, dedup, plausibility checks, or injection scanning in the public code. Security posture of the backend is unknown.
- **Single-vendor risk** — entire system depends on `api.supermemory.ai` availability. Self-hosting option documented but requires their backend image.
- **DELETE semantics** — bulk delete endpoint exists; unclear whether delete is hard (history loss like Mem0) or soft (tombstone with audit trail).
