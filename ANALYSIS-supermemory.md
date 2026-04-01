---
title: "Analysis — Supermemory (supermemoryai, 2024–2026)"
date: 2026-03-28
type: analysis
source:
  - references/supermemory.md
  - vendor/supermemory/
related:
  - ANALYSIS.md
  - ANALYSIS-arxiv-2504.19413-mem0.md
  - ANALYSIS-arxiv-2501.13956-zep.md
  - ANALYSIS-mira-OSS.md
---

# Analysis — Supermemory (supermemoryai, 2024–2026)

Supermemory is a **memory-as-a-service** product from a small VC-backed startup (Dhravya Shah et al.), offering a hosted API for adding long-term memory to AI agents. It's positioned alongside Mem0 and Zep as an industry memory layer, with claims of benchmark leadership (LongMemEval, LoCoMo, ConvoMem). The open-source repo (20k stars, MIT) provides SDKs, a web UI, and MCP integration — but the core memory engine is proprietary.

This analysis evaluates supermemory's **design choices** (via schemas and architecture documentation) rather than **implementation quality** (which cannot be verified from the open-source code).

## TL;DR

- **Memory model**: Documents → Chunks → MemoryEntries with version chains (`parentMemoryId`/`isLatest`) and a 3-type relationship ontology (`updates`/`extends`/`derives`). Static vs dynamic memory distinction. Time-based forgetting (`forgetAfter`). Multi-model embedding columns for model migration.
- **Profile synthesis**: First-class `/v4/profile` endpoint returning `{ static, dynamic, searchResults }` — automatic partitioning of permanent facts vs recent context. No other system in our survey exposes this as an API primitive.
- **Infrastructure**: Cloudflare Workers + PostgreSQL (pgvector/HNSW) + Durable Objects. No separate vector DB. Extensive framework integrations (Vercel AI SDK, LangChain, MCP, etc.).
- **Critical finding**: The open-source repo is a **frontend/SDK client**. All core logic — versioning, relationship indexing, forgetting, search, document processing, profile generation — runs on the proprietary hosted backend at `api.supermemory.ai`. Schemas define the data model; implementation is not inspectable.
- **Benchmark claims**: Self-reported #1 on LongMemEval (81.6%), LoCoMo, ConvoMem. No peer-reviewed paper. MemoryBench framework for running benchmarks is open-source, but no committed results.
- **Most reusable takeaway**: The versioned-memory-with-typed-relationships pattern and the static/dynamic profile split are clean design ideas worth adopting — but the lack of visible implementation means we're evaluating a **design spec**, not a proven system.

## Stage 1 — Descriptive (what the system proposes)

### 1.1 Architecture overview

Supermemory is a **Turbo monorepo** (TypeScript, Bun) with:

| Component | What it does | Where core logic lives |
|---|---|---|
| `apps/web/` | Next.js consumer UI (console.supermemory.ai) | Frontend only |
| `apps/mcp/` | MCP server (Cloudflare Durable Objects) | Wraps hosted API |
| `apps/browser-extension/` | Chrome/Firefox extension | API client |
| `packages/validation/` | Zod schemas (data model + API) | **Schema definitions** |
| `packages/tools/` | Framework integrations (Vercel AI, LangChain, etc.) | API client wrappers |
| `packages/lib/` | Shared utilities, API route config | Routes to hosted backend |
| Hosted backend (`api.supermemory.ai`) | All core engine logic | **Proprietary** |

All API calls route through `createFetch({ baseURL: "https://api.supermemory.ai/v3" })` (see `packages/lib/api.ts:231`). Self-hosting is documented but requires their backend image.

### 1.2 Data model

The data model (from `packages/validation/schemas.ts`) has four entity layers:

**Documents** — raw content sources with a 6-stage processing pipeline:
```
queued → extracting → chunking → embedding → indexing → done
```
Fields include multi-model summary embeddings (`summaryEmbedding` + `summaryEmbeddingNew`) and step-by-step processing metadata.

**Chunks** — semantic segments of documents, each with position tracking and multi-model embeddings (`embedding`, `embeddingNew`, `matryokshaEmbedding`).

**MemoryEntries** — the core unit. Extracted semantic facts with:
- **Version control**: `version`, `isLatest`, `parentMemoryId`, `rootMemoryId`
- **Relationships**: `memoryRelations: Record<string, "updates" | "extends" | "derives">`
- **Classification**: `isStatic` (permanent fact), `isInference` (derived), `isForgotten`
- **Temporal**: `forgetAfter` (TTL date), `forgetReason`
- **Multi-model embeddings**: `memoryEmbedding` + `memoryEmbeddingNew` variants

