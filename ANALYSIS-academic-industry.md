---
title: "Analysis — Academic/Industry Agent Memory Systems (Synthesis)"
date: 2026-02-22
type: analysis
related:
  - ANALYSIS.md
  - PUNCHLIST-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — Academic/Industry Agent Memory Systems (Synthesis)

This document is a synthesis/comparison of **academic + industry** memory systems and memory benchmarks (papers), intended to drive design decisions for `shisad` (see `/home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md`).

Scope notes:
- This is **not** a review of the “folk” ad-hoc memory projects; those are covered in `ANALYSIS.md` and `ANALYSIS-*.md`.
- Treat results as **reported** unless we reproduce them.
- This file is **iterative**: it should get richer as more per-paper deep dives land (tracked in `PUNCHLIST-academic-industry.md`).

## 1) Quick comparison table (builder-facing)

| Paper | Type | Core memory substrate | Explicit ops / correction semantics | What it adds (in one line) |
|---|---|---|---|---|
| LoCoMo (arXiv:2402.17753) | benchmark | multi-session dialogue + event graphs (+ images) | n/a | episodic memory stress test with multimodal + temporal grounding |
| LongMemEval (arXiv:2410.10813) | benchmark | scalable multi-session assistant histories | updates + abstention are first-class | indexing → retrieval → reading decomposition for “memory systems” |
| EverMemBench (arXiv:2602.01313) | benchmark | >1M-token multi-party interleavings | version semantics becomes critical | multi-party + fragmentation + “memory awareness” diagnostics |
| LoCoMo-Plus (arXiv:2602.10715) | benchmark | long-term dialogue with latent constraints | constraint-consistency metric | evaluates beyond factual recall: values/goals/state constraints |
| Mem0 (arXiv:2504.19413) | system | dense “facts” (+ optional KG) | `ADD/UPDATE/DELETE/NOOP` (delete loses history) | production-oriented memory ops + token/latency reporting on LoCoMo |
| Zep/Graphiti (arXiv:2501.13956) | system | bi-temporal knowledge graph (episodes/entities/communities) | invalidate via `tvalid/tinvalid` + audit timeline | correction-history semantics + hybrid retrieval (BM25/embeddings/BFS) |
| Nested Learning (arXiv:2512.24695) | concept/arch | internal multi-timescale update dynamics | “continuum memory” via update frequency | consolidation at multiple time scales (“corrections without forgetting” lens) |
| MINJA (arXiv:2503.03704) | attack | “memory-as-demonstrations” records | poisoning via query-only injection | shows memory write-path is a security boundary; demonstrations are dangerous |

Deep dives: see the corresponding `ANALYSIS-arxiv-*.md` files linked from `README.md`.

## 2) Taxonomy: what kinds of memory are being modeled?

This is the core of what we need for `shisad`: a way to name **memory types** and **what they’re for**.

### Episodic memory (events over time)

Episodic memory shows up in two different “substrates”:
- **Raw episodes/logs** (Zep): keep a non-lossy store of interactions, then derive semantics.
- **Event-graph generation** (LoCoMo): a benchmark that forces “what happened when” reasoning (and can be multimodal).

Practical takeaway: episodic memory needs **timestamps + narrative structure**, not just “facts”.

### Semantic memory (facts / relations)

Two dominant representations:
- **Dense natural-language facts** (Mem0): store compact fact-like strings and retrieve them with embeddings.
- **Explicit relations** (Zep, Mem0g): store entity–relation edges with semantics and (ideally) validity intervals.

Practical takeaway: semantic memory should support **dedup**, **conflict handling**, and **query-time compilation** into bounded prompts.

### Constraint / “cognitive” memory (values, goals, preferences)

LoCoMo-Plus is the clearest benchmark signal here: it treats many “memory failures” as failures to retain and apply **constraints** that are not purely factual (causal/state/goal/value constraints under cue–trigger disconnect).

Practical takeaway: constraint memory likely needs **stricter write gates** and should be evaluated with **consistency** metrics, not only recall.

### Multi-party / multi-group memory (fragmentation + boundaries)

EverMemBench forces:
- multiple speakers,
- multiple group contexts,
- very long histories,
which makes it hard to even decide “what is relevant memory” without scoping rules and version semantics.

