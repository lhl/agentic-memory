---
title: "Analysis — MIRA-OSS (taylorsatula)"
date: 2026-03-03
type: analysis
system: mira-OSS
source:
  - vendor/mira-OSS (submodule; reviewed @ ee44b18, 2026-03-03, version 2026.03.07-major)
related:
  - ANALYSIS.md
  - ANALYSIS-academic-industry.md
---

# Analysis — MIRA-OSS (taylorsatula)

MIRA is a self-hosted, event-driven conversational AI system built around the constraint of **one continuous conversation forever**. It maintains persistent long-term memory with autonomous lifecycle management (extraction, linking, consolidation, decay), a modular "working memory" system prompt composer, and a behavioral adaptation pipeline the author calls "Text-Based LoRA." The system uses PostgreSQL (pgvector + BM25 full-text search) as its primary store, Valkey (Redis-compatible) for caching, and HashiCorp Vault for credential management.

This file is a critical deep dive over the vendored snapshot in `vendor/mira-OSS` (commit `ee44b18`, version `2026.03.07-major`).

## Stage 1 — Descriptive (what MIRA is)

### Product surface

MIRA is a **full-stack conversational agent** (FastAPI + Hypercorn), not a library. It includes:
- HTTP + WebSocket chat API
- Authentication (WebAuthn + magic link)
- Multi-user isolation (PostgreSQL Row Level Security)
- 11 built-in tools (web search, email, contacts, maps, weather, reminders, memory manipulation, domain docs, etc.)
- Dynamic tool loading/unloading (tools expire from context after 5 turns of non-use)
- A hosted version at miraos.org

The codebase is ~269 Python files organized into four core subsystems:
- **CNS** (Central Nervous System): conversation orchestration, the "Continuum" aggregate, LLM interaction
- **LT_Memory**: long-term memory extraction, linking, consolidation, retrieval
- **Working Memory**: event-driven system prompt composition via modular "trinkets"
- **Tools**: self-registering tool framework with per-tool config

### Architecture: event-driven, synchronous

All inter-component communication goes through an `EventBus` (pub/sub, synchronous). Key event flow:

1. User message → `ContinuumOrchestrator.process_message()`
2. **Subcortical layer** (pre-LLM): query expansion, entity extraction (spaCy), complexity assessment, memory retention evaluation
3. **Memory surfacing**: parallel hybrid search (BM25 + vector) and hub-based entity discovery → merge → link traversal → rerank → cap at ~20 surfaced memories
4. **Working memory composition**: trinkets contribute sections → `SystemPromptComposer` assembles into cached/non-cached/notification-center/post-history blocks
5. LLM streaming response with tool execution loop
6. On inactivity (~60 min): `SegmentCollapseEvent` → summary generation → memory extraction → feedback signal extraction → cache invalidation

### Memory system: three tiers

**1. Working Memory (system prompt)**

Modular "trinkets" contribute to the system prompt via events:
- `base_prompt` + `behavioral_directives` + `tool_availability` → cached system content
- `domaindoc` → post-history (stable reference docs)
- `datetime`, `conversation_manifest`, `active_reminders`, `relevant_memories`, `peanutgallery_guidance` → notification center (slides forward each turn)

Trinkets auto-enable/disable based on relevance. The notification center is wrapped in `<mira:hud>` tags and explicitly marked as "runtime state, authoritative for current context."

**2. Short-term / segment memory**

One continuous conversation thread (the "Continuum"). Segments collapse after ~60 min of inactivity. At collapse:
- LLM generates a **first-person summary** ("I debugged the IndexError...") with absolute timestamps
- Previous 5 summaries provided as context for narrative continuity
- Summary embeddings generated (768d, mdbr-leaf-ir-asym)

**3. Long-term memory (persistent)**