**Spaces** — isolation containers with `containerTag` scoping and role-based access (owner/admin/editor/viewer).

A **MemoryDocumentSource** join table links memories back to source documents with `relevanceScore` — this is provenance tracking, though lighter than Gigabrain's full event-sourced audit trail.

### 1.3 Memory relationships

Three relationship types:

| Type | Semantics | Example |
|---|---|---|
| `updates` | New information supersedes old | "Uses React 17" → "Uses React 18" |
| `extends` | New information enriches existing | "Likes TypeScript" ← "Completed TS course" |
| `derives` | Inferred connection from patterns | Multiple ML interests → "Is ML engineer" |

The search API (`/v4/search`) returns relationship context as `context.parents[]` and `context.children[]` arrays, each with `relation` type, `version` distance (negative for parents, positive for children), `memory` content, and `updatedAt`.

**Comparison to adjacent systems:**

| System | Relationship types | Implementation |
|---|---|---|
| Supermemory | 3 types (updates/extends/derives) | Proprietary backend |
| MIRA-OSS | 6 types (supersedes/conflicts/supports/refines/precedes/contextualizes) | Open-source (PostgreSQL) |
| Mem0 | None explicit; `UPDATE`/`DELETE` ops | Open-source pipeline |
| Mem0g | Labeled directed graph (entity→relation→entity) | Open-source (Neo4j) |
| Zep/Graphiti | Temporal knowledge graph with validity intervals | Partially open-source |
| Gigabrain | Event-sourced (every op is an event; no explicit relationship types) | Open-source |

### 1.4 Version chains

Memories form linked-list version chains:
```
v1: "Prefers Vue" (isLatest: false, rootMemoryId: v1.id)
  ↓ updates
v2: "Prefers React" (isLatest: false, parentMemoryId: v1.id, rootMemoryId: v1.id)
  ↓ updates
v3: "Prefers React+TS" (isLatest: true, parentMemoryId: v2.id, rootMemoryId: v1.id)
```

Default queries return only `isLatest: true` memories. Full version history is traversable via parent/child context in search results.

**Comparison**: Gigabrain uses append-only event sourcing (richer audit trail, every op logged). Zep uses bi-temporal validity intervals (`valid_from`/`valid_to`). Supermemory's linked-list is simpler than either but supports the essential "current vs historical" distinction.

### 1.5 Profile generation

The `/v4/profile` endpoint returns:
```json
{
  "profile": {
    "static": ["Name: John", "Role: Engineer", ...],
    "dynamic": ["Working on React project", "Asked about auth 2h ago", ...]
  },
  "searchResults": { "results": [...] }
}
```

Static profile comes from memories with `isStatic: true`. Dynamic context comes from recent `isStatic: false` memories. The search results are query-dependent — the profile endpoint combines user model + retrieval in one call.

This is a **clean API design** that no other system in our survey exposes as a primitive. Most systems treat profile/persona as a manually maintained block (Letta's `memory_blocks`, OpenClaw's `SOUL.md`) rather than a dynamically generated view over the memory store.

### 1.6 Forgetting

Schema fields: `isForgotten: boolean`, `forgetAfter: Date`, `forgetReason: string`.

The MCP server's `memory` tool has a `forget` action (alongside `save`) — users can explicitly forget memories. Time-based forgetting via `forgetAfter` implies a backend scheduler that marks memories as forgotten after the TTL expires.

No forgetting logic exists in the open-source code. We cannot verify whether forgotten memories are soft-deleted (tombstoned, still queryable for history) or hard-deleted.

### 1.7 Framework integrations

Supermemory has the broadest framework integration surface of any memory system in our survey:

- **Vercel AI SDK**: `withSupermemory()` middleware that injects memory context into system prompts
- **LangChain/LangGraph**: Memory tools for agents
- **Mastra/OpenAI Agents SDK**: Tool definitions
- **MCP server**: Full Model Context Protocol implementation with `memory`, `recall`, `whoAmI`, `listProjects` tools + `supermemory://profile` and `supermemory://projects` resources
- **Python**: agent-framework, pipecat SDK, OpenAI SDK integration
- **Browser extension**: WXT-based Chrome/Firefox extension for saving tabs, auto-capturing prompts
- **Connectors**: Google Drive, Gmail, Notion, OneDrive, GitHub, S3

## Stage 2 — Evaluative (what we can verify, what we can't, what breaks)

### 2.1 The open-source / hosted-backend split

