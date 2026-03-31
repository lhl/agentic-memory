---
title: "Analysis — MIRA-OSS v1 rev 2 (taylorsatula)"
date: 2026-03-30
type: analysis
system: mira-OSS
source:
  - vendor/mira-OSS (snapshot; reviewed @ f8b13b9, 2026-03-30, version 2026.03.30-major)
  - previous review: ee44b18 (2026-03-03, version 2026.03.07-major)
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
---

# Analysis — MIRA-OSS v1 rev 2 (taylorsatula)

MIRA is a self-hosted, event-driven conversational AI system built around the constraint of **one continuous conversation forever**. It maintains persistent long-term memory with autonomous lifecycle management (extraction, linking, consolidation, decay), a modular "working memory" system prompt composer, behavioral adaptation via "Text-Based LoRA," and a background agent system for speculative context gathering. The system uses PostgreSQL (pgvector + BM25 full-text search) as its primary store, Valkey (Redis-compatible) for caching and trinket state, and HashiCorp Vault for credential management.

This file is a deep dive over the vendored snapshot in `vendor/mira-OSS` (commit `f8b13b9`, version `2026.03.30-major`). It supersedes the prior analysis of commit `ee44b18` (version `2026.03.07-major`).

## What changed: v1 (2026.03.07) → v1 rev 2 (2026.03.30)

Summary of substantive changes (not just bugfixes/cleanup):

| Area | Change | Impact |
|------|--------|--------|
| **Background agent system** | New `agents/` directory: LLM-in-a-loop "forage" agent running in daemon threads with shared tools, quality rubric, and ForageTrinket for result surfacing | First system in this repo with autonomous sub-agent collaboration during conversation |
| **User model synthesis** | Assessment extraction (alignment/misalignment/contextual_pass signals) → critic validation loop (Haiku, 3 attempts) → XML user model stored on `users.user_model`, every 7 use-days | Replaces prior blind feedback extraction; anchored to system prompt sections |
| **Portrait synthesis** | 150–250 word prose portrait from recent collapsed summaries, every 10 use-days, injected as `{user_context}` | User-facing identity continuity |
| **Verbose refinement ablated** | Removed trim/split pipeline for memories >70 chars (sync path had KeyError bug proving it never ran) | Clean ablation: dropped columns, constraints, LLM configs, pricing entries |
| **Relationship classification → Haiku** | Downgraded from Sonnet to Haiku-4-5-20251001 for 2-text classification | Cost optimization; well-scoped task for "big fast idiot" |
| **Segment pause/resume** | Explicit `paused` state; paused segments never timeout; auto-resume on next message | User-controlled conversation suspension |
| **Extraction pipeline restructure** | ExtractionEngine (payloads) / MemoryProcessor (pure data, no side effects) / ExecutionStrategy ABC (shared `_process_and_store_memories`) | Eliminates batch/immediate code duplication |
| **3-axis linking** | Vector similarity + entity co-occurrence + TF-IDF term overlap | TF-IDF catches orphan memories (no entities, distant embeddings) |
| **Hub discovery formalized** | Dedicated `HubDiscoveryService` replacing ad-hoc entity boosting | Proper entity → memories → ranking pipeline |
| **16 tools** (up from 11) | Added: forage, imagegen (Gemini), punchclock, pager (Lattice federation), square, kasa (smart home) + code execution beta | Broader tool surface; IoT/commerce integration |
| **Account tier system** | `account_tiers` table with provider/endpoint/api_key columns | Multi-provider support (Anthropic + generic/Ollama) |
| **Context overflow remediation** | Embedding-based drift pruning → oldest-first fallback, tool pair safety, 3 retries | Handles token budget overflow gracefully |
| **Immutable domain models** | Frozen dataclasses for ContinuumState/Message; Continuum as aggregate root; Unit of Work pattern | Prevents silent mutations; atomic DB→cache persistence |
| **StatefulTrinket formalization** | Base class with Valkey persistence, TTL `_expire_items()` per turn, centralized segment collapse cleanup | ForageTrinket/PeanutGalleryTrinket auto-expire stale results |
| **Federation API** | `cns/api/federation.py` — Lattice server-to-server messaging | Multi-instance communication |
| **Subcortical context reduction** | 3 user/assistant pairs (down from 6), based on MI analysis (2.34× → 1.1× context bleed) | Tighter retrieval signal |
| **Preprocess consolidation** | `preprocess_content_blocks()` as canonical shared function (assessment, summary, peanut gallery) | No more duplicated media/tool stripping logic |

