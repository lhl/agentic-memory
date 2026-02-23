from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from enum import StrEnum
from typing import TYPE_CHECKING, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, PrivateAttr

if TYPE_CHECKING:
    from asyncio import Task


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: str = Field(..., description="The ID of the user who sent the message.")
    role: MessageRole = Field(..., description="Indicates who sent the message.")
    content: str = Field(..., description="The actual message content.")
    sent_at: datetime = Field(..., description="When the message was sent (UTC).")


class Episode(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: str = Field(..., description="The ID of user whose conversation this episode belongs to.")
    title: str = Field(..., description="The title of the episode.")
    content: str = Field(..., description="Detailed third-person narrative with ALL important information from the conversation.")
    original_messages: list[dict] = Field(..., description="Raw messages stored on the episode for extraction.")
    start_time: datetime = Field(..., description="Time when the episode started (UTC).")
    end_time: datetime = Field(..., description="Time when the episode ended (UTC).")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="When the episode was created (UTC).")

    @property
    def message_count(self) -> int:
        return len(self.original_messages)


class BiTemporalValidity(BaseModel):
    """
    Bi-temporal validity tracking.

    Event timeline (T): when the fact was/is true in the world
    Transaction timeline (T'): when we learned/recorded it
    """

    # Event time - when fact is true in world
    valid_at: datetime | None = Field(default=None, description="When fact became true (None = unknown/always)")
    invalid_at: datetime | None = Field(default=None, description="When fact stopped being true (None = still true)")

    # Transaction time - when we recorded it
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="When we learned this")
    expired_at: datetime | None = Field(default=None, description="When we invalidated this record (None = current)")

    def is_valid_at(self, event_time: datetime) -> bool:
        """Check if fact was true at given event time."""
        if self.valid_at and event_time < self.valid_at:
            return False
        if self.invalid_at and event_time >= self.invalid_at:
            return False
        return True

    def is_current(self) -> bool:
        """Check if this is the current (non-expired) record."""
        return self.expired_at is None


class SemanticKnowledge(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    statement: str = Field(..., description="A declarative statement about the user or world generated from the conversation")
    source_episode_id: UUID = Field(..., description="The id of the episode that generated this knowledge")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="The time when the knowledge entry was created (UTC)."
    )
    importance_score: float | None = Field(default=None, description="The importance score of the knowledge entry.")
    embedding: list[float] | None = Field(default=None, description="The embedding of the statement.")

    # Bi-temporal validity fields
    valid_at: datetime | None = Field(default=None, description="When fact became true in world (None = unknown/always)")
    invalid_at: datetime | None = Field(default=None, description="When fact stopped being true (None = still true)")
    expired_at: datetime | None = Field(default=None, description="When this record was superseded (None = current)")

    def invalidate(self) -> None:
        """Mark this knowledge as superseded."""
        self.expired_at = datetime.now(timezone.utc)

    def is_valid_at(self, event_time: datetime) -> bool:
        """Check if fact was true at given event time."""
        if self.valid_at and event_time < self.valid_at:
            return False
        if self.invalid_at and event_time >= self.invalid_at:
            return False
        return True

    def is_current(self) -> bool:
        """Check if this is the current (non-expired) record."""
        return self.expired_at is None


class RetrievalResult(BaseModel):
    """Results from memory retrieval."""

    retrieved_knowledge: list[SemanticKnowledge] = Field(default_factory=list, description="Retrieved semantic knowledge entries.")

    def to_prompt(self) -> str:
        """Format retrieval results for LLM context injection."""
        if not self.retrieved_knowledge:
            return "No relevant context found."

        lines = ["## Relevant Context"]
        for k in self.retrieved_knowledge:
            lines.append(f"- {k.statement}")

        return "\n".join(lines)


class ExtractedKnowledge(BaseModel):
    """Output of predict-calibrate extraction."""

    statement: str
    knowledge_type: Literal["new", "update", "contradiction"]
    temporal_info: str | None = None  # Human-readable: "since January 2024", "until next week"
    valid_at: datetime | None = None  # Parsed: when fact became true (ISO format from LLM)
    invalid_at: datetime | None = None  # Parsed: when fact stops being true (ISO format from LLM)
    confidence: float = 1.0


class ProcessStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessTask(BaseModel):
    """Handle for monitoring/awaiting async processing."""

    model_config = {"arbitrary_types_allowed": True}

    user_id: str
    status: ProcessStatus = ProcessStatus.PENDING
    knowledge_count: int = 0
    error: str | None = None

    _task: Task[int] | None = PrivateAttr(default=None)

    @property
    def done(self) -> bool:
        """Check if processing has completed (success or failure)."""
        return self.status in (ProcessStatus.COMPLETED, ProcessStatus.FAILED)

    async def wait(self) -> int:
        """Wait for processing to complete and return knowledge count."""
        if self._task is None:
            return self.knowledge_count

        try:
            result = await self._task
            return result
        except asyncio.CancelledError:
            raise
        except Exception:
            # Status already updated by the task wrapper
            return 0
