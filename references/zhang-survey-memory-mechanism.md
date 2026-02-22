---
title: "A Survey on the Memory Mechanism of Large Language Model based Agents"
author: "Zeyu Zhang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - survey
  - taxonomy
  - agent-memory
  - evaluation
  - memory-operations
source: https://arxiv.org/abs/2404.13501
source_alt: https://arxiv.org/pdf/2404.13501.pdf
version: "arXiv v1 (2024-04-21)"
context: "A broad survey of memory mechanisms for LLM-based agents: definitions, why memory is needed, how memory modules are designed (sources/forms/ops), how memory is evaluated, and application areas. Useful for shisad as baseline taxonomy and a checklist of memory operations + evaluation approaches, especially when combined with newer benchmark/system papers."
related:
  - ../ANALYSIS-arxiv-2404.13501-survey-memory-mechanism.md
files:
  - ./papers/arxiv-2404.13501.pdf
  - ./papers/arxiv-2404.13501.md
---

# A Survey on the Memory Mechanism of LLM-based Agents

## TL;DR

- Surveys what “memory” means for LLM agents, why it matters, and how it is designed and evaluated.
- Reviews memory along multiple design axes (sources, storage forms, operations) and discusses:
  - **textual vs parametric memory** trade-offs,
  - memory operations (writing/reading/management),
  - evaluation approaches (direct subjective/objective; indirect task-based).
- Covers memory-enhanced agent applications (role-playing/social simulation, assistants, games, code generation, recommendation, domain experts) and future directions (parametric memory, multi-agent, lifelong learning, humanoids).
- Maintains a resource repository (as reported): `https://github.com/nuster1128/LLM_Agent_Memory_Survey`.

## Why it matters for shisad

- Provides a checklist-level taxonomy and highlights that memory is not just storage/retrieval: it includes write policy, management, and evaluation methodology.