## Stage 1 — Descriptive (what MIRA is)

### Product surface

MIRA is a **full-stack conversational agent** (FastAPI + Hypercorn), not a library. It includes:
- HTTP + WebSocket chat API
- Authentication (WebAuthn + magic link; single-user OSS mode)
- Multi-user isolation (PostgreSQL Row Level Security)
- 16 built-in tools (web search, email, contacts, maps, weather, reminders, memory manipulation, domain docs, image generation, smart home, commerce, time tracking, federation messaging, background research)
- Dynamic tool loading/unloading with two lifetimes (ephemeral per-turn, pinned per-session)
- Background agent for speculative context gathering ("forage")
- A hosted version at miraos.org with web/macOS interfaces

The codebase is organized into five core subsystems:
- **CNS** (Central Nervous System): conversation orchestration, the "Continuum" aggregate, LLM interaction, user model synthesis
- **LT_Memory**: long-term memory extraction, linking, consolidation, retrieval, decay scoring
- **Working Memory**: event-driven system prompt composition via modular "trinkets"
- **Tools**: self-registering tool framework with per-tool config and dependency injection
- **Agents**: background LLM-in-a-loop modules for autonomous speculative work

### Architecture: event-driven, synchronous core

All inter-component communication goes through an `EventBus` (pub/sub, synchronous). Key event flow:

1. User message → `ContinuumOrchestrator.process_message()`
2. **Subcortical layer** (pre-LLM): query expansion (replaces original), entity extraction (spaCy), complexity assessment, memory retention evaluation — using 3 user/assistant pairs as context
3. **Memory surfacing**: parallel hybrid search (BM25 + vector RRF) and hub-based entity discovery → merge → link traversal → rerank → cap at ~20 surfaced memories (~15 pinned + ~5 fresh)
4. **Working memory composition**: trinkets contribute sections → `SystemPromptComposer` assembles into cached/non-cached/notification-center/post-history blocks
5. LLM streaming response with tool execution loop (includes context overflow remediation)
6. **TurnCompletedEvent** published (carries continuum object to prevent handler race conditions)
7. On inactivity (~60 min): `SegmentCollapseEvent` → summary generation → memory extraction → assessment signal extraction → portrait synthesis (every 10 use-days) → cache invalidation

### Memory system: three tiers

**1. Working Memory (system prompt)**

Modular "trinkets" (11 total) contribute to the system prompt via events:

| Trinket | Variable name | Placement | Purpose |
|---------|--------------|-----------|---------|
| Base prompt | `base_prompt` | system (cached) | Core identity + `{user_context}` portrait |
| LoRA directives | `behavioral_directives` | system (cached) | Behavioral adaptation from feedback synthesis |
| Tool availability | `tool_availability` | system (cached) | Enabled tool descriptions |
| Location | `location_context` | system (cached) | User location + weather |
| Conversation manifest | `conversation_manifest` | system (cached) | Segment manifest |
| Domain docs | `domaindoc` | post-history | Stable reference docs with section collapse/expand |
| DateTime | `datetime_section` | notification center | Current time (fresh each turn) |
| Active reminders | `active_reminders` | notification center | Scheduled reminders |
| Forage results | `forage_results` | notification center | Background agent findings |
| Relevant memories | `relevant_memories` | notification center | Surfaced LT memories |
| Peanut gallery | `peanutgallery_guidance` | notification center | Metacognitive observer guidance |

