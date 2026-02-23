# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

memv is a structured, temporal memory system for AI agents. It extracts and retrieves knowledge from conversations using a predict-calibrate approach (inspired by Nemori): importance emerges from prediction error, not upfront LLM scoring.

PyPI package name: `memvee`. Import name: `memv`.

## Development Setup

Uses `uv` for dependency management. Requires Python 3.13.

```bash
make install                # uv sync + pre-commit hooks
make sync                   # update deps
```

## Commands

```bash
# Quality
make format                 # ruff format + fix
make lint                   # ruff check + format check
make typecheck              # ty check src/
make all                    # format + lint + typecheck + test

# Testing
uv run pytest                                    # all tests
uv run pytest tests/test_models.py::test_name    # single test

# Docs
make docs                   # mkdocs build --strict
make docs-serve             # local preview

# Pre-commit
uv run pre-commit run --all-files
```

Pre-commit hooks (ruff-check, ruff-format, ty) run on `src/` only.

## Architecture

### Data Flow

```
Messages → BatchSegmenter → Episodes → EpisodeGenerator → PredictCalibrateExtractor → SemanticKnowledge
                                                                    ↓
                                                    VectorIndex + TextIndex (per type)
                                                              ↓
                                                    Retriever (RRF fusion)
```

### Key Modules (`src/memv/`)

**`memory/`** — `Memory` class is the public API. Internally split into:
- `_api.py`: add_message, add_exchange, retrieve, clear_user
- `_lifecycle.py`: LifecycleManager (init/open/close, wires all components)
- `_pipeline.py`: Pipeline (orchestrates processing stages)
- `_task_manager.py`: TaskManager (auto-processing, buffering, background tasks)

**`processing/`** — All extraction logic:
- `batch_segmenter.py`: Groups messages into episodes via single LLM call. Handles interleaved topics, splits on time gaps (30 min default).
- `episodes.py`: EpisodeGenerator — converts message sequences to episodes with third-person narratives.
- `extraction.py`: PredictCalibrateExtractor — the core innovation. Predicts what episode should contain given existing KB, extracts only what was unpredicted.
- `episode_merger.py`: Deduplicates semantically similar episodes (cosine similarity threshold).
- `boundary.py`: Legacy incremental boundary detector (replaced by BatchSegmenter, kept behind `use_legacy_segmentation` flag).
- `prompts.py`: All LLM prompt templates.

**`retrieval/retriever.py`** — Hybrid search: vector similarity (sqlite-vec) + BM25 text (FTS5), merged via Reciprocal Rank Fusion (k=60). Temporal filtering via `at_time` and `include_expired`. All queries scoped by `user_id`.

**`storage/sqlite/`** — All stores inherit `StoreBase` (async context manager + transactions). Convention: UUIDs as TEXT, datetimes as Unix timestamps (INTEGER), complex fields as JSON.

**`protocols.py`** — `EmbeddingClient` (`embed`, `embed_batch`) and `LLMClient` (`generate`, `generate_structured`). Implement these for custom providers. Also defines `MessageStore`, `EpisodeStore`, `KnowledgeStore` protocols (incomplete — not all methods the SQLite implementations expose are in the protocols yet). No protocol for `VectorIndex` or `TextIndex`.

**`config.py`** — `MemoryConfig` dataclass with all tuning knobs. Key defaults: `auto_process=False`, `batch_threshold=10`, `merge_similarity_threshold=0.9`, `knowledge_dedup_threshold=0.8`, `time_gap_minutes=30`, `enable_embedding_cache=True`.

**`embeddings/openai.py`** — `OpenAIEmbedAdapter` (text-embedding-3-small, 1536 dims).

**`llm/pydantic_ai.py`** — `PydanticAIAdapter` (multi-provider via PydanticAI).

**`dashboard/`** — Textual TUI for browsing memory state. Run via `uv run python -m memv.dashboard`.

### Public API

```python
async with memory:
    await memory.add_exchange(user_id, user_msg, assistant_msg)  # store conversation pair
    await memory.add_message(message)                            # store single Message
    await memory.process(user_id)                                # extract knowledge (blocking)
    result = await memory.retrieve("query", user_id=user_id)     # hybrid search
    result.to_prompt()                                           # format for LLM context
    await memory.clear_user(user_id)                             # delete all user data
```

`Memory` must be used as an async context manager — `open()` initializes stores/indices, `close()` cleans up.

### Critical Design Decisions

**Episode.original_messages is ground truth for extraction**, not Episode.content. The narrative content is for retrieval display. The extractor works against the raw messages to find novel knowledge.

**Bi-temporal model**: Every `SemanticKnowledge` has event time (`valid_at`/`invalid_at` — when fact is true in world) and transaction time (`created_at`/`expired_at` — when we recorded it). `is_valid_at(time)` checks event time, `is_current()` checks transaction time.

**User isolation is mandatory**: All retrieval and storage operations require and filter by `user_id`. No cross-user queries possible by design.

**Extraction validation (`_pipeline.py`)**: `_validate_extraction` enforces a single check: confidence >= 0.7. All regex filters (third-person, first-person pronouns, relative time, assistant-sourced patterns) were removed because they only work for English. Quality enforcement is handled entirely at the prompt level via ATOMIZATION_RULES and EXCLUSIONS in `prompts.py`.

**`temporal.py` regex gotchas**: Avoid broad word matches in `_RELATIVE_PATTERNS` (e.g. "later"/"earlier" match adjective usage). `_UNTIL_PATTERN` must not include bare "to" (matches non-temporal uses). `_SINCE_PATTERN` uses `began` not `began?` (the `?` makes "a" optional).

**PR reviews**: The `claude` bot posts automated code reviews on PRs. Check with `gh pr view <N> --comments` and address feedback before merging.

## Code Style

- Line length: 135 characters
- Ruff rules: I (isort), ERA (dead code), F401 (unused imports), E/W (pycodestyle), B (flake8-bugbear)
- ty for type checking (pre-release, `src/` only)
- All datetimes in UTC (`datetime.now(timezone.utc)`)
- Async everywhere: stores, embedding calls, LLM calls, processing

## Plan Tracking

After committing code changes, update `notes/PLAN.md` checkboxes and append to `notes/PROGRESS.md`. Follow the format in the `/update-plan` command.

## CI

- `.github/workflows/ci.yml` — lint, typecheck, test on Python 3.13
- `.github/workflows/docs.yml` — mkdocs build → GitHub Pages
- `.github/workflows/publish.yml` — PyPI publish on release tags
