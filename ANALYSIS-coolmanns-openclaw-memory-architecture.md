---
title: "Analysis — OpenClaw Memory Architecture (coolmanns)"
date: 2026-02-21
type: analysis
system: openclaw-memory-architecture
source:
  - references/coolmanns-openclaw-memory-architecture.md
  - vendor/openclaw-memory-architecture (snapshot @ 5a7cb84969e3e34242b3e0e32949882d18ac2966, captured 2026-02-20)
related:
  - ANALYSIS-jumperz-agent-memory-stack.md
  - ANALYSIS-versatly-clawvault.md
---

# Analysis — OpenClaw Memory Architecture (coolmanns)

This file is a **critical deep dive** on the vendored `openclaw-memory-architecture` repository. It is intended as synthesis input and **builds on** `references/coolmanns-openclaw-memory-architecture.md`, but emphasizes verification against primary repo docs/scripts and highlights gaps/risks.

## Context & Sources

- Primary (vendored): `vendor/openclaw-memory-architecture` (commit `5a7cb849…`, captured 2026-02-20; see `vendor/README.md`).
- Most “facts” here are **doc-claims** inside that repo; they are stronger than tweets, but still mostly **self-report** unless backed by reproducible scripts and data.

## Stage 1 — Descriptive (what the system is)

### Problem framing
The repo argues that “memory” is not one thing. Different questions require different storage/retrieval mechanisms:
- Exact lookups (“Mom’s phone number”) → structured data.
- Fuzzy recall (“what were we discussing about infrastructure?”) → semantic/keyword search.
- Relationship queries (“What port does Keystone run on?”) → entity/graph resolution.

### The 12-layer stack (high-level)
The architecture is explicitly layered (see `vendor/openclaw-memory-architecture/README.md` and `docs/ARCHITECTURE.md`):
- **Always-loaded files** (identity + working context): `SOUL.md`, `USER.md`, `IDENTITY.md`, `active-context.md`, `HEARTBEAT.md`.
- **Strategic curated memory:** `MEMORY.md` (loaded only in the main, private session).
- **Project memory:** `memory/project-{slug}.md` (institutional knowledge shared across agents).
- **Structured graph store:** `memory/facts.db` (SQLite + FTS5, with relations, aliases, activation/decay).
- **Search:** QMD (BM25 + reranking) primary; llama.cpp embeddings fallback.
- **Domain RAG:** separate ebook RAG DB (`ebook_rag.db`) for niche domain content.
- **On-demand corpus:** daily logs (`YYYY-MM-DD.md`), runbooks (`tools-*.md`), gating policies, checkpoints.
- **Runtime plugins:** continuity, stability, graph-memory injection.

### Write path (how memory gets created)
The repo mostly describes **file-based accumulation + periodic consolidation**:
- Daily logs collect events/decisions/lessons with importance tags.
- Working context (`active-context.md`) is a short-lived scratch space.
- Strategic `MEMORY.md` is curated and pruned.
- Structured facts and relations can be seeded manually and auto-ingested from tagged daily entries (scripts exist).

The implementation emphasis is: “move structured facts into `facts.db` and keep always-loaded files small” (see `docs/context-optimization.md`).

### Read path (how memory is retrieved)
Multiple paths exist depending on query type:
- Graph/entity lookup from `facts.db` (sub-ms, local).
- Keyword/BM25 search via QMD.
- Embedding similarity via llama.cpp (local, ~ms).
- Graph-memory plugin injects `[GRAPH MEMORY]` into prompt on `before_agent_start` when entity match score ≥ 65 (reported ~2s latency).

### Maintenance
Maintenance appears as:
- Cron-driven decay (activation hot/warm/cool).
- Weekly reindex of domain RAG.
- Ongoing pruning/size targets for always-loaded context (explicit budgets).

