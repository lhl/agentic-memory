# Independent benchmark reproduction on M2 Ultra — raw confirms 96.6%, aaak/rooms regress

Source: https://github.com/milla-jovovich/mempalace/issues/39

First, thank you for open-sourcing this and for shipping a reproducible benchmark runner. Being able to clone, install, point at the dataset and run the exact command from BENCHMARKS.md is rare and very appreciated.

We're evaluating MemPalace as a possible memory layer for our local AI stack and for our AI orchestrator [Sandcastle](https://github.com/gizmax/Sandcastle), and ran the canonical benchmark on our hardware. Posting the numbers here in case they're useful for you and for anyone else doing due diligence.

## Setup

- **Hardware:** Mac Studio M2 Ultra, 64 GB unified memory, macOS 25.4
- **Python:** 3.13.12 in a clean venv
- **Install:** `pip install mempalace` → `mempalace 3.0.0`
  (note: `mempalace.__version__` reports `2.0.0` — minor metadata mismatch)
- **Dataset:** `longmemeval_s_cleaned.json` (265 MB, 500 questions, 6 question types) fetched exactly as in BENCHMARKS.md L315–316
- **Embedding:** ChromaDB default `all-MiniLM-L6-v2` (no `--embed-model` flag)
- **Command:** `python benchmarks/longmemeval_bench.py /tmp/longmemeval-data/longmemeval_s_cleaned.json --mode <raw|aaak|rooms>`

## Results — all three modes, full 500 questions

| Mode  | R@1   | R@3   | **R@5**   | R@10  | NDCG@5 | Wall time |
|-------|-------|-------|-----------|-------|--------|-----------|
| raw   | 0.806 | 0.926 | **0.966** | 0.982 | 0.888  | 4:37      |
| aaak  | 0.602 | 0.780 | **0.842** | 0.920 | 0.720  | 4:24      |
| rooms | 0.686 | 0.840 | **0.894** | 0.956 | 0.789  | 4:21      |

### Per-type R@10

| Question type             |   n | aaak  | rooms |
|---------------------------|-----|-------|-------|
| knowledge-update          |  78 | 1.000 | 1.000 |
| multi-session             | 133 | 0.947 | 0.970 |
| single-session-assistant  |  56 | 0.911 | 0.964 |
| single-session-preference |  30 | 0.833 | 0.933 |
| single-session-user       |  70 | 0.786 | 0.914 |
| temporal-reasoning        | 133 | 0.940 | 0.940 |

## How to read these numbers

**The raw 96.6% reproduces exactly** on independent hardware, in under 5 minutes, with zero modifications. That's a clean, reproducible result and credit where it's due.

**All three modes are well above the published session-level R@5 baselines** in the original LongMemEval paper (Wu et al. 2024, Table 9, Appendix E.2):

| System                                       | session R@5 |
|----------------------------------------------|-------------|
| BM25 (paper, on LongMemEval-M)               | 0.683       |
| Stella V5 1.5B (paper, on M)                 | 0.732       |
| Contriever + fact expansion (paper SOTA, M)  | **0.762**   |
| **MemPalace aaak** (this test, on S)         | **0.842**   |
| **MemPalace rooms** (this test, on S)        | **0.894**   |
| **MemPalace raw** (this test, on S)          | **0.966**   |

Two caveats so this isn't oversold: (a) LongMemEval-S is the easier variant (~40 sessions, 115k context) vs the M variant where the paper numbers are measured, so some of the absolute gap is dataset difficulty; (b) most other memory systems (Mem0, Zep, Mastra, Supermemory, Hindsight, Letta) report end-to-end QA accuracy with an LLM judge rather than pure retrieval R@5, so apples-to-apples comparison with them isn't possible from this benchmark alone.

**The interesting internal pattern** is that aaak and rooms both regress vs raw on this benchmark — by 12.4 and 7.2 points respectively. They're not weak modes in absolute terms, but raw is clearly the strongest configuration here, which is surprising given that the README positions AAAK compression and palace structure as the value-add on top of raw.

**One more thing worth flagging:** the `--mode raw` runner builds a fresh `chromadb.EphemeralClient()` per question and never touches the palace, wings, or rooms code paths (`longmemeval_bench.py:97, 209`). So the headline 96.6% is effectively a benchmark of `all-MiniLM-L6-v2` embeddings on this dataset rather than of the palace architecture itself. That's still a valuable result — "verbatim text + good default embeddings is a stronger baseline than people assumed" is a fair and important message — but the README framing that attributes the score to MemPalace's structure is hard to square with what the benchmark code actually does.

## Smaller things we hit

