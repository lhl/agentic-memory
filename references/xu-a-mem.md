---
title: "A-Mem: Agentic Memory for LLM Agents"
author: "Wujiang Xu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - zettelkasten
  - note-taking
  - linking
  - memory-evolution
  - locomo
source: https://arxiv.org/abs/2502.12110
source_alt: https://arxiv.org/pdf/2502.12110.pdf
version: "arXiv v11 (2025-10-08)"
context: "A-Mem is a Zettelkasten-inspired, note-based agent memory that dynamically links notes and updates historical note attributes (‘memory evolution’). Useful for shisad as a reference for note primitives, link-generation workflows, and graph-like retrieval, but it raises strong versioning/audit and safety questions (don’t silently rewrite high-influence memories)."
related:
  - ../ANALYSIS-arxiv-2502.12110-a-mem.md
files:
  - ./papers/arxiv-2502.12110.pdf
  - ./papers/arxiv-2502.12110.md
---

# A-Mem: Agentic Memory for LLM Agents

## TL;DR

- Proposes **A‑Mem**, an “agentic memory” system that builds an interconnected memory network from **atomic notes**, inspired by **Zettelkasten**.
- Each stored memory is a note with multiple structured attributes (e.g., timestamp, content, context description, keywords, tags, embedding).
- Two distinctive mechanisms:
  - **Link generation**: retrieve candidate historical notes and use an LLM to decide whether to create links.
  - **Memory evolution**: new memories can trigger updates to contextual representations/attributes of older notes.
- Evaluates on **LoCoMo** and a multi-party long-dialogue QA dataset **DialSim** (as reported), with improvements vs baselines across multiple foundation models.
- Reports substantial token-length reductions vs full-context baselines via selective top‑k retrieval (as reported).
- Code links reported:
  - Benchmark evaluation: `https://github.com/WujiangXu/AgenticMemory`
  - Production system: `https://github.com/WujiangXu/A-mem-sys`

## What’s novel / different

- Treats memory as a **living note graph** that can be reinterpreted as new evidence arrives (memory evolution), not just a static store with fixed ops.
- Uses an LLM decision step for **relationship discovery** between notes (beyond raw embedding similarity).

## System / method overview (mechanism-first)

### Memory types and primitives

- **Note** (atomic memory) with:
  - timestamp,
  - content,
  - contextual description,
  - keywords/tags,
  - embedding.
- **Links** between notes representing meaningful similarity/relationship (LLM-judged).

### Write path / Read path / Maintenance

- **Write path**: construct note attributes from interaction → store → retrieve candidate related notes → decide links → optionally evolve/update historical notes.
- **Read path**: embed query → retrieve top‑k relevant notes (plus linked context) → answer.
- **Maintenance**: memory evolution acts like continual reconsolidation, but needs audit/versioning in real systems.

## Open questions / risks

- “Memory evolution” implies rewriting older notes; without versioned history this is hard to debug and can be unsafe.
- Link generation + evolution are LLM-driven and can hallucinate structure unless constrained/verified.