### Evaluation (as described)
The repo includes a benchmark methodology and script:
- A **60-query benchmark** across categories, scored as “expected file substring appears in top-K results” (default K=6). See `docs/knowledge-graph.md`, `docs/benchmark-process.md`, and `scripts/memory-benchmark.py`.
- Reported results: BM25 baseline 46.7%, graph-only 96.7%, hybrid 100%.

## Stage 2 — Evaluative (what’s strong, what’s weak)

### Evidence quality: unusually strong for this repo, but still self-contained
Compared to other sources here, this repo:
- Provides **concrete artifacts** (schema, scripts, benchmark harness) → stronger than pure architecture threads.
- But still relies on **self-reported environment + data**; we do not have the underlying workspace files/db that the benchmark ran against.

Practical rating:
- “This can be implemented” → **E4** (documented, scripted).
- “It achieves 100% recall” → **E4/E5** (benchmark exists, but dataset + environment are author-provided).

### Strengths (high leverage ideas)

#### 1) Clear separation of “always-loaded” vs “on-demand”
This is a core operational insight:
- Keep system prompt overhead bounded (explicit KB/token targets).
- Push bulk facts into a structured store + inject only relevant subsets.

This matches real cost/latency constraints in long-running agents.

#### 2) Structure beats embeddings (and the repo shows *how*)
The benchmark writeup is persuasive because it operationalizes failures:
- BM25 fails on entity/relationship queries.
- Adding aliases + entity modeling yields large gains.
Even if the exact numbers are local, the *mechanism* is plausible and reusable.

#### 3) Benchmark-driven iteration (guardrails against regressions)
Including a regression story (“alias matching caused PROJECTS regression”) is a strong sign:
- It frames memory quality as an engineering target, not vibes.
- It suggests a development loop: adjust structure → re-run benchmark → observe deltas.

#### 4) “Docs vs reality” self-audit
`docs/COMPARISON.md` explicitly tracks drift (e.g., schema evolution, scale growth, QMD timeouts).
This is rare and valuable: it treats documentation drift as a first-class failure mode.

### Weaknesses / risks

#### 1) Benchmark measures “file hit”, not “answer correctness”
The benchmark counts a hit if the right file appears in top-K. That is useful, but:
- It does not ensure the *specific fact* was retrieved.
- It can be satisfied by “finding the right blob” even if the agent still answers incorrectly.

For synthesis: treat “100% recall” as “100% top-6 correct-file hits on a curated query set”.

#### 2) The system is operationally complex
Multiple layers, scripts, crons, plugins, and special-case rules create coordination cost:
- Drift between layers (facts.db vs MEMORY.md vs daily files).
- Cron fragility and silent failures.
- Debugging injection: graph-memory plugin as a subprocess adds failure surface.

The repo partially addresses this (comparison doc, budgets), but replication requires discipline.

#### 3) QMD as “primary” search may be too slow/unreliable in practice
`docs/COMPARISON.md` notes QMD “often times out”. If the “best quality” search backend is flaky:
- Fallback paths must be excellent, not just “acceptable”.
- The system may oscillate between “high quality but slow” and “fast but lower quality” unpredictably.

#### 4) Write-side correctness and conflict handling is less developed than read-side retrieval
The repo is strongest on retrieval and organization, but less explicit about:
- Conflict resolution (multiple truths / temporal facts),
- Write gating (preventing mistaken extractions),
- Provenance for auto-ingested facts.

In practice, long-term memory systems fail on write quality as much as on retrieval.

#### 5) Security boundaries rely on conventions
A notable rule: `MEMORY.md` is only loaded in the “main session” and never in shared contexts.
This is good, but enforcement details matter:
- Is this guaranteed by tooling, or by operator discipline?
- Plugins that inject memory must respect the same boundary.

### Missing details (for synthesis-grade confidence)
- A clear “minimal viable subset” that achieves most benefits without plugins/crons.
- Formal definitions for:
  - activation/decay formula and pruning thresholds,
  - how contradictions are represented and resolved.
- Multi-agent write coordination (locking or merge strategy for shared files).

