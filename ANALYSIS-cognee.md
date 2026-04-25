---
title: "Analysis — Cognee (topoteretes)"
date: 2026-04-25
type: analysis
system: Cognee
source: https://github.com/topoteretes/cognee
local_clone: vendor/cognee
version: "commit f4964c31 (v1.0.3, 2026-04-24)"
paper:
  id: "arXiv:2505.24478"
  title: "Optimizing the Interface Between Knowledge Graphs and LLMs for Complex Reasoning"
  authors: "Markovic, Obradovic, Hajdu, Pavlovic (2025)"
related:
  - ANALYSIS.md
  - ANALYSIS-memobase.md
  - ANALYSIS-arxiv-2501.13956-zep.md
  - ANALYSIS-karta.md
  - ANALYSIS-mira-OSS.md
  - REVIEWED.md
tags:
  - agentic-memory
  - knowledge-graph
  - graphrag
  - session-memory
  - multi-tenant
  - feedback-loop
  - kuzu
  - neo4j
  - lancedb
---

# Analysis — Cognee (topoteretes)

Deep analysis of **Cognee**, a 16.8k-star open-source "knowledge-graph-backed memory engine" with an associated paper (arXiv:2505.24478). Source: `vendor/cognee` (commit `f4964c31`, v1.0.3, 2026-04-24). Scale: ~138k Python LOC.

## TL;DR

- **Memory system first, knowledge engine second.** The API surface (`remember`/`recall`/`forget`/`improve`) is agentic; the substrate (graph DB + vector store + relational store) is GraphRAG. Agent-runtime decorator, session-first writes, and a feedback loop that bridges sessions into the graph distinguish it from generic GraphRAG frameworks (LightRAG, Graphiti).
- **Bidirectional session-graph sync with feedback-weighted consolidation is the central novelty.** The `improve()` function has four stages: (1) apply feedback weights to graph nodes/edges used in session Q&A (alpha = 0.1 by default); (2) cognify session Q&A text into permanent graph as new entities tagged with `node_set="user_sessions_from_cache"`; (3) memify enrichment — triplet `(subject, predicate, object)` embeddings; (4) sync recent graph edges back into session cache. Not found in any other memory system in our survey.
- **Multi-backend storage by default.** Graph: Kuzu (default), Neo4j, Neptune, Postgres-graph-experimental. Vector: LanceDB (default), Chroma, pgvector, Qdrant, Weaviate, Milvus. Relational: SQLite/Postgres. Per-tenant file isolation on Kuzu; label-based filtering on Neo4j/Neptune.
- **13+ search types with rule-based routing.** `GRAPH_COMPLETION` (default), `GRAPH_SUMMARY_COMPLETION`, `GRAPH_COMPLETION_COT`, `TRIPLET_COMPLETION`, `RAG_COMPLETION`, `CHUNKS`, `CHUNKS_LEXICAL`, `SUMMARIES`, `CYPHER`, `TEMPORAL`, `FEELING_LUCKY`, `CODING_RULES`. Router (`cognee/api/v1/recall/query_router.py:49-200`) is keyword-weight-heuristic, not an LLM call.
- **Mini-DAG task runtime.** A custom pipeline/task engine (`cognee/modules/pipelines/`) runs cognify/memify/improve as composable task graphs with optional `run_in_background=True`. Not Airflow/Celery/Prefect; embedded async.
- **RBAC multi-tenancy with shared-dataset semantics.** `User`/`Permission`/`Dataset` tables; cross-user memory sharing via permission grants. Session cache key `{user_id}:{session_id}`; session-data-to-graph bridging is permission-scoped.
- **Not agent-centric at the memory-type level.** No first-class episodic/semantic/procedural split like ENGRAM/Zep; no supersede/validity-interval like Zep's bi-temporal KG. Versioning is a single monotonic `version` counter on `DataPoint`.
- **No LoCoMo/LongMemEval results.** Evals in `evals/` compare Cognee vs Mem0/Graphiti/LightRAG on HotpotQA (QA-focused, not agentic-memory-focused). The paper (arXiv:2505.24478) is a narrow contribution (KG-LLM interface optimization) atop the broader platform.

