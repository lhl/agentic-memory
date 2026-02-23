"""Hybrid retrieval combining vector and text search."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from memv.models import RetrievalResult, SemanticKnowledge
from memv.protocols import EmbeddingClient, KnowledgeStore
from memv.storage import TextIndex, VectorIndex

if TYPE_CHECKING:
    from memv.cache import EmbeddingCache


class Retriever:
    """
    Hybrid retriever combining vector similarity and text search.

    Searches knowledge statements and returns unified results with RRF fusion.
    """

    def __init__(
        self,
        knowledge_store: KnowledgeStore,
        vector_index: VectorIndex,
        text_index: TextIndex,
        embedding_client: EmbeddingClient | None = None,
        embedding_cache: EmbeddingCache | None = None,
    ):
        self.knowledge = knowledge_store
        self.vector_index = vector_index
        self.text_index = text_index
        self.embedder = embedding_client
        self._embedding_cache = embedding_cache

    async def retrieve(
        self,
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
            query: Search query text
            user_id: Filter results to this user only (required for privacy)
            top_k: Number of results to return
            vector_weight: Weight for vector vs text (0-1, where 0.5 is balanced)
            at_time: If provided, filter knowledge by validity at this event time
            include_expired: If True, include superseded (expired) records

        Returns:
            RetrievalResult containing knowledge statements
        """
        if self.embedder is None:
            raise RuntimeError("Embedding client required for retrieval")

        # 1. Embed query (with caching)
        query_embedding = None
        if self._embedding_cache is not None:
            query_embedding = self._embedding_cache.get(query)

        if query_embedding is None:
            query_embedding = await self.embedder.embed(query)
            if self._embedding_cache is not None:
                self._embedding_cache.set(query, query_embedding)

        # 2. Search knowledge (filtered by user_id)
        knowledge = await self._search_knowledge(
            query=query,
            query_embedding=query_embedding,
            top_k=top_k,
            vector_weight=vector_weight,
            user_id=user_id,
            at_time=at_time,
            include_expired=include_expired,
        )

        return RetrievalResult(retrieved_knowledge=knowledge)

    async def _search_knowledge(
        self,
        query: str,
        query_embedding: list[float],
        top_k: int,
        vector_weight: float,
        user_id: str,
        at_time: datetime | None = None,
        include_expired: bool = False,
    ) -> list[SemanticKnowledge]:
        """Search knowledge using hybrid vector + text search, filtered by user_id."""
        # Vector search (filtered by user_id)
        vector_ids = await self.vector_index.search(query_embedding, top_k=top_k * 3, user_id=user_id)

        # Text search (BM25) (filtered by user_id)
        text_ids = await self.text_index.search(query, top_k=top_k * 3, user_id=user_id)

        # RRF fusion
        fused_ids = self._rrf_fusion(vector_ids, text_ids, vector_weight=vector_weight)

        # Fetch full objects (deduplicated) with temporal filtering
        knowledge = []
        seen = set()
        for kid in fused_ids:
            if kid in seen:
                continue
            if len(knowledge) >= top_k:
                break

            k = await self.knowledge.get(kid)
            if k:
                # Apply temporal filtering
                if not self._passes_temporal_filter(k, at_time, include_expired):
                    continue
                knowledge.append(k)
                seen.add(kid)

        return knowledge

    def _passes_temporal_filter(
        self,
        knowledge: SemanticKnowledge,
        at_time: datetime | None,
        include_expired: bool,
    ) -> bool:
        """Check if knowledge passes temporal filtering criteria."""
        # Filter by transaction time (expired_at)
        if not include_expired and not knowledge.is_current():
            return False

        # Filter by event time (valid_at/invalid_at)
        if at_time is not None and not knowledge.is_valid_at(at_time):
            return False

        return True

    def _rrf_fusion(
        self,
        vector_ids: list[UUID],
        text_ids: list[UUID],
        vector_weight: float = 0.5,
        k: int = 60,  # RRF constant
    ) -> list[UUID]:
        """
        Reciprocal Rank Fusion.

        RRF score = vector_weight * (1/(k + rank_vector)) +
                    (1 - vector_weight) * (1/(k + rank_text))

        k=60 is standard from literature.
        """
        scores: dict[UUID, float] = {}

        # Vector contributions
        for rank, uid in enumerate(vector_ids):
            scores[uid] = scores.get(uid, 0.0) + vector_weight * (1 / (k + rank + 1))

        # Text contributions
        text_weight = 1.0 - vector_weight
        for rank, uid in enumerate(text_ids):
            scores[uid] = scores.get(uid, 0.0) + text_weight * (1 / (k + rank + 1))

        # Sort by score descending
        sorted_ids = sorted(scores.keys(), key=lambda uid: scores[uid], reverse=True)
        return sorted_ids
