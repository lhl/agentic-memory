---
title: "Full Agent Memory Build — 31-Piece Memory Stack"
author: "@jumperz"
source: https://x.com/jumperz/status/2024841165774717031
source_alt: https://threadreaderapp.com/thread/2024841165774717031.html
date: 2026-02-20
type: reference
tags: [agent-memory, architecture, prompts, memory-pipeline, knowledge-graph, episodic-memory]
phases:
  core: 10 pieces
  next: 7 pieces
  advanced: 14 pieces
  total: 31 pieces
images:
  - ./1-full-agent-memory-build.jpg
  - ./2-feeds-into.jpg
---

# Full Agent Memory Build — 31-Piece Memory Stack

> this is the entire memory stack if you actually want to take your agent memory to somewhere real. from actually remembering to having an intelligence layer.
>
> 31 pieces total, split into 3 phases: core first, reliability second, then advanced last. you build from core to advanced slowly, and you test each phase before touching the next.
>
> if you try to build all 31 at once, you will break everything and you won't understand anything.

## Overview

| Phase | Pieces | Focus |
|-------|--------|-------|
| **Phase 1 — Core** | 10 | Write pipeline, read pipeline, decay, session flush, behavior loop — minimum for memory that actually works |
| **Phase 2 — Next** | 7 | Crash recovery, audit trail, dedup, conflict resolution, automated maintenance — makes memory durable |
| **Phase 3 — Advanced** | 14 | Trust scoring, cross-agent sharing, knowledge graphs, episode tracking, intelligent retrieval, budget awareness — the ceiling: intelligence |

> phase 1 unstable means phase 3 just amplifies the flaws and if phase 2 is missing means phase 3 is literally optimising pure garbage.

**Legend:**
- **Core** 🔴: build first
- **Next** 🟠: build next
- **Adv** 🔵: advanced

---

# 1. MEMORY STORAGE

## SHORT-TERM

### Checkpoint `Next`
Build a checkpoint module. After every agent turn, serialize `{user_input, tool_calls, llm_output, internal_state}` into a Postgres table keyed by `session_id + turn_number`. Add a `/replay` endpoint that reconstructs state at any turn, and a `/recover` endpoint that resumes from the last saved checkpoint after a crash.

### Working Memory `Core`
Create a single working memory file that the agent overwrites (never appends) with its current task context each turn. Before session ends, flush all contents to long-term storage as Items. On new session start, load an empty working memory. This is scratch space only — nothing survives here.

---

## FILES

### Resources `Next`
Create an append-only Resources table with columns: `id`, `raw_content`, `source_type`, `created_at`, `conversation_id`. Never allow updates or deletes on this table. Add an index on `created_at` for time-range queries. Every downstream extraction must reference back to a `resource_id` — this is the audit trail.

### Items `Core`
Build an extraction pipeline that takes each new message, passes it to an LLM with the prompt: "Extract every atomic fact from this message. One fact per line. No opinions, no filler." Store each as a row: `fact_text`, `confidence` (start 0.7), `created_at`, `source_resource_id`. On confirmation from another source: `confidence += 0.1`. On contradiction: `-0.2`.

### Write Gate `Core`
Before inserting any Item, run three checks: 1) Is this a verifiable fact, not an opinion or filler? 2) Is it specific enough to be useful on its own? 3) Does it conflict with an existing Item that has confidence > 0.7? If conflict → trigger conflict resolution. If vague or opinion → reject and log the rejection reason. Never store raw transcripts.

### Dedup `Next`
Before inserting a new Item, compute cosine similarity against all Items in the same category. If any match scores > 0.85, don't create a new row — instead update the existing Item's text with the fresher wording, bump its confidence by +0.05, and update its timestamp. Log the merge.

### Categories `Core`
Create one markdown summary file per category: `work.md`, `health.md`, `preferences.md`. When a new Item is stored, identify its category, fetch the current summary, then prompt the LLM: "Here is the current summary and a new fact. Rewrite the full summary incorporating the new fact and resolving any contradictions. Output only the updated summary." Save the result. Archive the old version with a timestamp.

### Strength `Adv`
During fact extraction, add a second LLM pass: "For each fact, classify how it was stated: EXPLICIT (directly said), IMPLIED (suggested but not stated), or INFERRED (derived from context)." Set strength: `explicit → 0.9`, `implied → 0.7`, `inferred → 0.5`. Store the strength tag alongside each Item.