## What's novel

1. **Bidirectional session-graph sync (`improve()`).** The feedback loop: agent interaction → session cache → feedback weights update graph edges → session Q&A cognified as new graph entities → recent graph edges synced back into session cache. Makes graph evolution a product of agent activity, not just a batch of document imports.
2. **Feedback-weighted edges with reinforcement semantics.** `Edge.feedback_weight` and `Edge.importance_weight` fields (`cognee/infrastructure/engine/models/Edge.py:6-40`) — higher feedback → higher retrieval rank for future queries.
3. **Triplet embeddings, not just node embeddings.** `memify()` creates vector embeddings for `(subject, predicate, object)` triples. Most GraphRAG systems embed nodes; Cognee embeds relationships. Enables "semantic search over edges" — e.g., find all triples semantically similar to "Einstein worked at Princeton".
4. **Rule-based search-type routing with pattern-weight classifier.** Not an LLM call. `"MATCH (n)"` → CYPHER (w=10), quoted phrases → CHUNKS_LEXICAL (w=8), "why/explain" → GRAPH_COMPLETION_COT (w=4). Negation suppression (within 20-char window). Deterministic and cheap.
5. **`@agent_memory` decorator.** Wraps agent functions, auto-injects memory context, records tool traces, generates LLM feedback summaries per step, periodically cognifies traces into permanent graph. This is agent-runtime scaffolding, not generic GraphRAG.
6. **Async-first API.** Every public function is `async`. Unusual for OSS memory libraries; signals agent-runtime design.
7. **DataPoint system with identity-field-driven UUID5 dedup.** Entities with declared `identity_fields` get deterministic UUIDs; same logical entity in multiple documents merges automatically if identity fields are set. Without identity fields, entities duplicate.

## System overview

### Storage substrate

| Store | Default | Also supported |
|---|---|---|
| Graph DB | Kuzu (file-per-tenant) | Neo4j, Neptune, Postgres-graph (experimental) |
| Vector store | LanceDB (per-tenant tables) | ChromaDB, pgvector, Qdrant, Weaviate, Milvus |
| Relational | SQLite | Postgres |
| Session cache | FS (ephemeral) | Redis (production) |

No static schema file. Nodes extend `DataPoint` (`cognee/infrastructure/engine/models/DataPoint.py:27-328`) — any Pydantic BaseModel subclass becomes a node type. `metadata.index_fields` declares which props get vector-indexed; `metadata.identity_fields` declares dedup keys. Optional OWL ontology grounding (`ONTOLOGY_FILE_PATH`) validates entity types against a predefined vocabulary.

Core node types emerge from the default ingestion pipeline: `DocumentChunk`, `Entity`, `NodeSet`. Edge types are generic — `Edge(relationship_name, properties, feedback_weight, importance_weight)`.

### Write path

`remember()` composes two pipelines:

1. **`add()`** (`cognee/api/v1/add/add.py`): resolves file/URL/text → `DataItem`, creates `Dataset` + `Data` records, saves raw data to local FS or S3. **No LLM calls.**
2. **`cognify()`** (`cognee/api/v1/cognify/cognify.py:1-150`):
   - `classify_documents` (L23): LLM call identifying doc type (research paper / code / chat / etc.).
   - `extract_chunks_from_documents` (L24): paragraph-based chunking (~512–8192 tokens).
   - `extract_graph_from_data` (L26 → `cognee/tasks/graph/extract_graph_from_data.py:128-150`): per-chunk LLM call via Instructor, produces `KnowledgeGraph(nodes, edges)`. Optional ontology validation.
   - `summarize_text`: hierarchical (chunk → doc → corpus).
   - `add_data_points` (L27): bulk-insert nodes into graph DB, generate embeddings for `index_fields`, store in vector DB.
3. Optional **`improve()`** if `self_improvement=True` (default).

