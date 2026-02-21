---
title: "<Full paper title>"
author: "<First author> et al."
date: YYYY-MM-DD
type: reference
tags:
  - paper
  - agent-memory
  - long-term-memory
source: "<primary landing page (arXiv abs / publisher DOI)>"
source_alt: "<PDF link>"
version: "<arXiv vN / camera-ready / etc>"
context: "<why we care; what synthesis bucket this supports>"
related:
  - "../ANALYSIS-<paper-analysis-file>.md"
files:
  - "papers/<paper-id>.pdf"
  - "papers/<paper-id>.md  # optional extracted text snapshot"
---

# <Paper title>

## TL;DR (3–8 bullets)

- What it is:
- What it adds:
- Why it matters for agent memory:
- Key reported results (if any):
- Biggest caveat / assumption:

## What’s novel / different

- (Novel mechanism / decomposition / benchmark / threat model / etc)

## System / method overview (mechanism-first)

### Memory types and primitives

- Memory types:
- Operations:
- Data model:

### Write path / Read path / Maintenance

- Write path:
- Read path:
- Maintenance:

## Evaluation (as reported)

- Benchmarks/datasets:
- Metrics:
- Baselines:
- Key results:

## Implementation details worth stealing

- Storage/index choices:
- Budgeting (token/latency):
- Retrieval/reading pipeline details:
- Consolidation/TTL/versioning:

## Open questions / risks / missing details

- (What would block implementation in shisad?)
- (What’s underspecified?)
- (Safety/security gaps?)

## Notes

- Paper version reviewed:
- Code availability:
