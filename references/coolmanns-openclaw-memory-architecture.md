---
title: "OpenClaw Memory Architecture"
author: coolmanns (Gandalf system)
source_repo: https://github.com/coolmanns/openclaw-memory-architecture
local_clone: ../vendor/openclaw-memory-architecture
date: 2026-02-20
type: reference
tags: [agent-memory, architecture, openclaw, knowledge-graph, sqlite, embeddings, plugins, production]
version: v6.0
context: "Shared by @joelhooks as related to the @jumperz memory stack discussion"
related:
  - jumperz-agent-memory-stack.md
  - joelhooks-adr-0077-memory-system-next-phase.md
---

# OpenClaw Memory Architecture

> A multi-layered memory system for OpenClaw agents that combines structured storage, semantic search, and cognitive patterns to give your agent persistent, reliable memory.

**Key insight:** Don't rely on one approach. Vector search is great for fuzzy recall but overkill for 80% of what a personal assistant needs. Use the right memory layer for each type of recall.

## Architecture: 12-Layer Stack

```
SESSION CONTEXT (~200K token window)
├── Layer 1:  Always-loaded files (SOUL.md, USER.md, active-context.md)     0ms
├── Layer 2:  MEMORY.md — curated long-term wisdom                          0ms
├── Layer 3:  project-{slug}.md — cross-agent institutional knowledge       0ms
├── Layer 4:  facts.db — SQLite + FTS5, entity/key/value structured store   <1ms
├── Layer 5:  Semantic search — QMD reranking / llama.cpp GPU (768d)         7ms
├── Layer 5a: Domain RAG — ebooks, 4,361 chunks, 27 documents               ~100ms
├── Layer 6:  Daily logs — YYYY-MM-DD.md raw session history                on demand
├── Layer 7:  tools-*.md — procedural runbooks                              on demand
├── Layer 8:  gating-policies.md — failure prevention rules                 on demand
├── Layer 9:  checkpoints/ — pre-flight state saves                         on demand
├── Layer 10: Continuity plugin — cross-session conversation memory         runtime
├── Layer 11: Stability plugin — entropy monitoring, drift prevention       runtime
└── Layer 12: Graph-memory plugin — automatic entity injection              runtime
```

## Production Scale

- **14 OpenClaw agents** in production (Gandalf, Pete, Toby, Beta-tester, Ram Dass, etc.)
- **3,108 facts**, 1,009 relations, 275 aliases in knowledge graph
- **2,065 exchanges** in continuity archive
- **4,361 chunks** in domain RAG
- **100% recall** on 60-query benchmark (hybrid search)

## Key Components

### Knowledge Graph (Layer 4)
- SQLite with FTS5 full-text search
- Schema: `facts` (entity/key/value + activation + importance), `relations` (subject/predicate/object), `aliases`, `co_occurrences`
- **Activation/decay system**: Hot (>2.0), Warm (1.0-2.0), Cool (<1.0) — daily cron at 3 AM
- Four-phase search: entity+intent → entity facts → FTS facts → FTS relations
- Importance tagging: i≥0.8 permanent, 0.4-0.8 kept 30d, <0.4 pruned after 7d

### Embeddings
- **Primary**: llama.cpp GPU with `nomic-embed-text-v2-moe` (768d, ~7ms, multilingual 100+ languages)
- **Upgraded from**: ONNX CPU `all-MiniLM-L6-v2` (384d, ~500ms) — 70x speedup
- **Hardware**: AMD Ryzen AI MAX+ 395, Radeon 8060S with 96GB unified VRAM

### Runtime Plugins
- **Continuity**: Cross-session memory, topic tracking, continuity anchors, context budgeting, proprioceptive first-person framing
- **Stability**: Shannon entropy monitoring, confabulation detection, loop detection, structured heartbeat decisions (GROUND/TEND/SURFACE/INTEGRATE), growth vectors
- **Graph-memory**: `before_agent_start` hook, entity extraction + matching (score ≥ 65), `[GRAPH MEMORY]` injection, zero API cost

### Information Flow
```
Upward (consolidation):
  Daily logs → active-context.md → MEMORY.md → facts.db
  (raw)        (working memory)    (curated)   (structured)

  Session work → phase close → project-{slug}.md
  (ephemeral)   (PM gate)      (institutional)
```

### Session Boot Sequence
1. Read SOUL.md (identity)
2. Read USER.md (who the human is)
3. Read active-context.md (what's hot)
4. Read daily logs (today + yesterday)
5. Read MEMORY.md
6. On demand: semantic search, facts.db lookups

## Notable Design Decisions

- **MEMORY.md only in main session** — never loaded in shared contexts (security)
- **Working memory overwrites, never appends** — active-context.md is scratch space
- **Gating policies** — numbered failure prevention rules learned from actual mistakes
- **Project memory is agent-independent** — survives agent resets, shared across team
- **Telemetry logging** — `/tmp/openclaw/memory-telemetry.jsonl` tracks latency, hit rates, injection rates

## Repo Contents

| Path | Contents |
|------|----------|
| `docs/ARCHITECTURE.md` | Full 12-layer technical reference |
| `docs/knowledge-graph.md` | Graph search pipeline, benchmarks |
| `docs/context-optimization.md` | Token trimming methodology (saved ~6,500 tokens/session) |
| `docs/embedding-setup.md` | Local vs remote embedding setup |
| `schema/facts.sql` | SQLite schema for knowledge graph |
| `scripts/` | init, seed, search, ingest, decay, benchmark, telemetry |
| `templates/` | Starter files (active-context, agents-memory-section, gating-policies, graph-viewer) |
| `plugin-graph-memory/` | OpenClaw plugin (JS, hooks before_agent_start) |

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v6.0 | 2026-02-20 | Embedding migration (ONNX→llama.cpp 70x faster), graph-memory plugin, activation/decay, domain RAG |
| v5.0 | 2026-02-18 | Auto-ingestion, OpenClaw plugin, context optimization, 100% benchmark |
| v4.0 | 2026-02-17 | Knowledge graph layer, 60-query benchmark, graph viewer |
| v3.0 | 2026-02-15 | Hybrid search (QMD BM25 + vector) |
| v2.0 | 2026-02-14 | Continuity plugin (cross-session archive) |
| v1.0 | 2026-02-10 | MEMORY.md + daily files + active-context + gating policies |

## Credits

- David Badre — *On Task: How the Brain Gets Things Done*
- Shawn Harris — Cognitive architecture patterns
- r/openclaw community — Hybrid memory approach
- CoderofTheWest — Continuity, stability, and graph-memory plugins
