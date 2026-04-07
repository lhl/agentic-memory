# Multiple issues between README claims and codebase

Source: https://github.com/milla-jovovich/mempalace/issues/27

I've been doing reviews of agentic memory systems and figured I'd flag this since no other system in my survey has had this pattern before where the README claims do not match what's in the code to such a degree.

| README claim | What the code actually does | Severity |
|---|---|---|
| **"Contradiction detection"** — automatically flags inconsistencies against the knowledge graph | `knowledge_graph.py` has **no contradiction detection**. The only dedup is blocking identical open triples (same subject/predicate/object where `valid_to IS NULL`). Conflicting facts (e.g., two different `married_to` values) accumulate silently. | **Feature does not exist** |
| **"30x compression, zero information loss"** — AAAK described as "lossless shorthand" | AAAK is lossy abbreviation: regex entity codes + keyword frequency + 55-char sentence truncation. `decode()` is string splitting — no original text reconstruction. Token counting uses `len(text)//3` heuristic. **LongMemEval drops from 96.6% to 84.2% in AAAK mode** — a 12.4pp quality loss. | **Claim is false** |
| **96.6% LongMemEval R@5** (headline, positioned as MemPalace's score) | Real score, but measured in "raw mode" — uncompressed verbatim text stored in ChromaDB, standard nearest-neighbor retrieval. **The palace structure (wings/rooms/halls) is not involved.** This measures ChromaDB's default embedding model performance, not MemPalace. | **Misleading attribution** |
| **"+34% retrieval boost from palace structure"** | Narrowing search scope from all drawers → wing → wing+room. This is metadata filtering — a standard technique in any vector DB, not a novel retrieval mechanism. | **Misleading framing** |
| **"100% with Haiku rerank"** | Not in the benchmark scripts. Method undocumented and unverifiable from the repo. | **Unverifiable** |
| **"Closets" as compressed summaries** | AAAK produces abbreviations, not summaries. No evidence of a separate closet storage tier distinct from drawers. | **Nomenclature mismatch** |
| **Hall types structurally enforced** | Halls exist as metadata strings but are not used in retrieval ranking or enforced as constraints. | **Conceptual, not functional** |

There's a lot to like conceptually, but between this and the benchmarks (LongMemEval is using raw ChromaDB, which just measures its embeddings, not using the palace structure at all, both AAAK and room-boosting *decrease* the score, ConvoMem is extremely truncated), is... concerning.  

Full analysis for review: https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md

---

**Comment by @akarnokd** (2026-04-07T08:56:32Z):

This is golden!

The substrate has kicked the CCC + CPC into high gear.

_(for reference, I did my own thing too, and this lib's flaws lit up like a black hole accretion disk. Sigma Game ;) https://x.com/akarnokd/status/2041401593338241316 )_

---

**Comment by @psinetron** (2026-04-07T09:06:04Z):

This is the exact kind of reality check the AI community needs right now. Incredible teardown! It's wild how a project can gain thousands of stars purely on hype and 'Readme-Driven Development' while the actual codebase is basically regex and unverified claims. Thanks for saving everyone a ton of time and exposing the actual state of this repository.

---

**Comment by @mattneel** (2026-04-07T09:18:42Z):

I was confused because they say no LLM calls like ChromaDB isn't using embeddings lol

---

**Comment by @akarnokd** (2026-04-07T09:33:15Z):

To be clear, the true underlying concept is a good idea. Adaptive compaction of histories, organized into trees for fast indexed depth-first search and retrieval.

We already have been doing something like this when the context got too long.

Ask the LLM to summarize the thread such that it can seed itself in a fresh new concept.

Use the summary, or just backlink to the prior thread and continue the talk.

Manually laborous but can usually work.

As for the anomaly of not getting 100%.

I suggested on X that the issue is likely either the test being buggy or deliberately broken, or the database is not correctly labelled probabilistically on the triad 

`{ truthfullness, moral goodness, beautifullness }`

. I.e., the most perfect thing would be `{ 1.0; 1.0; 1.0 }` and the most false, wrong and ugly thing would be `{-1.0, -1.0, -1.0}`.

Now this would require relabeling existing databases and I don't know how to practically do it on this scale.

---

**Comment by @dial481** (2026-04-07T09:49:33Z):

Cross-linking #29, which goes into the benchmark methodology side of the same gap you're documenting here. A few overlap points worth noting:

The 96.6% → 84.2% AAAK drop you measured on LongMemEval is a clean refutation of the "30x lossless compression, any LLM reads natively" claim from the launch post. A 12.4pp quality loss on the project's own retrieval metric is not lossless by any definition. #29 raises the same concern from the absence-of-round-trip-eval angle, but your number is stronger because it's measured rather than missing.

Your point about contradiction detection being absent from `knowledge_graph.py` also matters because the launch tweet specifically claims "Contradiction detection catches wrong names, wrong pronouns, wrong ages before you ever see them." If the only dedup is identical-triple blocking, that feature does not exist as described. I missed this in #29 and it should probably be section 9.

Your README-vs-code framing and #29's BENCHMARKS.md-vs-launch-post framing are pointing at the same thing from two angles. The repository's internal documentation is actually unusually honest.

---

**Comment by @akarnokd** (2026-04-07T10:54:14Z):

Interesting. Is this a Reverse Centaur trap? (See Cory Doctorow: Ensh*ttification book).

They deliberately put out wrong things so the kind people of the internet will fix it for them?

Good look, haha, fat chance.

I have no LLM development capability. I'm a gamer.

https://www.youtube.com/watch?v=Y6ljFaKRTrI

---

**Comment by @Ibouseye04** (2026-04-07T11:06:29Z):

> Interesting. Is this a Reverse Centaur trap? (See Cory Doctorow: Ensh*ttification book).
> 
> They deliberately put out wrong things so the kind people of the internet will fix it for them?
> 
> Good look, haha, fat chance.
> 
> I have no LLM development capability. I'm a gamer.
> 
> https://www.youtube.com/watch?v=Y6ljFaKRTrI

this is exactly it. vibe code your idea, post it to x. then have the community of developers drop their own tokens to clean it up. 

---

**Comment by @Fi1osof** (2026-04-07T11:52:44Z):

Hey @lhl, great analysis — really appreciate the depth here. Honest audits like this are rare and valuable.

For reference, you might find it worth looking at our system: https://github.com/haih-net/agent

We've taken a different architectural approach — particularly around the knowledge base layer. A few things that might be relevant to your survey:

KBConcept vs KBFact separation — concepts are knowledge anchors (no truth criteria), facts carry confidence, importance, status (verified/disputed/deprecated), and temporal validity (validFrom/validTo)
Contradiction handling — facts are never overwritten; a new fact is created with full history preserved. No silent accumulation.
Graph relations — KBFactParticipation supports n-ary relations with typed roles across multiple concepts, not just subject/predicate/object triples
Agent-owned KB — the agent autonomously builds and queries its own knowledge base via GraphQL API, not just retrieves from a store
We don't have a public LongMemEval benchmark yet, so no headline numbers to mislead anyone with. But the architecture is honest and the claims match the code.

Would love your take if you do end up reviewing it.

---

**Comment by @skia1337** (2026-04-07T12:17:58Z):

@lhl MVP 🐙 

---

**Comment by @JohnnyWalkerDigital** (2026-04-07T12:47:13Z):

> this is exactly it. vibe code your idea, post it to x. then have the community of developers drop their own tokens to clean it up.

Not just post it to X, but have it connected with a Hollywood actress: https://www.instagram.com/p/DWzNnqwD2Lu/ (if this isn't an AI generated video)

---

**Comment by @GosuDRM** (2026-04-07T13:51:16Z):

GOTTEM

---

**Comment by @AlexChesser** (2026-04-07T14:04:56Z):

I was just starting on the losslessness claim - turns out you've got that covered 😄 thanks. 

It's still a really interesting project, but important to take what it does offer with a realistic lens. There may be some things worth taking away, especially considering those benchmarks if they're replicable, but it's definitely making far bolder claims than the evidence backs up.  

---

**Comment by @lhl** (2026-04-07T14:44:52Z):

> Would love your take if you do end up reviewing it.

Her you go: https://github.com/lhl/agentic-memory/blob/main/REVIEWED.md#2026-04-07--kms-agent-haih-net

Interesting KB design and N-ary facts design but weak on architecture/implementation. Points to some other systems you might want to look at implementing some similar things. I think the problem/solution design space is wide open, so I say keep going, see what works for you, but be aware of what's out there, and, uh try not to be make stuff up or cheat on benchmarks (you're only cheating yourself - how do you know if your system is even working?), etc.

BTW, I have a prior claims checking project I built at the beginning of this year that explores some similar ground in terms of epistemics/analytical rigor that might be of interest: https://github.com/lhl/realitycheck/blob/main/docs/PLAN-analysis-rigor-improvement.md