Structured `Memory` objects stored in PostgreSQL with:
- `text`, `embedding` (768d), `importance_score` (0.0–1.0)
- `happens_at`, `expires_at` (temporal fields)
- `access_count`, `mention_count` (behavioral signals)
- `inbound_links`, `outbound_links` (JSONB arrays of `MemoryLinkEntry`)
- `entity_links` (JSONB array of `EntityLinkEntry`)
- `annotations` (JSONB array of `AnnotationEntry`)
- `activity_days_at_creation`, `activity_days_at_last_access` (vacation-proof decay)
- `source_segment_id` (provenance back to extraction source)

### Data model: entities and links

**Entities**: named entities (PERSON, ORG, EVENT, PRODUCT, etc.) extracted via spaCy, stored in a dedicated `entities` table with `link_count` and `last_linked_at`. Entity matching uses PostgreSQL trigram fuzzy matching (`pg_trgm`), not embedding similarity.

**Memory links** (typed relationships between memories):
- Types: `supports`, `conflicts`, `supersedes`, `refines`, `precedes`, `contextualizes`, `extraction_ref`, `null`
- Stored bidirectionally in `inbound_links`/`outbound_links` JSONB on each memory
- Each link carries `type`, `confidence`, `reasoning`, `created_at`, and optional `extraction_bond` (3-word descriptor)

**Domain docs** ("DomainDocs"): stable text files that do not decay. Sections can be collapsed/expanded autonomously by the LLM. Used for behavioral directives, documentation, procedures. Changes reflected in real-time.

### Write path (extraction pipeline)

Triggered at segment collapse via `SegmentCollapseEvent`:

1. **Chunking**: conversation messages → `ProcessingChunk` objects with temporal bounds and segment provenance
2. **Memory context snapshot**: existing relevant memories retrieved for extraction context (enables dedup, linking, and consolidation detection)
3. **LLM extraction**: via Anthropic Batch API (50% cheaper than streaming). Produces `ExtractedMemory` objects with:
   - text, importance_score, confidence
   - `happens_at`, `expires_at` (temporal)
   - `related_memory_ids` (references to existing memories with bond descriptors)
   - `linking_hints` (intra-batch relationship hints)
   - `entities` (LLM-extracted entity list)
   - `consolidates_memory_ids` (memories this one replaces)
4. **Deduplication**: fuzzy matching at 0.92 similarity threshold
5. **Entity extraction + linking**: spaCy NER → match to existing entities via pg_trgm → create new entities as needed
6. **Post-processing** (also via Batch API):
   - **Relationship classification**: LLM classifies pairs → bidirectional link creation
   - **Consolidation**: connected-component clustering of similar memories → LLM-driven merge/rewrite
   - **Entity GC**: BFS connected-component grouping → LLM review for merge/delete/keep decisions
7. **Verbose refinement**: trim redundant content from consolidated memories

Two execution strategies: `BatchExecutionStrategy` (Anthropic Batch API, preferred) and `ImmediateExecutionStrategy` (synchronous fallback).

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

**Stage 1 — Subcortical layer** (pre-LLM processing):
- LLM rewrites user query into an expanded retrieval query
- spaCy extracts named entities from the query
- Complexity assessment (straightforward vs complex → thinking budget)
- Memory retention evaluation (which pinned memories to keep)

**Stage 2 — Dual-path retrieval** (parallel):
1. **Similarity pool**: BM25 + vector hybrid search with Reciprocal Rank Fusion
   - Intent-aware weighting (recall: BM25-heavy; explore: vector-heavy; exact: strong BM25; general: balanced)
   - RRF with sigmoid normalization to spread scores into 0–1 range
   - Importance score floor filtering
2. **Hub-derived pool**: entity-driven discovery
   - Fuzzy match extracted entities to DB entities (pg_trgm)
   - Collect all linked memories per matched entity
   - Rank by expansion embedding similarity

