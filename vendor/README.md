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

### openclaw-memory-architecture
- **Source:** https://github.com/coolmanns/openclaw-memory-architecture
- **Commit:** `5a7cb84969e3e34242b3e0e32949882d18ac2966`
- **Date:** 2026-02-20
- **Message:** Merge remote changes + resolve README conflict
