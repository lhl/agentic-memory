---
title: "Analysis — MemPalace"
date: 2026-04-07
type: analysis
source:
  - https://github.com/milla-jovovich/mempalace
status: not promoted (claims-vs-code issues; see REVIEWED.md)
related:
  - REVIEWED.md
  - README.md
---

# Analysis — MemPalace

MemPalace is a Python-based agent memory system organized around the **method of loci** — the ancient mnemonic technique of placing memories in rooms of an imaginary building. The core proposition is "store everything, then make it findable" via spatial structure rather than AI-driven curation.

The project is very new (created 2026-04-05, ~988 stars in 2 days, 7 commits) and lightweight (21 Python files, 2 runtime dependencies: `chromadb` + `pyyaml`). It provides an MCP server with 20 tools, a CLI for mining projects/conversations, and a 4-layer memory stack with very low wake-up cost (~170 tokens).

**The spatial metaphor is genuinely novel in this survey.** However, the README makes several claims that the code does not substantiate, and the headline benchmark (96.6% LongMemEval R@5) is misleading about what the system actually does vs. what plain ChromaDB vector search does.

> **Status: NOT PROMOTED to ANALYSIS.md.** This is the only system we've reviewed with multiple outright false claims in the README — features described that don't exist in code, and "lossless" compression that is measurably lossy. The spatial metaphor is worth tracking but the claims gap disqualifies it from the main comparison. See `REVIEWED.md` for the triage entry.