## Stage 3 — Dialectical (steelman + counterarguments)

### Steelman
This repo demonstrates that agent memory can be treated like a **search + data modeling problem**:
- Use a structured graph for entity queries, BM25 for keyword queries, embeddings for fuzzy recall.
- Maintain strict context budgets and inject only relevant knowledge per turn.
- Measure quality with a benchmark and iterate.

It’s one of the more synthesis-ready sources because it includes concrete mechanisms, not just desiderata.

### Counterarguments
- The environment is highly custom (OpenClaw ecosystem, QMD dependency, plugins). Portability is non-trivial.
- Benchmarks can overfit; “file hit” is not “task success”.
- Operational complexity might outweigh benefits for smaller systems without strong maintenance habits.

### Relationship to @jumperz’s 31-piece stack
OpenClaw’s system covers many “jumperz” themes (tiering, decay, budgets, knowledge graph) but differs in emphasis:
- More “file + SQLite structure”, less “LLM extraction pipeline”.
- Strong evaluation loop (benchmark) that jumperz doesn’t provide.

## Synthesis-ready takeaways (what to carry forward)

- Layer memory by query type; don’t force everything through embeddings.
- A lightweight SQLite graph + alias resolution is a high-leverage primitive for personal-agent recall.
- Context budgets and per-session token overhead deserve explicit targets.
- Treat memory changes as “search quality engineering”: benchmarks + regression stories matter.

## Claims (for later synthesis / registration)

Claims below are written as “repo asserts X” unless independently verifiable from code alone.

| Claim | Type | Evidence | Credence | Layer | Actor | Scope | Quantifier | Notes / verification |
|---|---:|---:|---:|---|---|---|---|---|
| The architecture is implemented as a 12-layer stack combining always-loaded files, curated memory, a SQLite knowledge graph, hybrid search, and runtime plugins. | [F] | E4 | 0.85 | Architecture | coolmanns | openclaw-memory-architecture repo | “is” | Verified by repo docs (`README.md`, `docs/ARCHITECTURE.md`). |
| `facts.db` uses SQLite + FTS5 with facts/relations/aliases and activation/importance fields; current documented scale is 3,108 facts, 1,009 relations, 275 aliases. | [F] | E4 | 0.75 | Storage | coolmanns | Gandalf deployment | “3,108/1,009/275” | Numbers are doc-claims (`docs/ARCHITECTURE.md`, `docs/COMPARISON.md`); schema evolution is documented. |
| A 60-query benchmark achieves 100% “recall” for hybrid (graph + BM25) at top-6 using expected-file-substring matching. | [F] | E4 | 0.7 | Evaluation | coolmanns | Gandalf workspace | “100% / top-6” | Benchmark script exists (`scripts/memory-benchmark.py`); dataset and results are environment-specific. |
| Token overhead was reduced by ~6,500 tokens/session by trimming always-loaded files and moving facts into `facts.db`. | [F] | E4 | 0.65 | Ops | coolmanns | Gandalf workspace | “~6,500” | Doc-claim (`docs/context-optimization.md`, `docs/knowledge-graph.md`); depends on tokenization/model. |
| QMD primary search often times out; llama.cpp embeddings fallback is ~7ms and multilingual. | [F] | E4 | 0.6 | Retrieval | coolmanns | Gandalf system | “often / ~7ms” | Timeouts noted in `docs/COMPARISON.md`; embedding latency is doc-claim in `README.md`/`ARCHITECTURE.md`. |

## Corrections & Updates

- The repo itself notes documentation drift (“documentation vs reality”). When two internal docs disagree (e.g., older counts in `docs/knowledge-graph.md`), prefer `docs/COMPARISON.md` and `docs/ARCHITECTURE.md` as the “current status” sources (both dated 2026-02-20).
- This analysis does not run the benchmark (requires the author’s workspace and QMD/OpenClaw setup). It verifies the benchmark *method* from source code and documents what it actually measures.