Pools are merged (dedup, similarity pool takes precedence), then:
- **Debut boost**: new memories (<10 activity days) with few entity links get ranking boost
- **Supersedes penalty**: memories with inbound "supersedes" links are soft-demoted
- **Link traversal**: attached linked memories with metadata (type, confidence, reasoning, depth)
- **Rerank**: type-weight × inherited_importance × confidence
- **Access tracking**: retrieved memories get `access_count`/`last_accessed` updated

Hard caps: ~15 pinned memories, ~5 fresh, ~20 total surfaced, ~2 linked per primary.

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

### Metacognitive observer ("Peanut Gallery")

A two-stage LLM pipeline that runs asynchronously after N turns:
1. Fast prerunner filters seed memories for relevance
2. Sonnet-class observer evaluates conversation state
3. Returns one of: noop / compaction / concern / coaching
4. Guidance injected via `PeanutGalleryTrinket` with TTL expiry

### Security and isolation

- **PostgreSQL Row Level Security**: all user data access automatically scoped via `SET app.current_user_id` at connection checkout
- **HashiCorp Vault**: all secrets (API keys, DB URLs, auth secrets); fail-fast if Vault is unreachable
- **User context propagation**: `contextvars` for thread-safe user scoping; `copy_context()` for spawned threads
- **Input validation**: Pydantic at API boundaries, size limits (10MB docs, 5MB images, 20K char messages)
- **Per-user credentials**: `UserCredentialService` for user-specific API keys (never exposed to LLM)
- **Distributed request locks**: per-user via Valkey (60s TTL)

### Domain docs as stable knowledge

DomainDocs are persistent text files that:
- Do not decay (exempted from importance scoring)
- Support autonomous section collapse/expand (LLM controls visibility)
- Can be edited by both MIRA and the user via API
- Are placed in post-history (after conversation, before notification center)
- Used for behavioral directives, reference material, procedures

### Evaluation and testing

- Tuning test results stored in `data/tuning_test_results/{operation}/{date}/` with JSON + Markdown reports
- Operations tracked: extraction quality, consolidation effectiveness, entity GC precision, subcortical performance
- Architecture oracle doc: `docs/MEMORY_ARCHITECTURE_ORACLE.md` (1930 lines)
- No standardized benchmark harness (e.g., LoCoMo/LongMemEval)

## Stage 2 — Evaluative (coherence, risks, missing pieces)

### Strengths

- **"Earn Your Keep" decay model is well-designed**: the multi-factor scoring formula with activity-day basis, momentum decay, hub centrality, mention tracking, and temporal multipliers is the most sophisticated importance scoring formula in this repo's folk systems. The activity-day distinction (vs calendar days) for decay is a genuinely good insight that prevents vacation-induced memory loss.

- **First-person memory summaries**: writing summaries as "I debugged the IndexError..." rather than "The assistant discussed debugging..." is a small but meaningful design choice that preserves narrative identity. The narrative continuity (previous 5 summaries as context) is a pragmatic approach to gradual context loss.

- **Event-driven loose coupling**: the `EventBus` architecture makes the system genuinely extensible. Components subscribe to events without knowing about each other. Adding a new trinket, tool, or post-processing step doesn't require modifying existing code.

- **Entity-driven hub discovery**: the dual-path retrieval (similarity + entity hubs) with pg_trgm fuzzy matching is more robust than pure vector similarity for structured questions about people, organizations, and events. This is a meaningful addition over most folk systems that rely on vector search alone.

- **Typed relationship links with bidirectional storage**: `supports`, `conflicts`, `supersedes`, `refines`, `precedes`, `contextualizes` — stored as JSONB with confidence and reasoning. This is richer than most folk systems and enables the supersedes-penalty/link-traversal patterns in retrieval.

- **Text-Based LoRA is a novel behavioral adaptation pattern**: extracting prediction errors, negative/positive feedback → accumulating → periodic synthesis into behavioral directives that flow into the system prompt. This is a concrete implementation of the "enforcement distillation loop" pattern seen abstractly in drag88/Marvy's work.

