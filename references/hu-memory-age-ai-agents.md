---
title: "Memory in the Age of AI Agents: A Survey — Forms, Functions and Dynamics"
author: "Yuyang Hu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - survey
  - taxonomy
  - agent-memory
  - forms-functions-dynamics
  - evaluation
  - trustworthiness
source: https://arxiv.org/abs/2512.13564
source_alt: https://arxiv.org/pdf/2512.13564.pdf
version: "arXiv v2 (2026-01-13)"
context: "Comprehensive 2026 survey proposing a ‘Forms–Functions–Dynamics’ taxonomy for agent memory (forms: token/parametric/latent; functions: factual/experiential/working; dynamics: formation/evolution/retrieval). Useful for shisad as the most up-to-date taxonomy and as a checklist for missing primitives (multi-agent shared memory, RL integration, trustworthiness)."
related:
  - ../ANALYSIS-arxiv-2512.13564-memory-age-ai-agents.md
files:
  - ./papers/arxiv-2512.13564.pdf
  - ./papers/arxiv-2512.13564.md
---

# Memory in the Age of AI Agents (Survey)

## TL;DR

- Surveys the rapidly growing agent-memory literature and argues that long/short-term taxonomies are no longer sufficient.
- Distinguishes **agent memory** from adjacent concepts: LLM “memory”, RAG, and context engineering (as described).
- Proposes unified lenses:
  - **Forms**: token-level, parametric, latent memory
  - **Functions**: factual, experiential, working memory
  - **Dynamics**: how memory is formed, evolved, and retrieved over time
- Compiles benchmarks and open-source frameworks, and highlights research frontiers: automation-oriented memory design, RL integration, multimodal memory, shared memory for multi-agent systems, and trustworthiness issues.
- Maintains a paper list repo (as reported): `https://github.com/Shichun-Liu/Agent-Memory-Paper-List`.

## Why it matters for shisad

- Provides the cleanest “design-space map” for identifying missing concepts/primitives and for organizing a v0.7 memory overhaul roadmap around forms/functions/dynamics.

