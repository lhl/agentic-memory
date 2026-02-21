---
title: "ClawVault — Structured Memory System for AI Agents"
author: Versatly (@drag88 / Aswin)
source_repo: https://github.com/Versatly/clawvault
local_clone: ../vendor/clawvault
date: 2026-02-16
type: reference
tags: [agent-memory, openclaw, cli-tool, obsidian, knowledge-graph, session-lifecycle, task-management, npm]
version: 2.6.1
npm: clawvault
related:
  - drag88-agent-output-degradation.md
  - coolmanns-openclaw-memory-architecture.md
---

# ClawVault 🐘

> Structured memory system for AI agents and operators: typed markdown memory, graph-aware context, task/project primitives, Obsidian views, and OpenClaw hook integration.

**Philosophy**: Local-first. Markdown-first. Built to survive long-running autonomous work.

## What It Is

An npm CLI tool (`npm install -g clawvault`) providing:
- Typed markdown memory vault with categories
- Knowledge graph index (wiki-links, tags, frontmatter edges)
- Graph-aware context injection
- Session lifecycle (wake/sleep/checkpoint/recover)
- Task & project management primitives
- Obsidian integration (canvas, bases views, graph themes)
- OpenClaw hook integration for automatic lifecycle events
- Tailscale + WebDAV for mobile sync

**Requires**: Node.js 18+, `qmd` on PATH

## CLI Surface

### Core Memory
- `remember`, `store`, `capture`, `list`, `get`, `stats`, `reindex`, `sync`

### Context + Intelligence
- `search` / `vsearch` — keyword and vector search
- `context "<task>"` — graph-aware context injection with profiles (default/planning/incident/handoff)
- `inject "<message>"` — dynamic prompt injection (deterministic + optional LLM fuzzy matching)
- `observe`, `reflect`, `session-recap`
- `graph`, `entities`, `link`, `embed`

### Session Lifecycle
- `wake` — recover + recap + summary at session start
- `sleep "summary"` — handoff + observe + optional git commit at session end
- `checkpoint` — mid-session state save
- `recover` — restore from checkpoint
- `repair-session` — fix corrupted OpenClaw transcripts
- `clean-exit`, `status`, `compat`, `doctor`

### Execution Primitives
- `task add/list/update/done/show`
- `backlog add/list/promote`
- `blocked` — show blocked tasks
- `project add/update/archive/list/show/tasks/board`
- `kanban sync/import`
- `canvas` — generate Obsidian JSON Canvas dashboard

## Architecture

### Observation Pipeline
```
Session transcript → Observer (compressor) → Scored observations → Router → Category files
                                                                       ↓
                                                                  Reflector → Promoted to MEMORY.md
```

**Observation format**: `- [<type>|c=<0-1>|i=<0-1>] <content>`
- Types: decision, preference, fact, commitment, milestone, lesson, relationship, project
- Importance tiers: structural (i≥0.8, permanent), potential (0.4-0.8, 30 days), contextual (<0.4, 7 days)

### Ledger Architecture (v2.6+, implementing)
- `ledger/raw/<source>/` — raw transcripts as source of truth
- `ledger/observations/YYYY/MM/DD.md` — compiled observations
- `ledger/reflections/YYYY-WNN.md` — weekly reflections
- `ledger/archive/` — archived observations

### Knowledge Graph
- `.clawvault/graph-index.json` — typed graph with wiki-link, tag, and frontmatter edges
- Schema versioned with incremental rebuild
- Context profiles for task-appropriate injection

### LLM Provider Chain
- Supports Anthropic, OpenAI, Gemini, Ollama, Minimax, GLM, and any OpenAI-compatible backend
- Fallback chain pattern for compressor

## Key Features

### Dynamic Prompt Injection (`inject`)
Two-layer matching:
1. **Deterministic** (default) — keyword/scope-based rules, zero latency
2. **LLM fuzzy** (opt-in `--enable-llm`) — classifies message intent, finds relevant entries

### OpenClaw Hook Integration
- `gateway:startup` — detects previous session death, injects alert
- `command:new` — auto-checkpoints before session reset
- `cron.weekly` — auto-reflect trigger
- Install: `openclaw hooks install clawvault && openclaw hooks enable clawvault`

### Obsidian Integration
- Graph themes (neural/minimal/none) with colored category nodes
- Bases views: all-tasks, blocked, by-project, by-owner, backlog
- Canvas dashboards: brain architecture, project board
- Kanban round-trip (export/import)

### Replay Engine (planned)
- Import from ChatGPT, Claude, OpenCode, OpenClaw exports
- Normalize → raw ledger → observer pipeline → reflect

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 2.6.1 | 2026-02-16 | Gemini API key security fix (header vs URL param) |
| 2.5.x | 2026-02-15 | Cross-platform hardening (Windows), 449 tests passing |
| 2.5.0 | 2026-02-15 | Dynamic prompt injection, first-class project primitive, pluggable LLM backends |
| 2.4.0 | 2026-02-14 | Brain architecture canvas, owner-centric project board, neural graph theme |
| 2.3.x | 2026-02-14 | Task tracking primitives, backlog, WebDAV server, 553 tests |
| 2.0.0 | 2026-02-13 | Memory graph index, graph-aware context, context profiles, CLI modularization |
| 1.5.x | 2026-02-06 | Shell injection fix, session repair, OpenClaw hook integration |
| 1.4.x | 2026-02-04 | qmd integration, semantic search, vault setup/status/doctor |
| 1.3.x | Earlier | Core: checkpoint/recover, handoff/recap, wiki-linking, categories |

## Repo Structure

| Path | Contents |
|------|----------|
| `src/` | TypeScript source (observer, commands, lib) |
| `bin/` | CLI entry point + command registration modules |
| `hooks/` | OpenClaw hook handler |
| `schemas/` | JSON schemas |
| `scripts/` | Utility scripts |
| `templates/` | Starter templates |
| `dashboard/` | Dashboard generator |
| `tests/` | Vitest test suite (449+ tests) |
| `PLAN.md` | Issue #4 implementation plan (ledger, reflect, replay, archive) |
| `SKILL.md` | OpenClaw skill metadata |
