---
title: "Evaluating Very Long-Term Conversational Memory of LLM Agents (LoCoMo)"
author: "Adyasha Maharana et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - dataset
  - long-term-memory
  - conversational-memory
  - multimodal
  - rag
source: https://arxiv.org/abs/2402.17753
source_alt: https://arxiv.org/pdf/2402.17753.pdf
version: "arXiv v1 (2024-02-27)"
related:
  - ../ANALYSIS-arxiv-2402.17753-locomo.md
files:
  - ./papers/arxiv-2402.17753.pdf
  - ./papers/arxiv-2402.17753.md
---

# Evaluating Very Long-Term Conversational Memory of LLM Agents (LoCoMo)

## TL;DR

- Introduces **LoCoMo**, a dataset and evaluation benchmark for **very long-term** multi-session conversations: ~**300 turns** / ~**9K tokens** per conversation on average, spanning up to **35 sessions**, with **multimodal** image sharing.  
- Data is built via a **machine→human** pipeline: LLM agent conversations are grounded on **personas** and **temporal event graphs**, then **human annotators verify/edit** for long-range consistency and grounding.  
- Proposes three evaluation tasks: **question answering**, **event graph summarization**, and **multimodal dialogue generation**.  
- Reported results: long-context LLMs and RAG-style strategies help in some settings, but overall performance remains far below humans (and long-context models can still degrade on certain failure modes).

## What’s novel / different

1. **“Very long” dialogue scale**: far beyond typical 1–5 session long-term dialogue benchmarks.
2. **Temporal event graphs as ground truth structure**: makes “episodic memory” more concrete than daily logs.
3. **Multimodal behavior**: agents can share/react to images, closer to real chat usage.
4. **Human verification pass**: the pipeline explicitly tries to fix the “LLM dialogue drift” problem for long-range consistency.

## Dataset construction (high level)

- Create two agent personas and a **timeline of causally linked events** (event graph) per dialogue.
- Generate multi-session conversations with LLM agents that:
  - “reflect & respond” based on dialogue history
  - share images and react to images
- Human annotators:
  - fix long-range inconsistencies
  - remove irrelevant images
  - verify grounding to the event graph

## Evaluation tasks (as proposed)

1. **Question Answering**
   - Questions categorized into reasoning types (e.g., single-hop, multi-hop, temporal, open-domain/world knowledge, adversarial).
   - Reported metric: answer prediction F1 (and retrieval recall metrics for RAG variants).
2. **Event Summarization**
   - Summarize the event graph over the long dialogue; uses factuality-oriented scoring (FactScore-based adaptation).
3. **Multimodal Dialogue Generation**
   - Train/evaluate a multimodal model (MiniGPT-5 variants) with different context augmentation strategies (e.g., summary vs “observations” retrieved from history).

## Notes / open questions (builder lens)

- **Scale vs diversity**: LoCoMo is long, but the dataset size is relatively small (50 conversations), so generalization and overfitting risk matter.
- **Synthetic pipeline bias**: even with human editing, the agent-generated conversation style may differ from real users (noise, topic shifts, adversarial content, tool outputs).
- **RAG pitfalls**: the paper highlights that inaccurate retrieval can *hurt* (wrong context can mislead the model), which is directly relevant to safety-minded memory systems.
