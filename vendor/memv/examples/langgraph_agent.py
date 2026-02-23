"""
LangGraph Agent with memv Memory
====================================

Shows how to integrate memv into a LangGraph StateGraph for persistent memory.

The pattern:
1. Retrieve relevant context from memory before graph invocation
2. Inject context as a system message in the graph state
3. Store exchange after response
4. Processing happens automatically in background

Run with:
    uv run python examples/langgraph_agent.py

Requires:
    - OPENAI_API_KEY environment variable
    - pip install langgraph langchain-openai
"""

import asyncio
from datetime import datetime, timezone
from typing import Annotated, TypedDict

import typer
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
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


class State(TypedDict):
    messages: Annotated[list, add_messages]


def build_graph(llm: ChatOpenAI) -> StateGraph:
    """Build a minimal chatbot graph: START -> chatbot -> END."""

    def chatbot(state: State) -> dict:
        return {"messages": [llm.invoke(state["messages"])]}

    builder = StateGraph(State)
    builder.add_node("chatbot", chatbot)
    builder.add_edge(START, "chatbot")
    builder.add_edge("chatbot", END)
    return builder.compile()


class MemoryAgent:
    """LangGraph agent with persistent memory via memv."""

    def __init__(self, memory: Memory, user_id: str = "default-user"):
        self.memory = memory
        self.user_id = user_id
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        self.graph = build_graph(self.llm)

    async def chat(self, user_message: str) -> str:
        """Process a user message and return a response."""
        # 1. Retrieve relevant context from memory
        result = await self.memory.retrieve(
            user_message,
            user_id=self.user_id,
            top_k=5,
        )

        # 2. Build messages with memory context as system message
        system_content = BASE_SYSTEM_PROMPT
        context_prompt = result.to_prompt()
        if context_prompt:
            system_content += f"\n\n{context_prompt}"

        messages = [
            ("system", system_content),
            ("user", user_message),
        ]

        # 3. Invoke graph
        response = await self.graph.ainvoke({"messages": messages})
        assistant_message = response["messages"][-1].content

        # 4. Store exchange in memory (processing triggers at threshold)
        await self.memory.add_exchange(
            user_id=self.user_id,
            user_message=user_message,
            assistant_message=assistant_message,
            timestamp=datetime.now(timezone.utc),
        )

        return assistant_message


async def main():
    console.print(Panel.fit("LangGraph Agent with memv Memory", style="bold"))
    console.print("[dim]Commands: quit, flush, debug[/dim]\n")

    memory = Memory(
        db_path=".db/langgraph_agent.db",
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
    """LangGraph Agent with memv Memory."""
    asyncio.run(main())


if __name__ == "__main__":
    app()