- `mempalace compress --wing X` on ~8.8k drawers ran for >24 CPU minutes with no progress output and we ended up killing it. Possibly related to #19?
- `mempalace wake-up` returned ~810 tokens on our setup, which matches the `cli.py:327` help string ("~600-900 tokens") but not the README's "~170 tokens".
- `mempalace mine --mode convos` classified ~8.8k drawers from real Claude Code `.jsonl` exports into 3 generic rooms (technical / problems / general). For the "+34% via wing+room filtering" story to land, more granular room detection out-of-the-box would help a lot. We saw the suggestion in `room_detector_local.py` to define rooms manually in `mempalace.yaml` — making that the documented default for `--mode convos` would set expectations correctly.

## Asks (only if useful to you)

1. Would you consider adding the aaak and rooms numbers next to the raw 96.6% in BENCHMARKS.md? Right now a reader can only find the headline number and it's easy to assume aaak/rooms are at least as good. Showing all three side by side would actually strengthen the project's credibility — "raw is our strongest mode" is a more honest and more interesting story than "AAAK and palace boost retrieval."
2. Is there a config (entities.json? mempalace.yaml schema?) that would make `--mode rooms` outperform raw on LongMemEval, so we can rerun? If yes, we're happy to test and post follow-up numbers.
3. The README↔help-string discrepancy on wake-up tokens is small but it's the first thing a careful reader will check. Either updating the README to "~600-900" or adding a `--mode minimal` would clear it up.

Thanks again for putting this out in the open and for making it this easy to reproduce. Happy to share our raw `results_*.jsonl` files if they're useful.


---

**Comment by @dial481** (2026-04-07T12:40:32Z):

