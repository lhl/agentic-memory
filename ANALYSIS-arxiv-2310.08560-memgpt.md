---
title: "Analysis — MemGPT (Packer et al., 2024)"
date: 2026-02-22
type: analysis
paper_id: "arxiv:2310.08560"
paper_title: "MemGPT: Towards LLMs as Operating Systems"
source:
  - references/packer-memgpt.md
  - references/papers/arxiv-2310.08560.pdf
related:
  - ANALYSIS-academic-industry.md
  - /home/lhl/github/shisa-ai/shisad-dev/planning/PLAN-longterm-memory.md
---

# Analysis — MemGPT (Packer et al., 2024)

MemGPT is a foundational “external memory” architecture for LLM agents. It’s useful to study not because it’s the most sophisticated 2026 memory system, but because it introduced a clean **OS paging metaphor** that still underlies many production designs:

- keep a bounded “working set” inside the prompt,
- store everything else outside,
- and let the agent page relevant items back in via tools/function calls.

## TL;DR

- **Problem**: LLM context windows are limited; scaling context is expensive and still suffers from “middle context” failures.
- **Core idea**: “Virtual context management” inspired by OS virtual memory: treat the prompt as RAM and external stores as disk; page content in/out via function calls.
- **Key primitives / operations**:
  - main context partitioning (system instructions / working context / FIFO queue),
  - external stores (recall DB + archival DB),
  - queue manager (append, evict, summarize, write to recall),
  - function executor (LLM outputs interpreted as memory ops),
  - function chaining via a heartbeat flag.
- **Evaluation (as reported)**: multi-session chat tasks + document analysis tasks; shows large gains in “deep memory retrieval” accuracy with MemGPT.
- **Main caveats**: correction/version semantics and safety gates are not the focus; function-call memory is a persistence boundary.
- **Most reusable takeaway for shisad**: implement explicit memory tiers and paging with deterministic tooling, but add versioned corrections, provenance, and policy gates (MemGPT is a strong baseline, not an end state).

## Stage 1 — Descriptive (what MemGPT proposes)

### 1.1 Memory hierarchy: main vs external context

MemGPT defines two primary memory types:

**Main context** (in-prompt; accessible to the LLM during inference)
- **System instructions** (read-only; defines control flow and tool usage)
- **Working context** (read/write; unstructured text, modifiable via functions; used for key facts/preferences/persona)
- **FIFO queue** (rolling message history; includes system messages and function inputs/outputs)
  - the first index stores a recursive summary of evicted messages (as described).

**External context** (out-of-prompt)
- **Recall storage**: a database of messages (conversation history store)
- **Archival storage**: a database for documents (e.g., uploaded texts)

### 1.2 Control flow: events and function chaining

Events trigger inference:
- user messages,
- system messages (e.g., capacity warnings),
- timed events (scheduled tasks; “unprompted” runs),
etc.

The LLM produces function calls; a function executor runs them. “Function chaining” allows multiple tool calls before returning control to the user via a heartbeat flag (as described in Figure 3).

### 1.3 Read/write semantics (practical view)

Write path:
- queue manager writes messages and agent outputs into recall storage,
- the agent may update working context (facts/preferences/persona) via functions.

Read path:
- the agent searches recall/archival stores via functions,
- paginates results to fit token budgets,
- integrates retrieved items into the working set to answer.

## Stage 2 — Evaluative (what it measures, what’s missing, what breaks)

### 2.1 Main results (as reported)

Deep Memory Retrieval (DMR) on multi-session chat (Table 2; as reported):

| Base model | Baseline accuracy | +MemGPT accuracy | Baseline ROUGE‑L | +MemGPT ROUGE‑L |
|---|---:|---:|---:|---:|
| GPT‑3.5 Turbo | 38.7% | 66.9% | 0.394 | 0.629 |
| GPT‑4 | 32.1% | 92.5% | 0.296 | 0.814 |
| GPT‑4 Turbo | 35.3% | 93.4% | 0.359 | 0.827 |

Conversation opener task (Table 3) reports similarity metrics to persona labels and human openers; the paper claims MemGPT can exceed human opener performance under these metrics (as reported).

### 2.2 Strengths

- Clear, implementable tiering and control flow; easy for builders to adapt.
- Treats memory operations as tool calls, enabling a modular system design.
- Explicitly recognizes that “load everything into context” is not enough; you need paging.

### 2.3 Limitations / open questions (builder lens)

- **No explicit correction semantics**: updates are “replace text in working context” style; this loses history and is hard to audit.
- **No scoping/ACL story**: for multi-user or multi-tenant systems, recall/archival stores must be scoped and access-controlled.
- **Security boundary**: function-call memory makes write-time prompt injection persistent unless gated (e.g., don’t let untrusted users write instructions into working context).
- **Derived vs raw**: the working context is a derived summary but can become the de facto “truth”; systems need explicit provenance pointers back to recall/archival evidence.

## Stage 3 — Mapping to shisad (`PLAN-longterm-memory.md`)

MemGPT suggests several concrete shisad primitives and priorities:

1. **Tiered memory is the right default**
   - working context (small, curated),
   - recall/episodic store (lossless logs),
   - archival/document store.
2. **Paging + budgeting as first-class**
   - retrieval must paginate and respect token budgets per tier.
3. **Versioned corrections**
   - replace “working_context.replace” style overwrites with:
     - append-only facts + supersedes chains,
     - invalidation with reasons,
     - and an audit trail (“don’t forget you used to think X”).
4. **Write policy**
   - add gates that prevent:
     - instruction-like content,
     - cross-tenant contamination,
     - and poisoned “demonstrations”.
5. **Maintenance jobs**
   - MemGPT hints at timed events; shisad should make maintenance/consolidation schedules explicit (daily/weekly/profile consolidation).

## Notes / Corrections & Updates

- Capture date: 2026-02-22
- Paper version reviewed: arXiv v2 (2024-02-12)

