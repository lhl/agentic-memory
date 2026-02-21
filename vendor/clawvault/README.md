# ClawVault 🐘

Structured memory system for AI agents and operators: typed markdown memory, graph-aware context, task/project primitives, Obsidian views, and OpenClaw hook integration.

[![npm](https://img.shields.io/npm/v/clawvault)](https://www.npmjs.com/package/clawvault)

> Local-first. Markdown-first. Built to survive long-running autonomous work.

**$CLAW**: [`5Fjr82MTB8mvxkzi9FYtvrUsPiDGE2M29w3dYcZpump`](https://pump.fun/coin/5Fjr82MTB8mvxkzi9FYtvrUsPiDGE2M29w3dYcZpump)

## Requirements

- Node.js 18+
- `qmd` installed and available on `PATH`

ClawVault currently relies on `qmd` for core vault/query flows. Install it before first use.

## Install

```bash
npm install -g clawvault
```

## 5-Minute Setup

```bash
# 1) Create or initialize a vault
clawvault init ~/memory --name my-brain

# 2) Optional vault bootstrap for Obsidian
clawvault setup --theme neural --canvas

# 3) Verify OpenClaw compatibility in this environment
clawvault compat
```

## OpenClaw Setup (Canonical)

If you want hook-based lifecycle integration, use this sequence:

```bash
# Install CLI
npm install -g clawvault

# Install and enable hook pack
openclaw hooks install clawvault
openclaw hooks enable clawvault

# Verify
openclaw hooks list --verbose
openclaw hooks info clawvault
openclaw hooks check
clawvault compat
```

Important:

- `clawhub install clawvault` installs skill guidance, but does not replace hook-pack installation.
- After enabling hooks, restart the OpenClaw gateway process so hook registration reloads.

## Minimal AGENTS.md Additions

Append these to your existing memory workflow. Do not replace your full prompt setup:

```markdown
## ClawVault
- Run `clawvault wake` at session start.
- Run `clawvault checkpoint` during heavy work.
- Run `clawvault sleep "summary" --next "next steps"` before ending.
- Use `clawvault context "<task>"` or `clawvault inject "<message>"` before complex decisions.
```

## Real CLI Surface (Current)

Core:

- `init`, `setup`, `store`, `capture`
- `remember`, `list`, `get`, `stats`, `reindex`, `sync`

Context + memory:

- `search`, `vsearch`, `context`, `inject`
- `observe`, `reflect`, `session-recap`
- `graph`, `entities`, `link`, `embed`

Resilience:

- `wake`, `sleep`, `handoff`, `recap`
- `checkpoint`, `recover`, `status`, `clean-exit`, `repair-session`
- `compat`, `doctor`

Execution primitives:

- `task ...`, `backlog ...`, `blocked`, `project ...`, `kanban ...`
- `canvas` (generates default `dashboard.canvas`)

Networking:

- `tailscale-status`, `tailscale-sync`, `tailscale-serve`, `tailscale-discover`

## Quick Usage

```bash
# Store and retrieve memory
clawvault remember decision "Use PostgreSQL" --content "Chosen for JSONB and reliability"
clawvault search "postgresql"
clawvault vsearch "what did we decide about storage"

# Session lifecycle
clawvault wake
clawvault checkpoint --working-on "auth rollout" --focus "token refresh edge cases"
clawvault sleep "finished auth rollout plan" --next "implement migration"

# Work management
clawvault task add "Ship v2 onboarding" --owner agent --project core --priority high
clawvault blocked
clawvault project list --status active
clawvault kanban sync

# Obsidian projection
clawvault canvas
```

## Obsidian Integration

- Setup can generate:
  - graph theme/snippet config (`--theme neural|minimal|none`)
  - Bases views (`all-tasks.base`, `blocked.base`, `by-project.base`, `by-owner.base`, `backlog.base`)
  - default canvas (`dashboard.canvas`) via `--canvas` or `clawvault canvas`
- Kanban round-trip:
  - export: `clawvault kanban sync`
  - import lane changes back to task metadata: `clawvault kanban import`

## Tailscale + WebDAV

ClawVault can serve vault content for sync over Tailscale and exposes WebDAV under `/webdav` for mobile-oriented workflows.

```bash
clawvault tailscale-status
clawvault tailscale-serve --vault ~/memory
clawvault tailscale-discover
```

## Troubleshooting

- Hook not found after enable:
  - run `openclaw hooks install clawvault` first
  - then `openclaw hooks enable clawvault`
  - restart gateway
  - verify with `openclaw hooks list --verbose`
- `qmd` errors:
  - ensure `qmd --version` works from same shell
  - rerun `clawvault setup` after qmd install
- OpenClaw integration drift:
  - run `clawvault compat`
- Session transcript corruption:
  - run `clawvault repair-session --dry-run` then `clawvault repair-session`

## License

MIT
