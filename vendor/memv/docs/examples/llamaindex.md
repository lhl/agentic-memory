# LlamaIndex

Integrates memv into a LlamaIndex `SimpleChatEngine`. Memory context is passed as a system prompt prefix.

```bash
uv run python examples/llamaindex_agent.py
```

Requires: `pip install llama-index llama-index-llms-openai`

## The Pattern

LlamaIndex chat engines accept a `system_prompt` at creation. Memory context is prepended to the base prompt, and a fresh engine is created each turn:

```python
class MemoryAgent:
    def __init__(self, memory: Memory, user_id: str = "default-user"):
        self.memory = memory
        self.user_id = user_id
        self.llm = OpenAI(model="gpt-4o-mini", temperature=0.7)
```

## Integration

```python
async def chat(self, user_message: str) -> str:
    # 1. Retrieve context
    result = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

    # 2. Build system prompt with context
    system_prompt = BASE_SYSTEM_PROMPT
    context_prompt = result.to_prompt()
    if context_prompt:
        system_prompt += f"\n\n{context_prompt}"

    # 3. Create chat engine with updated prompt
    chat_engine = SimpleChatEngine.from_defaults(
        llm=self.llm,
        system_prompt=system_prompt,
    )
    response = await chat_engine.achat(user_message)

    # 4. Store exchange
    await self.memory.add_exchange(
        user_id=self.user_id,
        user_message=user_message,
        assistant_message=str(response),
    )

    return str(response)
```

## Notes

- A fresh `SimpleChatEngine` is created per turn so the system prompt reflects current memory state
- For more complex setups (RAG pipelines, query engines), inject memory context the same way — as part of the system prompt or as a separate context node
- LlamaIndex has its own memory abstractions, but memv's predict-calibrate extraction provides a different approach to what gets remembered

See the [full source](https://github.com/vstorm-co/memv/blob/main/examples/llamaindex_agent.py) for the complete interactive example.
