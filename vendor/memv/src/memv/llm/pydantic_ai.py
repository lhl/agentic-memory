"""PydanticAI adapter for LLMClient protocol."""

from typing import Any, TypeVar, cast

from pydantic_ai import Agent

T = TypeVar("T")


class PydanticAIAdapter:
    """
    LLM client using PydanticAI.

    Supports multiple providers out of the box:
    - "openai:gpt-4.1-mini"
    - "anthropic:claude-3-5-sonnet-latest"
    - "google-gla:gemini-2.5-flash"
    - "groq:llama-3.3-70b-versatile"

    See https://ai.pydantic.dev/models/ for full list.
    """

    def __init__(self, model: str = "openai:gpt-4.1-mini"):
        self.model = model
        # Cache agents to avoid re-initialization overhead
        self._text_agent: Agent[None, str] = Agent(self.model)
        self._structured_agents: dict[type, Agent[None, Any]] = {}

    async def generate(self, prompt: str) -> str:
        """Generate unstructured text response."""
        result = await self._text_agent.run(prompt)
        return result.output

    async def generate_structured(self, prompt: str, response_model: type[T]) -> T:
        """Generate structured response matching the Pydantic model."""
        # Cache structured agents by response type
        if response_model not in self._structured_agents:
            self._structured_agents[response_model] = Agent(self.model, output_type=response_model)
        agent: Agent[None, T] = cast(Agent[None, T], self._structured_agents[response_model])
        result = await agent.run(prompt)
        return result.output
