# Handoff — 2026-04-25 (session compaction point)

This handoff captures where we are so the next session can pick up cleanly.

## What we accomplished this session

Five commits pushed to `origin/main`:

1. `b4c5f3a` — **shisad v0.7.0 analysis refresh**: rewrote `ANALYSIS-shisad.md` from plan-document analysis to v0.7.0 running-code analysis with file-path references into `src/shisad/memory/`. Updated `ANALYSIS.md` matrix + §2.6 + §5 mapping + §11 Novel Features to mark shipped primitives as "Implemented (v0.7.0)" with honest gaps flagged (benchmark adapters not in repo; adversarial track minimal; `observed` band gated off; Recall-surface annotation rewire pending).

2. `e596e71` — **StructMem (arXiv:2604.21748) paper deep dive**: `references/xu-structmem.md` + `ANALYSIS-arxiv-2604.21748-structmem.md` + REVIEWED.md triage entry + cross-refs in `ANALYSIS-academic-industry.md` (architectures list + consolidation mechanism section) + README.md (reference summaries table + deep-dive table).

3. `a8ef02b` — **Cross-reference external awesome-lists**: Added TsinghuaC3I / AgentMemoryWorld / TeleAI-UAGI links under README "Other catalogs". Created `PUNCHLIST-academic-industry-addendum.md` queuing 12 system deep-dive candidates + 5 benchmark candidates. Triaged 4 systems to REVIEWED.md: Memobase/Cognee/Second Me as promotion candidates; OMEGA not promoted (awesome-list's "LongMemEval 95.4%" claim was misattributed).

4. `36f4b54` — **Memobase / Cognee / Second Me full code-level analyses**:
   - Added three submodules: `vendor/memobase` (358c16bb), `vendor/cognee` (f4964c31 v1.0.3), `vendor/second-me` (d0e40251).
   - Memobase: **PROMOTED** to main matrix + `ANALYSIS-memobase.md` (typed 8-topic profile ontology, cold-path batch YOLO merge, reproducible LoCoMo 75.78/85.05 artifacts shipped in `docs/experiments/locomo-benchmark/`).
   - Cognee: **PROMOTED** to main matrix + `ANALYSIS-cognee.md` (bidirectional session-graph sync + feedback-weighted consolidation via `improve()`; multi-backend abstraction; 13+ search types; `@agent_memory` decorator).
   - Second Me: **NOT promoted** — standalone `ANALYSIS-second-me.md` kept for triage-hygiene. It's a personal LLM fine-tuning pipeline (LoRA training on synthetic QA), not a runtime memory system.

## Current state of repo

- **39 paper deep dives** in `ANALYSIS-arxiv-*.md`
- **Standalone system analyses**: ANALYSIS-karta, ANALYSIS-memobase, ANALYSIS-cognee, ANALYSIS-second-me (excluded), ANALYSIS-shisad, ANALYSIS-mempalace (excluded, see REVIEWED), plus older ANALYSIS-byterover-cli, ANALYSIS-openviking, ANALYSIS-mira-OSS, ANALYSIS-supermemory, ANALYSIS-claude-code-memory, ANALYSIS-codex-memory, ANALYSIS-google-always-on-memory-agent, ANALYSIS-coolmanns-openclaw-memory-architecture, ANALYSIS-drag88-agent-output-degradation, ANALYSIS-versatly-clawvault, ANALYSIS-vstorm-memv, ANALYSIS-joelhooks-adr-0077-memory-system-next-phase, ANALYSIS-jumperz-agent-memory-stack
- Main comparison matrix in ANALYSIS.md now includes: Memobase, Cognee (in addition to all prior systems)
- `PUNCHLIST-academic-industry-addendum.md` queues remaining paper work

## Next: paper-addendum batches

User confirmed workflow:
- **Full deep dives for P2 systems (12) only; benchmarks get lighter triage**.
- **Batch size ~3-5 papers per commit**.
- **Handoff + compact between each batch** (this one is the first).

### Batch 1 (up next) — Foundation/sister papers
1. **LightMem** (arXiv:2510.18866) — ZJU NLP framework that StructMem lives inside; direct LoCoMo baseline context. Code: `zjunlp/LightMem`.
2. **HippoRAG v2** (arXiv:2502.14802) — "From RAG to Memory"; hippocampus-inspired, widely cited. Code: `OSU-NLP-Group/HippoRAG`.
3. **Memp** (arXiv:2508.06433) — first explicit agent-procedural-memory paper.

### Batch 2 — Multi-agent memory cluster
4. **MIRIX** (arXiv:2507.07957) — multi-agent memory system, code `Mirix-AI/MIRIX`.
5. **G-Memory** (arXiv:2506.07398) — hierarchical multi-agent memory.
6. **LEGOMem** (arXiv:2510.04851) — modular procedural multi-agent memory.

### Batch 3 — Self-evolving / RL memory cluster
7. **Memento** (arXiv:2508.16153) / **Memento 2** (arXiv:2512.22716) — "stateful reflective memory" school; treat as paired deep-dive.
8. **Mem-α** (arXiv:2509.25911) — RL for memory construction; companion to Memory-R1.
9. **ReasoningBank** (arXiv:2509.25140) — reasoning-trace memory vs fact memory.

### Batch 4 — Latent/generative + context engineering
10. **MemGen** (arXiv:2509.24704) — generative latent memory.
11. **Agentic Context Engineering** (arXiv:2510.04618) — representative "context engineering" school.

### Batch 5 — Benchmarks (lighter triage)
12. **BEAM** (arXiv:2510.27246) — the benchmark behind Karta's 57.7%.
13. **ConvoMem** (arXiv:2511.10523) — "first 150 conversations don't need RAG" (Salesforce).
14. **MemoryAgentBench** (arXiv:2507.05257) — incremental multi-turn.
15. **HaluMem** (arXiv:2511.03506) — memory hallucination.
16. **RealTalk** (arXiv:2502.13270) — 21-day real-world dialog.
17. **LifelongAgentBench** (arXiv:2505.11942) — lifelong-learning agent benchmark.

## Established conventions (IMPORTANT — follow these)

### Paper deep-dive file naming
- PDF: `references/papers/arxiv-<id>.pdf` (git-lfs-tracked)
- Optional text snapshot: `references/papers/arxiv-<id>.md`
- Reference summary: `references/<firstauthor>-<shortslug>.md` (mechanism-first, follows `templates/REFERENCE-paper.md`)
- Analysis: `ANALYSIS-arxiv-<id>-<shortslug>.md` (5-stage structure: descriptive → comparative → evaluative → landscape → takeaways)

### Reference-summary frontmatter (see `references/xu-structmem.md` for template):
```yaml
---
title: "..."
author: "First author et al."
date: YYYY-MM-DD
type: reference
tags: [paper, agent-memory, long-term-memory, ...]
source: "arxiv abs URL"
source_alt: "arxiv pdf URL"
version: "arXiv vN, venue"
context: "why we care"
related: [links]
---
```

### Analysis-paper frontmatter (see `ANALYSIS-arxiv-2604.21748-structmem.md` for template):
```yaml
---
title: "Analysis — <ShortName> (<FirstAuthorYYYY>)"
date: YYYY-MM-DD
type: analysis
paper:
  id: "arxiv:XXXX.XXXXX"
  title: "..."
  authors: [list]
  year: YYYY
  venue: "..."
  version: "..."
links: [...]
source: [reference summary file]
related: [other analyses]
tags: [...]
---
```

### For each paper:
1. Fetch abstract + extract concrete numbers (LoCoMo/LongMemEval/BEAM etc., with baselines named).
2. Write `references/<author>-<slug>.md` with TL;DR, What's novel, Write/Read/Maintenance paths, Evaluation, Takeaways for shisad.
3. Write `ANALYSIS-arxiv-<id>-<slug>.md` with stages 1-5: descriptive, evaluation, comparative position (vs existing systems in our catalog), evaluative strengths/gaps, takeaways. Corrections & Updates at bottom.
4. Add to `ANALYSIS-academic-industry.md` → architectures/benchmarks/learning list as appropriate.
5. Add to `README.md` → references table + deep-dive analyses table.
6. Mark `[x]` in `PUNCHLIST-academic-industry-addendum.md` and add file links.

### Commit style (per project CLAUDE.md):
- No `git add .` or `-A` — stage specific files explicitly.
- No Claude/Co-Authored-By footers.
- Simple prefixes: `docs:`, `vendor:`, `chore:`.
- One coherent batch per commit.
- HEREDOC commit messages:
```bash
git commit -m "$(cat <<'EOF'
docs: add batch N paper analyses (LightMem, HippoRAG v2, Memp)

- LightMem (arXiv:2510.18866, Fang et al.): ...
- HippoRAG v2 (arXiv:2502.14802, ...): ...
- Memp (arXiv:2508.06433, ...): ...

Cross-refs in ANALYSIS-academic-industry.md + README.md.
Marked [x] in PUNCHLIST-academic-industry-addendum.md.
EOF
)"
```

### Promotion criterion for main ANALYSIS.md matrix
Only promote if the paper has a **unique primitive** (novel mechanism unmatched in our catalog) AND real benchmark numbers. Otherwise keep it at paper-level only with a cross-ref in ANALYSIS-academic-industry.md §1 systems list.

From addendum queue, likely matrix-promotion candidates based on what's in the abstracts:
- LightMem — probably yes (companion to StructMem, widely cited)
- HippoRAG v2 — probably yes (widely cited; defines "hippocampus-inspired RAG")
- Memp — maybe (first procedural-memory paper; if code is available + numbers are real)
- MIRIX — probably yes (first multi-agent memory with real code)
- Memento — probably yes (popular fine-tune-without-fine-tuning framing)

Batch 5 benchmarks: no matrix promotion, just academic-industry §9.1 cross-ref.

## Workflow for next session

1. Start fresh session.
2. Say "continue batch 1" or similar — I'll know which batch from task #13 (currently `in_progress`).
3. Fetch paper abstract(s), author(s), numbers.
4. Write references/ + ANALYSIS-arxiv-*.md.
5. Update academic-industry + README + addendum.
6. Commit and push.
7. Write new handoff for next batch, compact, repeat.

## Key file locations to recall

- `PUNCHLIST-academic-industry-addendum.md` — the queue (P2 systems + P2 benchmarks sections).
- `ANALYSIS-academic-industry.md` — academic/industry synthesis; new papers slot into §1 lists + occasional §3 cross-refs.
- `README.md` — references table + deep-dive analyses table; file-tree at bottom.
- `REVIEWED.md` — triage log; add entry only if a paper surprises us (e.g., it turns out to be out of scope).
- `templates/REFERENCE-paper.md` + `templates/ANALYSIS-paper.md` — reference-summary + analysis templates.
- Existing paper deep-dives in `ANALYSIS-arxiv-*.md` are the model for structure, tone, and depth.

## Task state (as of compaction)

- Task #13 (Batch 1: LightMem / HippoRAG v2 / Memp) — **in_progress** (up next)
- Task #14 (Batch 2) — pending
- Task #16 (Batch 3) — pending
- Task #17 (Batch 4) — pending
- Task #15 (Batch 5: benchmarks) — pending
- All earlier tasks (#1-#12) — completed

---

**End of handoff.** Next session: start by re-reading this file, check `PUNCHLIST-academic-industry-addendum.md`, then begin Batch 1.
