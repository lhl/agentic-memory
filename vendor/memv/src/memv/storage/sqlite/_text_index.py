"""Full-text search index using FTS5."""

import re
from uuid import UUID

from memv.storage.sqlite._base import StoreBase


class TextIndex(StoreBase):
    """Full-text search index using FTS5 with per-user isolation."""

    def __init__(self, db_path: str, name: str = "knowledge"):
        super().__init__(db_path)
        self.name = name
        self._mapping_table = f"fts_{name}_mapping"
        self._fts_table = f"fts_{name}"

    async def open(self):
        await super().open()
        await self._migrate_add_user_id()

    async def _create_table(self):
        # Mapping table with user_id for per-user isolation
        await self._conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {self._mapping_table} (
                rowid INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL DEFAULT ''
            )
        """)
        # Index for user_id filtering
        await self._conn.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_{self._mapping_table}_user
            ON {self._mapping_table}(user_id)
        """)
        # FTS5 virtual table
        await self._conn.execute(f"""
            CREATE VIRTUAL TABLE IF NOT EXISTS {self._fts_table}
            USING fts5(content)
        """)
        await self._conn.commit()

    async def _migrate_add_user_id(self):
        """Add user_id column if missing (schema migration)."""
        cursor = await self._conn.execute(f"PRAGMA table_info({self._mapping_table})")
        columns = {row[1] for row in await cursor.fetchall()}
        if "user_id" not in columns:
            await self._conn.execute(f"ALTER TABLE {self._mapping_table} ADD COLUMN user_id TEXT NOT NULL DEFAULT ''")
            await self._conn.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_{self._mapping_table}_user
                ON {self._mapping_table}(user_id)
            """)
            await self._conn.commit()

    async def add(self, uuid: UUID, text: str, user_id: str) -> None:
        # Insert into mapping to get rowid
        cursor = await self._conn.execute(f"INSERT INTO {self._mapping_table} (uuid, user_id) VALUES (?, ?)", (str(uuid), user_id))
        rowid = cursor.lastrowid

        # Insert into FTS5 table
        await self._conn.execute(f"INSERT INTO {self._fts_table} (rowid, content) VALUES (?, ?)", (rowid, text))
        await self._conn.commit()

    async def search(self, query: str, top_k: int = 10, user_id: str | None = None) -> list[UUID]:
        """Search for matching text, optionally filtered by user_id."""
        sanitized = self._sanitize_fts_query(query)
        if not sanitized:
            return []

        if user_id is not None:
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid
                FROM {self._fts_table}
                JOIN {self._mapping_table} ON {self._fts_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._fts_table}.content MATCH ?
                  AND {self._mapping_table}.user_id = ?
                ORDER BY rank
                LIMIT ?
            """,
                (sanitized, user_id, top_k),
            )
        else:
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid
                FROM {self._fts_table}
                JOIN {self._mapping_table} ON {self._fts_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._fts_table}.content MATCH ?
                ORDER BY rank
                LIMIT ?
            """,
                (sanitized, top_k),
            )
        rows = await cursor.fetchall()
        return [UUID(row["uuid"]) for row in rows]

    def _sanitize_fts_query(self, query: str) -> str:
        """
        Sanitize query for FTS5.

        FTS5 has special syntax for operators like AND, OR, NOT, quotes, etc.
        We escape by quoting each token as a literal phrase.
        """
        # Remove special FTS5 characters and split into words
        cleaned = re.sub(r"[^\w\s]", " ", query)
        words = cleaned.split()

        if not words:
            return ""

        # Quote each word to treat as literal, join with space (implicit AND)
        return " ".join(f'"{word}"' for word in words)

    async def clear_user(self, user_id: str) -> int:
        """Delete all text index entries for a user. Returns count of deleted entries."""
        # Get rowids to delete from fts table
        cursor = await self._conn.execute(f"SELECT rowid FROM {self._mapping_table} WHERE user_id = ?", (user_id,))
        rows = await cursor.fetchall()
        rowids = [row["rowid"] for row in rows]

        if not rowids:
            return 0

        # Delete from fts table
        placeholders = ",".join("?" * len(rowids))
        await self._conn.execute(f"DELETE FROM {self._fts_table} WHERE rowid IN ({placeholders})", rowids)

        # Delete from mapping table
        cursor = await self._conn.execute(f"DELETE FROM {self._mapping_table} WHERE user_id = ?", (user_id,))
        await self._conn.commit()
        return cursor.rowcount
