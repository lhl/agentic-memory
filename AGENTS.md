# agentic-memory - Research Repo Guide

This `AGENTS.md`/`CLAUDE.md` describes conventions for maintaining this research repository (reference summaries + vendored snapshots) and keeping it clean.

Instruction precedence: if this file conflicts with platform/system/developer instructions, follow platform/system/developer instructions.

## Project Overview

This is a **research collection** focused on agentic memory systems: architectures, persistence patterns, evaluation/benchmarks, and failure modes.

Primary artifacts:
- `references/`: our curated summaries (Markdown with YAML frontmatter)
- `vendor/`: external repos for research reference (prefer submodules; some legacy snapshots)
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

## Workflow: Add an External Repo to vendor/

External repos live in `vendor/` (not `vendors/`).

**Prefer git submodules** over vendored snapshots. Submodules keep our repo lean and avoid bloating history with external code. The tradeoff (upstream could vanish) is acceptable — we care more about repo size than archival preservation.

Adding a submodule:
```bash
git submodule add <url> vendor/<repo-name>
cd vendor/<repo-name> && git checkout <commit-or-tag>
cd ../.. && git add vendor/<repo-name> .gitmodules
```

Rules:
- Record provenance in `vendor/README.md` for every entry (submodule or snapshot):
  - Source URL
  - Reviewed commit SHA / tag
  - Review date (YYYY-MM-DD)
  - Short note/message about what was captured and why
- Some legacy entries are **point-in-time snapshots** (actual code committed). These are fine to leave as-is but new additions should use submodules.
- For snapshots: do not keep `.git/` directories; remove generated artifacts (`node_modules/`, `dist/`, `.venv/`, build caches); keep upstream license files.
- Avoid editing external code for “style” or “cleanup”.
  - Any research notes belong in `references/`, not inside `vendor/`.

## Research/Claim Hygiene

- Separate **author claims** from **our verification** (if any).
- If something isn’t reproduced/validated, say so explicitly.
- Don’t invent implementation details; prefer “unknown/TBD” + links to upstream evidence.
- When quoting benchmarks or counts, include context (hardware, dataset, date) when available.

## Workflow: Triage New Systems (REVIEWED.md)

All newly examined systems, projects, and papers go through `REVIEWED.md` **first** as a triage stage, unless the user explicitly directs otherwise.

Process:
1. Examine the system (clone, read docs, read code as needed).
2. Write a triage entry in `REVIEWED.md`: summary table row + detailed assessment section.
3. Decide disposition with the user:
   - **Not promoted**: stays in REVIEWED.md with reasoning. Prevents re-examination later.
   - **Promoted to ANALYSIS.md**: add to comparison matrices, note “PROMOTED” in REVIEWED.md. The REVIEWED.md entry stays as history.
   - **Standalone analysis**: create `ANALYSIS-*.md` if the system warrants a deep dive.
4. Systems that are clearly lightweight/PoC/convergent patterns can be documented in REVIEWED.md without promotion.

The triage log is reverse-chronological with a summary table at the top and detailed sections below.

## Git Hygiene (Keep History Reviewable)

- Commit when a coherent research task is complete (reference/vendor/README updates done); avoid mid-task commits.
- Prefer short status updates for longer tasks, and finish with a concise summary (files touched + next step).
- Prefer small, atomic commits: one coherent research addition per commit (reference + README updates; vendor snapshot + metadata).
- Stage files explicitly (avoid `git add .`).
- Use simple commit prefixes: `docs:`, `vendor:`, `chore:`.
- Don’t “fix” unrelated drift outside the active scope without asking.
- **No bylines or co-author tags** in commit messages (no `Co-Authored-By`, no `Signed-off-by`, no agent attribution). Multiple agents work on this repo; individual attribution is noise.

## Meta: Evolving This File

Update this guide when you notice:
- recurring repo messiness
- recurring confusion about where things go
- a new workflow that makes future research faster and more reliable
