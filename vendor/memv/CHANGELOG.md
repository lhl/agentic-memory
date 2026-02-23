# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-10

### Added

- Initial release
- `Memory` class — high-level API for structured, temporal memory
- Predict-calibrate knowledge extraction (importance from prediction error)
- Bi-temporal validity model for knowledge
- Hybrid retrieval with Reciprocal Rank Fusion (vector + BM25)
- Episode segmentation via LLM-based boundary detection
- Episode merging for redundancy reduction
- SQLite storage with sqlite-vec for vector search and FTS5 for text search
- OpenAI embedding adapter
- PydanticAI multi-provider LLM adapter
- Framework integration examples (PydanticAI, LangGraph, LlamaIndex, CrewAI, AutoGen)
- MkDocs documentation site with Material theme
