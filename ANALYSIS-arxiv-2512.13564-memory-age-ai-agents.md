---
title: "Analysis — Memory in the Age of AI Agents Survey (Hu et al., 2026)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2512.13564"
paper_title: "Memory in the Age of AI Agents: A Survey — Forms, Functions and Dynamics"
source:
  - references/hu-memory-age-ai-agents.md
  - references/papers/arxiv-2512.13564.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md
---

# Analysis — Memory in the Age of AI Agents Survey (Hu et al., 2026)

This survey is valuable because it tries to “unstick” the field from overloaded/ambiguous terminology by proposing a unifying framework:

**Forms ↔ Functions ↔ Dynamics**

That triangle maps cleanly onto builder decisions:
- what representations exist,
- what kinds of memory you’re trying to support,
- and how memory changes over time (formation, retrieval, evolution).

## TL;DR

- **Contribution type**: comprehensive 2026 survey + taxonomy + resource compilation.
- **Key move**: explicitly distinguish *agent memory* from “LLM memory”, RAG, and context engineering.
- **Forms** (representations): token-level, parametric, latent memory.
- **Functions** (roles): factual, experiential, working memory (finer than long/short-term).
- **Dynamics**: how memories are formed, retrieved, updated, consolidated, and shared over time.
- **Forward-looking frontiers**: automation-oriented memory design, RL integration, multimodal memory, shared memory for multi-agent systems, and trustworthiness.
- **Most reusable takeaway for shisad**: use this taxonomy as the organizing frame for v0.7 memory overhaul planning and to ensure coverage of “dynamic” primitives (corrections, consolidation schedules, trust).

## Stage 1 — Descriptive (what the survey proposes)

### 1.1 Clarifying scope: agent memory vs adjacent concepts

The survey emphasizes that “agent memory” is not synonymous with:
- **RAG** (retrieving external documents to answer a query),
- “LLM memory” (model-internal behaviors/weights),
- or generic **context engineering** (prompt packing heuristics).

Agent memory is framed as a system capability that supports long-horizon reasoning, adaptation, and interaction with environments.

### 1.2 Forms: token / parametric / latent

The “forms” axis separates memory by where and how it is represented:
- **Token-level**: explicit textual artifacts (notes, logs, tool traces, KVs) that can be retrieved/compiled.
- **Parametric**: stored in weights (learned memory).
- **Latent**: stored as hidden states / embeddings / memory tokens (cf. latent-memory papers like MemoryLLM/M+).

This is useful because it forces builders to talk about auditability and correction semantics: token-level is inspectable, parametric/latent is not.

### 1.3 Functions: factual / experiential / working

The survey argues “long vs short-term” is not enough and proposes function-based categories:
- **Factual memory**: stable facts/knowledge (semantic).
- **Experiential memory**: trajectories, episodes, procedures/skills (how-to).
- **Working memory**: transient state used for immediate reasoning/planning.

This aligns well with what we see in systems papers:
- LoCoMo/LongMemEval stress factual + episodic,
- ReMe/Live‑Evo stress experiential/procedural,
- GAM/RLMs stress working-memory/compilation.

### 1.4 Dynamics: formation, evolution, retrieval

The dynamics lens emphasizes:
- memory write/extraction,
- retrieval policies,
- evolution via consolidation/reflection/pruning,
- and multi-agent shared memory considerations.

This is where many production systems fail: they build retrieval, but under-specify evolution/corrections/governance.

## Stage 2 — Builder critique (what this suggests we should do)

### 2.1 Taxonomy → primitives

The survey’s framing implies a memory system must have:
- explicit separation of memory tiers by function (facts vs experiences vs working state),
- explicit evolution mechanisms (merge/prune/version),
- trustworthiness/poisoning posture.

### 2.2 Trustworthiness as first-class

By highlighting “trustworthiness issues” as a frontier, the survey implicitly supports what attack papers show (MINJA, poisoning): memory write-path is a security boundary.

## Stage 3 — Mapping to shisad (`PLAN-longterm-memory.md`)

Using this survey as an organizing frame, shisad’s roadmap can be made more explicit:

1. **Forms**
   - define canonical token-level evidence store + derived notes + (optional) latent accelerators.
2. **Functions**
   - implement separate tiers:
     - factual/semantic notes (user facts/preferences/profile),
     - experiential/procedural experiences (skills, workflows, tool recipes),
     - working state (task scratchpads; ephemeral).
3. **Dynamics**
   - implement explicit evolution:
     - versioned corrections (supersedes/invalidate),
     - consolidation schedules (session/day/week/profile),
     - pruning with audit,
     - multi-agent sharing with scoping and access control.

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2026-01-13)