> **UPDATE:** @milla-jovovich has graciously [acknowledged our findings](https://github.com/milla-jovovich/mempalace/issues/27#issuecomment-4201242972) and has been [actively remediating](https://github.com/milla-jovovich/mempalace/issues/27#issuecomment-4216409621) known issues. It's great to see that!

## Claims vs. code reality — READ THIS FIRST

This section is placed first because the gap between README claims and actual implementation is unusually large and affects how every other section should be read.

| README claim | What the code actually does | Severity |
|---|---|---|
| **"Contradiction detection"** — automatically flags inconsistencies against the knowledge graph | `knowledge_graph.py` has **no contradiction detection**. The only dedup is blocking identical open triples (same subject/predicate/object where `valid_to IS NULL`). Conflicting facts (e.g., two different `married_to` values) accumulate silently. | **Feature does not exist** |
| **"30x compression, zero information loss"** — AAAK described as "lossless shorthand" | AAAK is lossy abbreviation: regex entity codes + keyword frequency + 55-char sentence truncation. `decode()` is string splitting — no original text reconstruction. Token counting uses `len(text)//3` heuristic. **LongMemEval drops from 96.6% to 84.2% in AAAK mode** — a 12.4pp quality loss. | **Claim is false** |
| **96.6% LongMemEval R@5** (headline, positioned as MemPalace's score) | Real score, but measured in "raw mode" — uncompressed verbatim text stored in ChromaDB, standard nearest-neighbor retrieval. **The palace structure (wings/rooms/halls) is not involved.** This measures ChromaDB's default embedding model performance, not MemPalace. | **Misleading attribution** |
| **"+34% retrieval boost from palace structure"** | Narrowing search scope from all drawers → wing → wing+room. This is metadata filtering — a standard technique in any vector DB, not a novel retrieval mechanism. | **Misleading framing** |
| **"100% with Haiku rerank"** | Not in the benchmark scripts. Method undocumented and unverifiable from the repo. | **Unverifiable** |
| **"Closets" as compressed summaries** | AAAK produces abbreviations, not summaries. No evidence of a separate closet storage tier distinct from drawers. | **Nomenclature mismatch** |
| **Hall types structurally enforced** | Halls exist as metadata strings but are not used in retrieval ranking or enforced as constraints. | **Conceptual, not functional** |

**Context:** No other system in this survey has this pattern. Systems like Supermemory have transparency caveats (proprietary backend), and many report benchmarks "as reported" without independent verification — but none claim features that provably don't exist in their own code.

## TL;DR

- **Core idea**: spatial organization (Wings → Rooms → Halls → Closets → Drawers) as a structural retrieval aid, inspired by the method of loci
- **Storage**: single ChromaDB collection (`mempalace_drawers`) for everything (memories + diary entries), plus SQLite knowledge graph for temporal entity triples
- **Retrieval**: ChromaDB nearest-neighbor with optional metadata filtering by wing/room; no re-ranking, no BM25, no hybrid search
- **Write path**: deterministic chunking (800 chars/100 overlap) + rule-based classification (regex/keyword); no LLM in the extraction pipeline
- **AAAK compression**: entirely rule-based abbreviation (regex + dict lookups + templates); claims "30x, zero information loss" but benchmark shows 12.4% retrieval quality drop
- **Wake-up cost**: genuinely low (~170 tokens for L0+L1) — a real differentiator
- **Headline benchmark is inflated**: 96.6% LongMemEval R@5 is just ChromaDB vector search on uncompressed text; the "palace structure" adds metadata filtering, a standard technique
- **Knowledge graph claims contradiction detection**: code has none; dedup only blocks identical open triples
- **4 test files for 21 modules**, 7 commits total — very early-stage code
- **Zero LLM dependency on write path** — both a strength (no API cost, offline) and a weakness (no semantic extraction, no write gating)

## 1. What's genuinely novel

### 1.1 The spatial metaphor as organizing principle

No other system in this survey uses a spatial/navigational metaphor for memory organization. The Wing/Room/Hall/Tunnel structure provides:

- **Human-legible organization**: a user can reason about "which wing, which room" more intuitively than "which collection, which namespace"
- **Cross-domain connections (tunnels)**: rooms with the same name across wings are automatically linked — a simple but clever heuristic for finding conceptual bridges
- **Hierarchical scoping**: search can be progressively narrowed (all → wing → wing+room) with predictable retrieval quality improvement

The metaphor is genuinely appealing for onboarding and explainability, even if the underlying mechanism is just metadata filtering on ChromaDB.

### 1.2 Extremely low wake-up cost

The 4-layer stack is well-designed for token economy:

| Layer | Content | Token budget | When loaded |
|-------|---------|-------------|-------------|
| L0 | Identity file (`~/.mempalace/identity.txt`) | ~50-100 | Always |
| L1 | Top-15 drawers by importance, grouped by room | ~500-800 | Always |
| L2 | Wing/room-scoped recall | ~200-500 | On topic trigger |
| L3 | Full semantic search | Unbounded | Explicit query |

~600-900 tokens at wake-up leaves >95% of context free. This is better than most systems reviewed: Claude Code loads full MEMORY.md + topic files; OpenViking loads L0 abstracts recursively; ByteRover loads a tiered context tree. MemPalace's approach is closest to ENGRAM's strict evidence budgets but simpler.

### 1.3 Zero-LLM write path

All extraction, classification, and compression is deterministic:
- **AAAK compression**: regex entity detection + keyword frequency + sentence scoring + emotion/flag keyword lookup
- **General extractor**: regex-based classification into 5 categories (decisions/preferences/milestones/problems/emotional) with confidence scoring
- **Room detection**: folder path matching → filename matching → keyword scoring → fallback

This means the entire system runs offline with zero API cost on writes. The trade-off is no semantic understanding during extraction.

### 1.4 Agent diary system

Each agent gets its own wing and timestamped diary entries stored in the same ChromaDB collection (distinguished by metadata `type: diary_entry`). This enables per-agent persistent memory accumulation without a shared scratchpad — similar in spirit to ByteRover's per-project agent pools but simpler.

## 2. Architecture

### 2.1 Storage layer

Everything lives in one ChromaDB persistent collection (`mempalace_drawers`). There is no separate collection per wing, per room, or per type. Diary entries, mined project files, and conversation memories all share the same vector space.

**Metadata schema per drawer:**

| Field | Purpose |
|-------|---------|
| `wing` | Top-level grouping (person/project/topic) |
| `room` | Named topic within a wing |
| `hall` | Memory category (hall_facts, hall_events, etc.) |
| `source_file` | Original file path |
| `chunk_index` | Position within chunked file |
| `added_by` | Agent identifier |
| `filed_at` | ISO timestamp |
| `importance` | Numeric weight (checked during L1 loading) |
| `emotional_weight` | Numeric weight (fallback for L1 scoring) |

**Drawer IDs** are deterministic: `drawer_{wing}_{room}_{md5(source_file + chunk_index)[:16]}`.

### 2.2 Knowledge graph (SQLite)

Two tables: `entities` (id, name, type, properties) and `triples` (subject, predicate, object, valid_from, valid_to, confidence, source_closet, source_file). Entity IDs are slugified names (`alice_obrien`).

Temporal validity uses string comparison on ISO dates:
```sql
AND (t.valid_from IS NULL OR t.valid_from <= ?)
AND (t.valid_to IS NULL OR t.valid_to >= ?)
```

The graph is inspired by Zep's Graphiti but much simpler: no community detection, no episodic layer, no BFS retrieval, no entity resolution beyond exact slug matching.

### 2.3 Palace graph (derived from metadata)

The "palace graph" (rooms, halls, tunnels) is **not stored as a graph**. It is computed on-demand by scanning ChromaDB metadata in 1000-item batches and building set intersections:

- Two rooms are **connected** if they share a wing (BFS traversal)
- A **tunnel** exists when the same room name appears in 2+ wings
- **Halls** are just metadata labels, not structural entities

This is lightweight but entirely structural — no semantic similarity between rooms, no edge weights, no learned connections.

## 3. Write path

### 3.1 Project mining

Files are walked recursively from a project directory. Supported: 20 file extensions (txt, md, py, js, ts, etc.). Skipped: standard build/dep directories.

Room assignment uses a 4-priority cascade:
1. Folder path segment matches a room name
2. Filename stem matches a room name
3. Keyword frequency scoring in first 2000 chars
4. Fallback to `general`

Chunking: 800 chars per chunk, 100 char overlap, paragraph-then-line boundary splitting. Chunks <50 chars are discarded.

**Dedup**: file-level only — if any drawer exists with the same `source_file`, the entire file is skipped. No content-level dedup within the mining pipeline (though the MCP `add_drawer` tool checks vector similarity before inserting).

### 3.2 AAAK compression

AAAK is a **deterministic abbreviation scheme**, not a compression codec:

1. Entity detection: known name→code mappings, or first-3-chars of capitalized words
2. Topic extraction: word frequency + proper noun boosting, top-3
3. Key sentence selection: decision-keyword scoring, truncated at 55 chars
4. Emotion detection: keyword → abbreviated emotion code
5. Flag detection: keyword → flag label (DECISION, CORE, etc.)

Output format: `wing|room|date|source_stem\n0:ENTITY+ENTITY|topic|"key sentence"|emotion|FLAG`

Token counting uses `len(text) // 3` (heuristic, not real tokenization). The "~30x compression" claim is based on this approximation.

**Critical**: the "decode" method is just string splitting back into a dict. There is no reconstruction of original text. AAAK is lossy.

### 3.3 General extractor

Rule-based classification into 5 categories via regex scoring:
- Code lines are stripped before scoring
- Segments >500 chars get +2 bonus, >200 get +1
- Confidence = min(1.0, max_score / 5.0); segments below 0.3 are dropped
- Sentiment helper resolves conflicts (problem + resolution keywords → reclassified as milestone)

## 4. Read path

### 4.1 Search

ChromaDB `col.query(query_texts=[query], n_results=N)` with optional `where` filters:
- Wing only: `{"wing": wing}`
- Room only: `{"room": room}`
- Both: `{"$and": [{"wing": wing}, {"room": room}]}`

Distance → similarity: `round(1 - dist, 3)`. No re-ranking, no BM25, no hybrid retrieval. Results are returned in ChromaDB's native order (embedding distance).

### 4.2 Layer loading

- **L0**: reads `~/.mempalace/identity.txt` — user-authored persona file
- **L1**: queries ChromaDB, scores by `importance`/`emotional_weight`/`weight` metadata, takes top-15 drawers, groups by room, truncates snippets at 200 chars
- **L2**: queries ChromaDB with wing/room filter, truncates at 300 chars
- **L3**: full search (same as 4.1)

### 4.3 Knowledge graph queries

- `query_entity(name, as_of, direction)`: outgoing, incoming, or both triples with temporal filtering
- `timeline(entity)`: all triples sorted by valid_from
- `query_relationship(predicate)`: all triples of a given type

No graph traversal in the KG — it's flat triple lookup, not multi-hop.

## 5. Benchmark assessment

### 5.1 LongMemEval: 96.6% R@5

This is the headline number. What it actually measures:

- **Mode**: "raw" — uncompressed verbatim text stored in ChromaDB
- **Method**: ChromaDB default embedding model, nearest-neighbor retrieval
- **What this tells you**: ChromaDB's default embeddings do very well on LongMemEval's retrieval task when you store the raw text

What it does NOT tell you:
- The "palace structure" is not being tested in raw mode — there's no wing/room filtering
- AAAK-compressed mode scores **84.2%** (12.4pp drop)
- Room-based boosting scores **89.4%** (7.2pp drop from raw)

The "+34% retrieval boost from palace structure" reported in the README comes from a different measurement: searching within progressively narrower scopes on 22K+ memories. This is metadata filtering — a standard technique, not a novel retrieval mechanism.

### 5.2 LoCoMo: 60.3% (session granularity, top-10)

This is mediocre. For comparison:
- HiMem reports 83-89% on LoCoMo (as reported)
- Hindsight reports similarly high scores
- SimpleMem and A-Mem both claim significant LoCoMo improvements

The top-k=50 number (77.8%) is much better but requires loading 5x more context — defeating the token-efficiency argument.

### 5.3 ConvoMem: 92.9%

Only 50 items per category (300 total) with 75K+ QA pairs available. The truncated sample size limits statistical confidence.

### 5.4 Methodological notes

- No end-to-end QA evaluation (retrieval only — "requires LLM API key")
- No comparison against any baseline system
- No statistical significance testing
- Benchmark scripts are provided and appear runnable — reproducibility is a genuine strength
- The README's "100% with Haiku rerank" claim appears to use an LLM reranker not included in the benchmark scripts

## 6. MCP server

20 tools across 5 categories — all implemented (no stubs):

- **Palace read** (7): status, search, list wings/rooms, taxonomy, duplicate check, AAAK spec
- **Palace write** (2): add drawer, delete drawer
- **Knowledge graph** (5): query, add, invalidate, timeline, stats
- **Navigation** (3): traverse, find tunnels, graph stats
- **Agent diary** (2): write, read

Notable: the `PALACE_PROTOCOL` string is embedded in the `status` tool output, instructing the AI to "BEFORE RESPONDING about any person...call mempalace_kg_query or mempalace_search FIRST. Never guess — verify." This is a good prompt-engineering practice for grounded retrieval.

The JSON-RPC 2.0 implementation is manual (stdin/stdout line loop), standard MCP transport.

## 7. Comparison positioning (not in ANALYSIS.md — claims gap)

### 8.1 Closest systems in this survey

| System | Similarity | Key difference |
|--------|-----------|----------------|
| **ENGRAM** | Typed memory, low token budgets, simple retrieval | ENGRAM uses LLM-routed typed stores; MemPalace uses spatial metaphor with single store |
| **Memoria** | SQLite + ChromaDB, session-based | Memoria has recency weighting + KG triplets; MemPalace has spatial structure + AAAK |
| **Mnemosyne** | Graph memory, lightweight | Mnemosyne has probabilistic decay + refresh; MemPalace has no decay |
| **ClawVault** | Structured markdown, session lifecycle | ClawVault has observation pipeline + task primitives; MemPalace is simpler but less capable |
| **Claude Code memory** | Flat-file memory, typed topics | Claude Code has LLM extraction + team memory; MemPalace has spatial structure + mining |

### 8.2 What MemPalace adds to the design space

1. **Spatial metaphor as user-facing organization** — no other system uses navigable "rooms"
2. **Zero-LLM write path** — fully offline, zero API cost, deterministic
3. **Verbatim-first philosophy** — "store everything, never summarize" (drawers hold originals)
4. **Very low wake-up cost** — 170 tokens is among the lowest in this survey
5. **Mining pipeline for existing artifacts** — most systems only capture new conversations

### 8.3 What MemPalace lacks vs. the field

- **No decay/forgetting** — memories accumulate without recency weighting or pruning
- **No LLM-based extraction** — misses semantic relationships, implicit facts, latent constraints
- **No write gating** — any content can be added without validation or confirmation
- **No dedup beyond file-level** — similar memories accumulate in different chunks
- **No provenance/audit trail** — no correction chains, no versioned updates
- **No multi-hop retrieval** — KG is flat triple lookup, not graph traversal
- **No hybrid search** — ChromaDB only, no BM25/FTS fallback
- **No feedback loops** — no echo/fizzle tracking, no usage-based retention

## 8. Risks and gaps (beyond claims issues)

### 9.1 Scale concerns

Everything is in one ChromaDB collection. At 22K drawers the benchmarks work, but:
- The palace graph is computed by scanning all metadata in 1000-item batches — O(n) per graph build
- L1 loading iterates all metadata to find top-15 by importance — O(n) per wake-up
- No indexing strategy for wing/room filtering beyond ChromaDB's built-in

### 9.2 Security

- No write gating or confirmation — MCP `add_drawer` inserts directly
- No input sanitization on drawer content (prompt injection surface)
- No taint tracking or provenance
- The KG `seed_from_entity_facts` method maps dict keys to graph triples without validation

### 9.3 Knowledge graph fragility

- Entity ID normalization is naive slug (`alice_obrien`) — no entity resolution
- Row parsing uses hardcoded column indices (`row[10]`, `row[11]`) — brittle
- String date comparison works only with consistent ISO formatting
- No contradiction detection despite README claim

## 9. Synthesis takeaways

**Worth adopting:**
- The spatial metaphor is genuinely useful for user-facing organization and could layer on top of more sophisticated backends
- The 4-layer progressive loading pattern with strict token budgets is well-designed
- The "store verbatim, compress separately" pattern avoids premature information loss
- Zero-LLM write path is a legitimate architecture choice for cost-sensitive deployments
- MCP protocol embedding (PALACE_PROTOCOL in status output) is a good integration pattern

**Worth noting but not adopting:**
- AAAK compression trades retrieval quality for token savings in a way that undermines the "zero information loss" claim; real systems should use LLM-based summarization or structured extraction instead
- The palace graph (derived from metadata set intersections) is too simple for semantic navigation; a real graph should have weighted edges and multi-hop traversal
- The knowledge graph is a useful starting point but needs entity resolution, contradiction detection, and proper column-name-based parsing before production use

**Red flags for claims:**
- The headline 96.6% benchmark is ChromaDB, not MemPalace
- "Zero information loss" is false — AAAK is lossy
- "Contradiction detection" is not implemented
- The 2-day age and 7-commit history suggest this is very early-stage despite the polished README
