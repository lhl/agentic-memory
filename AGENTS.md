# agentic-memory - Research Repo Guide

This `AGENTS.md`/`CLAUDE.md` describes conventions for maintaining this research repository (reference summaries + vendored snapshots) and keeping it clean.

Instruction precedence: if this file conflicts with platform/system/developer instructions, follow platform/system/developer instructions.

## Project Overview

This is a **research collection** focused on agentic memory systems: architectures, persistence patterns, evaluation/benchmarks, and failure modes.

Primary artifacts:
- `references/`: our curated summaries (Markdown with YAML frontmatter)
- `vendor/`: point-in-time snapshots of relevant external repos (stripped, not submodules)
- `README.md`: the index/entrypoint; should stay accurate

## Key Directories

```
agentic-memory/
├── README.md          # Index + pointers; keep in sync
├── references/        # Our summaries + small supporting assets
└── vendor/            # Vendored external repos (snapshots) + metadata
```

## Workflow: Add a New Reference

1. Create a new file in `references/` with a stable, descriptive name:
   - Prefer: `<author>-<topic>.md` (match existing style)
2. Include YAML frontmatter at the top.
   - Required keys: `title`, `author`, `date` (YYYY-MM-DD), `type: reference`, `tags`
   - Provenance keys: at least one of `source`, `source_repo`
   - Optional keys: `source_alt`, `local_clone` (usually `../vendor/<repo>`), `version`, `context`, `related`, `images`
3. In the body, keep the structure scannable:
   - **TL;DR** (3–8 bullets)
   - **What’s novel / different**
   - **Write path / Read path / Maintenance** (if applicable)
   - **Data model / storage choices**
   - **Metrics/benchmarks** (quote numbers carefully; include where they came from)
   - **Open questions / risks / missing details**
4. Update `README.md` in the same change:
   - Add the new reference to the tables
   - Add any new source links
   - Fix any file tree drift caused by your change

## Workflow: Vendor an External Repo Snapshot

Vendored repos live in `vendor/` (not `vendors/`).

Rules:
- Snapshots are **point-in-time copies** (no submodules; no live checkouts).
- Do not keep `.git/` directories under `vendor/`.
- Record provenance in `vendor/README.md` for every snapshot:
  - Source URL
  - Upstream commit SHA / tag
  - Capture date (YYYY-MM-DD)
  - Short note/message about what was captured and why
- Keep vendor trees lean:
  - Remove obvious generated artifacts (`node_modules/`, `dist/`, `.venv/`, build caches, etc.)
  - Keep upstream license/notice files when present
- Avoid editing vendored code for “style” or “cleanup”.
  - Any research notes belong in `references/`, not inside `vendor/`.

## Research/Claim Hygiene

- Separate **author claims** from **our verification** (if any).
- If something isn’t reproduced/validated, say so explicitly.
- Don’t invent implementation details; prefer “unknown/TBD” + links to upstream evidence.
- When quoting benchmarks or counts, include context (hardware, dataset, date) when available.

## Git Hygiene (Keep History Reviewable)

- Commit when a coherent research task is complete (reference/vendor/README updates done); avoid mid-task commits.
- Prefer short status updates for longer tasks, and finish with a concise summary (files touched + next step).
- Prefer small, atomic commits: one coherent research addition per commit (reference + README updates; vendor snapshot + metadata).
- Stage files explicitly (avoid `git add .`).
- Use simple commit prefixes: `docs:`, `vendor:`, `chore:`.
- Don’t “fix” unrelated drift outside the active scope without asking.

## Meta: Evolving This File

Update this guide when you notice:
- recurring repo messiness
- recurring confusion about where things go
- a new workflow that makes future research faster and more reliable