The headline benchmark numbers don't hold up when you read the repo's own [BENCHMARKS.md.](https://github.com/milla-jovovich/mempalace/blob/main/benchmarks/BENCHMARKS.md) The 100% LoCoMo result runs top_k=50 against conversations with at most 32 sessions (BENCHMARKS.md calls this out directly: "the embedding retrieval step is bypassed entirely"), and the "perfect score on LongMemEval" is a recall_any@5 retrieval metric, not a LongMemEval QA score. No answer generation, no judge.

See #27 and #29 for further details. 

---

**Comment by @gizmax** (2026-04-07T13:32:14Z):

@dial481 thanks for the extra context — both points land hard, and they explain something we noticed but couldn't articulate cleanly in our original post.

Our framing was deliberately scoped to **the retrieval R@5 metric the runner actually computes**, because that's what `longmemeval_bench.py` does end-to-end and it reproduces exactly. We chose not to make claims about how those numbers compare to Mem0 / Zep / Mastra / Hindsight precisely because we couldn't tell from the README whether the comparison in `BENCHMARKS.md` was apples-to-apples — your comment confirms it isn't. The headline table puts a recall_any@5 number next to QA-accuracy-with-LLM-judge numbers from the other systems, which are two very different layers of the stack. That's a real problem that no amount of running benchmarks on our side fixes.

The LoCoMo `top_k=50` bypass is the cleaner finding of the two, in a way — it's literally documented in the project's own `BENCHMARKS.md` as "the embedding retrieval step is bypassed entirely" but framed as a 100% headline. We hadn't run LoCoMo ourselves so we appreciate the pointer to #29.

While we're piling on the disclosures, here are a few other tests we ran on our side that didn't make it into the original post but are relevant context for anyone reading this thread:

## 1. AAAK direct compression test (not via the benchmark runner)

We instantiated `mempalace.dialect.Dialect()` directly and fed it a 221-character / 73-token sample. The README claims "30x lossless compression" and shows examples like:

```
TEAM: PRI(lead) | KAI(backend,3yr) SOR(frontend) MAY(infra) LEO(junior,new)
PROJ: DRIFTWOOD(saas.analytics) | SPRINT: auth.migration→clerk
DECISION: KAI.rec:clerk>auth0(pricing+dx) | ★★★★
```

What `Dialect.compress()` actually returned for our sample:

```
0:JAR+BEZ+NAH|b-a_tom_qwen|"Tom rozhodl ze pouzijeme Qwen3"
```

Three observations:

- **Compression ratio: 3.84x**, not 30x. (`count_tokens` reported 73 → 19.)
- **Lossy**, not lossless. The original sentence contained "Qwen3.5-35B-A3B-4bit", port numbers, references to Devstral and Foresight — **all of that information is gone** in the compressed form. The output is `index : ENTITY_CODES | bigram_token | "truncated_first_55_chars"`. There's no representation that survives the compression for those facts.
- **`decode()` does not roundtrip to the original.** It returns `{'header': {}, 'arc': '', 'zettels': [<the same compressed string>], 'tunnels': []}` — i.e. it just wraps the compressed string in a dict, it does not reconstruct anything. There is no decompression step because there's nothing to decompress to.

This lines up with what @lhl describes in #27 ("regex entity codes + keyword frequency + 55-char sentence truncation, `decode()` is string splitting") and explains *why* `--mode aaak` regresses by 12.4 points vs `--mode raw` on the LongMemEval runner — the compressed representation has materially less semantic content than the original text. The benchmark doesn't lie. It just measures the wrong thing if the goal is "show that the compression is lossless".

## 2. Real-world ingestion test on ~244 MB of Claude Code session exports

Outside the benchmark, we mined 244 MB of real `.jsonl` session files from `~/.claude/projects/-Users-jarvis/` (20 files, the largest in the directory). Numbers:

- **Drawers filed:** 8 786
- **Wall time:** 10 min 36 s (~23 MB/min, ~3.3 cores active)
- **Disk footprint:** 36 MB ChromaDB sqlite (~15 % of source)
- **Built-in `_try_claude_code_jsonl` parser** in `normalize.py` handled the format with zero configuration — credit where it's due, this is genuinely useful out of the box for anyone using Claude Code

The 6/6 manual recall test we ran on this corpus (queries about specific incidents we knew were in the history) all returned the exact passages we were looking for, **including queries written in Czech** against an English embedding model (`all-MiniLM-L6-v2`). A made-up query for a fact that wasn't in the corpus came back with negative similarity scores, so the embeddings degrade gracefully on out-of-distribution input. As a search engine over conversation history, this part of the project is solid.

## 3. Default room detection in `--mode convos` does not match its description

We were curious why our 8 786 drawers landed in just 3 rooms (`technical: 8654`, `problems: 131`, `general: 1`) given that the README sells "room detection" as one of the value-adds. Looking at `mempalace/config.py:14`:

```python
DEFAULT_TOPIC_WINGS = [
    "emotions",
    "consciousness",
    "memory",
    "technical",
    "identity",
    "family",
    "creative",
]
```

These default categories appear to be designed for AI persona / introspective memories, not for software engineering or business workflows, which is consistent with the project's framing around `identity.txt` and the L0/L1 wake-up. That's a legitimate design choice for the intended use case, but it does mean the "+34% retrieval boost from palace structure" claim in the README will not materialise out of the box for users with technical or business conversation corpora — they'd need to customise `mempalace.yaml` first. Worth surfacing more prominently in the docs.

## 4. `mempalace compress --wing X` ran for 24+ CPU minutes on 8 786 drawers without producing any progress output, and we ended up killing it

Possibly related to #19. There's no `--workers` flag and the inner loop in `cli.cmd_compress` is single-threaded over `Dialect.compress()`. For anyone planning to run this on a real-world corpus, this is going to be a problem.

## 5. `mempalace wake-up` returns ~810 tokens, not ~170

The README repeatedly cites "~170 tokens" for the wake-up context, but `cli.py:327` defines the wake-up subcommand with `help="Show L0 + L1 wake-up context (~600-900 tokens)"`. Our actual run produced 3 429 characters / 373 words / ~810 tokens, which matches the help string, not the README. The L0 layer was empty by default (no `~/.mempalace/identity.txt`) and the L1 layer was a flat dump of the first N drawers as raw text — not the AAAK-style summary the README suggests.

---

To be clear about what this all means for our own use case: we still think there's a real product here, just not the one the README is selling. The combination of

- **a one-command ChromaDB ingest pipeline** for Claude Code, ChatGPT, and Slack exports,
- **a working semantic search index** over months or years of conversation history,
- **fully local, MIT-licensed, no API key required**,
- **and a standalone temporal knowledge graph module** (`knowledge_graph.py`) that could be used independently of the rest of the palace machinery,

is genuinely useful, and we're planning to integrate it into our [Sandcastle](https://github.com/gizmax/Sandcastle) orchestrator as a `claude_history_search` MCP tool exactly along those lines. The framing problem is that all of those concrete strengths get buried under the AAAK / palace / contradiction-detection / 100%-leaderboard story, which is the part that doesn't survive contact with the code.

A constructive suggestion if it's useful to anyone reading this: the most compelling thing this project could do right now is **publish a true end-to-end QA accuracy number on LongMemEval-S using an LLM judge** (e.g. GPT-4o or Sonnet as both reader and judge, ideally the same setup the LongMemEval paper uses). That would settle the apples-to-oranges concern with Mem0 / Zep / Mastra in one shot. A retrieval recall@5 number is meaningful internally but it can't be put in the same table as QA accuracy without the disclaimer that @dial481 is rightly pushing for. We'd be happy to run this on our side and post the results back into this thread if there's interest — happy to coordinate so we don't all run the same benchmark in parallel.

Thanks again to both @dial481 and @lhl for taking the time to audit this in public. The project is two days old and getting attention very fast; threads like this are exactly what should happen before adoption gets ahead of the actual capabilities.
