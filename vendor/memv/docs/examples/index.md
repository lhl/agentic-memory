# Examples

All examples are interactive chat agents with persistent memory. They share the same integration pattern:

1. Retrieve relevant context from memory
2. Inject context into the agent/LLM
3. Store the exchange after response
4. Processing triggers automatically in background

## Prerequisites

```bash
export OPENAI_API_KEY=sk-...
```

## Available Examples

| Example | Framework | Run Command |
|---------|-----------|-------------|
| [Quickstart](../getting-started.md#first-example) | None (core API) | `uv run python examples/quickstart.py` |
| [Full Demo](../getting-started.md#first-example) | None (core API) | `uv run python examples/demo.py` |
| [PydanticAI](pydantic-ai.md) | PydanticAI | `uv run python examples/pydantic_ai_agent.py` |
| [LangGraph](langgraph.md) | LangGraph + LangChain | `uv run python examples/langgraph_agent.py` |
| [LlamaIndex](llamaindex.md) | LlamaIndex | `uv run python examples/llamaindex_agent.py` |
| [CrewAI](crewai.md) | CrewAI | `uv run python examples/crewai_agent.py` |
| [AutoGen](autogen.md) | Microsoft AutoGen | `uv run python examples/autogen_agent.py` |

All interactive agents support these commands:

- `quit` — Flush remaining messages and exit
- `flush` — Force-process buffered messages
- `debug` — Show current memory contents
