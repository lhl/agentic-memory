# Supermemory — Vendor Snapshot

**Source:** https://github.com/supermemoryai/supermemory
**Commit:** `38282a37d68e6dc9827f5734d5b8603067b7f480`
**Date:** 2026-03-28
**License:** MIT

## What's Here

This is a **lean subset** of the supermemory monorepo, containing only files
with research value for memory architecture analysis. The full repo is a Turbo
monorepo with apps (web, MCP, browser extension, docs) and shared packages.

**Critical note:** The open-source repo is primarily a **frontend UI + SDK
client** for the proprietary hosted backend at `api.supermemory.ai`. Core memory
engine logic (versioning, relationship traversal, forgetting, search, document
processing) is **not** in this open-source code. The research value here is in
the **data model schemas** and **architecture documentation** (which describe
the claimed design of the proprietary backend).

### Files included

```
vendor/supermemory/
├── README.md                                         ← this file
├── LICENSE                                           ← MIT
├── packages/
│   ├── validation/
│   │   ├── schemas.ts                               ← Core data model (MemoryEntry, Document, Chunk, Space)
│   │   └── api.ts                                   ← API request/response schemas (v3/v4)
│   ├── lib/
│   │   ├── similarity.ts                            ← Client-side cosine similarity (visualization only)
│   │   └── api.ts                                   ← API route definitions → hosted backend
│   └── tools/src/shared/
│       └── memory-client.ts                         ← SDK client (calls /v4/profile)
├── skills/supermemory/references/
│   └── architecture.md                              ← Claimed architecture (living knowledge graph)
└── apps/mcp/src/
    └── server.ts                                    ← MCP server (memory/recall/whoAmI tools)
```

### What's NOT included (and why)

- `apps/web/` — Next.js consumer UI; no memory logic
- `apps/browser-extension/` — WXT extension; API client only
- `apps/docs/` — Mintlify docs site
- `packages/ui/`, `packages/hooks/` — React components
- `packages/ai-sdk/` — Vercel AI SDK wrapper (thin)
- All test files, configs, CI artifacts
