<p align="center">
  <img src="docs/assets/banner.png" alt="memv" width="600">
</p>

<h1 align="center">memv</h1>

<p align="center">
  <b>Structured, Temporal Memory for AI Agents</b>
</p>

<p align="center">
  <a href="https://vstorm-co.github.io/memv/">Docs</a> •
  <a href="https://vstorm-co.github.io/memv/getting-started/">Getting Started</a> •
  <a href="https://pypi.org/project/memvee/">PyPI</a>
</p>

<p align="center">
  <a href="https://pypi.org/project/memvee/"><img src="https://img.shields.io/pypi/v/memvee.svg" alt="PyPI version"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.13+-blue.svg" alt="Python 3.13+"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/pydantic/pydantic-ai"><img src="https://img.shields.io/badge/Powered%20by-Pydantic%20AI-E92063?logo=pydantic&logoColor=white" alt="Pydantic AI"></a>
</p>

<p align="center">
  <b>🧠 Predict-Calibrate</b> extraction
  &nbsp;•&nbsp;
  <b>⏱️ Bi-Temporal</b> validity
  &nbsp;•&nbsp;
  <b>🔍 Hybrid</b> retrieval
  &nbsp;•&nbsp;
  <b>📦 SQLite</b> default
</p>

---

## Why memv?

Most memory systems extract everything and hope retrieval sorts it out. memv is different:

| Typical Approach | memv |
|------------------|--------|
| Extract all facts upfront | Extract only what we **failed to predict** |
| Overwrite old facts | **Invalidate** with temporal bounds |
| Retrieve by similarity | **Hybrid** vector + BM25 + RRF |
| Timestamps only | **Bi-temporal**: event time + transaction time |

**Result:** Less noise, better retrieval, accurate history.

---

## Get Started in 60 Seconds

```bash
pip install memvee
```

```python
from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter

memory = Memory(
    db_path="memory.db",
    embedding_client=OpenAIEmbedAdapter(),
    llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
)

async with memory:
    # Store conversation
    await memory.add_exchange(
        user_id="user-123",
        user_message="I just started at Anthropic as a researcher.",
        assistant_message="Congrats! What's your focus area?",
    )
    
    # Extract knowledge
    await memory.process("user-123")
    
    # Retrieve context
    result = await memory.retrieve("What does the user do?", user_id="user-123")
    print(result.to_prompt())
```

**That's it.** Your agent now has:

- ✅ **Episodic memory** — conversations grouped into coherent episodes
- ✅ **Semantic knowledge** — facts extracted via predict-calibrate
- ✅ **Temporal awareness** — knows when facts were true
- ✅ **Hybrid retrieval** — vector + text search with RRF fusion

---

## Features

🧠 **Predict-Calibrate Extraction**
> Only extracts what the model failed to predict. Importance emerges from prediction error, not upfront scoring. Based on [Nemori](https://arxiv.org/abs/2508.03341).

⏱️ **Bi-Temporal Validity**
> Track when facts were true (event time) vs when you learned them (transaction time). Query history at any point in time. Based on [Graphiti](https://github.com/getzep/graphiti).

🔍 **Hybrid Retrieval**
> Combines vector similarity and BM25 text search with Reciprocal Rank Fusion. Configurable weighting.

📝 **Episode Segmentation**
> Automatically groups messages into coherent conversation episodes. Handles interleaved topics.

🔄 **Contradiction Handling**
> New facts automatically invalidate conflicting old facts. Full history preserved.

📅 **Temporal Parsing**
> Relative dates ("last week", "yesterday") resolved to absolute timestamps at extraction time.

⚡ **Async Processing**
> Non-blocking `process_async()` with auto-processing when message threshold is reached.

🗄️ **SQLite Default**
> Zero-config local storage with sqlite-vec for vectors and FTS5 for text search.

---

## Point-in-Time Queries

memv's bi-temporal model lets you query knowledge as it was at any moment:

```python
from datetime import datetime

# What did we know about user's job in January 2024?
result = await memory.retrieve(
    "Where does user work?",
    user_id="user-123",
    at_time=datetime(2024, 1, 1),
)

# Show full history including superseded facts
result = await memory.retrieve(
    "Where does user work?",
    user_id="user-123",
    include_expired=True,
)
```

---

## Architecture

```
Messages (append-only)
    │
    ▼
Episodes (segmented conversations)
    │
    ▼
Knowledge (extracted facts with bi-temporal validity)
    │
    ├── Vector Index (sqlite-vec)
    └── Text Index (FTS5)
```

**Extraction Flow:**
1. Messages buffered until threshold
2. Boundary detection segments into episodes
3. Episode narrative generated
4. Predict what episode should contain (given existing KB)
5. Compare prediction vs actual → extract gaps
6. Store with embeddings + temporal bounds

---

## Framework Integration

memv works with any agent framework:

```python
class MyAgent:
    def __init__(self, memory: Memory):
        self.memory = memory
    
    async def run(self, user_input: str, user_id: str) -> str:
        # 1. Retrieve relevant context
        context = await self.memory.retrieve(user_input, user_id=user_id)
        
        # 2. Generate response with context
        response = await self.llm.generate(
            f"{context.to_prompt()}\n\nUser: {user_input}"
        )
        
        # 3. Store the exchange
        await self.memory.add_exchange(user_id, user_input, response)
        
        return response
```

---

## Documentation

- [Getting Started](https://vstorm-co.github.io/memv/getting-started/) — Installation, setup, first example
- [Core Concepts](https://vstorm-co.github.io/memv/concepts/) — Predict-calibrate, episodes, bi-temporal, retrieval
- [API Reference](https://vstorm-co.github.io/memv/api/) — All public classes and methods

---

## Contributing

```bash
git clone https://github.com/vstorm-co/memv.git
cd memv
make install
make all
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

MIT — see [LICENSE](LICENSE)

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/vstorm-co">vstorm</a></sub>
</p>
