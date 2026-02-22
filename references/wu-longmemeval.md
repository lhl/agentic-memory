---
title: "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory"
author: "Di Wu et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - benchmark
  - evaluation
  - long-term-memory
  - conversational-memory
  - indexing-retrieval-reading
source: https://arxiv.org/abs/2410.10813
source_alt: https://arxiv.org/pdf/2410.10813.pdf
version: "arXiv v2 (2025-03-04); published as ICLR 2025"
related:
  - ../ANALYSIS-arxiv-2410.10813-longmemeval.md
files:
  - ./papers/arxiv-2410.10813.pdf
  - ./papers/arxiv-2410.10813.md
---

# LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory

## TL;DR

- Introduces **LongMemEval**, a benchmark for **long-term interactive memory** in chat assistants, with **500 curated questions** embedded into **freely scalable multi-session** user–assistant histories.  
- Defines **five memory abilities**: information extraction, multi-session reasoning, knowledge updates, temporal reasoning, and abstention.  
- Reports that commercial chat assistants and long-context LLMs show a substantial **accuracy drop** when memorizing information across sustained interactions (as reported by the authors).  
- Proposes a practical decomposition of “memory systems” into **indexing → retrieval → reading** (and gives a more formal view as a **key–value datastore** + functions for indexing/querying/scoring/reading).  
- Presents engineering-oriented optimizations: **value granularity/session decomposition**, **key expansion** (augment keys with extracted facts / summaries / keyphrases), and **time-aware indexing/query expansion** for temporal queries.

## What’s novel / different

1. **Benchmark realism for assistants**: the task framing is explicitly “assistant with memory”, not just a long-context reading exam.
2. **Ability coverage**: knowledge updates + abstention are treated as first-class memory abilities (not just recall).
3. **Scalable history construction**: histories are assembled at test time so the overall length can be scaled to stress systems.
4. **Pipeline decomposition**: indexing/retrieval/reading is framed as the *unit of optimization* (not “pick a vector DB”).

## Benchmark design (mechanism-first)

### Problem formulation

Each instance is described as a tuple `(S, q, t_q, a)`:
- `S`: a sequence of timestamped chat sessions, provided sequentially at test time
- `q`: user question asked after the history
- `t_q`: question date (after the latest session timestamp)
- `a`: short answer phrase or a rubric (for open-ended questions)

### Five core memory abilities

- **Information Extraction (IE)**: recall specific information mentioned by user or assistant.
- **Multi-Session Reasoning (MR)**: aggregate/compare across multiple sessions.
- **Knowledge Updates (KU)**: detect changes in user information and update memory over time.
- **Temporal Reasoning (TR)**: use timestamps and explicit time mentions correctly.
- **Abstention (ABS)**: recognize unknowns (not in history) and answer “I don’t know”.

### Data curation pipeline (high level)

- Define an ontology of user attributes; generate attribute-focused background paragraphs.
- Generate candidate Q/A pairs with an LLM, then **human experts rewrite and filter** questions for depth/diversity.
- Decompose answers into one or more **evidence statements** (optionally timestamped).
- Construct “evidence sessions” via **LLM self-chat** (task-oriented) where evidence is revealed indirectly; then manually screen/edit and annotate evidence positions.
- Assemble full histories at test time (length is configurable).

## Unified framework (indexing → retrieval → reading)

The paper treats long-term memory as an end-to-end pipeline:
- **Indexing**: convert sessions into stored units (key–value tuples) at some value granularity (session vs round).
- **Retrieval**: rank stored units for a query using a retriever/scoring function.
- **Reading**: combine a bounded retrieved set with the model to produce the answer (the “reading” stage is where long-context weaknesses show up).

The appendix also provides a formal view: memory as a heterogeneous **key–value datastore** with functions for indexing, query formulation, salience scoring, and reading.

## Evaluation notes (as reported)

- Includes a **human study** on commercial “memory chatbots” (ChatGPT, Coze) with multi-session histories, showing strong single-session behavior but large drops on cross-session reasoning/updating and temporal reasoning.
- Includes ablations over retrievers (e.g., BM25 vs dense retrievers) and key-expansion strategies.

## Open questions / risks / missing details (builder lens)

- The benchmark relies heavily on **synthetic + human-edited** histories; how well this transfers to real, messy user interactions is an open question.
- Results can hide which stage is the bottleneck unless systems report stage-wise metrics (indexing quality vs retrieval quality vs reading/answering).
- For safety-focused agents (e.g., shisad), the benchmark does not model adversarial memory poisoning; it should be paired with explicit threat-model testing.
