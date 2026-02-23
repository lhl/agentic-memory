"""
memv Quickstart
======================

Minimal example showing the core API.

Run with:
    uv run python examples/quickstart.py
"""

import asyncio

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter


async def main():
    # Setup
    memory = Memory(
        db_path=".db/quickstart.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
    )

    async with memory:
        user_id = "user-123"

        # Add conversation
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

        # Extract knowledge
        await memory.process(user_id)

        # Retrieve context for a new query
        result = await memory.retrieve("What does the user do for work?", user_id=user_id)
        print(result.to_prompt())


if __name__ == "__main__":
    asyncio.run(main())
