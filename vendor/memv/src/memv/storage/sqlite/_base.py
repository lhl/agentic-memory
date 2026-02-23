"""Base class for SQLite stores."""

from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aiosqlite


class StoreBase(ABC):
    """Abstract base class for all SQLite stores."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None
        self._in_transaction = False

    async def __aenter__(self):
        await self.open()
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def open(self):
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row
        await self._create_table()

    async def close(self):
        if self._db:
            await self._db.close()
            self._db = None

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        """Context manager for atomic multi-operation transactions."""
        self._in_transaction = True
        try:
            yield
            await self._conn.commit()
        except Exception:
            await self._conn.rollback()
            raise
        finally:
            self._in_transaction = False

    async def _commit(self) -> None:
        """Commit if not inside a transaction."""
        if not self._in_transaction:
            await self._conn.commit()

    @abstractmethod
    async def _create_table(self):
        raise NotImplementedError

    @property
    def _conn(self) -> aiosqlite.Connection:
        if self._db is None:
            raise RuntimeError("Store not opened. Call open() first.")
        return self._db
