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

### mira-OSS (**git submodule** — AGPLv3)
- **Source:** https://github.com/taylorsatula/mira-OSS
- **Reviewed commit:** `ee44b18` (version 2026.03.07-major)
- **Review date:** 2026-03-03
- **License:** AGPLv3 — included as a **git submodule** (not vendored) to avoid license concerns. Run `git submodule update --init vendor/mira-OSS` to fetch the code for your own analysis.
- **Note:** Full-stack event-driven conversational AI with autonomous memory lifecycle (extraction, linking, consolidation, decay), Text-Based LoRA behavioral adaptation, and multi-user PostgreSQL RLS isolation.

### always-on-memory-agent
- **Source:** https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/agents/always-on-memory-agent
- **Date:** 2026-03-07
- **License:** Apache 2.0 (GoogleCloudPlatform/generative-ai repo)
- **Note:** Official Google ADK sample agent (Gemini 3.1 Flash-Lite) with always-on daemon pattern: multimodal file watcher + periodic LLM consolidation + HTTP API + Streamlit dashboard. SQLite storage, no vector search. First-party reference implementation for ADK agent orchestration.

### openclaw-memory-architecture
- **Source:** https://github.com/coolmanns/openclaw-memory-architecture
- **Commit:** `5a7cb84969e3e34242b3e0e32949882d18ac2966`
- **Date:** 2026-02-20
- **Message:** Merge remote changes + resolve README conflict
