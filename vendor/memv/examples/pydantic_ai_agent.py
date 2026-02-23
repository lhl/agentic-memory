"""
PydanticAI Agent with memv Memory
===================================

Shows how to integrate memv into a PydanticAI agent for persistent memory.

The pattern:
1. Retrieve relevant context from memory before agent runs
2. Inject context into agent via dependency
3. Store exchange after agent responds
4. Processing happens automatically in background

Run with:
    uv run python examples/pydantic_ai_agent.py

Requires:
    - OPENAI_API_KEY environment variable
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

import typer
from pydantic_ai import Agent, RunContext
from rich.console import Console
from rich.panel import Panel

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter

console = Console()
app = typer.Typer()


@dataclass
class MemoryContext:
    """Dependency injected into agent with retrieved memory context."""

    user_id: str
    context_prompt: str  # Formatted memory context for system prompt


def create_agent() -> Agent[MemoryContext, str]:
    """Create the PydanticAI agent with memory context dependency."""
    agent: Agent[MemoryContext, str] = Agent(
        "openai:gpt-4o-mini",
        deps_type=MemoryContext,
        system_prompt=(
            "You are a helpful assistant with memory of past conversations. "
            "Use the provided context to personalize responses. "
            "Reference specific details you know about the user when relevant. "
            "Don't make up information that isn't in the context."
        ),
    )

    @agent.system_prompt
    def add_memory_context(ctx: RunContext[MemoryContext]) -> str:
        """Inject memory context into system prompt."""
        if ctx.deps.context_prompt:
            return f"\n\n{ctx.deps.context_prompt}"
        return ""

    return agent


class MemoryAgent:
    """PydanticAI agent with persistent memory via memv."""

    def __init__(self, memory: Memory, user_id: str = "default-user"):
        self.memory = memory
        self.user_id = user_id
        self.agent = create_agent()

    async def chat(self, user_message: str) -> str:
        """Process a user message and return a response."""
        # 1. Retrieve relevant context from memory
        result = await self.memory.retrieve(
            user_message,
            user_id=self.user_id,
            top_k=5,
        )

        # 2. Run agent with memory context
        deps = MemoryContext(
            user_id=self.user_id,
            context_prompt=result.to_prompt(),
        )
        response = await self.agent.run(user_message, deps=deps)
        assistant_message = response.output

        # 3. Store exchange in memory (processing triggers at threshold)
        await self.memory.add_exchange(
            user_id=self.user_id,
            user_message=user_message,
            assistant_message=assistant_message,
            timestamp=datetime.now(timezone.utc),
        )

        return assistant_message


async def main():
    console.print(Panel.fit("PydanticAI Agent with memv Memory", style="bold"))
    console.print("[dim]Commands: quit, flush, debug[/dim]\n")

    # Initialize memory with auto-processing
    memory = Memory(
        db_path=".db/pydantic_agent.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
        auto_process=True,
        batch_threshold=10,  # Process after 10 messages
    )

    async with memory:
        agent_instance = MemoryAgent(memory)

        while True:
            try:
                user_input = console.input("[bold cyan]You:[/] ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue

            if user_input.lower() == "quit":
                with console.status("[dim]Processing memories…[/dim]"):
                    count = await memory.flush(agent_instance.user_id)
                if count > 0:
                    console.print(f"[dim][Flushed {count} knowledge entries][/dim]")
                break

            if user_input.lower() == "flush":
                with console.status("[dim]Processing memories…[/dim]"):
                    count = await memory.flush(agent_instance.user_id)
                console.print(f"[dim][Flushed: {count} knowledge entries extracted][/dim]")
                continue

            if user_input.lower() == "debug":
                result = await memory.retrieve("*", user_id=agent_instance.user_id, top_k=10)
                console.print(Panel(result.to_prompt() or "[dim]No memories yet[/dim]", title="Memory Contents"))
                continue

            response = await agent_instance.chat(user_input)
            console.print(f"\n[bold green]Assistant:[/bold green] {response}\n")

    console.print("[dim][Session ended][/dim]")


@app.command()
def run() -> None:
    """PydanticAI Agent with memv Memory."""
    asyncio.run(main())


if __name__ == "__main__":
    app()
