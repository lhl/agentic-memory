---
title: "Memory Injection Attacks on LLM Agents via Query-Only Interaction"
author: "Shen Dong et al."
date: 2026-02-22
type: reference
tags:
  - paper
  - security
  - agent-memory
  - poisoning
  - prompt-injection
  - long-term-memory
  - demonstrations
source: https://arxiv.org/abs/2503.03704
source_alt: https://arxiv.org/pdf/2503.03704.pdf
version: "arXiv v5 (2026-02-12); NeurIPS 2025"
related:
  - ../ANALYSIS-arxiv-2503.03704-minja.md
files:
  - ./papers/arxiv-2503.03704.pdf
  - ./papers/arxiv-2503.03704.md
---

# Memory Injection Attacks on LLM Agents via Query-Only Interaction (MINJA)

## TL;DR

- Introduces **MINJA**, a practical **memory poisoning** attack that assumes the attacker **cannot directly edit** the memory bank.
- Attack surface: agents that store past `(query, reasoning trace / execution record)` and later retrieve similar records as **in-context demonstrations**.
- Mechanism: inject a malicious record whose query looks benign but whose retrieved “demonstration” causes the agent to take **malicious reasoning steps** for future victim queries.
- Key technique: **bridging steps** + an **indication prompt** to induce the agent to generate the malicious record, plus **progressive shortening** to remove the overt indication while preserving the malicious content.
- Reports high injection success rates and meaningful downstream attack success rates across multiple agent types (as reported).

## What’s novel / different

- Threat model is significantly more realistic than “attacker edits the DB”: the attacker only has **query + output observation** access.
- Turns “memory as demonstrations” into a **backdoor-like** channel at inference time, without modifying the base model.
- Explicitly studies how benign-looking queries can still result in stored malicious demonstrations that later get retrieved.

## Attack model (mechanism-first)

### Agent assumption

- Agent generates a reasoning trace `R_q` for each query `q`.
- Memory bank stores past records `(q, R_q)` (or richer execution records).
- For a new query, the agent retrieves `k` similar records and uses them as demonstrations.

### Attacker goal

- For victim queries containing a victim term `v`, cause the agent to generate reasoning steps corresponding to a target term `t` (i.e., “swap entity v→t” in the internal reasoning/execution).

### MINJA method

- **Bridging steps** `b_{v,t}`: early reasoning steps that connect victim term `v` to target term `t` (e.g., “data for A is stored under B”).
- **Indication prompt**: appended to an attack query to get the agent to autonomously generate bridging + target reasoning steps (so they can be stored).
- **Progressive Shortening Strategy (PSS)**: iteratively remove parts of the indication prompt while preserving the malicious response, yielding a final record that looks benign and is retrievable for victim queries.

## Evaluation (as reported)

- Evaluated against multiple agent types (web-shopping ReAct-style, healthcare database agent, and QA agent) and multiple datasets.
- Metrics:
  - **Inject Success Rate (ISR)**: can MINJA inject malicious records?
  - **Attack Success Rate (ASR)**: do victim queries later elicit malicious reasoning steps?
  - **Utility Drop (UD)**: does benign task performance degrade?
- Reports (averaged) **very high ISR** and **substantial ASR** with relatively small UD in many settings (see paper tables).

## Defenses discussed (high level)

- Considers adversarial training (expensive), embedding-space filtering (fails due to entanglement), prompt-level detection (mixed), and system-level mitigations.

## Builder takeaways (shisad relevance)

- “Store reasoning traces and replay them as demonstrations” is a high-risk memory pattern.
- Shared memory across users/tenants is a major amplifier; write-time gates, provenance, and isolation are first-class requirements.
