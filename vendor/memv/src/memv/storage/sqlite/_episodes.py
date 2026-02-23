"""Episode storage."""

import json
from datetime import datetime, timezone
from uuid import UUID

import aiosqlite

from memv.models import Episode
from memv.storage.sqlite._base import StoreBase


class EpisodeStore(StoreBase):
    """Store for conversation episodes."""

    async def add(self, episode: Episode) -> None:
        await self._conn.execute(
            "INSERT INTO episodes (id, user_id, title, content, original_messages, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",  # noqa: E501
            (
                str(episode.id),
                episode.user_id,
                episode.title,
                episode.content,
                json.dumps(episode.original_messages),
                int(episode.start_time.timestamp()),
                int(episode.end_time.timestamp()),
                int(episode.created_at.timestamp()),
            ),
        )
        await self._commit()

    async def get(self, episode_id: UUID | str) -> Episode | None:
        cursor = await self._conn.execute("SELECT * FROM episodes WHERE id = ?", (str(episode_id),))
        row = await cursor.fetchone()
        if row is None:
            return None
        return self._row_to_episode(row)

    async def get_by_user(self, user_id: str) -> list[Episode]:
        cursor = await self._conn.execute("SELECT * FROM episodes WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        rows = await cursor.fetchall()
        return [self._row_to_episode(row) for row in rows]

    async def get_by_time_range(self, user_id: str, start_time: datetime, end_time: datetime) -> list[Episode]:
        """Return episodes that overlap with the given time range."""
        cursor = await self._conn.execute(
            "SELECT * FROM episodes WHERE user_id = ? AND NOT (end_time < ? OR start_time > ?) ORDER BY start_time ASC",
            (user_id, int(start_time.timestamp()), int(end_time.timestamp())),
        )
        rows = await cursor.fetchall()
        return [self._row_to_episode(row) for row in rows]

    async def count(self, user_id: str | None = None) -> int:
        """Count episodes, optionally filtered by user."""
        if user_id:
            cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM episodes WHERE user_id = ?", (user_id,))
        else:
            cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM episodes")
        row = await cursor.fetchone()
        return row["cnt"] if row else 0

    async def delete(self, episode_id: UUID | str) -> bool:
        """Delete an episode by ID. Returns True if deleted."""
        cursor = await self._conn.execute("DELETE FROM episodes WHERE id = ?", (str(episode_id),))
        await self._commit()
        return cursor.rowcount > 0

    async def clear_user(self, user_id: str) -> int:
        """Delete all episodes for a user. Returns count of deleted episodes."""
        cursor = await self._conn.execute("DELETE FROM episodes WHERE user_id = ?", (user_id,))
        await self._commit()
        return cursor.rowcount

    async def update(self, episode: Episode) -> bool:
        """Update an existing episode. Returns True if updated."""
        cursor = await self._conn.execute(
            """UPDATE episodes SET
                title = ?,
                content = ?,
                original_messages = ?,
                start_time = ?,
                end_time = ?
            WHERE id = ?""",
            (
                episode.title,
                episode.content,
                json.dumps(episode.original_messages),
                int(episode.start_time.timestamp()),
                int(episode.end_time.timestamp()),
                str(episode.id),
            ),
        )
        await self._commit()
        return cursor.rowcount > 0

    def _row_to_episode(self, row: aiosqlite.Row) -> Episode:
        return Episode(
            id=UUID(row["id"]),
            user_id=row["user_id"],
            title=row["title"],
            content=row["content"],
            original_messages=json.loads(row["original_messages"]),
            start_time=datetime.fromtimestamp(row["start_time"], tz=timezone.utc),
            end_time=datetime.fromtimestamp(row["end_time"], tz=timezone.utc),
            created_at=datetime.fromtimestamp(row["created_at"], tz=timezone.utc),
        )

    async def _create_table(self):
        await self._conn.execute(
            "CREATE TABLE IF NOT EXISTS episodes (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, content TEXT, original_messages TEXT, start_time INTEGER, end_time INTEGER, created_at INTEGER)"  # noqa: E501
        )
        await self._conn.execute("CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON episodes(user_id)")
        await self._conn.execute("CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at)")
        await self._migrate_add_columns()
        await self._commit()

    async def _migrate_add_columns(self):
        """Add content and original_messages columns if they don't exist."""
        cursor = await self._conn.execute("PRAGMA table_info(episodes)")
        columns = {row["name"] for row in await cursor.fetchall()}

        if "content" not in columns:
            await self._conn.execute("ALTER TABLE episodes ADD COLUMN content TEXT DEFAULT ''")
        if "original_messages" not in columns:
            await self._conn.execute("ALTER TABLE episodes ADD COLUMN original_messages TEXT DEFAULT '[]'")