Per-run LLM cost: 1 classify + N chunk-extraction + M summarize. Not cost-optimized for long conversations (per-chunk extraction).

Session memory (`remember(..., session_id=X)`) **short-circuits** the cognify path: writes `QAEntry(question, context, answer, feedback_score, used_graph_element_ids)` to the session cache, then optionally cognifies in the background. Variants: `TraceEntry` (agent tool calls) and `FeedbackEntry` (retroactive feedback).

### Read path

`recall(query_text, query_type=None, session_id=None, datasets=None, top_k=10, auto_route=True, scope="auto")` (`cognee/api/v1/recall/recall.py:317-532`).

Scope resolution (L373-387):
- `session_id` only → searches session cache; falls through to graph if empty.
- `session_id` + `datasets`/`query_type` → hybrid (session + graph, no short-circuit).
- No `session_id` → graph only.

Session-cache search is token-overlap Jaccard (not vector). Graph search dispatches to one of 13+ search types via the query router. Every returned dict is tagged with `_source` ∈ `{session, graph, trace, graph_context}`.

`GRAPH_COMPLETION` (default) is a classic GraphRAG: vector-search nodes → traverse neighborhood (configurable depth) → LLM prompt with serialized graph context.

### Consolidation

`improve(dataset, session_ids=None, run_in_background=False)` (`cognee/api/v1/improve/improve.py:36-368`):

1. **Apply feedback weights** (L221-256): for each graph element used in session Q&A, update `feedback_weight` by alpha (default 0.1). Higher-rated answers boost, lower-rated answers penalize.
2. **Persist session Q&A** (L258-272): cognify the Q&A text into the permanent graph tagged `node_set="user_sessions_from_cache"`.
3. **Memify enrichment** (L182-189): extract and embed `(subject, predicate, object)` triplets.
4. **Sync graph to sessions** (L316-368): copy recent graph edges back into session cache as human-readable summaries with per-session checkpoint tracking.

Without `session_ids`, only stage 3 runs.

### Forgetting

`forget()` (`cognee/api/v1/forget/forget.py:15-204`) is **hard-delete only**:
- Per-item: remove `Data` record + graph nodes + vectors.
- Per-dataset: wipe graph + vectors + relational records.
- `everything=True`: delete all datasets + prune session cache.

No soft-delete, no decay, no supersedes.

### Versioning / temporal

- `DataPoint.version: int` (default 1) — monotonic counter, incremented by `update_version()`.
- `created_at`/`updated_at` (ms).
- **No bi-temporal.** No validity intervals. No supersedes edges by default.
- `SearchType.TEMPORAL` exists as an enum; implementation is in `cognee/tasks/temporal_graph/` (experimental, flagged by `temporal_cognify` parameter).

### Multi-tenancy

RBAC via relational DB:
- `User`, `Permission` (user_id, dataset_id, permission_type ∈ {read, write, delete, share}), `Dataset`, `Data` tables.
- Every `add`/`cognify`/`recall`/`forget` call checks `get_authorized_dataset()`.
- When `ENABLE_BACKEND_ACCESS_CONTROL=True` (default), Kuzu uses per-tenant file isolation; Neo4j/Neptune use label-based filtering.
- Session cache keys `{user_id}:{session_id}`.
- Cross-user memory sharing: User A grants User B read access to dataset X → B can query A's graph.

### API surface

Core verbs (all async):
- `remember(data, dataset_name, session_id=None, self_improvement=True)` — ingest + cognify + optional improve.
- `recall(query_text, query_type=None, session_id=None, datasets=None, top_k=10, auto_route=True, scope="auto")` — search.
- `forget(data_id=None, dataset=None, everything=False)` — hard delete.
- `improve(dataset, session_ids=None, run_in_background=False)` — feedback loop + memify.
- `search(query_text, search_type=...)` — lower-level search.
- `prune()` — orphaned node cleanup.
- `@agent_memory(...)` decorator — auto-inject memory for agent functions.

