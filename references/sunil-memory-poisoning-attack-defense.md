---
title: "Memory Poisoning Attack and Defense on Memory Based LLM-Agents"
author: "Balachandra Devarangadi Sunil et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - security
  - agent-memory
  - poisoning
  - prompt-injection
  - minja
  - defense
  - trust-scoring
  - sanitization
  - temporal-decay
  - healthcare
source: https://arxiv.org/abs/2601.05504
source_alt: https://arxiv.org/pdf/2601.05504.pdf
version: "arXiv v2 (2026-01-12)"
context: "Empirical follow-up to MINJA focusing on more realistic memory conditions and defense trade-offs, in a high-stakes EHR setting. Useful for shisad’s memory roadmap as a concrete motivation for write-time gating, taint/provenance, audit logs, and retrieval-time trust filtering (with strong caveats)."
related:
  - ../ANALYSIS-arxiv-2601.05504-memory-poisoning-attack-defense.md
  - ../ANALYSIS-arxiv-2503.03704-minja.md
files:
  - ./papers/arxiv-2601.05504.pdf
  - ./papers/arxiv-2601.05504.md
---

# Memory Poisoning Attack and Defense on Memory Based LLM-Agents

## TL;DR

- Studies **memory poisoning** for memory-augmented LLM agents via **query-only interactions**, building on MINJA.
- Focuses on an **Electronic Health Record (EHR) agent** setting using **MIMIC‑III** clinical data and measures:
  - **ISR** (Injection Success Rate): poison accepted into memory,
  - **ASR** (Attack Success Rate): poison actually changes victim behavior.
- Key finding: **realistic pre-existing legitimate memories** can dramatically reduce ASR/ISR compared to “empty memory” settings (as reported).
- Explores robustness along three dimensions:
  - initial memory state,
  - number of indication prompts,
  - retrieval parameter `k` (how many memories are appended as few-shot context).
- Proposes defenses:
  1) **Input/Output moderation** with composite trust scoring (static heuristics + optional LLM checks + code safety),
  2) **Memory sanitization** with trust-aware retrieval (append-time trust scoring + temporal decay + pattern filters).
- Defense evaluation highlights a hard trade-off: systems can become **overly conservative** (store nothing) or **overconfident** (store poisoned entries with perfect trust).

## What’s novel / different

- Tests MINJA-like attacks under more realistic memory conditions (pre-populated “correct” memories) in a high-stakes domain.
- Emphasizes that **ISR ≠ ASR**: many injections may be stored but not retrieved/used; retrieval policy is a major lever.
- Provides an empirical lens on “trust score” defenses and their calibration failure modes.

## System / method overview (mechanism-first)

### Attack surface

- Attacker is a normal user; injects “Knowledge:” style directives (e.g., patient-ID redirection) via benign-looking queries.
- Poison becomes dangerous when retrieved as few-shot context for future victim queries.

### Defense sketches

- **Guard moderation**: input heuristics/keywords + output code-safety and relevance checks → composite trust score → append/reject with audit logs.
- **Memory sanitization**: continuous trust scoring at append time, plus retrieval-time filtering and ranking using (decayed) trust + similarity; pattern-based filters for known poisoning templates.

## Evaluation (as reported)

- Models: GPT‑4o‑mini, Gemini‑2.0‑Flash, Llama‑3.1‑8B‑Instruct (varies by experiment).
- Findings (selected):
  - Empty memory can yield high ASR/ISR (e.g., GPT‑4o‑mini ASR ~62%, ISR 100%).
  - With relevant initial memory, GPT‑4o‑mini ASR drops to ~6.7% and ISR to ~26.7% (Table 1).
  - Increasing retrieved memory count increases ASR (Table 2), showing retrieval aggressiveness amplifies poisoning risk.

## Implementation details worth stealing

- Separate metrics for “stored” vs “harmful” (ISR vs ASR) and treat retrieval policy as a security-critical knob.
- Always keep an **auditable log** for memory append decisions (inputs, trust score, reasons).

## Open questions / risks / missing details

- Trust-score defenses can be brittle: confidence is not safety; needs external verification hooks (immutable ground truth checks) to stop high-confidence poison.
- The work is a project-report style preprint; results should be treated as reported until reproduced in other settings.

## Notes

- Paper version reviewed: arXiv v2 (2026-01-12).
- Code link in paper: `https://github.com/umass-CS690F/proj-group-09` (not validated here).

