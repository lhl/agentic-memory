---
title: "memv — Structured, Temporal Memory for AI Agents"
author: "Bartosz Roguski (vstorm-co)"
date: 2026-02-23
type: reference
tags:
  - project
  - system
  - agent-memory
  - python
  - sqlite
  - hybrid-retrieval
  - bi-temporal
  - predict-calibrate
  - episode-segmentation
source: https://vstorm-co.github.io/memv/
source_repo: https://github.com/vstorm-co/memv
local_clone: ../vendor/memv
version: "memvee 0.1.0 (commit 36f3a78d, 2026-02-21)"
related:
  - ../ANALYSIS-vstorm-memv.md
  - nan-nemori.md
---

# memv

> Structured, temporal memory for AI agents: episode segmentation → predict-calibrate extraction → bi-temporal knowledge store → hybrid retrieval.

## TL;DR

- **memv** (PyPI package `memvee`) is a Python library that implements a Nemori-inspired memory pipeline:
  - segments raw messages into coherent **episodes**,
  - extracts **semantic knowledge** using **predict-calibrate** (store only what the model failed to predict),
  - tracks knowledge with **bi-temporal validity** (event time + transaction time),
  - retrieves with **hybrid search** (sqlite-vec vector search + SQLite FTS5 BM25 + RRF fusion).
- Default storage is **SQLite** (local-first) and the library is built to plug into agent frameworks (examples for PydanticAI, LangGraph, LlamaIndex, CrewAI, AutoGen).

## What it provides (product surface)

- `Memory` class with:
  - `add_message` / `add_exchange` to append raw messages,
  - `process()` / `process_async()` to segment → generate episodes → extract knowledge,
  - `retrieve()` for query-time context (currently returns semantic knowledge statements).
- Optional features:
  - batch segmentation with time-gap splitting (default 30 minutes),
  - episode merging (default enabled),
  - knowledge deduplication (default enabled),
  - embedding cache (default enabled).

## Architecture (as documented / implemented)

```
Messages (append-only)
  → Episodes (segmented, titled, narrative + raw messages)
  → Knowledge (predict-calibrate statements with bi-temporal validity)
  → Retrieval (vector + BM25 + RRF)
```

Key inspirations called out by the project:
- **Predict-Calibrate** extraction: Nemori (arXiv:2508.03341)
- **Bi-temporal validity** framing: Graphiti (getzep/graphiti)

## Notable design choices (builder lens)

- The extraction pipeline explicitly treats **original messages as ground truth** and positions the episode narrative as a retrieval-friendly representation (not the extraction source).
- Contradictions are handled via **invalidation** (expire old records; keep history) rather than overwrite/delete.
- Retrieval is hybrid IR, but the current public `retrieve()` API surfaces **semantic knowledge** (statements), not full episodic evidence.
