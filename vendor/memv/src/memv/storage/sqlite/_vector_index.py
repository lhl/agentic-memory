"""Vector similarity index using sqlite-vec."""

import struct
from uuid import UUID

import aiosqlite
import sqlite_vec

from memv.storage.sqlite._base import StoreBase


class VectorIndex(StoreBase):
    """Vector similarity index using sqlite-vec with per-user isolation."""

    def __init__(self, db_path: str, dimensions: int = 1536, name: str = "knowledge"):
        super().__init__(db_path)
        self.dimensions = dimensions
        self.name = name
        self._mapping_table = f"vec_{name}_mapping"
        self._vec_table = f"vec_{name}"

    async def open(self):
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row
        # Load sqlite-vec extension
        await self._db.enable_load_extension(True)
        await self._db.load_extension(sqlite_vec.loadable_path())
        await self._db.enable_load_extension(False)
        await self._create_table()
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
        # Vector table
        await self._conn.execute(f"""
            CREATE VIRTUAL TABLE IF NOT EXISTS {self._vec_table}
            USING vec0(embedding float[{self.dimensions}])
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

    async def add(self, uuid: UUID, embedding: list[float], user_id: str) -> None:
        # Insert into mapping to get rowid
        cursor = await self._conn.execute(f"INSERT INTO {self._mapping_table} (uuid, user_id) VALUES (?, ?)", (str(uuid), user_id))
        rowid = cursor.lastrowid

        # Insert into vector table
        embedding_bytes = struct.pack(f"{len(embedding)}f", *embedding)
        await self._conn.execute(f"INSERT INTO {self._vec_table} (rowid, embedding) VALUES (?, ?)", (rowid, embedding_bytes))
        await self._conn.commit()

    async def search(self, query_embedding: list[float], top_k: int = 10, user_id: str | None = None) -> list[UUID]:
        """Search for similar vectors, optionally filtered by user_id."""
        query_bytes = struct.pack(f"{len(query_embedding)}f", *query_embedding)

        if user_id is not None:
            # Request more candidates from vector search, then filter by user_id
            k_candidates = top_k * 10
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid
                FROM {self._vec_table}
                JOIN {self._mapping_table} ON {self._vec_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._vec_table}.embedding MATCH ?
                  AND k = ?
                  AND {self._mapping_table}.user_id = ?
                ORDER BY distance
                LIMIT ?
            """,
                (query_bytes, k_candidates, user_id, top_k),
            )
        else:
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid
                FROM {self._vec_table}
                JOIN {self._mapping_table} ON {self._vec_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._vec_table}.embedding MATCH ?
                  AND k = ?
                ORDER BY distance
            """,
                (query_bytes, top_k),
            )
        rows = await cursor.fetchall()
        return [UUID(row["uuid"]) for row in rows]

    async def search_with_scores(
        self, query_embedding: list[float], top_k: int = 10, user_id: str | None = None
    ) -> list[tuple[UUID, float]]:
        """Search for similar vectors and return (uuid, similarity_score) tuples.

        sqlite-vec returns L2 distance. We convert to similarity: 1 / (1 + distance).
        """
        query_bytes = struct.pack(f"{len(query_embedding)}f", *query_embedding)

        if user_id is not None:
            k_candidates = top_k * 10
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid, distance
                FROM {self._vec_table}
                JOIN {self._mapping_table} ON {self._vec_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._vec_table}.embedding MATCH ?
                  AND k = ?
                  AND {self._mapping_table}.user_id = ?
                ORDER BY distance
                LIMIT ?
            """,
                (query_bytes, k_candidates, user_id, top_k),
            )
        else:
            cursor = await self._conn.execute(
                f"""
                SELECT {self._mapping_table}.uuid, distance
                FROM {self._vec_table}
                JOIN {self._mapping_table} ON {self._vec_table}.rowid = {self._mapping_table}.rowid
                WHERE {self._vec_table}.embedding MATCH ?
                  AND k = ?
                ORDER BY distance
            """,
                (query_bytes, top_k),
            )
        rows = await cursor.fetchall()
        # Convert L2 distance to similarity score (higher = more similar)
        return [(UUID(row["uuid"]), 1.0 / (1.0 + row["distance"])) for row in rows]

    async def clear_user(self, user_id: str) -> int:
        """Delete all vector entries for a user. Returns count of deleted entries."""
        # Get rowids to delete from vec table
        cursor = await self._conn.execute(f"SELECT rowid FROM {self._mapping_table} WHERE user_id = ?", (user_id,))
        rows = await cursor.fetchall()
        rowids = [row["rowid"] for row in rows]

        if not rowids:
            return 0

        # Delete from vec table
        placeholders = ",".join("?" * len(rowids))
        await self._conn.execute(f"DELETE FROM {self._vec_table} WHERE rowid IN ({placeholders})", rowids)

        # Delete from mapping table
        cursor = await self._conn.execute(f"DELETE FROM {self._mapping_table} WHERE user_id = ?", (user_id,))
        await self._conn.commit()
        return cursor.rowcount