The notification center is wrapped in `<mira:hud>` tags and explicitly marked as "runtime state, authoritative for current context." StatefulTrinkets (ForageTrinket, PeanutGalleryTrinket) persist to Valkey and auto-expire via TTL (`_expire_items()` each turn); all stateful trinkets are flushed centrally on segment collapse.

**2. Short-term / segment memory**

One continuous conversation thread (the "Continuum"). Segments can be `active`, `paused`, or `collapsed`:
- **Active**: current conversation; times out after inactivity (~60 min)
- **Paused**: user-suspended; never times out; auto-resumes on next message
- **Collapsed**: archived with first-person summary + 768d embedding

At collapse:
- LLM generates a **first-person summary** ("I debugged the IndexError...") with absolute timestamps
- Previous 5 summaries provided as context for narrative continuity
- Summary embeddings generated (768d, mdbr-leaf-ir-asym)
- Assessment signals extracted for user model synthesis

Session reconstruction on cache miss: collapse marker → summaries → behavioral primer → continuity (last 2 pairs) → session boundary → active messages.

**3. Long-term memory (persistent)**

Structured `Memory` objects stored in PostgreSQL with:
- `text`, `embedding` (768d), `importance_score` (0.0–1.0)
- `happens_at`, `expires_at` (temporal fields)
- `access_count`, `mention_count` (behavioral signals)
- `inbound_links`, `outbound_links` (JSONB arrays of `MemoryLinkEntry` with typed relationships)
- `entity_links` (JSONB array of `EntityLinkEntry`)
- `annotations` (JSONB array of `AnnotationEntry`)
- `activity_days_at_creation`, `activity_days_at_last_access` (vacation-proof decay)
- `source_segment_id` (provenance back to extraction source)

### Data model: entities and links

**Entities**: named entities (PERSON, ORG, GPE, PRODUCT, EVENT, WORK_OF_ART, LAW, LANGUAGE, NORP, FAC) extracted via spaCy, stored in a dedicated `entities` table with `link_count` and `last_linked_at`. Entity matching uses PostgreSQL trigram fuzzy matching (`pg_trgm`), not embedding similarity. Entity extraction normalizes variations to canonical forms (PostgreSQL ← postgres/Postgres) via fuzzy clustering.

**Memory links** (typed relationships between memories):
- Types: `supports`, `conflicts`, `supersedes`, `refines`, `precedes`, `contextualizes`, `extraction_ref`, `null`
- Stored bidirectionally in `inbound_links`/`outbound_links` JSONB on each memory
- Each link carries `type`, `confidence`, `reasoning`, `created_at`, and optional `extraction_bond` (3-word descriptor)
- Relationship classification now uses Haiku-4-5-20251001 (cost-optimized for this well-scoped task)

**Memory linking** uses 3-axis candidate discovery:
1. **Vector similarity** — cosine distance above threshold
2. **Entity co-occurrence** — shared entities with embedding floor to suppress common-entity noise
3. **TF-IDF term overlap** — catches orphan memories (no entities, distant embeddings) via rare shared terms

**Domain docs** ("DomainDocs"): stable text files that do not decay. Sections can be collapsed/expanded autonomously by the LLM. Used for behavioral directives, documentation, procedures. Changes reflected in real-time.

### Write path (extraction pipeline)

Triggered at segment collapse via `SegmentCollapseEvent`:

1. **Message loading**: query boundary sentinel, load messages until next boundary → single `ProcessingChunk`
2. **Memory context snapshot**: existing relevant memories retrieved for extraction context (enables dedup, linking, and consolidation detection)
3. **Payload construction** (`ExtractionEngine`): system + user prompts, formatted existing memories, short ID mapping (8-char hex → full UUID)
4. **LLM extraction** via Anthropic Batch API (50% cheaper) or immediate fallback (non-Anthropic endpoint or failover active). Produces `ExtractedMemory` objects with text, importance, temporals, related memory IDs, linking hints, entities, and consolidation targets
5. **Response processing** (`MemoryProcessor`, pure data — no side effects): JSON parsing with `json_repair` fallback → UUID remapping → validation → deduplication (0.85 fuzzy text + 0.7 cosine vector)
6. **Shared storage path** (`_process_and_store_memories`): store memories with embeddings → entity persistence (spaCy NER + pg_trgm matching) → extraction_ref link creation. Identical path for batch and immediate strategies
7. **Post-processing** (also via Batch API or immediate):
   - **Relationship classification** (Haiku): LLM classifies pairs → bidirectional link creation
   - **Consolidation**: connected-component clustering of similar memories (BFS) → LLM-driven merge/rewrite → link transfer + memory archival
   - **Entity GC**: pg_trgm self-join finds similar name pairs → BFS grouping → LLM review for merge/delete/keep decisions

