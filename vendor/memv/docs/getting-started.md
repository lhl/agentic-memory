# Getting Started

## First Example

```python
import asyncio
from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter


async def main():
    memory = Memory(
        db_path="memory.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
    )

    async with memory:
        user_id = "user-123"

        # Add a conversation exchange
        await memory.add_exchange(
            user_id=user_id,
            user_message="I work at Anthropic as a researcher.",
            assistant_message="That's great! What area do you focus on?",
        )
        await memory.add_exchange(
            user_id=user_id,
            user_message="AI safety, specifically interpretability.",
            assistant_message="Fascinating field!",
        )

        # Process messages into episodes and extract knowledge
        count = await memory.process(user_id)
        print(f"Extracted {count} knowledge entries")

        # Retrieve relevant context for a query
        result = await memory.retrieve("What does the user do for work?", user_id=user_id)
        print(result.to_prompt())


if __name__ == "__main__":
    asyncio.run(main())
```

That's it. After `process()`, memv has:

1. Segmented the messages into an episode
2. Generated a narrative summary
3. Predicted what the episode should contain (nothing -- first time)
4. Extracted knowledge from the prediction gap
5. Indexed everything for hybrid retrieval

## Agent Integration Pattern

The typical pattern for adding memory to any agent:

```python
class MemoryAgent:
    def __init__(self, memory: Memory):
        self.memory = memory
        self.user_id = "default-user"

    async def chat(self, user_message: str) -> str:
        # 1. Retrieve relevant context
        context = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

        # 2. Build prompt with memory context
        system_prompt = f"""You are a helpful assistant.

{context.to_prompt()}

Use the context to personalize responses."""

        # 3. Generate response (using your LLM of choice)
        assistant_message = await self.generate_response(system_prompt, user_message)

        # 4. Store the exchange
        await self.memory.add_exchange(
            user_id=self.user_id,
            user_message=user_message,
            assistant_message=assistant_message,
        )

        return assistant_message
```

This pattern works with any framework. See [Examples](examples/index.md) for PydanticAI, LangGraph, LlamaIndex, CrewAI, and AutoGen integrations.

## Using Different Providers

The LLM adapter supports multiple providers via PydanticAI:

=== "OpenAI"

    ```python
    from memv.llm import PydanticAIAdapter

    llm = PydanticAIAdapter("openai:gpt-4o-mini")
    ```

=== "Anthropic"

    ```python
    from memv.llm import PydanticAIAdapter

    llm = PydanticAIAdapter("anthropic:claude-3-5-sonnet-latest")
    ```

=== "Google"

    ```python
    from memv.llm import PydanticAIAdapter

    llm = PydanticAIAdapter("google-gla:gemini-2.5-flash")
    ```

=== "Groq"

    ```python
    from memv.llm import PydanticAIAdapter

    llm = PydanticAIAdapter("groq:llama-3.3-70b-versatile")
    ```

See [PydanticAI models](https://ai.pydantic.dev/models/) for the full list.

## Next Steps

- [Core Concepts](concepts/index.md) — How memv works under the hood
- [Configuration](advanced/configuration.md) — Tuning all the knobs
- [Custom Providers](advanced/custom-providers.md) — Bring your own embedding/LLM
