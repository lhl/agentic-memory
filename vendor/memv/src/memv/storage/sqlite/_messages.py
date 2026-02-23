"""Message storage."""

from datetime import datetime, timezone
from uuid import UUID

import aiosqlite

from memv.models import Message, MessageRole
from memv.storage.sqlite._base import StoreBase


class MessageStore(StoreBase):
    """Store for conversation messages."""

    async def add(self, message: Message) -> None:
        await self._conn.execute(
            "INSERT INTO messages (id, user_id, role, content, sent_at) VALUES (?, ?, ?, ?, ?)",
            (str(message.id), message.user_id, message.role.value, message.content, int(message.sent_at.timestamp())),
        )
        await self._commit()

    async def get(self, message_id: UUID | str) -> Message | None:
        cursor = await self._conn.execute("SELECT * FROM messages WHERE id = ?", (str(message_id),))
        row = await cursor.fetchone()
        if row is None:
            return None
        return self._row_to_message(row)

    async def get_by_user(self, user_id: str) -> list[Message]:
        cursor = await self._conn.execute("SELECT * FROM messages WHERE user_id = ? ORDER BY sent_at ASC", (user_id,))
        rows = await cursor.fetchall()
        return [self._row_to_message(row) for row in rows]

    async def get_by_time_range(self, user_id: str, start: datetime, end: datetime) -> list[Message]:
        cursor = await self._conn.execute(
            "SELECT * FROM messages WHERE user_id = ? AND sent_at BETWEEN ? AND ? ORDER BY sent_at ASC",
            (user_id, int(start.timestamp()), int(end.timestamp())),
        )
        rows = await cursor.fetchall()
        return [self._row_to_message(row) for row in rows]

    async def list_users(self) -> list[str]:
        """Return distinct user IDs from messages."""
        cursor = await self._conn.execute("SELECT DISTINCT user_id FROM messages ORDER BY user_id")
        rows = await cursor.fetchall()
        return [row["user_id"] for row in rows]

    async def count(self, user_id: str | None = None) -> int:
        """Count messages, optionally filtered by user."""
        if user_id:
            cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM messages WHERE user_id = ?", (user_id,))
        else:
            cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM messages")
        row = await cursor.fetchone()
        return row["cnt"] if row else 0

    async def delete(self, message_id: UUID | str) -> bool:
        """Delete a message by ID. Returns True if deleted."""
        cursor = await self._conn.execute("DELETE FROM messages WHERE id = ?", (str(message_id),))
        await self._commit()
        return cursor.rowcount > 0

    async def clear_user(self, user_id: str) -> int:
        """Delete all messages for a user. Returns count of deleted messages."""
        cursor = await self._conn.execute("DELETE FROM messages WHERE user_id = ?", (user_id,))
        await self._commit()
        return cursor.rowcount

    def _row_to_message(self, row: aiosqlite.Row) -> Message:
        return Message(
            id=UUID(row["id"]),
            user_id=row["user_id"],
            role=MessageRole(row["role"]),
            content=row["content"],
            sent_at=datetime.fromtimestamp(row["sent_at"], tz=timezone.utc),
        )

    async def _create_table(self):
        await self._conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user_id TEXT, role TEXT, content TEXT, sent_at INTEGER)"
        )
        await self._conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)")
        await self._conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)")
        await self._commit()