### Importance scoring formula

The scoring formula (`lt_memory/scoring_formula.sql`) is a single SQL expression with sigmoid transform:

```
final_score = sigmoid(raw_score × recency × temporal × expiration_trailoff − 2.0)
```

Components:
- **Value score**: `ln(1 + access_rate / 0.02) × 0.8`, where access_rate uses momentum-decayed access count (5% fade per activity day) normalized by age
- **Hub score**: diminishing returns on inbound link count (linear to 10, then logarithmic)
- **Entity hub score**: weighted entity links (type-weighted: PERSON=1.0, EVENT=0.9, ORG=0.8, etc.) with diminishing returns above 50 weighted links
- **Mention score**: explicit LLM references (strongest signal); linear to 5, then logarithmic
- **Newness boost**: 2.0 decaying to 0 over 15 activity days (grace period for new memories)
- **Recency**: `1 / (1 + days_since_access × 0.015)` (~67 activity-day half-life)
- **Temporal multiplier**: upcoming events get 2× (within 1 day) to 1.2× (within 14 days); past events decay over 45 days to a 0.4 floor
- **Expiration trailoff**: linear crash from 1.0 to 0.0 over 5 calendar days after `expires_at`

Key design choice: **activity days, not calendar days** for decay calculations. This prevents vacation-induced memory degradation. Temporal events (`happens_at`, `expires_at`) still use calendar days since real-world deadlines don't pause.

### Read path (retrieval)

Two-stage pipeline:

**Stage 1 — Subcortical layer** (pre-LLM processing, 3 user/assistant pairs as context):
- LLM rewrites user query into an expanded retrieval query (replaces original, not augments)
- spaCy extracts named entities from the query
- Complexity assessment (straightforward → medium effort; complex → high effort/thinking)
- Memory retention evaluation (which pinned memories to keep)

**Stage 2 — Dual-path retrieval** (parallel):
1. **Similarity pool**: BM25 + vector hybrid search with Reciprocal Rank Fusion
   - Intent-aware weighting (recall: BM25-heavy 0.6/0.4; explore: vector-heavy 0.3/0.7; exact: strong BM25 0.8/0.2; general: balanced 0.4/0.6)
   - RRF with sigmoid normalization to spread scores into 0–1 range
   - Searches both personal (RLS-scoped) and global memories
   - Importance score floor filtering
2. **Hub-derived pool** (`HubDiscoveryService`): entity-driven discovery
   - Fuzzy match extracted entities to DB entities (pg_trgm)
   - Cap matched entities to prevent explosion
   - Collect all linked memories per matched entity (per-entity cap)
   - Rank by expansion embedding similarity (ranking, not gating)

Pools are merged (dedup, similarity pool takes precedence), then:
- **Debut boost**: new memories (<10 activity days) with few entity links get ranking boost
- **Supersedes penalty**: memories with inbound "supersedes" links are soft-demoted
- **Link traversal**: attached linked memories with metadata (type, confidence, reasoning, depth)
- **Rerank**: type-weight × inherited_importance × confidence
- **Access tracking**: retrieved memories get `access_count`/`last_accessed` updated

Hard caps: ~15 pinned memories, ~5 fresh, ~20 total surfaced, ~2 linked per primary.

### Background agent system ("Forage")

New in v1 rev 2. An autonomous sub-agent that runs in a background thread to speculatively gather context:

