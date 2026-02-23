# Custom Providers

memv uses two protocols for external services: `EmbeddingClient` and `LLMClient`. Implement them to use any provider.

## EmbeddingClient

```python
from memv.protocols import EmbeddingClient


class MyEmbedder:
    async def embed(self, text: str) -> list[float]:
        """Embed single text, return vector."""
        ...

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts, return list of vectors."""
        ...
```

!!! warning "Dimension consistency"
    The vector dimensions must match `embedding_dimensions` in your config (default: 1536). If your model produces 768-dimensional vectors, set `embedding_dimensions=768`.

### Example: Cohere

```python
import cohere


class CohereEmbedder:
    def __init__(self, model: str = "embed-english-v3.0"):
        self.client = cohere.AsyncClient()
        self.model = model

    async def embed(self, text: str) -> list[float]:
        response = await self.client.embed(
            texts=[text],
            model=self.model,
            input_type="search_query",
        )
        return response.embeddings[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self.client.embed(
            texts=texts,
            model=self.model,
            input_type="search_document",
        )
        return response.embeddings


memory = Memory(
    embedding_client=CohereEmbedder(),
    embedding_dimensions=1024,  # Cohere v3 outputs 1024
    # ...
)
```

## LLMClient

```python
from memv.protocols import LLMClient
from typing import TypeVar

T = TypeVar("T")


class MyLLM:
    async def generate(self, prompt: str) -> str:
        """Generate unstructured text response."""
        ...

    async def generate_structured(self, prompt: str, response_model: type[T]) -> T:
        """Generate structured response matching Pydantic model."""
        ...
```

`generate_structured` must return an instance of the given Pydantic model. This is used for episode generation and knowledge extraction where memv needs structured output.

### Example: Anthropic (direct)

```python
import anthropic
import json


class AnthropicLLM:
    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.AsyncAnthropic()
        self.model = model

    async def generate(self, prompt: str) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def generate_structured(self, prompt: str, response_model: type[T]) -> T:
        schema = response_model.model_json_schema()
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
            tools=[{"name": "output", "description": "Output", "input_schema": schema}],
            tool_choice={"type": "tool", "name": "output"},
        )
        data = response.content[0].input
        return response_model.model_validate(data)
```

## Built-in Adapters

memv ships with two adapters that cover most use cases:

### OpenAIEmbedAdapter

```python
from memv.embeddings import OpenAIEmbedAdapter

embedder = OpenAIEmbedAdapter(
    api_key=None,                          # Uses OPENAI_API_KEY env var
    model="text-embedding-3-small",        # Default model
)
```

### PydanticAIAdapter

Multi-provider LLM via PydanticAI. Supports OpenAI, Anthropic, Google, Groq, and more.

```python
from memv.llm import PydanticAIAdapter

llm = PydanticAIAdapter("openai:gpt-4o-mini")
llm = PydanticAIAdapter("anthropic:claude-3-5-sonnet-latest")
llm = PydanticAIAdapter("google-gla:gemini-2.5-flash")
llm = PydanticAIAdapter("groq:llama-3.3-70b-versatile")
```

See [PydanticAI models](https://ai.pydantic.dev/models/) for the full provider list.
