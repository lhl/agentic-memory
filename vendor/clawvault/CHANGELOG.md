# Changelog

## [2.6.1] — 2026-02-16

### Fixed
- Moved Gemini API key from URL query parameter (`?key=`) to `x-goog-api-key` request header in both `llm-provider.ts` and `wake.ts`. Prevents key leakage into HTTP logs, proxy caches, and monitoring middleware. Aligns Gemini auth with Anthropic/OpenAI header-based approach. (PR #40, thanks @gupsammy)

---

## [2.5.4] — 2026-02-15

### Fixed
- Hardened cross-platform qmd result handling by normalizing URI-derived paths and cache key resolution across Windows and Unix path separators.
- Fixed WebDAV path safety and root containment checks to avoid false 403s and traversal edge-cases on Windows.
- Stabilized cross-platform test behavior for WebDAV temp vault setup/cleanup and shell-init path expectations.
- Corrected npm package `bin` metadata to preserve global CLI install wiring for `clawvault`.

### Improved
- Strengthened primitives reliability baseline: full test suite now passes on Windows (`449/449`) after path portability fixes.
- Updated `SKILL.md` with explicit stability snapshot, `auto` context profile guidance, and clearer runtime verification (`openclaw --version`, `clawvault compat`).

---

## [2.5.3] — 2026-02-15

### Fixed
- Canonicalized OpenClaw onboarding and hook setup docs around the required runtime flow: `openclaw hooks install clawvault` -> `openclaw hooks enable clawvault` -> verification with `hooks list/info/check`.
- Removed command-surface drift in top-level docs (legacy `serve`/`peers`/`net-search`, old canvas template flags, and stale compatibility script references).
- Clarified AGENTS.md guidance to append ClawVault workflow instructions instead of replacing existing bootstrap prompts.

### Improved
- Standardized default OpenClaw fallback agent identity to `main` in active observer and hook runtime paths for safer multi-user installs.
- Updated hook and skill metadata/docs to align with current package/runtime behavior.
- Simplified CI and npm script stack to executable, in-repo checks (`typecheck`, `test`, `build`) and removed references to missing compat validator scripts.

### Removed
- Removed deprecated in-repo `docs/` markdown set in favor of the external live docs source of truth.

---

## [2.5.1] — 2026-02-15

### Security
- Hardened CLI runtime argument handling for qmd execution by exporting and reusing `sanitizeQmdArg` in `bin/command-runtime.js`.
- Re-validated `--file` inputs through `validatePathWithinBase` for file-backed write flows (`store` and `remember`) to prevent path traversal.

### Fixed
- Audited and clarified command descriptions across `bin/register-*.js` modules.
- Expanded help text default guidance for options where runtime defaults apply.
- Completed help coverage for `inject` and `project` command families, including subcommand and default behavior notes.

---

## [2.5.0] — 2026-02-15

Two headline features that change how agents interact with their vaults.

### 🧠 Dynamic Prompt Injection (`clawvault inject`)

Agents can now pull relevant decisions, preferences, and rules directly into their prompt context — automatically. Two-layer matching system:

1. **Deterministic matching** (default) — keyword and scope-based rules fire instantly with zero latency. Define rules that match on entity names, categories, or custom scopes.
2. **LLM fuzzy matching** (opt-in via `--enable-llm`) — when deterministic rules miss, an LLM classifies the message intent and finds relevant vault entries. Uses the shared LLM provider (same as observer).

```bash
clawvault inject "How should we handle the Hale deployment?"
clawvault inject --enable-llm "What's our pricing strategy?"
clawvault inject --scope decisions,preferences "brand guidelines"
```

Options: `--max-results`, `--scope`, `--format (markdown|json)`, `--model`, `--enable-llm`/`--disable-llm`.

This is the bridge between passive memory storage and active context engineering — your vault decisions actually show up when they matter.

### 📁 First-Class Project Primitive (`clawvault project`)

Projects are now a proper entity type with full lifecycle management:

```bash
clawvault project add "Site Machine" --owner pedro --client "Hale Pet Door" \
  --team "pedro,clawdious,joao" --status active --deadline 2026-03-01 \
  --repo "https://github.com/Versatly/site-machine" --tags "client,priority"

clawvault project list --status active --client "Hale Pet Door"
clawvault project tasks site-machine
clawvault project board --group-by client
```

Subcommands: `add`, `update`, `archive`, `list`, `show`, `tasks`, `board`.

Projects link to tasks via the `--project` flag on `task add`. `project tasks <slug>` shows all related tasks. `project board` generates an Obsidian-compatible Kanban grouped by status, owner, or client.

Frontmatter fields: `owner`, `status`, `team`, `client`, `tags`, `description`, `deadline`, `repo`, `url`.

### Also Added
- **Pluggable compression backends** — observer now supports Ollama, Minimax, GLM, and any OpenAI-compatible backend via config. No more hard dependency on a single LLM provider.
- **Centralized transition logging** — task state changes write to a ledger (`transitions.jsonl`) with timestamps, reasons, and actor. Ledger write failures are non-fatal.

### Improved
- Canvas refactored to single generator, stripped 4 redundant templates (-2,081 lines).
- Inject: LLM matching disabled by default — deterministic-only unless explicitly opted in.
- Global inject scope treated as unfiltered for maximum flexibility.
- Observer: stabilized pluggable backend assertions.
- Test suite expanded to **429 passing tests across 64 files**.

### Fixed
- Ledger write failures no longer crash task updates.
- Task list metadata visibility preserved correctly.

---

## [2.4.0] — 2026-02-14

### Added
- **Brain Architecture Canvas** — `clawvault canvas --template brain` generates a 4-quadrant system overview:
  - **Hippocampus** (top-left): vault structure with category card grid, content flow pipeline (Session → Observe → Score → Route → Store → Reflect)
  - **Direction** (top-right): vault stats, recent decisions, open loops
  - **Agent Workspace** (bottom-left): 3-column task triage — active, blocked, backlog with owner tags and priority icons
  - **Knowledge Graph** (bottom-right): node/edge stats, most-connected entities, category breakdown with bar charts
- **Owner-Centric Project Board** — `clawvault canvas --template project-board` redesigned with:
  - Status columns (Open / In Progress / Blocked / Done) with priority icons (🔴🟠🟡)
  - Owner cards distinguishing agents (🤖) from humans (👤) with per-owner task distribution
  - Backlog section grouped by project
  - Blocked-by edges connecting dependent tasks
- **Canvas Customization Flags**:
  - `--owner <name>` — filter tasks by owner (agent or human)
  - `--width <px>` / `--height <px>` — canvas dimensions
  - `--include-done` — include completed tasks
- **Setup Command Overhaul** — `clawvault setup` now configurable:
  - `--theme neural|minimal|none` — graph color themes with Obsidian CSS snippets and colorGroups
  - `--graph-colors` / `--no-graph-colors` — opt in/out of graph theming
  - `--bases` / `--no-bases` — opt in/out of Obsidian Bases task views
  - `--canvas [template]` — generate a canvas dashboard during setup
  - `--force` — overwrite existing configuration files
  - `-v, --vault <path>` — target a specific vault
- **Init Command Flags**:
  - `--no-bases` — skip Obsidian Bases file generation
  - `--no-tasks` — skip tasks/ and backlog/ directories
  - `--no-graph` — skip initial graph build
  - `--categories <list>` — comma-separated custom categories
  - `--canvas <template>` — generate canvas on init
  - `--theme neural|minimal|none` — graph color theme
  - `--minimal` — bare-bones vault (memory categories only)
- **Neural Graph Theme** — dark background (#0a0a0a), colored nodes by category/tag (cyan people, green projects, orange decisions, yellow lessons, red commitments), green neural-network links, golden glow on focused nodes
- **Obsidian Bases Views** — auto-generated on `setup` and `init`:
  - `all-tasks.base` — table + card views grouped by status
  - `blocked.base` — blocked tasks with days-blocked formula
  - `by-project.base` — tasks grouped by project
  - `by-owner.base` — tasks grouped by owner (agent or human)
  - `backlog.base` — backlog items by source and project

### Fixed
- Date handling for bare dates in frontmatter (e.g., `2026-02-14` without time) — `blocked`, `backlog list`, and canvas templates no longer crash on Date objects from gray-matter
- Canvas template descriptions no longer reference competitor products

### Changed
- Default setup theme is now `neural` (was unconfigured)
- Brain canvas template generates 37-50 nodes with architecture-style grouped layout (was radial)
- Project board uses text cards with owner/priority metadata (was bare file nodes)

---

## [2.3.1] — 2026-02-14

### Added
- **WebDAV server** — `clawvault serve` now handles WebDAV protocol on `/webdav/` path prefix for Obsidian mobile sync via Remotely Save over Tailscale

### Improved
- Tailscale server module refactored for WebDAV route integration
- 51 new WebDAV tests (553 total passing)

---

## [2.3.0] — 2026-02-14

### Added
- **Task Tracking Primitives** — Full task management with `clawvault task` command:
  - `task add` — Create tasks with owner, project, priority, due date
  - `task list` — List tasks with filters (status, owner, project, priority)
  - `task update` — Update task status, owner, priority, blocked_by
  - `task done` — Mark tasks complete with completion timestamp
  - `task show` — Display task details
- **Backlog Management** — Quick capture with `clawvault backlog` command:
  - `backlog add` — Add ideas to backlog with source and project
  - `backlog list` — List backlog items with project filter
  - `backlog promote` — Promote backlog item to active task
- **Blocked View** — `clawvault blocked` shows all blocked tasks with blockers and duration
- **Canvas Dashboard** — `clawvault canvas` generates Obsidian JSON Canvas file:
  - Active tasks grouped by status with priority colors
  - Blocked tasks with blocker info (red)
  - Backlog queue grouped by project
  - Knowledge graph stats and top entities
  - Recent decisions and vault statistics
  - Data flow diagram (Session → Observe → Score → Route → Reflect → Promote)
  - File nodes for tasks (clickable in Obsidian)
  - Valid JSON Canvas spec (jsoncanvas.org)
- **New Categories** — `tasks` and `backlog` added to DEFAULT_CATEGORIES

### Changed
- Task files stored as markdown in `tasks/` with frontmatter (status, owner, project, priority, blocked_by, due, created, updated, completed, tags)
- Backlog files stored in `backlog/` with frontmatter (source, project, created, tags)
- Wiki-links auto-generated for task owners and projects (`[[owner]]`, `[[project]]`)
- Clean terminal table output for task and backlog lists

## [2.0.0] — 2026-02-13

### Added
- **Memory Graph Index** — typed knowledge graph (`.clawvault/graph-index.json`) with wiki-link, tag, and frontmatter edges. Schema versioned with incremental rebuild.
- **Graph-Aware Context** — `clawvault context` now blends semantic search with graph-neighbor traversal, with explain signals in JSON output.
- **Context Profiles** — `clawvault context --profile <name>` with `default`, `planning`, `incident`, `handoff` presets for task-appropriate context injection.
- **`clawvault compat`** — OpenClaw compatibility diagnostics. Checks hook wiring, event routing, SKILL.md, and handler safety. `--strict` mode for CI.
- **`clawvault graph`** — Graph summary and refresh diagnostics.
- **Doctor upgrade** — now includes OpenClaw compatibility check summary.
- **Dashboard upgrades** — vault parser emits typed nodes, typed edges, and type statistics.
- **Hook handler** — flexible event routing via `eventMatches()` and `normalizeEventToken()`, `--profile auto` for context queries.

### Changed
- **CLI modularized** — monolithic `clawvault.js` split into 7 command groups (`register-core`, `register-query`, `register-vault-operations`, `register-maintenance`, `register-resilience`, `register-session-lifecycle`, `register-template`).
- **367+ tests** across core, commands, graph, dashboard, hooks, and CLI registration.

## [1.11.2] - 2026-02-12

### Fixed
- **Entity-slug routing** — People/project observations now route to entity subfolders (`people/pedro/2026-02-12.md` instead of `people/2026-02-12.md`)
- **Root-level file prevention** — Observations never create files at vault root; always route to category folders
- **Entity name extraction** — Case-sensitive proper noun matching prevents capturing common words as entity names
- **Dedup improvements** — Router uses normalized content + Jaccard similarity to prevent duplicate entries

### Changed
- Router `appendToCategory` now resolves entity-aware file paths for people and projects categories
- Updated router tests to validate entity-slug subfolder structure

---

## [1.11.1] - 2026-02-11

### Fixed
- **Compressor priority enforcement** — Post-processes LLM output to upgrade misclassified priorities (decisions→🔴, preferences→🟡)
- **Temporal decay in reflector** — 🟢 observations older than 7 days auto-pruned; 🔴 always kept
- **Exec summary in wake** — Wake command now shows richer context with observation summaries
- **Dedup normalization** — Strips timestamps, wiki-links, and whitespace before comparing for duplicates

---

## [1.11.0] - 2026-02-11

### Removed
- **Cloud sync** — Removed entire `src/cloud/` module (client, config, queue, service, types)
- **`clawvault cloud` command** — Removed cloud sync CLI command
- All cloud-related dependencies and imports stripped

### Philosophy
- ClawVault is now fully local-first. Zero network calls except optional LLM API for observe compression.
- Local folder sync (`vault.sync()`) remains for Obsidian cross-platform workflows.

---

## [1.10.2] - 2026-02-10

### Added
- Auto wiki-links in routed observations for Obsidian graph view

---

## [1.10.1] - 2026-02-10

### Fixed
- Search docs: clarified memory_search vs clawvault search scope

---

## [1.10.0] - 2026-02-10

### Changed
- Clean repo: removed internal docs, SEO bloat, dist from git

---

## [1.9.6] - 2026-02-10

### Fixed
- Stress test fixes: priority calibration, budget enforcement, scoring, watch reliability, wake verbosity

---

## [1.9.5] - 2026-02-10

### Fixed
- Stronger decision detection in compressor

---

## [1.9.4] - 2026-02-10

### Fixed
- Enforce priority rules on LLM output, fix people routing patterns

---

## [1.9.3] - 2026-02-10

### Fixed
- Watch, dedup, budget, classification, people routing fixes

---

## [1.9.2] - 2026-02-10

### Added
- Gemini support for observer compressor (in addition to Anthropic + OpenAI)

---

## [1.9.1] - 2026-02-10

### Added
- Auto-observe on sleep/wake
- Context-aware token budgets for observation injection

---

## [1.9.0] - 2026-02-10

### Added
- **Observational memory system** — Compresses session transcripts into durable observations
- Observer, Compressor, Reflector, Router, SessionWatcher, SessionParser modules
- Priority system (🔴 critical, 🟡 notable, 🟢 info) with automatic classification
- Vault routing: observations auto-categorize to decisions/, people/, lessons/, etc.
- File watcher mode for real-time session observation
- One-shot compression via `--compress` flag

---

## [1.8.2] - 2026-02-09

### Fixed
- **Path validation** - OPENCLAW_HOME and OPENCLAW_STATE_DIR now properly validated (trimmed, require absolute paths)
- **Error handling** - `listAgents()` now wrapped in try/catch to handle malformed filesystem state gracefully

---

## [1.8.1] - 2026-02-09

### Added
- **OPENCLAW_HOME support** - Session utilities now respect the `OPENCLAW_HOME` environment variable for custom OpenClaw installations
- **OPENCLAW_STATE_DIR support** - Also supports `OPENCLAW_STATE_DIR` for overriding state/agent paths

### Compatibility
- Verified compatibility with OpenClaw v2026.2.9
- Hook handler confirmed working after OpenClaw's tsdown migration fix (#9295)
- Session transcript reading benefits from OpenClaw's parentId chain fix (#12283)

---

## [1.5.1] - 2026-02-06

### Security
- **Fixed shell injection vulnerability** in hooks/clawvault/handler.js
  - Changed from `execSync` (with shell) to `execFileSync` (no shell)
  - All arguments passed as array, never interpolated into shell string
  - Vault path validation: must be absolute, exist, and contain .clawvault.json

- **Fixed prompt injection vulnerability**
  - Checkpoint recovery data now sanitized before injection
  - Control characters stripped, markdown escaped, length limited
  - Session keys and command sources sanitized with strict allowlist

- **Removed direct GitHub dependency** for qmd
  - qmd moved to optional peer dependency
  - Users install separately: `npm install -g github:tobi/qmd`
  - ClawVault gracefully handles missing qmd

### Changed
- Hook now validates vault paths before use
- Error messages in hooks are now generic (no sensitive data leaked)

---

## [1.5.0] - 2026-02-06

### Added
- **`clawvault repair-session`** - Repair corrupted OpenClaw session transcripts
  - Detects orphaned `tool_result` blocks that reference non-existent `tool_use` IDs
  - Identifies aborted tool calls with partial JSON
  - Automatically relinks parent chain after removals
  - Creates backup before repair (configurable with `--no-backup`)
  - Dry-run mode with `--dry-run` to preview repairs
  - List sessions with `--list` flag
  - JSON output with `--json` for scripting
  
  **Problem solved:** When the Anthropic API rejects with "unexpected tool_use_id found in tool_result blocks", this command fixes the transcript so the session can continue without losing context.
  
  ```bash
  # Analyze without changing
  clawvault repair-session --dry-run
  
  # Repair current main session
  clawvault repair-session
  
  # Repair specific session
  clawvault repair-session --session <id> --agent <agent-id>
  ```

- **Session utilities** (`src/lib/session-utils.ts`)
  - `listAgents()` - Find all agents in ~/.openclaw/agents/
  - `findMainSession()` - Get current session for an agent
  - `findSessionById()` - Look up specific session
  - `getSessionFilePath()`, `backupSession()` - File helpers

### Tests
- Added 13 tests for session repair functionality
  - Transcript parsing
  - Tool use extraction from assistant messages
  - Corruption detection (aborted + orphaned)
  - Parent chain relinking
  - Dry-run mode
  - Backup creation

---

## [1.4.2] - 2026-02-06

### Added
- **OpenClaw Hook Integration** - Automatic context death resilience
  - `gateway:startup` event: Detects if previous session died, injects alert into first agent turn
  - `command:new` event: Auto-checkpoints before session reset
  - Install: `openclaw hooks install clawvault && openclaw hooks enable clawvault`
  - Hook ships with npm package via `openclaw.hooks` field in package.json

- **`clawvault wake`** - All-in-one session start command
  - Combines: `recover --clear` + `recap` + summary
  - Shows context death status, recent handoffs, what you were working on
  - Perfect for session startup ritual

- **`clawvault sleep <summary>`** - All-in-one session end command
  - Creates handoff with: --next, --blocked, --decisions, --questions, --feeling
  - Clears death flag
  - Optional git commit prompt (--no-git to skip)
  - Captures rich context before ending session

### Fixed
- Fixed readline import in sleep command (was using `readline/promises` which bundlers couldn't resolve)

### Changed
- Documentation updated for hook-first approach
- AGENTS.md simplified - hook handles basics, manual commands for rich context
- SKILL.md updated with OpenClaw Integration section

---

## [1.4.1] - 2026-02-05

### Added
- `clawvault doctor` - Vault health diagnostics
- `clawvault shell-init` - Shell integration setup

---

## [1.4.0] - 2026-02-04

### Added
- **qmd integration** - Semantic search via local embeddings
- `clawvault setup` - Auto-discovers OpenClaw memory folder
- `clawvault status` - Vault health, checkpoint age, qmd index
- `clawvault template` - List/create/add with 7 built-in templates
- `clawvault link --backlinks` - See what links to a file
- `clawvault link --orphans` - Find broken wiki-links

### Changed
- qmd is now required for semantic search functionality

---

## [1.3.x] - Earlier

- Initial release with core functionality
- Checkpoint/recover for context death resilience
- Handoff/recap for session continuity
- Wiki-linking and entity management
- Structured memory categories