**Architecture**:
- `agents/forage.py` exports a `run()` function (procedural, not a class)
- Spawned via `ForageTool` in a daemon thread with `contextvars.copy_context()` (inherits user isolation)
- Uses the shared `ToolRepository` — same tools as primary LLM (continuum_tool, memory_tool, web_tool)
- Configurable model (default: qwen/qwen3-32b on Groq endpoint)

**Loop mechanism**:
1. Build tool schemas from ToolRepository, resolve API key from Vault
2. Call LLM with tools; if tool calls returned, execute them, send "Continue." heartbeat
3. Repeat until agent stops calling tools (natural completion) or hits iteration/timeout cap
4. On max iterations: force one final call without tools for summary
5. Publish result via `UpdateTrinketEvent` → `ForageTrinket`

**Quality rubric** (baked into system prompt): GROUNDED (backed by search results), RELEVANT (addresses query), SPECIFIC (concrete details), USEFUL (genuinely helps), HONEST (admits if nothing found).

**Result lifecycle**: pending → success/timeout/failed → dismissed. Errors auto-expire after 5 turns. Results refinable via `refine_task_id`. Every forage saves a JSON trace in user's data directory.

**Integration**: ForageTool dispatches agents; ForageTrinket manages result state in Valkey and surfaces content in the notification center HUD. Multiple concurrent forages supported (tracked by task_id).

### Text-Based LoRA (behavioral adaptation)

After each segment collapse, a feedback extractor scans for three signal types:
- **Prediction errors**: MIRA made a wrong assumption
- **Negative feedback**: user expressed frustration or correction
- **Positive feedback**: user expressed appreciation or resonance

Signals accumulate in PostgreSQL. Every 7 **use-days** (not calendar days), a pattern synthesizer:
1. Analyzes accumulated signals
2. Evolves behavioral directives (patterns can be reinforced, refined, revised, or new)
3. Writes directives to a `BEHAVIORAL DIRECTIVES` section in the `personal_context` DomainDoc
4. These flow into the system prompt via the `LoraTrinket` on every subsequent interaction

The synthesis is **evolutionary** (builds on previous synthesis), not replacement.

### User model synthesis pipeline (new in v1 rev 2)

After each segment collapse, an assessment extractor evaluates the conversation against anonymized system prompt sections:

```
AssessmentSignal:
  signal_type: 'alignment' | 'misalignment' | 'contextual_pass'
  section_id: e.g., 'authenticity', 'collaboration'
  strength: 'strong' | 'moderate' | 'mild'
  evidence: concrete quote or behavior
```

Every 7 use-days, a **user model synthesizer** runs:
1. Analyze accumulated assessment signals
2. Generate candidate user model (Sonnet)
3. **Critic validation** (Haiku, max 3 attempts): checks for observation laundering, personality labels, contradictions
4. If failed: rerun synthesis with critic feedback
5. Store as XML on `users.user_model`

Separately, every 10 use-days, **portrait synthesis** generates a 150–250 word prose portrait from recent collapsed summaries (20 activity-day window, minimum 3 summaries). The portrait is injected into the base prompt as `{user_context}`.

### Metacognitive observer ("Peanut Gallery")

A two-stage LLM pipeline that runs asynchronously after N turns (fire-and-forget, non-critical):
1. Prerunner (fast model) filters seed memories for relevance
2. Sonnet-class observer evaluates conversation state
3. Returns one of: noop / compaction / concern / coaching
4. Guidance injected via `PeanutGalleryTrinket` with TTL expiry (default 5 turns)

### Security and isolation

- **PostgreSQL Row Level Security**: all user data access automatically scoped via `SET app.current_user_id` at connection checkout. B-tree index on user_id + IVFFlat on embedding combined by query planner. `mira_admin` role has `BYPASSRLS`
- **HashiCorp Vault**: all secrets (API keys, DB URLs, auth secrets); AppRole auth; fail-fast if Vault is unreachable
- **User context propagation**: `contextvars` for thread-safe user scoping; `copy_context()` for spawned threads (including forage agents)
- **Input validation**: Pydantic at API boundaries, size limits (10MB docs, 5MB images, 20K char messages)
- **Per-user credentials**: `UserCredentialService` for user-specific API keys (never exposed to LLM)
- **Distributed request locks**: per-user via Valkey (60s TTL)
- **Admin sessions**: explicit `AdminSession` bypasses RLS for cross-user operations (scheduled jobs, batch polling)