### Sentiment `Adv`
During extraction, also tag each fact with emotional context: "Classify the emotional tone when this fact was stated: frustrated, excited, uncertain, neutral." Store the tag. During retrieval, use sentiment as a weight modifier — match the user's current emotional tone to stored sentiment for better contextual relevance.

---

## GRAPH

### Triples `Adv`
Set up a knowledge graph store. For every Item, also extract and store a triple: (subject, predicate, object). Schema: `id`, `subject`, `predicate`, `object`, `confidence`, `status` (active or archived), `created_at`, `archived_at`. Build traversal queries that can walk from any entity to all its connected facts in both directions.

### Conflict Resolution `Next`
Before writing any new fact, query: `SELECT * WHERE subject = X AND predicate = Y AND status = 'active'`. If a match exists, set the old record to `status = 'archived'` with `archived_at = now()`, then insert the new fact with `status = 'active'`. One active truth per subject+predicate pair at all times. Log every transition.

---

## EPISODIC

### Episodes `Adv`
After each conversation, check: were there 3+ related facts, a decision point, or a strong emotional signal? If yes, create an Episode: prompt the LLM with the full conversation and ask: "Summarize this as an experience. Include: summary, participants, emotional tone, key decisions made." Store with links to the source resource_ids.

### Episode Search `Adv`
Embed all episode summaries. On queries like "what happened when I discussed my career?" — run semantic search over episode summaries only. Return the full episode object with all its context. Only fall back to Item-level search if no episode matches above a 0.6 similarity threshold.

---

# 2. MEMORY INTELLIGENCE

## RETRIEVAL

### Rewrite Query `Core`
Before any memory lookup, take the last 5 messages and pass them to the LLM with this exact prompt: **"Given this conversation context, write the single most effective search query to retrieve relevant memories from storage. Output only the query string, nothing else."** Use the rewritten query for all vector and graph searches downstream. Never pass the raw user message to your DB.

### Score Decay `Core`
After retrieving memory candidates, score each one: `final_score = relevance_score × exp(-0.01 × days_since_created)`. This means a 0.8-relevance fact from 3 days ago outranks a 0.95-relevance fact from 200 days ago. Sort by final_score descending. Only pass the top-scoring results forward. Tune the 0.01 decay constant per domain if needed.

### Tiered `Core`
Route every query through two tiers: **Tier 1** — search Category summary files. If the top result has confidence ≥ 0.7 and covers the query → return it, done. **Tier 2** — only if Tier 1 is insufficient, run vector search over raw items. Merge results with source attribution. Log which tier answered to optimize the split over time.

### Inject `Core`
Hard cap at **10 memories per turn**. After scoring, take the top 10 and format each as: **"- [fact_text] (confidence: 0.X, age: Nd, category: work)"**. Inject this block into the system prompt immediately before the user's message. Track which of the 10 the agent actually references in its response — this feeds the echo/fizzle loop later.

### Dual Search `Adv`
On every retrieval, **fire two parallel queries**: vector similarity search on embedded fact text + graph traversal starting from entities in the query. Merge results: deduplicate by entity, compute `final_score = (semantic_score × 0.5) + (graph_proximity_score × 0.5)`. Return the top N unified results to the agent.

---

## DECAY

### Nightly `Next`
Run at 2am: **1)** Find Item pairs with cosine sim > 0.95 → merge into one, keep highest confidence. **2)** Any Item accessed > 3x today → boost retrieval_priority by +0.1. **3)** Scan all Resources from today that have no extracted Items → run the extraction pipeline on them. Log: merged count, promoted count, extracted count.

### Weekly `Next`
Run Sunday 3am: **1)** For every category, re-generate the summary file from scratch using only active items. **2)** All Items with last_accessed > 90 days → set status to archived. **3)** Cluster archived Items by semantic similarity → for each cluster, generate one high-level insight sentence. Log: summaries rebuilt, items archived, insights created.

### Cron Fallback `Next`
Store a `last_run_at` timestamp for every scheduled job (nightly, weekly, monthly). On every agent heartbeat or session start, check: is any job overdue? If yes, **run it inline immediately** before proceeding. Never assume cron executed. This is the difference between "works in dev" and "works in production."

