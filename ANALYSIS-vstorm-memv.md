---
title: "Analysis — memv (vstorm-co)"
date: 2026-02-23
type: analysis
system: memv
source:
  - references/vstorm-memv.md
  - vendor/memv (snapshot @ 36f3a78d9573ee37dd4e069c78f2cd5e899111bd, captured 2026-02-23)
related:
  - ANALYSIS-arxiv-2508.03341-nemori.md
  - ANALYSIS-academic-industry.md
---

# Analysis — memv (vstorm-co)

`memv` (PyPI: `memvee`) is a small, opinionated Python library that implements a Nemori-inspired memory pipeline (episode segmentation + predict-calibrate extraction) and combines it with Graphiti-like **bi-temporal validity** and a pragmatic **SQLite-first** storage/retrieval stack (sqlite-vec + FTS5 + RRF).

This file is a critical deep dive over the vendored snapshot in `vendor/memv` (commit `36f3a78d…`).

## Stage 1 — Descriptive (what memv is)

### Product surface

- Main API: `vendor/memv/src/memv/memory/memory.py` (`Memory` class).
- Primary operations:
  - **Append**: `add_message()` / `add_exchange()` store raw messages.
  - **Process**: `process()` segments messages → generates episodes → extracts semantic knowledge → indexes.
  - **Retrieve**: `retrieve()` returns a `RetrievalResult` formatted for prompt injection (currently a list of semantic knowledge statements).
- Default config is centralized in `vendor/memv/src/memv/config.py` (`MemoryConfig`), with defaults that enable:
  - batch segmentation + time-gap splits,
  - episode merging,
  - knowledge dedup,
  - embedding cache.

### Data model / storage

The persisted entities are:

- **Messages**: append-only store with `user_id`, `role`, `content`, `sent_at` (`vendor/memv/src/memv/models.py` + `vendor/memv/src/memv/storage/sqlite/_messages.py`).
- **Episodes**: `(title, narrative, original_messages, start_time, end_time)` stored in SQLite (`vendor/memv/src/memv/storage/sqlite/_episodes.py`).
  - Note: episodes are stored, but there is no episode vector/text index in this snapshot; they are used mainly as an intermediate representation and for provenance (`source_episode_id`).
- **Semantic knowledge**: natural-language statements with:
  - **event time**: `valid_at/invalid_at`,
  - **transaction time**: `created_at/expired_at`,
  - plus embedding and `source_episode_id` (`vendor/memv/src/memv/models.py` + `vendor/memv/src/memv/storage/sqlite/_knowledge.py`).

### Write path (pipeline)

Implemented in `vendor/memv/src/memv/memory/_pipeline.py`:

1. Load unprocessed messages (messages after the latest episode’s end time).
2. Segment into episode groups using `BatchSegmenter` by default (`vendor/memv/src/memv/processing/batch_segmenter.py`):
   - split first on **time gaps** (default 30 minutes),
   - then use a single LLM call to group messages by topic (can group interleaved topics).
3. Generate episode title + third-person narrative (`vendor/memv/src/memv/processing/episodes.py`) and store raw messages on the episode.
4. Optionally merge episodes by embedding similarity (`vendor/memv/src/memv/processing/episode_merger.py`).
5. Retrieve existing semantic knowledge relevant to `(episode.title + episode.content)` to seed prediction.
6. Run **predict-calibrate extraction** (`vendor/memv/src/memv/processing/extraction.py`), using original messages as the extraction ground truth.
7. Backfill/parse temporal fields from `temporal_info` (`vendor/memv/src/memv/processing/temporal.py`).
8. Filter low-confidence extractions (confidence ≥ 0.7).
9. Embed extracted statements in batch; store + index:
   - vector index: sqlite-vec (`vendor/memv/src/memv/storage/sqlite/_vector_index.py`)
   - text index: FTS5 BM25 (`vendor/memv/src/memv/storage/sqlite/_text_index.py`)

**Contradictions / invalidation**: if an extracted item is labeled `contradiction`, the pipeline searches for the top-1 nearest existing statement by embedding similarity and calls `knowledge.invalidate()` if similarity ≥ 0.7.

### Read path (retrieval)

Implemented in `vendor/memv/src/memv/retrieval/retriever.py`:

- Hybrid candidate generation:
  - vector search over knowledge embeddings (sqlite-vec),
  - BM25 search over the same knowledge statements (FTS5).
- Fusion:
  - Reciprocal Rank Fusion (RRF, constant `k=60`) with a configurable `vector_weight` (default 0.5).
- Temporal filters:
  - `at_time` filters by event validity (`valid_at/invalid_at`),
  - `include_expired` toggles transaction-time filtering (`expired_at`).

## Stage 2 — Evaluative (coherence, risks, missing pieces)

### Strengths

- **Predict-calibrate as a default write gate**: “store what wasn’t predicted” is a high-signal heuristic that should reduce redundant memory growth versus naive extraction.
- **Bi-temporal semantics are a strong default** for user/profile memory:
  - enables point-in-time queries and history inspection,
  - avoids silent overwrite as the default “update” behavior.
- **Local-first SQLite stack** is operationally attractive:
  - sqlite-vec + FTS5 keep deployment simple,
  - RRF fusion is a good “baseline-best-practice” hybrid retrieval choice.

### Risks / open questions

- **Derived-first retrieval surface**: the public `retrieve()` API returns semantic statements; episodic evidence is stored but not currently retrieved/indexed in the same IR stack. For auditability/safety, most systems need an evidence tier surfaced at read-time.
- **Contradiction handling is similarity-based**: invalidating only the nearest neighbor (top-1) by embedding similarity is a coarse heuristic; it can miss the actually-conflicting fact or invalidate the wrong one.
- **LLM dependence**: segmentation and extraction are LLM calls; quality/latency/cost and prompt-injection safety depend on downstream integrators’ controls.
- **Typing and schemas**: knowledge is still “just statements”; richer typed objects (constraints, ledgers, procedures) and validators are not core to this snapshot.

## Stage 3 — Prescriptive (how this informs shisad)

- memv is a useful “minimum viable” implementation reference for:
  - predict-calibrate write gating,
  - bi-temporal invalidation semantics,
  - hybrid retrieval with RRF on a local SQLite stack.
- For `shisad`, the two biggest deltas to make this safe and scalable are:
  1. **Evidence-first read path** (surface episodes/pages with provenance alongside derived statements).
  2. **Stronger correction semantics** (explicit supersedes chains and conflict sets, not “invalidate nearest neighbor”).