Practical takeaway: you need **scoping** (user/project/team/room), and retrieval needs to be time- and scope-aware.

### Security / adversarial memory

MINJA effectively says: memory is part of your attack surface if:
- any user can cause writes,
- memory is shared broadly, and
- stored items are later used as **demonstrations** (high influence).

Practical takeaway: “memory” needs **policy** (who can write what, where, and how it can be used).

## 3) Pipeline decomposition (cross-paper “common shape”)

LongMemEval’s **indexing → retrieval → reading** decomposition is a good shared vocabulary, but we need to extend it for real systems:

1. **Ingestion / extraction (indexing)**: convert raw interactions into candidate memory artifacts.
2. **Validation / gating (indexing)**: decide what is allowed to persist (policy, safety, user confirmation).
3. **Storage + correction semantics (indexing)**: append/supersede/invalidate with history.
4. **Candidate generation (retrieval)**: hybrid search over facts/events/graph neighborhoods.
5. **Ranking (retrieval)**: rerank for precision (cross-encoders, MMR, recency, graph-distance, mention frequency).
6. **Compilation (reading)**: format retrieved artifacts into a bounded prompt context (with conflict handling).
7. **Post-response feedback (maintenance)**: measure utility (echo/fizzle), issue corrections, schedule consolidation jobs.

Zep is the most explicit about steps (4–6); Mem0 is explicit about (1–3) via its ops; MINJA forces step (2) to be a first-class component.

## 4) Corrections, versioning, and “don’t forget you used to think X”

This is the highest leverage synthesis point across papers:

- Benchmarks increasingly test **updates** (LongMemEval) and implicitly require version semantics (EverMemBench).
- Systems differ sharply:
  - Mem0’s base design includes **hard delete** for contradictions (simple, but loses history).
  - Zep/Graphiti uses **validity intervals + invalidation**, preserving historical evolution.
  - Nested Learning’s CMS offers a conceptual analogue: keep knowledge at multiple “frequencies” so updates don’t fully erase prior state.

For `shisad`, the design pressure is clear: implement correction semantics as **append + supersedes/invalidate** with audit trails, not “overwrite the one truth”.

## 5) Evaluation lessons (what to measure so we don’t fool ourselves)

From the benchmarks:
- Retrieval errors can actively hurt (LoCoMo).
- “Memory awareness” and organization matter beyond raw recall (EverMemBench).
- “Cognitive memory” needs its own metrics (LoCoMo-Plus).

From systems papers:
- If you don’t track **token consumption** and **p95 latency** (Mem0, Zep), you can build a memory system that works only on paper.
- LLM-as-judge is useful but can hide systematic failure modes; pair it with oracle diagnostics and targeted regressions.

## 6) Implications for shisad: what might be missing?

Based on the set above (so far), the biggest missing/under-specified primitives to track in `shisad` are:

- **Versioned correction semantics** everywhere (supersedes chains; validity intervals; tombstones with reasons).
- **Memory scoping** as a first-class dimension (multi-party/multi-group; tenant isolation).
- **Constraint memory tier** (values/goals/preferences) with stricter write gates and explicit consistency evaluation.
- **Security model** for write-path + retrieval-path (MINJA-style poisoning harness; provenance/taint metadata).
- **Evaluation adapters**:
  - LoCoMo/LongMemEval/EverMemBench/LoCoMo-Plus harnesses,
  - “oracle evidence” diagnostics,
  - and regression suites for update/correction behavior.

## 7) Roadmap suggestion (high level)

If we align with the v0.7 “big memory overhaul” framing:

- **Phase A (core semantics)**: versioned memories + scopes + basic consolidation jobs + retrieval compilation.
- **Phase B (benchmarks)**: integrate LongMemEval/LoCoMo/EverMemBench-style tests; add constraint-consistency checks.
- **Phase C (hardening)**: MINJA-style poisoning tests; add memory firewalls + quarantine flows.
- **Phase D (optional indexing layers)**: graph expansions/community summaries as accelerators, not as the source of truth.

This is intentionally conservative: correctness + safety semantics first, fancy indices later.
