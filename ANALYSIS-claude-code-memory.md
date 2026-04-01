---
title: "Analysis — Claude Code Memory Subsystem (Anthropic, from source)"
date: 2026-03-31
type: analysis
system: Claude Code (CLI + IDE + web)
source: /home/lhl/Downloads/claude-code/src
source_alt: https://github.com/anthropics/claude-code (closed-source; analysis from decompiled/bundled source)
related:
  - ANALYSIS.md
  - REVIEWED.md
  - ANALYSIS-academic-industry.md
---

# Analysis — Claude Code Memory Subsystem

Deep-dive analysis of the memory subsystem in **Claude Code** (Anthropic's official coding agent CLI/IDE/web tool), based on a thorough source code review of the `src/` directory. This is a **first-party, production-scale** memory system — the only one in our survey built by a frontier model provider and shipping to their entire user base.

## TL;DR

- **Flat-file MEMORY.md index + typed topic files** — the same convergent pattern as Hermes Agent, Malaiac/claude, and others, but with substantially more infrastructure behind it.
- **Four-type taxonomy** (user/feedback/project/reference) enforced via prompt engineering, not code-level types. Explicit exclusion rules prevent saving derivable content.
- **Background extraction via forked subagent** — a "perfect fork" that shares the parent's prompt cache. Main agent and background agent are mutually exclusive per turn (`hasMemoryWritesSince`).
- **LLM-based query-time relevance selection** — Sonnet picks up to 5 relevant memories per query from frontmatter descriptions. Not vector search — closer to a lightweight "memory router."
- **Team memory with server sync** — private + shared memories with OAuth-authenticated delta sync, secret scanning before upload, and per-type scope guidance (user=always private, project=bias team, etc.).
- **Auto dream consolidation** — time-gated (24h default) + session-gated (5 sessions default) + lock-gated background consolidation via forked agent. Four phases: orient, gather, consolidate, prune.
- **KAIROS daily-log mode** — append-only date-named logs for long-lived assistant sessions, with separate nightly `/dream` distillation into topic files + MEMORY.md.
- **Eval-validated prompt engineering** — source comments reference specific eval case IDs with pass/fail rates (e.g., "H1: 0/2 → 3/3 via appendSystemPrompt"). Memory prompts are empirically tuned, not vibes-based.
- **Security-hardened path validation** — multi-layer defense against symlink traversal, Unicode normalization attacks, URL-encoded traversals, null bytes, dangling symlinks, and projectSettings-sourced path injection.
- **Session memory** — separate forked subagent maintains running notes about the current conversation (distinct from persistent auto-memory). Periodic updates, section-based template, token-budgeted.
- **No vector search, no knowledge graph, no entity linking, no decay scoring** — retrieval is LLM-routed (Sonnet selector) over flat files with mtime-based staleness caveats.

## Stage 1 — Descriptive (what is implemented)

### 1.1 Architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MEMORY SUBSYSTEM LAYERS                          │
├─────────────────────────────────────────────────────────────────────────┤
│  SYSTEM PROMPT INJECTION                                                │
│  ├── MEMORY.md index (truncated at 200 lines / 25KB)                   │
│  ├── Memory behavioral instructions (4-type taxonomy + save/access)     │
│  └── Searching past context (grep commands for memory + transcripts)    │
├─────────────────────────────────────────────────────────────────────────┤
│  QUERY-TIME RELEVANCE                                                   │
│  ├── scanMemoryFiles() → frontmatter headers (max 200 files)           │
│  ├── Sonnet selector: "which 5 memories match this query?"              │
│  ├── Tool-aware filtering (exclude reference docs for active tools)     │
│  └── Staleness caveats injected for memories >1 day old                │
├─────────────────────────────────────────────────────────────────────────┤
│  MAIN AGENT MEMORY WRITES                                               │
│  ├── Model follows prompt instructions to write topic files             │
│  ├── Two-step: write file + update MEMORY.md index                     │
│  └── Mutual exclusion: if main writes, extraction skips this turn      │
├─────────────────────────────────────────────────────────────────────────┤
│  BACKGROUND EXTRACTION (forked subagent, fire-and-forget)               │
│  ├── Perfect fork sharing parent's prompt cache                         │
│  ├── Pre-injected memory manifest (avoids spending a turn on ls)        │
│  ├── Restricted tools: Read/Grep/Glob + read-only Bash + Write/Edit    │
│  ├── Max 5 turns; typical 2-4 (read → write)                           │
│  └── Throttled by feature gate (min turns between runs)                │
├─────────────────────────────────────────────────────────────────────────┤
│  AUTO DREAM (nightly consolidation, forked subagent)                    │
│  ├── Time gate: ≥24h since last consolidation                          │
│  ├── Session gate: ≥5 sessions touched since last consolidation        │
│  ├── Lock gate: file-based lock with rollback on failure               │
│  └── 4-phase: orient → gather signal → consolidate → prune index      │
├─────────────────────────────────────────────────────────────────────────┤
│  SESSION MEMORY (forked subagent, periodic)                             │
│  ├── Running notes about current conversation                          │
│  ├── Section-based template (title, state, spec, files, workflow...)    │
│  ├── Token-budgeted (12K total, 2K per section)                        │
│  └── Injected into context compaction                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  TEAM MEMORY SYNC (OAuth-authenticated, periodic)                       │
│  ├── Server API: GET/PUT with delta checksums (sha256)                 │
│  ├── Secret scanning before upload                                     │
│  ├── Size caps: 250KB/entry, 200KB/request                            │
│  └── Upsert semantics: server preserves unmentioned keys               │
├─────────────────────────────────────────────────────────────────────────┤
│  STORAGE                                                                │
│  ├── ~/.claude/projects/<sanitized-git-root>/memory/                    │
│  │   ├── MEMORY.md (index)                                             │
│  │   ├── *.md (topic files with YAML frontmatter)                      │
│  │   ├── team/ (shared memories, synced to server)                     │
│  │   └── logs/YYYY/MM/YYYY-MM-DD.md (KAIROS daily logs)               │
│  ├── ~/.claude/session-memory/<sessionId>.md                           │
│  └── ~/.claude/projects/<slug>/transcripts/*.jsonl                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 File inventory

**Core memory directory** (`src/memdir/`, 8 files, ~1,650 LOC total):

| File | LOC | Role |
|------|-----|------|
| `memdir.ts` | 508 | Prompt builders (individual/combined/KAIROS), MEMORY.md truncation, directory initialization |
| `memoryTypes.ts` | 272 | Four-type taxonomy definitions with scope, examples, exclusions, staleness caveats |
| `memoryScan.ts` | 95 | File scanning, frontmatter parsing, manifest formatting (max 200 files, 30-line headers) |
| `findRelevantMemories.ts` | 142 | Query-time Sonnet-based relevance selection (up to 5 memories) |
| `paths.ts` | 279 | Path resolution, validation, security checks (symlink, Unicode, null byte) |
| `memoryAge.ts` | 54 | Staleness detection: `memoryAge()`, `memoryFreshnessText()`, `memoryFreshnessNote()` |
| `teamMemPaths.ts` | 293 | Team memory paths, symlink traversal protection, key sanitization |
| `teamMemPrompts.ts` | 101 | Combined private+team memory prompt builder |

**Services** (~1,800 LOC across 4 directories):

| Directory | Files | Role |
|-----------|-------|------|
| `extractMemories/` | `extractMemories.ts` (616), `prompts.ts` (155) | Background memory extraction via forked agent |
| `autoDream/` | `autoDream.ts` (325), `consolidationPrompt.ts` (65), `consolidationLock.ts`, `config.ts` | Nightly memory consolidation |
| `SessionMemory/` | `sessionMemory.ts` (400+), `prompts.ts` (325), `sessionMemoryUtils.ts` | Session note-taking |
| `teamMemorySync/` | `index.ts` (500+), `secretScanner.ts`, `teamMemSecretGuard.ts`, `types.ts`, `watcher.ts` | OAuth-authenticated server sync |

**UI/Commands:**

| File | Role |
|------|------|
| `commands/memory/memory.tsx` | Interactive file selector for editing memories |
| `skills/bundled/remember.ts` | `/remember` skill: review + promotion proposals |

### 1.3 Data model

**MEMORY.md** (index file):
- One line per topic file, under ~150 chars: `- [Title](file.md) — one-line hook`
- No frontmatter. Never contains memory content directly.
- Truncated at 200 lines AND 25KB, with a warning appended naming which cap fired.
- Always loaded into system prompt context.

**Topic files** (individual memories):
```markdown
---
name: User Testing Preferences
description: One-line summary used for relevance selection
type: feedback
---

Rule or fact content.

**Why:** Reason behind the memory.
**How to apply:** When/where this guidance kicks in.
```

Frontmatter fields: `name` (required), `description` (required, used by Sonnet selector), `type` (required: user/feedback/project/reference).

**Four-type taxonomy:**

| Type | Scope (team mode) | What to save | What NOT to save |
|------|-------------------|-------------|-----------------|
| **user** | Always private | Role, expertise, preferences, goals | Negative judgments, irrelevant details |
| **feedback** | Default private, team if project-wide | Corrections AND confirmations, with *why* | Style preferences as team conventions |
| **project** | Bias team | Deadlines, incidents, decisions, context | Derivable from code/git |
| **reference** | Usually team | Pointers to external systems | Internal file paths (derivable) |

**Explicit exclusions** (even when user asks to save):
- Code patterns, conventions, architecture, file paths, project structure
- Git history, recent changes, who-changed-what
- Debugging solutions or fix recipes
- CLAUDE.md duplicates
- Ephemeral task details, current session context

### 1.4 Write path

**Main agent writes** (prompt-directed):
The system prompt instructs the model to write memories directly. Two-step process: write topic file → update MEMORY.md index. The model makes the judgment call about what to save based on the taxonomy and exclusion rules.

**Background extraction** (forked subagent):
1. Fires at end of each query loop (`handleStopHooks`)
2. Eligibility: feature gate on, auto-memory enabled, main agent only, not remote mode
3. Mutual exclusion: `hasMemoryWritesSince()` checks if main agent already wrote to memory paths → skips extraction if so
4. Throttled by `tengu_bramble_lintel` (configurable min turns between runs)
5. Pre-injects existing memory manifest so agent doesn't spend a turn on `ls`
6. Forked agent gets restricted tools: Read/Grep/Glob unrestricted, Bash read-only, Write/Edit only within memory directory
7. Max 5 turns (typical: read all files → write updates in parallel)
8. Coalesces overlapping calls: if a new call arrives during extraction, stashes context for a trailing run

**Key design choice:** The main agent and background agent are mutually exclusive per turn range. This prevents duplicate writes and is simpler than merge/conflict resolution.

### 1.5 Read path

**System prompt injection** (session start):
- `loadMemoryPrompt()` dispatches based on mode:
  - KAIROS + active → `buildAssistantDailyLogPrompt()` (append-only log instructions)
  - Team memory enabled → `buildCombinedMemoryPrompt()` (both directories)
  - Auto-only → `buildMemoryLines()` (single directory)
- MEMORY.md content loaded and truncated
- Cached by `systemPromptSection('memory', ...)` — loaded once per session

**Query-time relevance selection** (per query):
1. `scanMemoryFiles(memoryDir)` → reads frontmatter (30 lines) from all .md files (max 200), sorted newest-first
2. `formatMemoryManifest()` → `[type] filename (timestamp): description`
3. `sideQuery` to Sonnet with `SELECT_MEMORIES_SYSTEM_PROMPT`:
   - Input: user query + memory manifest + recently-used tools
   - Output: JSON `{ selected_memories: ["file1.md", ...] }` (max 5)
   - Structured output via `json_schema` format
4. Filter: exclude memories already surfaced in prior turns (`alreadySurfaced` set)
5. Filter: exclude reference docs for currently-active tools (tool-aware filtering)
6. Include warnings/gotchas about active tools (active use = when those matter)
7. Inject selected memories with staleness caveats into user context

**Staleness handling:**
- `memoryAge(mtimeMs)` → "today", "yesterday", "N days ago"
- `memoryFreshnessText()` for memories >1 day old: "This memory is N days old. Memories are point-in-time observations... Verify against current code before asserting as fact."
- `MEMORY_DRIFT_CAVEAT` in system prompt: "verify that the memory is still correct... trust what you observe now — and update or remove the stale memory"
- `TRUSTING_RECALL_SECTION`: "A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged."

**Searching past context** (manual, grep-based):
- Two-tier: search topic files in memory directory first, session transcripts (JSONL) as last resort
- Uses Grep tool or shell grep depending on build variant

### 1.6 Maintenance pipeline

**Auto dream (consolidation):**

Gate chain (cheapest first):
1. Feature gate: `isAutoDreamEnabled()`
2. Mode gate: not KAIROS (which uses its own /dream skill)
3. Remote gate: not remote mode
4. Time gate: hours since `lastConsolidatedAt` ≥ `minHours` (default 24)
5. Scan throttle: suppress re-scanning if <10 min since last scan
6. Session gate: transcript count with mtime > `lastConsolidatedAt` ≥ `minSessions` (default 5, excluding current session)
7. Lock gate: `tryAcquireConsolidationLock()` (file-based, with rollback on failure)

Execution (4-phase consolidation prompt):
- Phase 1 — Orient: `ls` memory dir, read MEMORY.md, skim existing topic files
- Phase 2 — Gather signal: daily logs, drifted memories, narrow transcript grep
- Phase 3 — Consolidate: write/update memory files, merge rather than duplicate, convert relative dates, delete contradicted facts
- Phase 4 — Prune index: keep MEMORY.md under 200 lines / 25KB, remove stale pointers, resolve contradictions

Registered as a `DreamTask` for user visibility; progress watched via `makeDreamProgressWatcher`.

**KAIROS mode** (long-lived assistant sessions):
- Agent appends to `logs/YYYY/MM/YYYY-MM-DD.md` (append-only, timestamped bullets)
- MEMORY.md is read-only (maintained nightly from logs)
- Separate `/dream` disk skill handles consolidation
- Date rollover handled via `date_change` attachment

### 1.7 Team memory

**Architecture:**
- Team memory is a `team/` subdirectory under the auto-memory directory
- Has its own `MEMORY.md` index
- Synced to Anthropic's server via OAuth-authenticated API

**Sync protocol:**
- `GET /api/claude_code/team_memory?repo=owner/repo` → entries + checksums
- `PUT` with delta only (compare local content hash vs `serverChecksums`)
- Pull: server wins (overwrites local)
- Push: delta only; server preserves unmentioned keys (no delete propagation)
- Size caps: 250KB/entry, 200KB/request (batched into sequential PUTs)

**Security:**
- Secret scanning before upload (`teamMemSecretGuard`)
- Path key sanitization: null bytes, URL-encoded traversals, Unicode normalization attacks, backslashes, absolute paths
- Symlink traversal protection: `realpathDeepestExisting()` resolves symlinks on deepest existing ancestor, verifies containment with trailing separator prefix-attack protection
- Dangling symlink detection: `lstat()` distinguishes truly non-existent paths from dangling symlinks
- `projectSettings` excluded from `autoMemoryDirectory` setting (prevents malicious repo from redirecting writes to `~/.ssh`)

### 1.8 Session memory

Separate from persistent auto-memory. Maintains running notes about the current conversation:
- Stored at `~/.claude/session-memory/<sessionId>.md`
- Section-based template: title, current state, task spec, files, workflow, etc.
- Periodic updates via forked subagent (threshold: N messages or T tokens)
- Token-budgeted: 12K total, 2K per section
- Injected into context compaction (not auto-memory's system prompt path)
- Custom template and update prompt supported

### 1.9 Configuration

**Environment variables:**

| Variable | Effect |
|----------|--------|
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | Disable auto-memory |
| `CLAUDE_CODE_SIMPLE` (`--bare`) | Disable memory |
| `CLAUDE_CODE_REMOTE_MEMORY_DIR` | Override memory base dir |
| `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` | Override full memory path |
| `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES` | Append to memory prompt |

**Settings (settings.json):**

| Setting | Scope | Effect |
|---------|-------|--------|
| `autoMemoryEnabled` | User/Local/Policy/Project | Enable/disable auto-memory |
| `autoMemoryDirectory` | Local/Policy/User only (NOT projectSettings) | Override memory directory path |

**Feature gates (GrowthBook):**

| Gate | Controls |
|------|----------|
| `tengu_passport_quail` | Background extraction enabled |
| `tengu_bramble_lintel` | Extraction throttle (min turns between runs) |
| `tengu_herring_clock` | Team memory enabled |
| `tengu_onyx_plover` | Auto dream config (minHours, minSessions) |
| `tengu_coral_fern` | "Searching past context" prompt section |
| `tengu_moth_copse` | Skip MEMORY.md index in prompt |
| `tengu_session_memory` | Session memory updates |
| `tengu_sm_config` | Session memory config (thresholds, template) |

### 1.10 Telemetry

| Event | When | Data |
|-------|------|------|
| `tengu_memdir_loaded` | Session start | file_count, subdir_count, content_length, line_count, memory_type |
| `tengu_extract_memories_extraction` | After extraction | input/output/cache tokens, message_count, turn_count, files_written, memories_saved, duration_ms |
| `tengu_extract_memories_skipped_direct_write` | Main agent wrote | message_count |
| `tengu_extract_memories_coalesced` | Concurrent call stashed | — |
| `tengu_auto_dream_fired` | Dream starts | hours_since, sessions_since |
| `tengu_auto_dream_completed` | Dream finishes | cache_read, cache_created, output, sessions_reviewed |
| `MEMORY_SHAPE_TELEMETRY` | After relevance selection | Memory recall analytics |

---

## Stage 2 — Evaluative (is it coherent? what's missing?)

### 2.1 Internal coherence

The system is well-engineered and internally consistent:

- **Mutual exclusion** between main agent writes and background extraction is clean and prevents the most obvious failure mode (duplicate memories). Cursor-based tracking ensures the next extraction picks up where the last left off.
- **Prompt cache sharing** via forked agent is an efficiency win that only makes sense at Anthropic's scale (they control the caching infrastructure). This means background extraction is surprisingly cheap.
- **Multi-gate consolidation** (time → scan-throttle → session → lock) prevents both over-consolidation and thundering-herd problems.
- **Path security** is defense-in-depth with specific threat models called out in comments (PSR ticket references, specific attack vectors). The `projectSettings` exclusion from `autoMemoryDirectory` is a sophisticated real-world security decision.
- **Eval-validated prompts** — the comments reference specific eval case IDs (e.g., "H1: 0/2 → 3/3 via appendSystemPrompt", "H6: branch-pollution evals #22856, case 5 1/3") with pass rates and position-sensitivity notes. This is the most empirically-grounded prompt engineering in our survey.

### 2.2 What's notably well-done

1. **Staleness handling is first-class.** The multi-layer approach (mtime-based age → freshness text → drift caveat → "before recommending from memory" section) addresses a real problem that most memory systems ignore. The `TRUSTING_RECALL_SECTION` with its "the memory says X exists ≠ X exists now" framing is particularly good — it's solving the "authoritative stale citation" problem where file:line references in old memories are more misleading than helpful.

2. **The exclusion list is as important as the inclusion list.** Most memory systems focus on what to save; Claude Code's `WHAT_NOT_TO_SAVE_SECTION` explicitly prevents saving derivable content (code patterns, git history, architecture). The gate that intercepts even explicit user requests to save activity logs ("ask what was *surprising* or *non-obvious* about it") is eval-validated and addresses real noise problems.

3. **Team memory scope guidance is per-type.** Rather than a binary "private or shared?" decision, the scope guidance is embedded in each type definition: user=always private, feedback=default private unless project-wide convention, project=bias team, reference=usually team. This is more nuanced than any other team/shared memory system in our survey.

4. **The forked agent pattern** (shared prompt cache, restricted tools, max turns, fire-and-forget with drain before shutdown) is a reusable infrastructure pattern. Three subsystems use it: extraction, consolidation, session memory.

### 2.3 What's missing vs the serious systems

1. **No vector search / embeddings.** Retrieval is entirely LLM-routed: Sonnet reads a manifest of descriptions and picks up to 5. This works when the memory corpus is small (≤200 files × 150-char descriptions ≈ 30KB manifest), but doesn't scale. At scale, the manifest itself would blow the Sonnet selector's context budget. There's no hybrid retrieval (BM25 + embeddings + graph) path.

2. **No knowledge graph or entity linking.** No entities, no relationships, no graph traversal. Memories are isolated topic files with no structural connections. This limits multi-hop reasoning ("what do I know about X's relationship to Y?").

3. **No decay or importance scoring.** There's mtime-based staleness *display* (freshness caveats), but no scoring that affects retrieval priority. Old memories are as likely to be selected as new ones — the Sonnet selector sees descriptions but not ages (ages are injected *after* selection, in the freshness note). The consolidation prompt can "delete contradicted facts" but there's no automated access tracking or echo/fizzle feedback.

4. **No structured episode objects.** KAIROS daily logs are append-only text files with timestamped bullets. There's no structured episode model (event type, participants, outcome, temporal relations). Episodic retrieval is grep-based.

5. **No correction/versioning semantics.** If a memory becomes wrong, the guidance is "update or remove" — overwrite, not supersede. No correction chains, no "this memory was wrong because..." append-only history. The auto dream can "delete contradicted facts" but there's no audit trail of *why* something was deleted.

6. **No write gating beyond prompt instructions.** The main agent decides what to save based on prompt instructions. The background extractor has tool restrictions (can only write to memory dir) but no content-level gating (no junk filter, no similarity check against existing memories, no plausibility heuristics). Dedup is the responsibility of the prompt ("Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.") — enforced by the model, not the system.

7. **No benchmark harness.** Quality is measured via internal evals (referenced in comments) but there's no user-facing benchmark or systematic memory quality measurement. The telemetry captures operational metrics (files_written, cache_hit_rate) but not retrieval precision/recall.

### 2.4 Likely failure modes

1. **Memory noise at scale.** Without content-level dedup or write gating, a heavily-used project could accumulate redundant or low-value memories. The 200-file cap in `scanMemoryFiles` is a hard ceiling, but 200 files × variable quality = noisy manifests for the Sonnet selector.

2. **Sonnet selector precision degrades with corpus size.** At 200 files with 150-char descriptions, the manifest is ~30KB. The selector sees descriptions but not content. If descriptions are vague or similar, it may mis-select. There's no fallback to content-level search.

3. **Consolidation quality depends on LLM judgment.** The auto-dream agent is told to "delete contradicted facts" and "resolve contradictions" — but contradictions require reading both the memory and the current codebase, within the agent's turn budget and tool restrictions. Complex contradictions may survive consolidation.

4. **Team memory sync is eventually consistent.** Pull overwrites local; push sends delta. Two users writing to the same memory file concurrently could lose one user's changes (last-write-wins on the server, last-pull-wins locally).

5. **Main agent memory writes are unconstrained.** The main agent can write any content to any file in the memory directory. The extraction agent has tool restrictions, but the main agent's writes are governed only by prompt instructions. A prompt injection in user-supplied code could potentially poison the memory store.

---

## Stage 3 — Dialectical (steelman + counterarguments)

### 3.1 Steelman

Claude Code's memory system makes a deliberate architectural bet: **prompt-directed flat files with LLM routing, not infrastructure-heavy vector/graph systems.** The strongest version of this argument:

1. **The user base is enormous and heterogeneous.** Unlike folk systems built for one developer's workflow, Claude Code ships to millions of users. The system must work across languages, project sizes, team sizes, and skill levels. Flat files are debuggable, editable, portable, and don't require setup. A SQLite + embeddings system would be more powerful but harder to inspect and repair.

2. **Prompt cache sharing makes background agents cheap.** Because Anthropic controls the inference infrastructure, forked agents that share the parent's prompt cache are an architectural primitive unavailable to third parties. This makes "just ask Sonnet" a viable retrieval strategy where others need precomputed indexes.

3. **Eval-validated > vibes-validated.** The memory prompts carry more empirical validation (specific eval case IDs, pass rates, position-sensitivity experiments) than any other system in our survey. The `TRUSTING_RECALL_SECTION` alone went through at least two header-wording experiments and an appendSystemPrompt vs in-place A/B test.

4. **The exclusion list is load-bearing.** By preventing the system from saving derivable content, the signal-to-noise ratio stays higher than systems that index everything. The explicit-save gate ("ask what was surprising") is a real design innovation.

5. **Staleness handling is defensive, not optimistic.** Rather than trusting old memories, the system actively warns the model (and indirectly the user) that memories may be stale. "The memory says X exists ≠ X exists now" is the right default for a coding assistant where code changes faster than memories.

### 3.2 Strongest objections

1. **"Just ask Sonnet" doesn't scale.** At 200 files with good descriptions, the manifest fits in a side query. At 2,000 files across 50 projects, it doesn't. The system has no upgrade path to vector search or hierarchical indexing. The 200-file hard cap is a scaling wall, not a design choice.

2. **No write gating creates a trust gap with team memory.** Private memories are low-risk (poisoned user memories only affect the poisoner). But team memories are synced to a server and pushed to teammates. The only write gate for team memory is the `teamMemSecretGuard` (credential scanning). There's no content-level quality check, no plausibility filter, no review queue. A prompt injection that creates a team memory saying "always use --no-verify when committing" would propagate to the whole team.

3. **No correction semantics means no learning from mistakes.** If a memory is wrong and gets deleted, there's no record of what was wrong or why. The system can't learn "I used to believe X but it turned out to be wrong because Y" — it can only forget. This is the opposite of the "corrections as append-only chains" pattern that several academic systems implement.

4. **Session memory and auto-memory are loosely coupled.** Session memory captures current-conversation context; auto-memory captures cross-conversation knowledge. But there's no promotion path from session memory → auto-memory. When a session ends, its session-memory notes are just abandoned. The auto-dream doesn't look at session memory files.

### 3.3 Relationship to other systems

**vs. Minimal MEMORY.md agents (Hermes, Malaiac):**
Claude Code is the "minimal MEMORY.md" pattern with real infrastructure behind it. Same flat-file data model, but with background extraction, LLM-based retrieval, team sync, consolidation, and eval-validated prompts. It proves the pattern can scale to production with enough engineering — but also shows where the pattern's limits are (no vector search, no graph).

**vs. OpenClaw memory architecture:**
OpenClaw has a 12-layer stack with SQLite+FTS5 knowledge graph, GPU embeddings, and a 60-query benchmark. Claude Code has flat files with LLM routing. OpenClaw is more capable on the engineering axis (structured retrieval, benchmarks, entity resolution); Claude Code is more capable on the deployment axis (ships to millions, eval-validated, team sync).

**vs. Gigabrain:**
Gigabrain has event-sourced storage, 7-type taxonomy, multi-gate write pipeline with review queue, and class-budgeted recall. Claude Code has simpler storage but more sophisticated infrastructure (forked agents, prompt cache sharing, team sync, multi-mode prompts). Gigabrain's write pipeline is more rigorous; Claude Code's read path is more practical at scale.

**vs. MIRA-OSS:**
MIRA has entity graph, typed relationships, activity-day decay, hub-based discovery, and behavioral adaptation via Text-Based LoRA. Claude Code has none of these — but has team memory, session memory, eval-validated prompts, and security hardening that MIRA lacks. Different quadrants of the design space.

**vs. Letta/MemGPT:**
Both use the model to manage its own memory via tool calls. Letta has explicit memory blocks (persona/human/thought) with size limits; Claude Code has typed topic files with a shared index. Letta's archival memory uses embeddings; Claude Code uses LLM routing. Letta's memory is always-loaded in context; Claude Code uses query-time selection for everything except the index.

**vs. Mem0:**
Mem0 is a dedicated memory layer with explicit ops (ADD/UPDATE/DELETE/NOOP) and optional graph memory. Claude Code's memory is embedded in the agent, not a separate service. Mem0 has consolidation and benchmarks in the paper; Claude Code has consolidation and internal evals.

---

## Synthesis-ready takeaways

1. **Forked-agent-as-infrastructure** is a pattern worth studying. Using a "perfect fork" with shared prompt cache for background memory work (extraction, consolidation, session notes) is elegant and avoids the message-bus complexity of separate memory services. Only works when you control the inference infrastructure.

2. **LLM-based memory routing** (Sonnet selector picking from a manifest) is a viable alternative to vector search at small scale. It has the advantage of understanding intent and context (the selector knows what tools are active) but the disadvantage of not scaling beyond ~200 files.

3. **Eval-validated prompt engineering** should be the standard. Every memory system in our survey has behavioral prompts; Claude Code is the only one that cites specific eval case IDs with pass/fail rates. The difference between "we wrote a good prompt" and "we A/B tested the header wording and it went from 0/3 to 3/3" is the difference between engineering and vibes.

4. **Staleness-first recall** is a design philosophy worth adopting. Rather than assuming memories are current, assume they're stale and require verification. The "memory says X exists ≠ X exists now" framing is universally applicable.

5. **The exclusion list matters as much as the taxonomy.** What NOT to save is at least as important as what to save. The explicit-save gate ("ask what was surprising") prevents activity-log noise that plagues other systems.

6. **Team memory needs write gating.** Claude Code's team memory has good security (path validation, secret scanning, OAuth) but no content-level quality gate. This is a gap worth addressing for any multi-user memory system.

---

## Claims table

| # | Claim | Type | Evidence | Credence | Notes |
|---|-------|------|----------|----------|-------|
| 1 | Forked agents share parent's prompt cache for cost efficiency | Mechanism | Source code (`runForkedAgent`, `createCacheSafeParams`) | 0.95 | Architecture confirmed; cost savings not independently measured |
| 2 | Main agent and extraction agent are mutually exclusive per turn | Mechanism | Source code (`hasMemoryWritesSince()` check) | 0.95 | Clean implementation; no known race conditions |
| 3 | Sonnet selector picks up to 5 relevant memories per query | Mechanism | Source code (`findRelevantMemories.ts`, `max_tokens: 256`) | 0.95 | Limit is in the prompt, not hard-coded in parsing |
| 4 | Memory prompts are eval-validated with specific case IDs | Process | Source comments (H1, H5, H6, eval names, pass rates) | 0.90 | Comments are credible; evals not independently reproducible |
| 5 | MEMORY.md truncation at 200 lines / 25KB | Mechanism | Source code (`MAX_ENTRYPOINT_LINES`, `MAX_ENTRYPOINT_BYTES`) | 0.95 | Dual-cap with clear warning message |
| 6 | Auto dream gates on 24h + 5 sessions by default | Mechanism | Source code (`DEFAULTS` object, `getConfig()`) | 0.95 | Defaults overridable via GrowthBook |
| 7 | Team memory secret scanning prevents credential upload | Mechanism | Source code (`teamMemSecretGuard.ts`) | 0.85 | Scanner exists; coverage/false-positive rate unknown |
| 8 | No vector search, embeddings, or knowledge graph | Absence | Full source review of `src/memdir/` and related services | 0.95 | Confirmed absent from all memory-related code |
| 9 | No write-side content gating (dedup, junk filter, plausibility) | Absence | Full source review | 0.90 | Extraction prompt says "don't duplicate" but no code-level check |
| 10 | No correction/versioning semantics | Absence | Full source review; prompt says "update or remove" | 0.90 | Overwrite model, not append-only corrections |

---

## Corrections & Updates

- 2026-03-31: Initial analysis from source code review of `/home/lhl/Downloads/claude-code/src`. Source is decompiled/bundled, not the official repository. Feature gates may be at different rollout percentages than what's in production. Telemetry event names and GrowthBook flag names are accurate as of the source snapshot.
