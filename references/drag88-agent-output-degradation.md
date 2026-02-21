---
title: "Why Your Agent's Output Gets Worse Over Time (and an Architecture That Fights Back)"
author: "@drag88 (Aswin)"
source: https://x.com/drag88/status/2022551759491862974
date: 2026-02-14
type: reference
tags: [agent-memory, multi-agent, output-quality, enforcement, convergence, content-filtering, learning-loop]
system: Marvy (5 sub-agents on OpenClaw)
repo: https://github.com/Versatly/clawvault
related:
  - coolmanns-openclaw-memory-architecture.md
  - jumperz-agent-memory-stack.md
---

# Why Your Agent's Output Gets Worse Over Time (and an Architecture That Fights Back)

> I run a multi-agent system called Marvy, built on top of OpenClaw. Five sub-agents — Socky, Wisy, Seeky, Coachy, Researchy — each responsible for a different domain, generating content mostly autonomously.
>
> About four weeks in, I noticed something. Every piece of output had started to sound the same. Not "same topic" same. Structurally identical.

**Core problem**: Multiple agents sharing context, learning from each other's outputs, reading each other's logs — they converge toward the blandest common denominator.

---

## Four-Tier Memory Architecture

> Fair warning: this is running at small scale — 17 knowledge entries, 5 agents, ~60 enforcement rules.

### Tier 1: Working Memory
Session context assembled fresh at every session start by a context-assembler script. ~8k tokens of conversation history, recent files, active task state. Ephemeral — lost when session ends.

### Tier 2: Episodic Memory
Daily logs (`memory/daily/*.md`) plus `hourly-summaries.md` regenerated every hour via cron. Every agent writes structured logs; summarization pass compresses into daily digests. Extracted patterns go into `learnings.md`.

### Tier 3: Semantic Memory
Extracted knowledge stored as `knowledge/*.json` — decisions, patterns, gotchas. Indexed by QMD (hybrid BM25 + vector, SQLite). Currently 141 files indexed, 1001 vectors.

Knowledge entry schema:
```json
{
  "id": "uuid",
  "type": "gotcha",
  "memoryType": "lesson",
  "category": "mission-control",
  "title": "Mission Control port fix",
  "description": "Resolved port 3100 conflict - killed stale processes",
  "content": "...",
  "confidence": 0.8,
  "decay_score": 1.0,
  "reinforcement_count": 1,
  "status": "pending",
  "created_at": "2026-02-12T21:57:25",
  "tags": ["correction"],
  "source": { "type": "session_extraction", "timestamp": "..." }
}
```

**memoryType taxonomy** (6 types): decision, lesson, pattern, preference, commitment, relationship

**Knowledge extraction** is automatic via `extract-session-knowledge.py` — watches hourly summaries for signals:
```python
EXTRACTION_PATTERNS = {
    "correction": {
        "patterns": [r"(?i)\b(no,?\s+do\s+it|actually\s+use|should\s+be|wrong|corrected?)"],
        "type": "gotcha", "confidence": 0.8
    },
    "decision": {
        "patterns": [r"(?i)\b(decided\s+to|let'?s\s+go\s+with|going\s+with|chose)"],
        "type": "decision", "confidence": 0.7
    },
}
```

**Vault index** (`knowledge/vault-index.md`) — single scannable manifest with one-line descriptions grouped by type. Agents read this one file first, then load individual entries only when relevant. One file read instead of N. Regenerates every 30 minutes via cron.

### Tier 4: Procedural Memory
Rules and constraints: `RULES.md` (hard constraints), `SHARED-LEARNINGS.md` (cross-agent rules), `banned-patterns.yaml` (enforcement patterns). Loaded at every session start, every agent, no exceptions.

### Search Layer
QMD — hybrid BM25 keyword matching + vector similarity, both on SQLite. No hosted vector DB. Single-digit ms locally. Supports type-filtered queries via `--memory-type` flag that bypasses QMD and reads vault index directly.

---

## Three-Layer Enforcement Pipeline

### Layer 1: YAML Rules (`banned-patterns.yaml`)
Regex rules organized by category: structural patterns, banned phrases, formatting violations. Each rule has name, regex, category, explanation. Rules as data, not code. Started with 15 rules, now over 60 — hasn't manually added one in weeks.

```yaml
twitter:
  - pattern: '\b\w[\w\s]{0,20}:\s+[a-z]'
    description: "Colon setup pattern"
    severity: error
    source: "Socky RULES.md - caught 'harder problem:' violation"
    added: "2026-02-13"
  - pattern: '\b(game[- ]?changer|revolutionary|paradigm shift|delve|tapestry)\b'
    description: "AI vocabulary word"
    severity: error
```

### Layer 2: Two-Gate Pre-Flight Check
- **Gate 1 — Regex scan**: Platform-specific + universal rules from YAML. Fast, deterministic, free. Sub-millisecond.
- **Gate 2 — LLM judge**: Gemini 2.0 Flash (not Claude — cross-model evaluation catches blind spots). 1-2s latency. Checks against RULES.md for violations regex can't catch.

### Layer 3: Learning Loop
When content passes regex but fails LLM judge → gap detected. `learn-pattern.py` takes the judge's feedback, uses Gemini to generalize the violation into a regex rule. Appended to `banned-patterns.yaml`, logged to `rules/learning-history.jsonl`.

**Economic logic**: Every Gemini call costs money, every regex check is free. The learning loop converts expensive LLM calls into free regex checks over time. Early: ~70% needed Gemini gate. Now: ~30%.

---

## Coordination Architecture

- 5 agents, each with own workspace directory, `AGENTS.md`, `RULES.md`, `memory/` folder — complete isolation
- `check-file-routing.py` runs nightly to detect domain files that leaked into wrong workspace
- Marvy orchestrates: owns system-level memory, dispatches tasks, reviews drafts, posts approved content
- Cron-driven (not event-driven) — deliberate choice: simpler to debug, survives restarts without message broker state
- Double pre-flight: once at submission (`submit-draft.py`), once at review (draft-auto-reviewer cron every 5 min)
- Enforcement in three places simultaneously: YAML rules file, cron job configs, shared docs loaded on startup

---

## What Didn't Work

- **Regex-first was backwards**: Should have built LLM judge first. Regex alone → whack-a-mole against infinite vocabulary. LLM catches semantically, then learning loop generates targeted regex from real failures.
- **False positives**: Anti-colon regex caught timestamps, URLs, JSON keys, YAML syntax, code snippets. Burned a weekend on allowlists. Now every rule has optional allowlist field, and learning loop generates allowlists when creating new rules.

## Open Questions

1. **Post-generation filtering vs constrained generation**: ~80% compute on generation, ~20% on filtering. Is that ratio right?
2. **Rule pruning**: Some of 60+ rules probably never fire. No mechanism for identifying dead rules yet. Learning loop only adds, never removes → monotonic growth risk.
3. **Evaluating the evaluator**: Who judges the Gemini judge? Recursive evaluation just pushes the problem back a level.
4. **Convergence pressure**: Even with enforcement + separate workspaces + distinct prompts, agents still drift toward each other's patterns via shared memory.
5. **Memory type boundaries are fuzzy**: Is "we switched from REST to GraphQL" a decision or a lesson?

---

## Core Insight

> Convert expensive runtime checks into cheap static rules over time. The LLM judge catches a violation, the learning loop generalizes it into a regex, and that class of failure never costs another API call. The system gets cheaper and more reliable as it runs.
>
> The question I keep coming back to: what other agent problems can be reformulated this way? Wherever you're paying for repeated LLM judgment on patterns that recur, there's probably a learning loop waiting to be extracted.
