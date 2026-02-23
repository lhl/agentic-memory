"""
Agent Integration Example
=========================

Shows how to integrate memv into a simple conversational agent.

With auto_process enabled (Nemori-style), the pattern is:
1. User sends message
2. Retrieve relevant context from memory
3. Generate response with context
4. Store exchange in memory (processing triggers automatically at threshold)

Run with:
    uv run python examples/agent_integration.py
"""

import asyncio
from datetime import datetime, timezone

import typer
from openai import AsyncOpenAI
from rich.console import Console
from rich.panel import Panel

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter

console = Console()
app = typer.Typer()


class MemoryAgent:
    """Simple conversational agent with long-term memory."""

    def __init__(self, memory: Memory, openai_client: AsyncOpenAI):
        self.memory = memory
        self.openai = openai_client
        self.user_id = "default-user"
        self.messages: list = []  # Chat history for context window

    async def chat(self, user_message: str) -> str:
        """Process a user message and return a response."""

        # 1. Retrieve relevant context from memory
        context = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)
        context_prompt = context.to_prompt()

        # 2. Build system prompt with memory context
        system_prompt = f"""You are a helpful assistant with memory of past conversations.

{context_prompt}

Use the above context to personalize your responses. If you remember something about the user \
that's relevant, mention it naturally. Don't make up information that isn't in the context."""

        # 3. Generate response
        self.messages.append({"role": "user", "content": user_message})
        response = await self.openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}, *self.messages],
            temperature=0.7,
        )
        assistant_message = response.choices[0].message.content or ""
        self.messages.append({"role": "assistant", "content": assistant_message})

        # 4. Store exchange in memory
        # With auto_process=True, processing triggers automatically when
        # batch_threshold messages accumulate
        await self.memory.add_exchange(
            user_id=self.user_id,
            user_message=user_message,
            assistant_message=assistant_message,
            timestamp=datetime.now(timezone.utc),
        )

        return assistant_message


async def main():
    console.print(Panel.fit("Memory Agent Demo", style="bold"))
    console.print("[dim]Commands: quit, flush, debug[/dim]\n")

    # Initialize memory with auto-processing enabled
    memory = Memory(
        db_path=".db/memv.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4.1-mini"),
        auto_process=True,  # Enable automatic background processing
        batch_threshold=10,  # Process after 10 messages (5 exchanges)
    )

    async with memory:
        # Initialize agent
        openai_client = AsyncOpenAI()
        agent = MemoryAgent(memory, openai_client)

        # Chat loop
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
                    console.print(f"[dim][Flushed {count} knowledge entries on exit][/dim]")
                break

            if user_input.lower() == "flush":
                with console.status("[dim]Processing memories…[/dim]"):
                    count = await memory.flush(agent.user_id)
                console.print(f"[dim][Flushed: {count} knowledge entries extracted][/dim]")
                continue

            if user_input.lower() == "debug":
                # Show what's in memory
                result = await memory.retrieve("*", user_id=agent.user_id, top_k=10)
                buffered = memory._buffers.get(agent.user_id, 0)
                console.print(
                    Panel(
                        (result.to_prompt() or "[dim]No memories yet[/dim]") + f"\n\n[dim]Buffered messages: {buffered}[/dim]",
                        title="Memory Contents",
                    )
                )
                continue

            response = await agent.chat(user_input)
            console.print(f"\n[bold green]Assistant:[/bold green] {response}\n")

    console.print("[dim][Session ended][/dim]")


@app.command()
def run() -> None:
    """Memory Agent with memv Memory."""
    asyncio.run(main())


if __name__ == "__main__":
    app()