### Scheduled jobs and use-day scheduling

Three-layer architecture:
1. **Activity tracking**: `increment_user_activity_day()` on first message of user's local day. Tracks `cumulative_activity_days` + `last_activity_date`
2. **Platform function**: `get_users_due_for_job(interval)` — `MOD(cumulative_activity_days, interval) = 0` with 2-day recency window. Stateless, no tracking table
3. **Job registration**: calendar-based `IntervalTrigger(days=1)` jobs that call `get_users_due_for_job()` to select eligible users

Current jobs: extraction retry (6h calendar), batch polling (1m), consolidation (7 use-days), temporal score recalc (1 use-day), bulk score recalc (1 use-day), entity GC (7 use-days), batch cleanup (1 use-day), portrait synthesis (10 use-days, runs in collapse chain).

### Evaluation and testing

- Tuning test infrastructure with JSON + Markdown reports for extraction quality, consolidation, entity GC, subcortical performance
- No standardized benchmark harness (LoCoMo/LongMemEval/EverMemBench)
- Architecture oracle doc: `docs/MEMORY_ARCHITECTURE_ORACLE.md`

## Stage 2 — Evaluative (coherence, risks, missing pieces)

### Strengths

- **"Earn Your Keep" decay model remains the most sophisticated in this repo**. The multi-factor scoring formula with activity-day basis, momentum decay, hub centrality, mention tracking, and temporal multipliers is well-designed. The v1 rev 2 codebase is unchanged here, but the extraction pipeline restructure (shared `_process_and_store_memories`) and Haiku classification reduce the cost of feeding the scoring system.

- **Background agent system is genuinely novel among the folk systems**. The forage agent is the first system in this repo with autonomous sub-agent collaboration — a background LLM that uses the same tools to speculatively gather context while the primary conversation continues. The quality rubric (GROUNDED, RELEVANT, SPECIFIC, USEFUL, HONEST) is a pragmatic approach to preventing speculative hallucination. The integration is clean: shared ToolRepository, contextvar propagation for user isolation, event-driven result surfacing via ForageTrinket.

- **3-axis linking catches what 2-axis misses**. Adding TF-IDF term overlap to vector similarity + entity co-occurrence addresses a real gap: orphan memories with no entity links and distant embeddings that share rare meaningful terms. This is a practical improvement over the prior linking approach.

- **Assessment-anchored user modeling is more principled than blind feedback extraction**. Evaluating conversation against anonymized system prompt sections (rather than just extracting "positive/negative" signals) produces more actionable observations. The critic validation loop (Haiku checking for observation laundering, personality labels, contradictions) adds a meaningful quality gate.

- **Verbose refinement ablation demonstrates good engineering discipline**. Removing a pipeline that (a) contradicted the extraction prompt's design and (b) had a KeyError proving it never ran, rather than trying to fix it, is the right call. The clean ablation (columns, constraints, configs, pricing entries all removed) shows the "ablate, don't deprecate" philosophy working in practice.

- **Immutable domain models + Unit of Work pattern** are a meaningful maturation. Frozen dataclasses prevent silent state mutations; the Unit of Work ensures atomic DB→cache persistence with DB as authoritative source on crash.

- **Context overflow remediation is a practical robustness addition**. Embedding-based drift pruning (remove least-similar messages to current query) → oldest-first fallback → tool pair safety → retry is better than most systems' approach of "truncate from the front and hope."

### Risks / open questions

- **No standardized benchmark** remains the biggest gap. Despite sophisticated tuning test infrastructure, there's no LoCoMo/LongMemEval/EverMemBench-style evaluation. The system is tuned by feel and internal metrics. This makes it impossible to compare retrieval quality claims against the literature.