### Monthly `Adv`
Run 1st of month: **1)** Rebuild all vector embeddings using your latest embedding model version — old embeddings drift. **2)** Full re-index of all search indices. **3)** Items with zero access in 6+ months → move to cold archive. **4)** Generate a health report: total active items, staleness distribution, growth trend.

### Domain TTLs `Adv`
Replace the flat 90-day prune with **per-category TTLs**: Work facts → 90d. Preferences → 180d. Health → 365d. Hobbies → 60d. Relationships → 180d. Use these as the prune threshold in your weekly job instead of a single cutoff. Make TTLs configurable per deployment so teams can tune for their domain.

> ↻ Weekly/Monthly rebuilds feed back into Categories + Score Decay. Summaries refresh, embeddings update, stale purges — retrieval compounds automatically.

---

## ADVANCED

### Trust Pass `Adv`
Before returning any memory set to the agent, run a validation pass: **1)** Scan for contradicting facts (same subject, opposing claims) → flag both, surface the higher-confidence one. **2)** Any Item with confidence < 0.3 → tag as [uncertain]. **3)** Items not confirmed by any source in 60+ days → tag [stale]. Attach these trust tags to every result the agent reads.

### Echo/Fizzle `Adv`
After each agent response, evaluate: which of the injected memories were actually referenced or influenced the output? For each used memory: retrieval_priority += 0.1. For each injected but ignored memory: priority -= 0.05. Run this automatically post-response. Over time, useful facts surface faster, noise sinks. This is the compounding moat.

### Memory Agent `Adv`
Create a dedicated `MemoryAgent` class that owns all memory operations: reads, writes, conflict resolution, decay scheduling, index maintenance. The main agent never touches memory directly — it calls `memory_agent.query("topic")` and gets back clean, resolved, trust-scored facts. All memory complexity is abstracted behind this single interface.

### Cross-Agent `Adv`
Build a `SharedMemory` service with REST read/write APIs. Every agent writes its discoveries tagged with `{agent_id, domain}`. Any agent can query across all agents' memories with a domain relevance filter — off-domain results get penalized in scoring. Add write rate limiting (max N writes/min per agent) to prevent flooding.

### Forward `Adv`
Scan every incoming message for temporal signals: explicit dates, "next week", "by Friday", "in 3 months". When detected, auto-create a FutureTrigger record: `{trigger_date, context_summary, memory_ids_to_preload}`. Run a daily check: if any trigger_date ≤ today → inject those memories into the agent's context before the user even sends a message.

---

## OPS

### Session Flush `Core`
Add a hard rule: **at the end of every session, write anything in working memory or pending state to long-term storage.** Run the extraction pipeline on any unprocessed conversation turns. Memory only exists if it's been written down. If the session crashes, the cron fallback catches anything missed on next heartbeat.

### Behavior Loop `Core`
Whenever the user corrects the agent or the agent makes a mistake, **immediately extract the correction as a pattern and write it to a lessons file**: "User prefers X over Y", "Don't do Z in this context". Load the lessons file into context on every session start. This improves agent behavior over time, not just memory retrieval.

### Budget-Aware `Adv`
Track cost-per-retrieval (embedding calls, LLM rewrite calls, DB queries). When running under budget constraints, automatically reduce the inject limit from 10 to 5, skip the Dual Search path, and rely on Tiered retrieval only. Penalize expensive memories that went unused in the echo/fizzle scoring. Log cost-per-turn for optimization.

---

# Component Index by Phase

## Phase 1 — Core (10 pieces) 🔴
1. Working Memory
2. Items
3. Write Gate
4. Categories
5. Rewrite Query
6. Score Decay
7. Tiered
8. Inject
9. Session Flush
10. Behavior Loop

## Phase 2 — Next (7 pieces) 🟠
1. Checkpoint
2. Resources
3. Dedup
4. Conflict Resolution
5. Nightly
6. Weekly
7. Cron Fallback

## Phase 3 — Advanced (14 pieces) 🔵
1. Strength
2. Sentiment
3. Triples
4. Episodes
5. Episode Search
6. Dual Search
7. Monthly
8. Domain TTLs
9. Trust Pass
10. Echo/Fizzle
11. Memory Agent
12. Cross-Agent
13. Forward
14. Budget-Aware