### The paper (arXiv:2505.24478)

"Optimizing the Interface Between Knowledge Graphs and LLMs for Complex Reasoning" (Markovic et al. 2025). Based on README framing + eval artifacts:
- Contributes: triplet-embedding + feedback-weighting mechanism + query-routing classifier.
- Reports HotpotQA results vs Mem0/Graphiti/LightRAG (not LoCoMo).
- Does NOT cover: session-cache architecture, agent decorator, multi-tenancy — these predate or postdate the paper.

The paper is a **component-level contribution** (the `improve()` feedback loop + triplet embeddings) within a larger platform. Not a paper *about* Cognee; a paper about one mechanism Cognee uses.

## Comparative position

### vs Zep (`arxiv:2501.13956`)

Both graph-backed, both target "agent memory." Zep's Graphiti has **bi-temporal KG** with validity intervals and typed `Message`/`Episode`/`Fact` primitives. Cognee has neither — its "temporal" is limited, its nodes are generic `DataPoint`s with a single `version` counter. On the other hand, Cognee has the session-graph bidirectional sync + feedback loop, which Zep doesn't expose publicly. Different design priorities: Zep optimizes correction semantics; Cognee optimizes agent-loop integration.

### vs Memobase

Both multi-tenant production systems. Memobase is **schema-first user profiles** (8 topics / ~40 slots); Cognee is **schema-free dynamic graph** where types emerge from extraction. Memobase has 3 fixed LLM calls per flush (cost-predictable); Cognee has N per-chunk extraction calls (cost scales with document size). Memobase has reproducible LoCoMo numbers (75.78 overall); Cognee has HotpotQA but no LoCoMo. Memobase's write path is more cost-optimized; Cognee's read path is richer (13+ search types).

### vs A-Mem (`arxiv:2502.12110`)

A-Mem uses a Zettelkasten note network with LLM-driven linking + "memory evolution" (rewrites). Cognee's graph is comparable — nodes as "notes" with typed edges — but Cognee doesn't do memory evolution (rewriting existing nodes from new evidence). Cognee's feedback-weight updates are closer to recommender-system reranking than to A-Mem's content evolution.

### vs Karta

Karta is Rust (library scope), Cognee is Python (platform scope). Karta's "dream engine" (7 inference types) actively generates new knowledge; Cognee's improve() does some of this (cognifying sessions into graph) but much more narrowly — Cognee doesn't do induction/abduction/contradiction-dream passes. Karta has a real BEAM 100K benchmark (57.7%); Cognee has only HotpotQA. Different scales: Karta is a focused library, Cognee is a multi-backend platform.

### vs LangChain / LlamaIndex memory

Generic memory layers (ConversationSummaryMemory etc.) store buffered chat history with optional vector indexing. Cognee is in a different design space: agent-persistent graph + feedback loop. Cognee's API is memory-verb-first (`remember`/`recall`); LangChain's is message-list-first. Cognee's multi-backend abstraction doesn't exist in LangChain's memory module.

### vs shisad

Closest points of contact: session cache pattern (shisad's transcript store) + feedback loop (shisad's citation_count / last_cited_at). Gaps: shisad has explicit provenance/trust labels that Cognee lacks; Cognee has graph/vector multi-backend abstraction that shisad doesn't attempt. shisad's Recall surface is closer to Cognee's `recall(session_id=X)` with short-circuit semantics than to a bare vector-top-K.

## Strengths

1. **Session-graph bridging architecture.** First system in the survey with an explicit `improve()` feedback-loop verb. Feedback-weighted edges + cognified session entities is a defensible consolidation pattern.
2. **Multi-backend storage.** Dropping in Kuzu → Neo4j → Neptune is rare in OSS. Enables gradual scale-out without rewriting the memory layer.
3. **Search-type diversity.** 13+ retrieval modes with rule-based routing. Lets applications trade off cost (`CHUNKS_LEXICAL` cheap) vs quality (`GRAPH_COMPLETION_COT` expensive).
4. **Triplet embeddings** for semantic edge search.
5. **Agent-runtime integration**: `@agent_memory` decorator, Claude Code / Hermes Agent plugins.
6. **Multi-tenancy with shared datasets.** Real RBAC; cross-user permission grants; per-tenant graph files on Kuzu.
7. **Reproducible evals.** Ships evaluation scripts against Mem0/Graphiti/LightRAG in `evals/`.
8. **Async-first.** Every public function async.