- **LLM extraction quality is unvalidated against ground truth**. Extraction, relationship classification (now Haiku), consolidation, entity GC, assessment extraction, and user model synthesis all depend on LLM calls. The Haiku downgrade for relationship classification is justified by task scope, but quality was presumably verified internally — no external validation data is available.

- **Scoring formula complexity is a maintenance risk**. The SQL expression is ~170 lines of nested CASEs, subqueries, and mathematical transforms. Constants are hardcoded in SQL (not in config). A single constant change has cascading effects on all memories.

- **No bi-temporal validity semantics**. MIRA has only `expires_at` and `happens_at`. Corrections are handled via `supersedes` links rather than validity intervals. Point-in-time queries ("what did I believe on January 15?") require link traversal rather than a simple temporal filter.

- **Memory text is untyped**. Memories are natural-language strings with no type discrimination (fact vs preference vs constraint vs procedure vs event). The system relies on the scoring formula and link types to differentiate behavior.

- **DomainDocs bypass importance scoring entirely**. They don't decay and are always injected. The section collapse/expand mechanism mitigates token bloat but relies on the LLM to manage its own context.

- **No write gating for memory extraction**. Memories are extracted automatically at segment collapse. There's no user confirmation step, no instruction/data boundary enforcement, and no quarantine for suspicious extractions. The `memory_tool` allows user-initiated memory creation, but LLM-extracted memories are auto-committed.

- **Forage agent inherits primary tool permissions**. The background agent uses the same ToolRepository with the same user context. A poorly-constrained forage could trigger side-effectful tools (email, reminders). Currently constrained to `continuum_tool`, `memory_tool`, `web_tool` by a constant, but this is a code-level constraint, not an architectural one.

- **Prompt injection surface**. Memories and forage results are injected into the notification center. While the `<mira:hud>` wrapper and delimiter markers provide visual separation, retrieved memories and forage content carry user-originated text that could contain adversarial instructions. No taint tracking or sanitization.

- **Entity GC uses LLM judgment**. Merge/delete/keep decisions for entities rely on LLM calls. A bad judgment can merge distinct entities or delete a valid one, with cascading effects on hub discovery.

- **Singleton-heavy architecture**. Many services use module-level singletons. Testing requires initialization in specific order. The `CNSIntegrationFactory` encodes the dependency graph, but it's implicit rather than declarative.

### Comparison to other folk systems in this repo

| Dimension | MIRA-OSS v1r2 | OpenClaw | ClawVault | memv | Gigabrain |
|-----------|---------------|----------|-----------|------|-----------|
| Deployment model | Full-stack app (FastAPI) | Plugin/config suite | CLI tool (npm) | Library (PyPI) | Obsidian plugin |
| Storage | PostgreSQL + pgvector + Valkey + Vault | SQLite + FTS5 | Markdown files + graph JSON | SQLite + sqlite-vec + FTS5 | SQLite + JSON + weighted Jaccard |
| Memory types | Untyped text + typed links | Typed facts + relations + aliases | Typed entries + graph index | Semantic statements + episodes | 7 typed memories (USER_FACT, PREFERENCE, etc.) |
| Decay model | Multi-factor sigmoid (activity-day) | Activation/importance | Reindex/refresh | Bi-temporal validity | Stepped recency (1d/7d/30d/90d/365d) + 8-factor value scoring |
| Retrieval | BM25+vector RRF + entity hubs + 3-axis linking | FTS5 + embeddings | QMD hybrid | sqlite-vec + FTS5 + RRF | FTS + weighted Jaccard + class budgets |
| Write gating | None (auto-extract) | Curation habits | Sanitization + path safety | Confidence ≥ 0.7 filter | 7-stage pipeline with review queue |
| Benchmark harness | Internal tuning tests | 60-query benchmark | None | None | harness-lab-run.js with A/B comparison |
| Behavioral learning | Text-Based LoRA + user model synthesis | None | None | None | None |
| Background agents | Forage (LLM-in-a-loop, shared tools) | None | None | None | None |
| Security model | RLS + Vault + contextvars + AdminSession | Convention-based | Path sanitization | None (library) | Junk filter + XML-escape injection |
| Entity model | spaCy NER + pg_trgm + 3-axis linking | SQLite facts + aliases | Graph index | None | Person service + coreference |

