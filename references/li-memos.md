---
title: "MemOS: A Memory OS for AI System"
author: "Zhiyu Li et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - system
  - memory-os
  - agent-memory
  - scheduling
  - provenance
  - versioning
  - lifecycle
  - activation-memory
  - parameter-memory
  - plaintext-memory
source: https://arxiv.org/abs/2507.03724
source_alt: https://arxiv.org/pdf/2507.03724.pdf
version: "arXiv v4 (2025-12-03)"
context: "A systems-style proposal treating memory as a first-class schedulable resource (MemCube + lifecycle + governance + migration), with strong emphasis on provenance/versioning and multiple memory substrates; useful to map shisad primitives to a more ‘OS-like’ control plane."
related:
  - ../ANALYSIS-arxiv-2507.03724-memos.md
files:
  - ./papers/arxiv-2507.03724.pdf
  - ./papers/arxiv-2507.03724.md
---

# MemOS: A Memory OS for AI System

## TL;DR

- Proposes **MemOS**, a “memory operating system” for AI that treats memory as a managed system resource with scheduling, lifecycle control, and governance.
- Unifies three substrates:
  - **Plaintext memory** (explicit knowledge fragments),
  - **Activation memory** (KV-cache / activation steering),
  - **Parameter memory** (weights or lightweight deltas like LoRA).
- Introduces **MemCube** as the minimal unit: payload + rich metadata (provenance, version chain, ACL/TTL, usage indicators).
- Provides a 3-layer architecture:
  - **Interface** (MemReader + Memory APIs + pipelines),
  - **Operation** (MemOperator, MemScheduler, MemLifecycle),
  - **Infrastructure** (MemGovernance, MemVault, MemStore, MemLoader/Dumper).
- Reports strong end-to-end benchmark results vs several baselines on LoCoMo, LongMemEval, PreFEval, and PersonaMem (as reported), plus API latency robustness and KV-cache acceleration experiments.

## What’s novel / different

- Makes “memory” explicit as an OS-style control plane: **versioning, permissions, logging, migration, and scheduling** are part of the core abstraction.
- Treats cross-format transformation as first-class:
  - plaintext ↔ activation ↔ parameter as consolidation pathways (cache, distill, offload, backpatch).
- MemCube metadata is designed to support:
  - identification (“semantic fingerprint”),
  - governance (ACL/TTL/sensitivity),
  - behavior-driven evolution (hot/cold, promotion/demotion).

## Architecture (mechanism-first)

### Memory types

- **Plaintext memory**: explicit stored fragments (docs, facts, preferences, templates).
- **Activation memory**: inference-coupled state (KV-cache segments; steering vectors / templates).
- **Parameter memory**: knowledge/capability encoded in weights; can be modularized via adapters/LoRA.

### MemCube (payload + metadata)

MemCube is the universal unit scheduled by MemOS. It has:
- **Payload**:
  - explicit text,
  - activation tensors (with injection layer),
  - parameter deltas (e.g., LoRA patch + module path).
- **Metadata** (three groups):
  - descriptive identifiers (timestamps, origin signature, semantic type),
  - governance attributes (ACL, TTL, priority, compliance/traceability tags),
  - behavioral usage indicators (frequency/recency; contextual fingerprints; version chains).

### Three-layer system

- **Interface layer**:
  - MemReader parses prompts into structured MemoryCalls (intent, time window, scope).
  - Memory APIs: provenance, update (append/merge/overwrite; version-aware), log query.
  - Pipeline composition: retrieve → augment → update → archive with rollback support.
- **Operation layer**:
  - MemOperator organizes memory (tags, graphs, indexes).
  - MemScheduler chooses memory types and injection paths and orders calls for latency/relevance.
  - MemLifecycle manages state transitions: create → activate → expire → reclaim.
- **Infrastructure layer**:
  - MemGovernance enforces ACL/TTL/redaction/watermarking/audit logs.
  - MemVault manages multiple repositories; MemStore enables publish/subscribe sharing.
  - MemLoader/Dumper support migration and cross-platform synchronization.

## Evaluation (as reported)

End-to-end benchmarks (GPT-4o-mini backbone used for parity in reported tables):
- **LoCoMo**: MemOS-1031 reports highest overall LLM-judge score (Overall 75.80) with ~1589 context tokens.
- **LongMemEval**: MemOS-1031 reports best overall (77.8) with ~1.4k context tokens.
- **PreFEval**: MemOS reports best personalized response rate and low “preference unaware” error in 0-turn and 10-turn-noise settings.
- **PersonaMem**: MemOS reports best precision (61.2% in a 1-in-4 selection format).

Systems metrics:
- Network API robustness on LoCoMo under QPS pressure (Table 7): MemOS reports low latency and 100% success up to 100 QPS.
- KV-based injection experiments: KV-cache memory injection reduces TTFT vs prompt-prepending (as reported).

## Implementation details worth stealing

- MemCube as a standardized memory object with provenance, TTL/ACL, usage metrics, and version chains.
- Policy-aware scheduling + lifecycle state machines for memory units.
- Treat “activation memory” as a compiled/cached form of frequently used plaintext memory (performance knob).
- Explicit logging and LogQuery interfaces for auditing/debugging memory behavior.

## Open questions / risks

- Complexity: MemOS is a large control plane; implementing all pieces may be heavy for smaller agents.
- Safety: activation/parameter memory manipulation increases risk surface; needs strong policy isolation and auditing.
- Evaluation comparability: vendor baselines and tuning choices can dominate; results should be treated as reported until independently reproduced.
- Practical semantics: how version chains resolve conflicts and how “knowledge update” correctness is guaranteed needs close scrutiny beyond headline scores.

## Notes

- Paper version reviewed: arXiv v4 (2025-12-03).
- Project links (as stated): `https://memos.openmem.net/` and `https://github.com/MemTensor/MemOS` (not validated here).
