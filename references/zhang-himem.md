---
title: "HiMem: Hierarchical Long-Term Memory for LLM Long-Horizon Agents"
author: "Ningning Zhang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - agent-memory
  - hierarchical-memory
  - episodic-memory
  - note-memory
  - segmentation
  - surprise
  - reconsolidation
  - conflict-detection
  - efficiency
  - locomo
source: https://arxiv.org/abs/2601.06377
source_alt: https://arxiv.org/pdf/2601.06377.pdf
version: "arXiv v1 (2026-01-10)"
context: "A cognitive-inspired hierarchical memory split (Episode Memory + Note Memory) with note-first/best-effort retrieval and conflict-aware reconsolidation. Useful for shisad as a concrete ‘event→knowledge’ hierarchy and as a reference for sufficiency checks + memory self-evolution loops."
related:
  - ../ANALYSIS-arxiv-2601.06377-himem.md
files:
  - ./papers/arxiv-2601.06377.pdf
  - ./papers/arxiv-2601.06377.md
---

# HiMem: Hierarchical Long-Term Memory for LLM Long-Horizon Agents

## TL;DR

- Proposes **HiMem**, a hierarchical long-term memory framework for long-horizon dialogue agents with continual updating.
- Two key memory types:
  - **Episode Memory**: cognitively consistent episodes built via **Topic-Aware Event–Surprise Dual-Channel Segmentation**.
  - **Note Memory**: stable “knowledge” notes extracted via a multi-stage pipeline into:
    - facts, preferences, and user profile items.
- Episode and note memories are **semantically linked** to bridge concrete events and abstract knowledge.
- Retrieval supports:
  - **hybrid** (query both layers) and
  - **best-effort** (note-first; fall back to episodes if insufficient),
  balancing accuracy vs efficiency.
- Introduces conflict-aware **Memory Reconsolidation**: detect conflicts in knowledge-oriented notes and revise/supplement using retrieval feedback.
- Reported LoCoMo results (GPT‑4o‑mini backbone):
  - Overall “GPT-Score” **80.71%** vs Mem0 **68.74%** and SeCom **69.03%** (as reported).
  - Hybrid retrieval avg latency ~1.53s with ~1272 tokens recalled; best-effort uses fewer tokens but higher latency (as reported).
- Code is reported available on GitHub.

## What’s novel / different

- Explicit “event→knowledge” hierarchy: store both concrete episodes and abstract stable notes, with structured linkage.
- “Best-effort retrieval” operationalizes a useful product pattern: try cheap abstract memory first, then descend to expensive evidence only if needed.
- Reconsolidation focuses on *knowledge consistency* rather than only add/delete.

## System / method overview (mechanism-first)

### Memory types and primitives

- Episode memory record: episode ID, timestamp, topic, topic summary, metadata, and associated dialogue segment.
- Note memory categories: `K_fact`, `K_pref`, `K_profile`.
- Ops: extract, align/link, retrieve, assess sufficiency, and reconsolidate (add/update/delete notes).

### Write path / Read path / Maintenance

- **Write path**:
  - segment dialogue into episodes using topic shift OR “surprise” discontinuity,
  - extract knowledge notes (facts/preferences/profile) with metadata complement + alignment,
  - link episodes ↔ notes semantically.
- **Read path**:
  - note-first retrieval; if insufficient, retrieve episodes; optionally hybrid query.
  - LLM sufficiency checks guide fallback.
- **Maintenance**:
  - conflict detection triggers reconsolidation for knowledge notes (preferences/profile), enabling self-evolution.

## Evaluation (as reported)

- Benchmark: LoCoMo.
- Metrics: “GPT-Score” (LLM-judge correctness), plus F1; efficiency via latency and token usage.
- Baselines: A‑MEM, SeCom, Mem0.

## Implementation details worth stealing

- Dual-channel segmentation (topic + surprise) to form cognitively coherent episodes.
- Note-first retrieval with explicit “sufficiency” assessment as a control knob.
- Reconsolidation for preference/profile conflicts rather than naive overwrite.

## Open questions / risks / missing details

- Reliance on LLM judges and prompting can mask error modes; F1 often diverges from judge scores.
- Conflict detection/reconsolidation policies need strong audit/versioning to avoid silent drift.
- Security/poisoning is not central; storing procedural or redirect-like notes is risky without write gates.

## Notes

- Paper version reviewed: arXiv v1 (2026-01-10).
- Code link in paper: `https://github.com/jojopdq/HiMem` (not validated here).