## Stage 3 — Prescriptive (how this informs the synthesis)

### What MIRA v1 rev 2 adds to the design space

1. **Background agent collaboration is a new pattern for the catalog**. The forage agent demonstrates that sub-agent work can share the same tool infrastructure and user isolation without creating a parallel tool ecosystem. The quality rubric (baked into the agent's system prompt, not a post-filter) is a pragmatic approach. The integration pattern (event bus → trinket → notification center) keeps the architecture clean. This is the first system in this repo where the primary LLM has an autonomous collaborator running in parallel.

2. **Assessment-anchored user modeling is more structured than feedback extraction**. Prior systems (including MIRA v1) extracted "positive/negative/prediction error" signals — broad buckets. Anchoring assessment to specific system prompt sections (anonymized) produces signals like "misalignment with 'collaboration' section, moderate strength, evidence: [quote]". The critic validation loop is an additional quality gate not seen in other systems.

3. **3-axis linking is a practical improvement worth adopting**. Adding TF-IDF term overlap to the standard vector + entity co-occurrence catches a real class of orphan memories. The embedding floor on entity co-occurrence (suppress common-entity noise) is also a good refinement.

4. **Prior v1 contributions still hold**: activity-day decay (best practice for personal memory), first-person summaries (preserves agent identity), hub-based entity discovery (practical alternative to full KG), Text-Based LoRA (concrete behavioral feedback loop), supersedes-as-link (alternative to invalidation-as-overwrite), Batch API for cost savings, production-grade RLS security.

5. **Ablation discipline is worth noting**. The verbose refinement removal demonstrates that it's better to remove a broken pipeline than to maintain dead code. The evidence (KeyError bug in sync path) backing the removal decision is the kind of rigor that prevents accrual of phantom subsystems.

### For shisad mapping

- **Background agents**: shisad could adopt the pattern of sub-agents sharing the tool repository with context propagation, but would need to add the capability-scoped retrieval constraints that MIRA lacks (forage agent has unconstrained access to all three tools).
- **Assessment-anchored feedback**: the section-anchored signal extraction is more structured than MIRA v1's broad feedback categories. shisad's behavioral feedback loop could use a similar anchor-to-policy approach, with the addition of write gating on the resulting directives.
- **3-axis linking**: shisad's planned knowledge graph could incorporate TF-IDF as a third linking axis for orphan node discovery.
- **Security delta remains**: MIRA's RLS + Vault is strong for multi-user isolation, but it still lacks instruction/data boundary enforcement, taint tracking, write gating on memory extraction, and capability-scoped retrieval for sub-agents. The forage agent's tool access is code-constrained (a list of tool names), not architecturally constrained.
- **Evidence gap remains**: no external benchmark evaluation means MIRA's retrieval quality claims are internal-only.

### Missing pieces for adoption (updated)

1. **Write gating**: memories extracted by LLM should pass through a confirmation or quarantine step, especially for identity-level facts and procedural directives.
2. **Typed memory**: even a simple type tag (fact/preference/constraint/procedure/event) would enable type-aware retrieval and governance.
3. **External benchmarks**: running LoCoMo/LongMemEval against MIRA's retrieval pipeline would quantify quality.
4. **Taint/provenance on injected content**: memories and forage results injected into the notification center should carry provenance markers and be placed in explicitly untrusted prompt regions.
5. **Capability scoping for sub-agents**: the forage agent should have architecturally enforced tool restrictions, not just a code-level `AVAILABLE_TOOLS` constant.
6. **Bi-temporal validity**: `supersedes` links provide correction semantics, but point-in-time queries and temporal filtering require explicit `valid_from`/`valid_until` intervals.
