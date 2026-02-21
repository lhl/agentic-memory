---
title: "Analysis — <Paper Short Name> (<FirstAuthorYYYY>)"
date: YYYY-MM-DD
type: analysis
paper:
  id: "arxiv:XXXX.XXXXX"
  title: "<Full paper title>"
  authors:
    - "<Author 1>"
    - "<Author 2>"
  year: YYYY
  venue: "<arXiv / conference / journal>"
  version: "vN (if arXiv)"
links:
  - "<primary landing page (arXiv abs / publisher DOI)>"
  - "<PDF link>"
artifacts:
  pdf: "references/papers/<paper-id>.pdf"
  text: "references/papers/<paper-id>.md  # optional: extracted/converted text snapshot"
source:
  - "references/<paper-reference-summary>.md"
related:
  - "ANALYSIS-academic-industry.md"
  - "/home/lhl/github/shisa-ai/shisad/docs/PLAN-longterm-memory.md"
---

# Analysis — <Paper Short Name> (<FirstAuthorYYYY>)

This document is a **mechanism-first deep dive** on the paper/system. The goal is to extract the **design primitives**, operational semantics, and evaluation setup in a way that is reusable for later synthesis (and for mapping to `shisad`).

Notes on framing:
- Treat quantitative results as **reported** unless we reproduce them.
- We’re less interested in “is the paper right in the universe?” and more in: **what is the system**, **what does it measure**, and **what could we steal (safely)**.
- Use critical analysis mainly to surface **assumptions, missing details, and failure modes** that matter for implementation.

## TL;DR (5–10 bullets)

- **Problem**:
- **Core idea**:
- **Memory types covered** (episodic / semantic / task / procedural / user-model / graph / etc):
- **Key primitives / operations** (ADD/UPDATE/DELETE, consolidate, reflect, replay, etc):
- **Write path** (what gets stored + when):
- **Read path** (retrieval + reading/compilation):
- **Maintenance** (dedup, decay/TTL, consolidation schedule):
- **Evaluation** (benchmarks + main results):
- **Main risks / caveats**:
- **Most reusable takeaway for shisad**:

## Quick facts (for later synthesis)

| Field | Value |
|---|---|
| Paper ID | `arxiv:XXXX.XXXXX` |
| Code / repo | `<url or “unknown”>` |
| Data / benchmarks | `<LoCoMo / LongMemEval / StructMemEval / etc>` |
| Memory ops explicit? | `<yes/no; list ops>` |
| Versioning / corrections | `<yes/no; semantics>` |
| Security stance | `<none / partial / explicit threat model>` |
| Primary contribution type | `<benchmark / system / algorithm / survey / attack>` |

## Stage 1 — Descriptive (what the paper proposes)

### 1.1 Problem statement (in your words)

- What failure mode or limitation does this address?
- What is the *unit of improvement* (accuracy, coherence, token cost, safety, latency, personalization, etc.)?

### 1.2 Core approach (one diagram worth of text)

- Components:
- Control flow:
- What decisions are made by the model vs deterministic code?

### 1.3 Memory taxonomy + data model

Be concrete and operational:
- Memory types (episodic/semantic/task/procedural/identity/etc):
- Data structures (chunks, key-value, graph, tables, “memory units”, latent vectors, etc):
- Metadata (timestamps, scope/tenant, provenance, confidence, risk/taint, TTL, access control):
- Versioning/corrections (append-only? overwrite? supersedes chains? validity intervals?):

### 1.4 Write path (ingestion)

- Inputs (conversation, tool output, docs, web, feedback signal):
- Extraction (LLM prompts? structured models? rules?):
- Gating (human confirmation, classifiers, “instruction-like” rejection, trust scoring):
- Storage (where the “raw” and “sanitized” forms live):

### 1.5 Read path (retrieval → reading/compilation)

Use the LongMemEval decomposition when helpful: **indexing → retrieval → reading**.

- Indexing:
- Retrieval/ranking:
- Reading/compilation step (how retrieved info becomes bounded prompt context):
- Conflict handling (competing memories):
- Budgeting (token caps, per-type caps, latency budgets):

### 1.6 Maintenance / consolidation

- Dedup/merge:
- Decay/TTL:
- Consolidation schedule (per-session/daily/weekly/etc):
- Feedback loops (utility feedback, correction loops, distillation loops):

### 1.7 What the paper explicitly does *not* cover

- Out-of-scope items:
- Known gaps:

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Evaluation setup (as reported)

- Benchmarks/datasets:
- Task types (recall, updating, temporal reasoning, consistency, organization, etc):
- Metrics:
- Baselines:
- Compute / context budgets:

### 2.2 Main results (as reported)

Prefer a small table with numbers + conditions rather than prose.

| Setting | Metric | Result | Notes |
|---|---:|---:|---|
| | | | |

### 2.3 Strengths (why this is credible/useful)

- Mechanism clarity:
- Engineering feasibility:
- Evaluation quality:
- Replicability:

### 2.4 Limitations / open questions (implementation-relevant)

Focus on what a builder needs to know:
- Does it require privileged model behavior (RL fine-tuning, special prompts, special tokens)?
- Does it assume a specific kind of environment (single-user, no adversary, no tool side effects)?
- What parts are underspecified (schemas, thresholds, schedules, ablations)?
- Where are the hidden costs (token overhead, background jobs, data retention)?

### 2.5 Security / trust analysis (only if relevant)

Even if the paper ignores safety, note:
- poisoning surfaces (write-time + retrieval-time)
- instruction/data boundary violations
- cross-tenant leakage risk (if multi-user)
- monitoring/audit gaps

## Stage 3 — Dialectical / Synthesis hooks (how this fits + what we steal)

### 3.1 Comparison to adjacent work

- Closest baselines:
- Key deltas (what’s actually new):
- Where it likely wins/loses:

### 3.2 Mapping to shisad (`PLAN-longterm-memory.md`)

Use this as the concrete reference point:
- What shisad already has (or plans) that matches:
- What this paper adds that shisad is missing:
- What shisad has that this paper ignores (especially safety):
- Suggested roadmap placement (v0.7 milestones; M1–M7 alignment):

### 3.3 Concrete takeaways (actionable)

**Primitives to add**
- (e.g., versioned entries / memory packs / time-aware retrieval / episode objects / etc)

**Tests / eval adapters to add**
- (e.g., LoCoMo-Plus consistency regression, MINJA-style poisoning harness, etc)

**Operational knobs**
- (e.g., token budgets, TTL policies, consolidation schedules)

## Notes / Corrections & Updates

- Capture date:
- Paper version reviewed:
- Any follow-up links (code, blog, errata):