- **Batch API for cost savings**: using Anthropic's Batch API for extraction, relationship classification, consolidation, and entity GC is a pragmatic cost optimization (50% cheaper) that most folk systems don't bother with.

- **Production-grade security**: RLS, Vault, contextvars, per-user credentials, input validation, distributed locks. This is substantially more mature than any other folk system in this repo.

### Risks / open questions

- **No standardized benchmark**: despite sophisticated tuning test infrastructure, there's no LoCoMo/LongMemEval/EverMemBench-style evaluation. The system is tuned by feel and internal metrics, not against reproducible external benchmarks. This makes it impossible to compare retrieval quality claims against the literature.

- **LLM extraction quality is unvalidated against ground truth**: extraction, relationship classification, consolidation, and entity GC all depend on LLM calls. The quality of these operations is tested via internal tuning reports but not against labeled datasets or human-annotated ground truth.

- **Scoring formula complexity is a maintenance risk**: the SQL expression in `scoring_formula.sql` is ~170 lines of nested CASEs, subqueries, and mathematical transforms. A single constant change (e.g., MOMENTUM_DECAY_RATE, SIGMOID_CENTER) has cascading effects on all memories. The formula is well-documented, but it's a single-point-of-failure for retrieval quality that's hard to reason about holistically.

- **No bi-temporal validity semantics**: unlike memv (which implements Graphiti-style `valid_at`/`invalid_at` + `created_at`/`expired_at`), MIRA has only `expires_at` and `happens_at`. There's no "this fact was true from X to Y" — corrections are handled via `supersedes` links rather than validity intervals. This means point-in-time queries ("what did I believe on January 15?") require link traversal rather than a simple temporal filter.

- **Memory text is untyped**: memories are natural-language strings with no type discrimination (fact vs preference vs constraint vs procedure). The system relies on the scoring formula and link types to differentiate behavior, but there's no way to query "all my procedural memories" or "all my preferences" without semantic search.

- **DomainDocs bypass the importance scoring entirely**: they don't decay and are always injected. This creates a potential token budget problem if a user accumulates many DomainDocs. The section collapse/expand mechanism mitigates this but relies on the LLM to manage its own context — a capability that may degrade under token pressure.

- **No write gating for memory extraction**: memories are extracted automatically at segment collapse. There's no user confirmation step, no instruction/data boundary enforcement, and no quarantine for suspicious extractions. The `memory_tool` allows user-initiated memory creation with `supersedes_memory_ids`, but LLM-extracted memories are auto-committed. This is a meaningful security gap for adversarial scenarios.

- **Singleton-heavy architecture**: many services use module-level `_instance` + `get_*()` singletons. This makes testing harder (requires `initialize_*()` calls in specific order) and creates implicit global state.

- **Prompt injection surface**: memories are injected into the system prompt notification center. While the `<mira:hud>` wrapper and delimiter markers provide some visual separation, retrieved memories carry user content that could contain adversarial instructions. There's no explicit taint tracking or sanitization on memory content before injection.

- **Entity GC uses LLM judgment**: merge/delete/keep decisions for entities rely on LLM calls. A bad LLM judgment can merge distinct entities (e.g., two people named "Alex") or delete a valid entity, with cascading effects on hub discovery.

### Comparison to other folk systems in this repo