This is the defining characteristic of supermemory and the primary constraint on our analysis.

| Aspect | Open-source repo | Hosted backend |
|---|---|---|
| Data model schemas | ✅ (Zod types) | N/A |
| API surface definition | ✅ (OpenAPI via zod-openapi) | N/A |
| Write path (extract/chunk/embed/index) | ❌ | ✅ |
| Version chain management | ❌ | ✅ |
| Relationship indexing + traversal | ❌ | ✅ |
| Forgetting logic | ❌ | ✅ |
| Profile generation | ❌ | ✅ |
| Vector search (HNSW) | ❌ | ✅ |
| Hybrid search | ❌ | ✅ |
| Document processing pipeline | ❌ | ✅ |
| MCP server (tool implementations) | ⚠️ (wraps API) | ✅ |
| Web UI | ✅ (Next.js) | N/A |
| SDK clients | ✅ | N/A |
| Graph visualization | ✅ (React component) | N/A |

The `similarity.ts` file in the open-source code is **visualization-only** — cosine similarity computed on already-retrieved vectors for rendering connection strengths in the graph UI. It is not the search engine.

**Implication for our analysis**: We are evaluating a **design document** (schemas + architecture docs), not a running system. Claims about implementation quality, performance, and correctness cannot be independently verified.

### 2.2 Benchmark claims

