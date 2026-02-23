# Agent Memory Examples

## Prerequisites

Set your OpenAI API key:
```bash
export OPENAI_API_KEY=sk-...
```

## Examples

### Quickstart (`quickstart.py`)

Minimal example showing core API - add messages, process, retrieve.

```bash
uv run python examples/quickstart.py
```

### Full Demo (`demo.py`)

Comprehensive demo showing:
- Multiple conversation topics
- Episode segmentation
- Knowledge extraction via predict-calibrate
- Context retrieval for different queries
- How to use retrieved context in LLM prompts

```bash
uv run python examples/demo.py
```

### Agent Integration (`agent_integration.py`)

Interactive chat agent with long-term memory using raw OpenAI client.

```bash
uv run python examples/agent_integration.py
```

Commands: `quit`, `flush`, `debug`

### PydanticAI Agent (`pydantic_ai_agent.py`)

Shows how to integrate memv into a PydanticAI agent. Demonstrates the idiomatic pattern:

1. Retrieve context from memory before agent runs
2. Inject context via PydanticAI dependency system
3. Store exchange after response
4. Auto-processing in background

```bash
uv run python examples/pydantic_ai_agent.py
```

Commands: `quit`, `flush`, `debug`

### LangGraph Agent (`langgraph_agent.py`)

Integrates memv into a LangGraph `StateGraph`. Retrieves context, injects it as a system message in the graph state, and invokes the compiled graph.

```bash
uv run python examples/langgraph_agent.py
```

Requires: `pip install langgraph langchain-openai`

Commands: `quit`, `flush`, `debug`

### LlamaIndex Agent (`llamaindex_agent.py`)

Integrates memv into a LlamaIndex `SimpleChatEngine`. Retrieves context and passes it as a system prompt prefix.

```bash
uv run python examples/llamaindex_agent.py
```

Requires: `pip install llama-index llama-index-llms-openai`

Commands: `quit`, `flush`, `debug`

### CrewAI Agent (`crewai_agent.py`)

Integrates memv into a CrewAI agent. Retrieves context and injects it into the agent's backstory before each task.

```bash
uv run python examples/crewai_agent.py
```

Requires: `pip install crewai`

Commands: `quit`, `flush`, `debug`

### AutoGen Agent (`autogen_agent.py`)

Integrates memv into a Microsoft AutoGen `AssistantAgent`. Retrieves context and injects it into the agent's system message.

```bash
uv run python examples/autogen_agent.py
```

Requires: `pip install autogen-agentchat autogen-ext[openai]`

Commands: `quit`, `flush`, `debug`

## Core Concepts

### Memory Flow

```
User messages → add_exchange() → Message buffer
                                      ↓
                               process()
                                      ↓
                    Episode segmentation (BoundaryDetector)
                                      ↓
                    Episode generation (EpisodeGenerator)
                                      ↓
                    Predict-calibrate extraction
                                      ↓
                         SemanticKnowledge stored
                                      ↓
                    retrieve() → Hybrid search (vector + BM25)
                                      ↓
                    RetrievalResult.to_prompt() → LLM context
```

### Why Predict-Calibrate?

Traditional extraction asks: "What facts are in this conversation?"
This extracts everything, including redundant information.

Predict-calibrate asks: "What did I fail to predict?"
1. Given what I already know, predict what this conversation contains
2. Compare prediction to actual content
3. Only extract what was unpredicted (genuinely novel)

This naturally focuses on new, important information without explicit importance scoring.
