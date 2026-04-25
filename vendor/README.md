# Vendor Snapshots

Vendored copies of external repositories for research reference. Most are
point-in-time snapshots (not submodules or live checkouts). Exceptions are
noted below.

## Repositories

### memv
- **Source:** https://github.com/vstorm-co/memv
- **Commit:** `36f3a78d9573ee37dd4e069c78f2cd5e899111bd`
- **Date:** 2026-02-23
- **Message:** feat(extraction): atomization for self-contained knowledge (#14)

### clawvault
- **Source:** https://github.com/Versatly/clawvault
- **Commit:** `f6d9be60ecd0d0283da53c8baa1f2de881ec3cab`
- **Date:** 2026-02-20
- **Message:** add $CLAW token address

### mira-OSS (AGPLv3)
- **Source:** https://github.com/taylorsatula/mira-OSS
- **Reviewed commit:** `f8b13b9` (version 2026.03.30-major, "MIRA OS v1 rev 2")
- **Previous review:** `ee44b18` (version 2026.03.07-major, 2026-03-03)
- **Review date:** 2026-03-30
- **License:** AGPLv3
- **Note:** Full-stack event-driven conversational AI with autonomous memory lifecycle (extraction, 3-axis linking, consolidation, activity-day decay), Text-Based LoRA behavioral adaptation, user model synthesis with critic validation, background forage agent (sub-agent collaboration), portrait synthesis, 16 tools, context overflow remediation, immutable domain models, and multi-user PostgreSQL RLS isolation.

### always-on-memory-agent
- **Source:** https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
- **Date:** 2026-03-07
- **License:** Apache 2.0 (GoogleCloudPlatform/generative-ai repo)
- **Note:** Official Google ADK sample agent (Gemini 3.1 Flash-Lite) with always-on daemon pattern: multimodal file watcher + periodic LLM consolidation + HTTP API + Streamlit dashboard. SQLite storage, no vector search. First-party reference implementation for ADK agent orchestration.

### supermemory
- **Source:** https://github.com/supermemoryai/supermemory
- **Commit:** `38282a37d68e6dc9827f5734d5b8603067b7f480`
- **Date:** 2026-03-28
- **License:** MIT
- **Note:** Lean subset (schemas, architecture docs, SDK client, MCP server). Industry memory-as-a-service startup. Open-source repo is frontend/SDK — core memory engine (versioning, relationship traversal, search, forgetting, profile generation) is proprietary backend at `api.supermemory.ai`. Research value is in the data model schemas and architecture documentation.

### widemem-ai
- **Source:** https://github.com/remete618/widemem-ai
- **Commit:** `f2b4e2f211bb47614af2a47f044966925a15f9db`
- **Date:** 2026-04-02
- **License:** Apache 2.0
- **Note:** Python memory SDK (~3.5K LOC) with importance+decay scoring, hierarchical fact→summary→theme tiers, YMYL domain protection, batch conflict resolution, self-supervised extraction data collection, MCP server, and uncertainty-aware retrieval. Added as submodule. Reviewed but not promoted — convergent patterns, no novel architectural mechanisms vs existing ANALYSIS.md coverage.

### karta
- **Source:** https://github.com/rohithzr/karta
- **Reviewed commit:** `c203059425717e0c0844acf8f34242682756e0c1`
- **Review date:** 2026-04-09
- **License:** MIT
- **Note:** Rust (~10.4K LOC) agentic memory library with Zettelkasten-inspired knowledge graph, 7-type dream engine (deduction, induction, abduction, consolidation, contradiction, episode digest, cross-episode digest), embedding-based query classification (6 modes), retroactive context evolution, cross-encoder reranking, multi-hop BFS traversal, atomic fact decomposition, foresight signals. BEAM 100K: 57.7%. Added as submodule. Promoted to standalone analysis.

### memobase
- **Source:** https://github.com/memodb-io/memobase
- **Reviewed commit:** `358c16bbc6d687937d79bc2f984a11c3be8da901`
- **Review date:** 2026-04-25
- **License:** Apache-2.0
- **Note:** User-profile-based memory system (FastAPI + Postgres + Redis + pgvector). Typed user-profile ontology (8 topics / ~40 sub-slots, customizable per project), cold-path batch architecture (buffer until token_size > 1024, then fixed 3-call extraction/merge pipeline — "YOLO merge"), dual profile/event channels (consolidated user profiles + append-only event timeline with pgvector gists). Reproducible LoCoMo artifacts in `docs/experiments/locomo-benchmark/`: overall 75.78, temporal 85.05 (best-in-table, beats Zep 67.71 and Mem0 55.51). Python/TS/Go SDKs + MCP. Added as submodule. **Promoted** to standalone analysis and main ANALYSIS.md matrix.

### cognee
- **Source:** https://github.com/topoteretes/cognee
- **Reviewed commit:** `f4964c31db04bb3f33e79592ee4a27d260667074` (v1.0.3)
- **Review date:** 2026-04-25
- **License:** Apache-2.0
- **Note:** Knowledge-graph-backed memory engine (~138k LOC Python). Multi-backend: Kuzu (default), Neo4j, Neptune for graph; LanceDB (default), Chroma/pgvector/Qdrant/Weaviate/Milvus for vectors; SQLite/Postgres for relational. `remember`/`recall`/`forget`/`improve` verb API. Central novelty: **bidirectional session-graph sync with feedback-weighted consolidation** via `improve()` (apply feedback weights → cognify session Q&A into graph → triplet embeddings → sync graph back to session cache). 13+ search types with rule-based router. `@agent_memory` decorator for agent-runtime integration. Multi-tenant RBAC with shared-dataset permissions. No LoCoMo/LongMemEval; HotpotQA-only evals vs Mem0/Graphiti/LightRAG. Associated paper arXiv:2505.24478 covers only the KG-LLM interface optimization piece. Added as submodule. **Promoted** to standalone analysis and main ANALYSIS.md matrix.

### second-me
- **Source:** https://github.com/mindverse/Second-Me
- **Reviewed commit:** `d0e40251d9de61b3340b8d0d7d83150669f1885a`
- **Review date:** 2026-04-25
- **License:** Apache-2.0
- **Note:** Personal LLM fine-tuning pipeline (~13.8K LOC across L0/L1/L2). **Scope-mismatched** — "memory" lives in LoRA adapter weights, not in a queryable store; updates require 30–60 min re-training. Pipeline: L0 extracts document insights → L1 clusters/synthesizes biography + "shades" → L2 generates synthetic QA training data → LoRA SFT + optional DPO → GGUF → llama.cpp inference. "Hierarchical Memory Modeling" is the training-data pipeline, not a retrieval hierarchy. "Me-Alignment Algorithm" is standard LoRA + DPO (TRL's SFTTrainer/DPOTrainer, r=64 α=16). Only L0 has runtime retrieval (ChromaDB for document-chunk RAG). No agent loop, no tool use, no benchmarks. Associated paper arXiv:2503.08102 "AI-native Memory 2.0". Added as submodule. **Not promoted** — personal-LLM-fine-tuning, not runtime agentic memory. Standalone analysis kept for triage-hygiene.

### openclaw-memory-architecture
- **Source:** https://github.com/coolmanns/openclaw-memory-architecture
- **Commit:** `5a7cb84969e3e34242b3e0e32949882d18ac2966`
- **Date:** 2026-02-20
- **Message:** Merge remote changes + resolve README conflict

### hermes-agent
- **Source:** https://github.com/NousResearch/hermes-agent
- **Reviewed commit:** `cc54818d2671f2e19c31305ef3f7cbc8d0d3294e`
- **Review date:** 2026-04-03
- **Note:** Hermes Agent now exposes a `MemoryProvider` abstraction with seven external provider plugins (Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover). Built-in memory remains minimal; research value is in the adapter/orchestration layer and the in-tree Holographic provider.

### honcho
- **Source:** https://github.com/plastic-labs/honcho
- **Reviewed commit:** `29ff4653e5feadbd129b2fe342d3349e91453bc0`
- **Review date:** 2026-04-03
- **Note:** Open-source memory library + managed service with peers/workspaces/sessions, semantic search, peer cards, and dialectic Q&A. Reviewed via the Hermes provider integration; not promoted.

### mem0
- **Source:** https://github.com/mem0ai/mem0
- **Reviewed commit:** `33d2bc495dba34e671a978bb2ae7e8078e0828fb`
- **Review date:** 2026-04-03
- **Note:** Platform/SDK/CLI memory product. Hermes uses the hosted `MemoryClient` API path only (prefetch/search, background add sync, profile reads). Existing standalone paper analysis was updated rather than creating a new deep dive.

### openviking
- **Source:** https://github.com/volcengine/OpenViking
- **Reviewed commit:** `3d2037aaea6a00c1bc29fe60abfe636078ad2b02`
- **Review date:** 2026-04-03
- **Note:** AGPL context database with filesystem-style hierarchy, L0/L1/L2 context loading, automatic session extraction, and resource ingestion. Not promoted yet, but a plausible candidate for deeper analysis.

### hindsight
- **Source:** https://github.com/vectorize-io/hindsight
- **Reviewed commit:** `906b740dd795aae63cfc2d5e0b78362cd661c622`
- **Review date:** 2026-04-03
- **Note:** Open-source cloud/local/embedded memory system with `retain` / `recall` / `reflect` APIs and knowledge-graph-style retrieval. Existing standalone paper analysis was updated rather than creating a new deep dive.

### byterover-cli
- **Source:** https://github.com/campfirein/byterover-cli
- **Reviewed commit:** `be9c3e7897977e3739a430be97164ee84b72e952`
- **Review date:** 2026-04-03
- **Note:** Local-first coding-agent memory CLI with context tree, cloud sync, MCP, and self-reported benchmark results. Hermes integration shells out to `brv`; not promoted yet, but a plausible candidate for deeper analysis.
