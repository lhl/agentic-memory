"""Public API implementations: add_message, add_exchange, retrieve, clear_user."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from memv.models import (
    Message,
    MessageRole,
    RetrievalResult,
)

if TYPE_CHECKING:
    from memv.memory._lifecycle import LifecycleManager
    from memv.memory._task_manager import TaskManager


async def add_message(lifecycle: LifecycleManager, message: Message) -> None:
    """Add a message to memory."""
    lifecycle.ensure_open()
    await lifecycle.messages.add(message)


async def add_exchange(
    lifecycle: LifecycleManager,
    task_manager: TaskManager,
    user_id: str,
    user_message: str,
    assistant_message: str,
    timestamp: datetime | None = None,
) -> tuple[Message, Message]:
    """
    Add a user/assistant exchange.

    If auto_process is enabled, buffers messages and triggers background
    processing when batch_threshold is reached.

    Returns the created Message objects.
    """
    lifecycle.ensure_open()
    ts = timestamp or datetime.now(timezone.utc)

    user_msg = Message(
        user_id=user_id,
        role=MessageRole.USER,
        content=user_message,
        sent_at=ts,
    )
    assistant_msg = Message(
        user_id=user_id,
        role=MessageRole.ASSISTANT,
        content=assistant_message,
        sent_at=ts,
    )

    await lifecycle.messages.add(user_msg)
    await lifecycle.messages.add(assistant_msg)

    # Track buffered messages for auto-processing
    if lifecycle.auto_process and lifecycle.llm is not None:
        task_manager.increment_buffer(user_id, 2)

        if task_manager.should_process(user_id):
            task_manager.schedule_processing(user_id)

    return user_msg, assistant_msg


async def retrieve(
    lifecycle: LifecycleManager,
    query: str,
    user_id: str,
    top_k: int = 10,
    vector_weight: float = 0.5,
    at_time: datetime | None = None,
    include_expired: bool = False,
) -> RetrievalResult:
    """
    Retrieve relevant knowledge for a query.

    Args:
        lifecycle: LifecycleManager instance
        query: Search query
        user_id: Filter results to this user only (required for privacy)
        top_k: Number of results to return
        vector_weight: Balance between vector (1.0) and text (0.0) search
        at_time: If provided, filter knowledge by validity at this event time
        include_expired: If True, include superseded (expired) records

    Returns:
        RetrievalResult containing knowledge statements.
    """
    lifecycle.ensure_open()
    if lifecycle.retriever is None:
        raise RuntimeError("Retriever not initialized")

    return await lifecycle.retriever.retrieve(
        query=query,
        user_id=user_id,
        top_k=top_k,
        vector_weight=vector_weight,
        at_time=at_time,
        include_expired=include_expired,
    )


async def clear_user(
    lifecycle: LifecycleManager,
    task_manager: TaskManager,
    user_id: str,
) -> dict[str, int]:
    """
    Delete all data for a user: messages, episodes, knowledge, and indices.

    Returns:
        Dict with counts of deleted items per category
    """
    lifecycle.ensure_open()

    # Cancel any pending processing for this user
    await task_manager.cancel_user_tasks(user_id)

    # Get episode IDs for knowledge deletion
    episodes = await lifecycle.episodes.get_by_user(user_id)
    episode_ids = [ep.id for ep in episodes]

    # Delete in order: indices first, then stores
    counts: dict[str, int] = {}

    # Clear knowledge indices
    counts["knowledge_vectors"] = await lifecycle.vector_index.clear_user(user_id)
    counts["knowledge_text"] = await lifecycle.text_index.clear_user(user_id)

    # Clear knowledge (by episode IDs since knowledge doesn't have user_id)
    counts["knowledge"] = await lifecycle.knowledge.clear_by_episodes(episode_ids)

    # Clear episodes
    counts["episodes"] = await lifecycle.episodes.clear_user(user_id)

    # Clear messages
    counts["messages"] = await lifecycle.messages.clear_user(user_id)

    return counts
