"""memv - Structured, temporal memory for AI agents.

Example:
    ```python
    from memv import Memory, Message, MessageRole
    from memv.embeddings import OpenAIEmbedAdapter
    from memv.llm import PydanticAIAdapter

    memory = Memory(
        db_path="memory.db",
        embedding_client=OpenAIEmbedAdapter(),
        llm_client=PydanticAIAdapter("openai:gpt-4o-mini"),
    )

    async with memory:
        await memory.add_exchange(user_id, user_msg, assistant_msg)
        await memory.process(user_id)
        result = await memory.retrieve("query", user_id=user_id)
        print(result.to_prompt())
    ```
"""

from memv.config import MemoryConfig
from memv.memory import Memory
from memv.models import (
    Episode,
    ExtractedKnowledge,
    Message,
    MessageRole,
    ProcessStatus,
    ProcessTask,
    RetrievalResult,
    SemanticKnowledge,
)

__all__ = [
    "Memory",
    "MemoryConfig",
    "Message",
    "MessageRole",
    "Episode",
    "SemanticKnowledge",
    "ExtractedKnowledge",
    "RetrievalResult",
    "ProcessTask",
    "ProcessStatus",
]


def main() -> None:
    print("memv - Structured, temporal memory for AI agents.")
    print("See examples/ for usage demos.")
