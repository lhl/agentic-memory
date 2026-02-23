"""
LlamaIndex Agent with memv Memory
=====================================

Shows how to integrate memv into a LlamaIndex chat engine for persistent memory.

The pattern:
1. Retrieve relevant context from memory before chat
2. Inject context as system prompt prefix
3. Store exchange after response
4. Processing happens automatically in background

Run with:
    uv run python examples/llamaindex_agent.py

Requires:
    - OPENAI_API_KEY environment variable
    - pip install llama-index llama-index-llms-openai
"""

import asyncio
from datetime import datetime, timezone

import typer
from llama_index.core.chat_engine import SimpleChatEngine
from llama_index.llms.openai import OpenAI
from rich.console import Console
from rich.panel import Panel

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter

console = Console()
app = typer.Typer()

BASE_SYSTEM_PROMPT = (
    "You are a helpful assistant with memory of past conversations. "
    "Use the provided context to personalize responses. "
    "Reference specific details you know about the user when relevant. "
    "Don't make up information that isn't in the context."
)


class MemoryAgent:
    """LlamaIndex chat agent with persistent memory via memv."""

    def __init__(self, memory: Memory, user_id: str = "default-user"):
        self.memory = memory
        self.user_id = user_id
        self.llm = OpenAI(model="gpt-4o-mini", temperature=0.7)

    async def chat(self, user_message: str) -> str:
        """Process a user message and return a response."""
        # 1. Retrieve relevant context from memory
        result = await self.memory.retrieve(
            user_message,
            user_id=self.user_id,
            top_k=5,
        )

        # 2. Build system prompt with memory context
        system_prompt = BASE_SYSTEM_PROMPT
        context_prompt = result.to_prompt()
        if context_prompt:
            system_prompt += f"\n\n{context_prompt}"

        # 3. Create a fresh chat engine with updated system prompt
        chat_engine = SimpleChatEngine.from_defaults(
            llm=self.llm,
            system_prompt=system_prompt,
        )
        response = await chat_engine.achat(user_message)
        assistant_message = str(response)

        # 4. Store exchange in memory (processing triggers at threshold)
        await self.memory.add_exchange(
            user_id=self.user_id,
            user_message=user_message,
            assistant_message=assistant_message,
            timestamp=datetime.now(timezone.utc),
        )

        return assistant_message


async def main():
    console.print(Panel.fit("LlamaIndex Agent with memv Memory", style="bold"))
    console.print("[dim]Commands: quit, flush, debug[/dim]\n")

    memory = Memory(
        db_path=".db/llamaindex_agent.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
        auto_process=True,
        batch_threshold=10,
    )

    async with memory:
        agent = MemoryAgent(memory)

        while True:
            try:
                user_input = console.input("[bold cyan]You:[/] ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue

            if user_input.lower() == "quit":
                with console.status("[dim]Processing memories…[/dim]"):
                    count = await memory.flush(agent.user_id)
                if count > 0:
                    console.print(f"[dim][Flushed {count} knowledge entries][/dim]")
                break

            if user_input.lower() == "flush":
                with console.status("[dim]Processing memories…[/dim]"):
                    count = await memory.flush(agent.user_id)
                console.print(f"[dim][Flushed: {count} knowledge entries extracted][/dim]")
                continue

            if user_input.lower() == "debug":
                result = await memory.retrieve("*", user_id=agent.user_id, top_k=10)
                console.print(Panel(result.to_prompt() or "[dim]No memories yet[/dim]", title="Memory Contents"))
                continue

            response = await agent.chat(user_input)
            console.print(f"\n[bold green]Assistant:[/bold green] {response}\n")

    console.print("[dim][Session ended][/dim]")


@app.command()
def run() -> None:
    """LlamaIndex Agent with memv Memory."""
    asyncio.run(main())


if __name__ == "__main__":
    app()