**Self-reported:**
- LongMemEval: 81.6% (claimed #1)
- LoCoMo: claimed #1 (no specific score)
- ConvoMem: claimed #1 (no specific score)

**MemoryBench framework** (open-source, `apps/docs/memorybench/`):
- CLI tool for running benchmarks against LongMemEval/LoCoMo/ConvoMem
- Composite MemScore metric: quality% + latency (ms) + context tokens
- Supports comparing multiple providers (Supermemory, Mem0, Zep)
- Judge models: GPT-4o, Claude Opus 4.5, Gemini 2.5 Pro, etc.

**Verification status:**
- No peer-reviewed paper (unlike Mem0's arXiv:2504.19413 or Zep's arXiv:2501.13956)
- No committed baseline results or comparison data in the repo
- MemoryBench framework exists but is a benchmarking tool, not a results publication
- The 81.6% LongMemEval figure cannot be cross-referenced against published LongMemEval leaderboards

**Context**: Mem0 reports 66.88% overall judge score on LoCoMo (2025 paper). If supermemory's claims are accurate, the improvement is substantial — but we cannot reproduce or validate the comparison methodology.

### 2.3 What's genuinely novel (design-level)

1. **Static/dynamic profile as a first-class API** — the `/v4/profile` endpoint that automatically partitions memories into permanent facts vs recent context and serves them alongside search results is a clean design primitive. No other system exposes this.

2. **Multi-model embedding columns** — supporting `embedding`, `embeddingNew`, and `matryokshaEmbedding` per chunk/memory enables gradual embedding model migration without full reindex. Practical production concern that most systems ignore.

3. **`forgetAfter` with reason tracking** — explicit TTL on memories with `forgetReason` provides auditability that most decay/TTL systems lack. The reason field means you can reconstruct *why* something was forgotten.

4. **MemoryBench as an evaluation framework** — regardless of whether supermemory's own scores are accurate, publishing a framework for cross-system memory benchmarking is a contribution to the field.

### 2.4 What's standard / not novel

- **Semantic chunking + vector similarity search** — standard RAG
- **Container tag isolation** — standard multi-tenancy
- **Metadata filtering** — standard search feature
- **Framework integrations** — SDK/wrapper engineering, not memory innovation
- **Document processing pipeline** — standard ingestion pattern
- **MCP server** — standard integration surface

### 2.5 Gaps, risks, and missing pieces

**No visible write gating / governance:**
- No evidence of junk filtering, dedup, plausibility checks, or injection scanning
- Contrast with Gigabrain (7-stage pipeline with 30+ junk patterns, review queue) or shisad (taint-aware, capability-scoped)
- For a commercial API accepting arbitrary user content, write-path hygiene is critical

**No visible conflict handling:**
- The `updates` relationship implies supersession, but how are conflicts *detected*? LLM-driven? Rule-based? Cosine similarity threshold? Not documented.
- What happens when two conflicting memories are ingested simultaneously?

**DELETE semantics unclear:**
- Bulk delete endpoint exists (`DELETE /v3/documents/bulk`)
- Whether delete is hard (Mem0-style history loss) or soft (tombstone) is unknown from the public API

**No maintenance/consolidation story:**
- No evidence of scheduled dedup, quality sweeps, graph pruning, or consolidation jobs
- Contrast with Gigabrain (8-stage nightly pipeline), MIRA-OSS (entity GC + consolidation), OpenClaw (decay cron + reindex)
- For a system that claims "trillions of memories," maintenance is essential

**Single-vendor dependency:**
- All core logic behind `api.supermemory.ai`
- Self-hosting documented but requires their backend image
- No path to inspect, audit, or customize the core engine

**Security posture unknown:**
- Claims SOC 2 and GDPR compliance
- No evidence of memory poisoning defenses, prompt injection scanning, or taint tracking
- For a shared multi-tenant system, this is a significant gap vs shisad's security-first approach

## Stage 3 — Synthesis hooks (how this fits + what we take)

### 3.1 Comparison to adjacent systems

**vs Mem0:**
- Supermemory adds version chains and typed relationships (Mem0 has `ADD/UPDATE/DELETE` ops but no relationship ontology)
- Supermemory adds profile synthesis (Mem0 treats memories as flat list)
- Mem0 has a peer-reviewed paper with reproducible benchmarks; supermemory does not
- Both are commercial APIs with open-source SDKs; Mem0's core pipeline is more visible in the open-source code

**vs Zep/Graphiti:**
- Zep has bi-temporal validity intervals (richer temporal semantics than supermemory's `forgetAfter`)
- Zep has community-level graph aggregation (supermemory doesn't mention this)
- Zep has a peer-reviewed paper; supermemory does not
- Supermemory has broader framework integrations (MCP, browser extension, more SDKs)

**vs MIRA-OSS:**
- MIRA-OSS has 6 typed relationship types vs supermemory's 3
- MIRA-OSS has activity-day sigmoid decay vs supermemory's TTL-based forgetting
- MIRA-OSS is fully open-source (AGPLv3) — entire engine is inspectable
- MIRA-OSS has Text-Based LoRA behavioral adaptation — no equivalent in supermemory
- Supermemory has broader integrations and commercial polish

**vs Gigabrain:**
- Gigabrain has event-sourced storage (stronger audit trail than version chains)
- Gigabrain has multi-gate write pipeline (junk filter, dedup, plausibility, review queue)
- Gigabrain has class-budgeted recall (core/situational/decisions)
- Supermemory has richer relationship types and profile synthesis
- Both handle memory versioning, but via different mechanisms

### 3.2 Mapping to shisad

**What shisad can draw from supermemory's design:**

1. **Static/dynamic profile split** — useful API primitive for shisad's user model. Generate profile by partitioning `MemoryEntry` objects by a `stable` flag, serve as a cached endpoint.

2. **`forgetAfter` + `forgetReason`** — maps cleanly to shisad's planned TTL/decay. The reason field adds auditability beyond a simple TTL counter.

3. **Multi-model embedding columns** — practical for shisad's eventual embedding model upgrades. Store old and new embeddings simultaneously during migration.

4. **Version chains** — shisad already plans versioned corrections (`supersedes`, `valid_from/valid_to`). Supermemory's simpler linked-list is a viable starting point; can upgrade to bi-temporal (Zep-style) later.

**Where shisad should diverge:**

1. **Write gating** — shisad's taint-aware, capability-scoped approach is stronger than supermemory's (apparently) ungated writes.

2. **Transparency** — shisad benefits from keeping core logic inspectable and auditable, not behind a hosted API.

3. **Maintenance pipeline** — shisad should follow Gigabrain/MIRA-OSS patterns for scheduled consolidation, not rely on a "the system handles it" black box.

4. **Conflict detection** — shisad should use explicit provenance + validity intervals + user verification, not just "the latest version wins."

### 3.3 Novel features for ANALYSIS.md Section 11

**Write-side:**
- **Multi-model embedding storage** — schema supports multiple embedding model columns per memory/chunk, enabling gradual model migration without full reindex. No other system in the survey has this.

**Retrieval-side:**
- **Static/dynamic profile synthesis API** — automatic partitioning of memories into permanent facts vs recent context, served as a first-class endpoint. Unique in the survey.

**Maintenance:**
- **Time-based forgetting with reason tracking** — `forgetAfter` TTL + `forgetReason` audit trail. Most systems use decay scores without hard expiration or don't forget at all.

## Corrections & Updates

- Capture date: 2026-03-28.
- Source: open-source repo commit `38282a3` + architecture docs + `api.supermemory.ai` docs.
- All implementation claims are from architecture documentation and schema definitions; core engine logic is proprietary and has not been independently verified.
