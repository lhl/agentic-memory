"""Caching utilities for AgentMemory."""

import hashlib
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class CacheEntry:
    """Entry in the embedding cache with expiration."""

    value: list[float]
    expires_at: datetime


class EmbeddingCache:
    """LRU cache for query embeddings with TTL.

    Caches embedding vectors by text content hash to avoid redundant API calls.
    Thread-safe for single-threaded async usage (no locks needed).

    Example:
        ```python
        cache = EmbeddingCache(max_size=1000, ttl_seconds=600)

        # Check cache first
        embedding = cache.get("query text")
        if embedding is None:
            embedding = await embedder.embed("query text")
            cache.set("query text", embedding)
        ```
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: int = 600):
        """
        Initialize the cache.

        Args:
            max_size: Maximum number of entries to cache
            ttl_seconds: Time-to-live for entries in seconds
        """
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()

    def _key(self, text: str) -> str:
        """Generate cache key from text content."""
        return hashlib.sha256(text.encode()).hexdigest()

    def get(self, text: str) -> list[float] | None:
        """
        Get cached embedding for text.

        Returns None if not found or expired.
        """
        key = self._key(text)
        entry = self._cache.get(key)

        if entry is None:
            return None

        # Check expiration
        if datetime.now(timezone.utc) > entry.expires_at:
            del self._cache[key]
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return entry.value

    def set(self, text: str, embedding: list[float]) -> None:
        """
        Cache embedding for text.

        Evicts oldest entry if cache is full.
        """
        # Evict if at capacity
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)  # Remove oldest

        key = self._key(text)
        self._cache[key] = CacheEntry(
            value=embedding,
            expires_at=datetime.now(timezone.utc) + self.ttl,
        )

    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()

    def __len__(self) -> int:
        """Return number of cached entries."""
        return len(self._cache)