| Dimension | MIRA-OSS | OpenClaw | ClawVault | memv |
|-----------|----------|----------|-----------|------|
| Deployment model | Full-stack app (FastAPI) | Plugin/config suite | CLI tool (npm) | Library (PyPI) |
| Storage | PostgreSQL + Valkey | SQLite + FTS5 | Markdown files + graph JSON | SQLite + sqlite-vec + FTS5 |
| Memory types | Untyped text + links | Typed facts + relations + aliases | Typed entries + graph index | Semantic statements + episodes |
| Decay model | Multi-factor sigmoid (activity-day) | Activation/importance | Reindex/refresh | Bi-temporal validity |
| Retrieval | BM25+vector RRF + entity hubs | FTS5 + embeddings | QMD hybrid | sqlite-vec + FTS5 + RRF |
| Write gating | None (auto-extract) | Curation habits | Sanitization + path safety | Confidence ≥ 0.7 filter |
| Benchmark harness | Internal tuning tests | 60-query benchmark | None | None |
| Behavioral learning | Text-Based LoRA (feedback → directives) | None | None | None |
| Security model | RLS + Vault + contextvars | Convention-based | Path sanitization | None (library) |
| Entity model | spaCy NER + pg_trgm + typed entities | SQLite facts + aliases | Graph index | None |

## Stage 3 — Prescriptive (how this informs the synthesis)

### What MIRA adds to the design space

1. **Activity-day decay is the right default for personal memory systems**. Calendar-day decay punishes users who take breaks. MIRA's distinction (activity days for behavioral signals, calendar days for real-world deadlines) should be adopted as a best practice.

2. **First-person summaries preserve agent identity continuity**. Third-person summaries create epistemic distance. This is a cheap, high-leverage design choice for any system with persistent conversations.

3. **Hub-based entity discovery is a practical alternative to full knowledge graph traversal**. Instead of building a separate graph store, MIRA uses entity links on memories + pg_trgm fuzzy matching as lightweight "hub navigation." This gets most of the benefit of graph retrieval without graph infrastructure.

4. **Text-Based LoRA is a concrete implementation of behavioral feedback loops**. The signal types (prediction error, negative feedback, positive feedback) → accumulation → periodic synthesis → directive injection is a clean, debuggable pattern that's more structured than the abstract "echo/fizzle" or "behavior loop" patterns in jumperz/joelclaw.

5. **Supersedes-as-link is an alternative to invalidation-as-overwrite**. Rather than setting `invalid_at` on old facts, MIRA creates a supersedes link and applies a scoring penalty. The old memory still exists and is retrievable (at lower priority). This is closer to append-only correction semantics than most systems, though it lacks the explicit validity intervals of bi-temporal approaches.

### For shisad mapping

- **Scoring formula**: the multi-factor sigmoid with activity-day basis is the most sophisticated decay model in the folk systems. shisad's planned TTL/decay could adopt the activity-day distinction and the "earn your keep" framing (new memories start at ~0.5, must prove relevance).
- **Hub discovery**: shisad's planned knowledge graph could start with MIRA's lightweight approach (entity links on memories + fuzzy matching) before investing in a full graph store.
- **Behavioral feedback**: the Text-Based LoRA pattern maps to shisad's "lessons/behavior loop" from jumperz, but with a concrete extraction → accumulation → synthesis → injection pipeline.
- **Security delta**: MIRA's RLS + Vault is strong for multi-user isolation, but it lacks the instruction/data boundary enforcement, taint tracking, and write gating that shisad treats as non-negotiable. Memory extraction is fully autonomous with no confirmation path.
- **Evidence gap**: no external benchmark evaluation means MIRA's retrieval quality claims are internal-only. shisad should not adopt MIRA's scoring constants without independent validation.

### Missing pieces for adoption

1. **Write gating**: memories extracted by LLM should pass through a confirmation or quarantine step, especially for identity-level facts and procedural directives.
2. **Typed memory**: even a simple type tag (fact/preference/constraint/procedure/event) would enable type-aware retrieval and governance without restructuring the data model.
3. **External benchmarks**: running LoCoMo/LongMemEval against MIRA's retrieval pipeline would quantify quality and enable comparison with the literature.
4. **Taint/provenance on injected memories**: memories injected into the notification center should carry provenance markers and be placed in explicitly untrusted prompt regions.
5. **Bi-temporal validity**: `supersedes` links provide correction semantics, but point-in-time queries and temporal filtering require explicit `valid_from`/`valid_until` intervals.
