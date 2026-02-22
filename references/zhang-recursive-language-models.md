---
title: "Recursive Language Models"
author: "Alex L. Zhang et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - architecture
  - long-context
  - inference-time-scaling
  - recursion
  - repl
  - agentic
  - external-environment
source: https://arxiv.org/abs/2512.24601
source_alt: https://arxiv.org/pdf/2512.24601.pdf
version: "arXiv v2 (2026-01-28)"
context: "RLMs treat long prompts as an external environment and use recursive self-calls + code execution to process inputs far beyond the model context window. Useful for agent memory work as an alternative ‘reading/compilation’ paradigm: programmatic access to a large evidence store (prompt/history) with recursion and persistent state, rather than stuffing everything into context."
related:
  - ../ANALYSIS-arxiv-2512.24601-recursive-language-models.md
files:
  - ./papers/arxiv-2512.24601.pdf
  - ./papers/arxiv-2512.24601.md
---

# Recursive Language Models

## TL;DR

- Proposes **Recursive Language Models (RLMs)**: an inference paradigm where the LLM treats the prompt as an **external object** and repeatedly calls itself over programmatically selected snippets, using a persistent environment (REPL) to store intermediate state.
- Key design choice: the root model does **not** ingest the entire prompt; it gets metadata + a symbolic handle to the prompt, forcing it to offload long strings into environment variables and sub-calls.
- Evaluates on long-context tasks (CodeQA, BrowseComp+, OOLONG, OOLONG-Pairs) and reports large gains vs base models and common scaffolds at comparable average cost (Table 1, as reported).
- Trains a small **natively recursive** model (RLM‑Qwen3‑8B) via post-training and reports sizable average improvements vs the base Qwen3‑8B (as reported).

## What’s novel / different

- Treats “long context” as a **computation** problem (recursion + programmatic access) rather than a pure retrieval or summarization problem.
- Makes symbolic recursion and persistent state first-class, closer to an “agent runtime” than a single forward pass.

## Open questions / risks

- Requires executing model-generated code; safety/sandboxing becomes central.
- Cost/runtime can be long-tailed depending on trajectory length.