## Gaps and risks

1. **No LoCoMo/LongMemEval evidence.** HotpotQA is multi-hop QA, not agentic-memory-specific. Without LoCoMo numbers, direct comparison with Zep/Mem0/Memobase/StructMem is indirect.
2. **No supersedes chains, no bi-temporal.** A single `version` counter is not a correction model. Zep is stronger here.
3. **Hard-delete-only `forget()`.** No soft-delete, no decay, no TTL. Memory loss is irreversible.
4. **Entity resolution is weak by default.** Duplicate entities across documents unless `identity_fields` is set consistently.
5. **Per-chunk LLM extraction.** Scales poorly with document size; no buffer-and-batch pattern like Memobase.
6. **No provenance / trust labels.** An ingested external document's extracted entities carry no source-trust markers.
7. **Generic graph schema.** `DataPoint`-extends-anything is powerful but unbounded; no guarantee of consistent typing across deployments.
8. **Session cache ephemeral by default.** Requires Redis for production; FS cache is lost on restart.
9. **Paper scope limited.** arXiv:2505.24478 covers only the KG-LLM interface piece; the broader system is not peer-reviewed.

## Verdict

**Promote to main `ANALYSIS.md` comparison matrix** with clear caveats:

- Primary novelty: **session-graph bidirectional sync with feedback-weighted consolidation** (`improve()`).
- Position: **hybrid memory system (semantic graph + session cache with bridging)**, closer to Zep than to Mem0/Memobase.
- Caveats: no LoCoMo evidence, no supersedes/bi-temporal, no provenance, per-chunk extraction (cost-unpredictable), hard-delete-only forgetting.
- Popularity + breadth (16.8k stars, multi-backend, multi-integration) justifies inclusion regardless of missing benchmarks.

### What we'd steal

1. **The `improve()` feedback loop as a consolidation verb.** shisad's consolidation worker could include an `improve`-equivalent: apply citation-feedback to `decay_score`/`importance_weight`, cognify high-value session content into the Identity-candidate pipeline, memify triplets into the derived KG.
2. **Triplet embeddings for edge-level semantic search.** shisad's derived-KG could embed `(subject, predicate, object)` triples from `relationship` entry_type payloads, enabling "find relationships similar to X".
3. **Rule-based search-type router.** Cheap, deterministic, auditable. shisad's Recall surface could use a similar router to select among {identity-only, active-attention-only, episodic, archive-widened}.
4. **Multi-backend abstraction as a deployment-story pattern.** shisad ships SQLite; Cognee shows how to cleanly abstract graph/vector/relational so a production deployment can swap to Postgres/Neo4j without rewriting the memory layer.
5. **Session-short-circuit semantics**: "if `session_id` is the only hint, stay in session cache". shisad's Recall could adopt this — don't expand into the full MemoryPack when the question is purely conversational.

### Where shisad's model is stronger

1. **Provenance + trust.** Cognee has no `ingress_handle_id` equivalent; every entity is just a node.
2. **Supersede chains.** Cognee's `version` counter is not a correction model; shisad's supersedes + bi-temporal validity is.
3. **Instruction-like rejection.** Cognee extracts whatever the LLM returns into the graph; shisad rejects directive-shaped content at write time.
4. **Capability-scoped retrieval.** Cognee has user/dataset scoping but no capability-scoping.

## Corrections & Updates

- 2026-04-25: Initial analysis against commit `f4964c31` (v1.0.3). Numbers and code paths verified in-repo. Paper content inferred from README + eval artifacts; full PDF not read.
