"""Processing pipeline: episode creation, knowledge extraction, indexing."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from memv.models import (
    Episode,
    ExtractedKnowledge,
    Message,
    SemanticKnowledge,
)
from memv.processing.temporal import backfill_temporal_fields

if TYPE_CHECKING:
    from memv.memory._lifecycle import LifecycleManager

logger = logging.getLogger(__name__)


class Pipeline:
    """Handles message processing, episode generation, and knowledge extraction."""

    def __init__(self, lifecycle: LifecycleManager):
        self._lc = lifecycle

    async def process(self, user_id: str) -> int:
        """
        Process unprocessed messages for a user into episodes and extract knowledge.

        Returns:
            Number of knowledge entries extracted
        """
        self._lc.ensure_open()
        if self._lc.llm is None:
            raise RuntimeError("LLM client required for processing. Pass llm_client to Memory().")

        # Get unprocessed messages (those after the last processed episode)
        all_messages = await self._lc.messages.get_by_user(user_id)
        episodes = await self._lc.episodes.get_by_user(user_id)

        if episodes:
            latest_end = max(ep.end_time for ep in episodes)
            unprocessed = [m for m in all_messages if m.sent_at > latest_end]
        else:
            unprocessed = all_messages

        if not unprocessed:
            return 0

        # Segment into episodes
        episodes_messages = await self._segment_messages(unprocessed)

        # Process episodes sequentially to ensure each sees prior extractions
        total_extracted = 0
        for messages in episodes_messages:
            count = await self._process_episode(messages, user_id)
            total_extracted += count

        return total_extracted

    async def process_messages(self, messages: list[Message], user_id: str) -> int:
        """
        Process explicit messages into an episode and extract knowledge.

        Args:
            messages: Messages to process (will be grouped into one episode)
            user_id: User ID for the episode

        Returns:
            Number of knowledge entries extracted
        """
        self._lc.ensure_open()
        if self._lc.llm is None:
            raise RuntimeError("LLM client required for processing.")

        if not messages:
            return 0

        return await self._process_episode(messages, user_id)

    async def _segment_messages(self, messages: list[Message]) -> list[list[Message]]:
        """
        Segment messages into episode-sized chunks.

        Uses BatchSegmenter by default (handles interleaved topics, time gaps).
        Falls back to legacy BoundaryDetector if use_legacy_segmentation=True.
        """
        if not messages:
            return []

        # Use new batch segmenter (default)
        if self._lc.segmenter is not None:
            return await self._lc.segmenter.segment(messages)

        # Legacy: incremental boundary detection (deprecated)
        if self._lc.legacy_boundary_detector is not None:
            return await self._segment_messages_legacy(messages)

        # No segmenter available, return all as one episode
        return [messages]

    async def _segment_messages_legacy(self, messages: list[Message]) -> list[list[Message]]:
        """Legacy segmentation using BoundaryDetector (deprecated)."""
        if not messages or not self._lc.legacy_boundary_detector:
            return [messages] if messages else []

        episodes: list[list[Message]] = []
        buffer: list[Message] = []

        for message in messages:
            should_split, _signal = await self._lc.legacy_boundary_detector.should_segment(message, buffer)

            if should_split and buffer:
                episodes.append(buffer)
                buffer = []

            buffer.append(message)

        if buffer:
            episodes.append(buffer)

        return episodes

    async def _process_episode(self, messages: list[Message], user_id: str) -> int:
        """Process a single episode: generate, merge if needed, index, extract, store."""
        if not self._lc.episode_generator or not self._lc.extractor or not self._lc.retriever:
            raise RuntimeError("Processing components not initialized")

        # 1. Generate episode
        episode = await self._lc.episode_generator.generate(messages, user_id)

        # 2. Check for episode merging
        merged_with: Episode | None = None
        if self._lc.episode_merger is not None:
            existing_episodes = await self._lc.episodes.get_by_user(user_id)
            episode, merged_with = await self._lc.episode_merger.merge_if_appropriate(episode, existing_episodes)

            if merged_with is not None:
                await self._lc.episodes.delete(merged_with.id)

        # 3. Store episode (new or merged)
        await self._lc.episodes.add(episode)

        # 4. Retrieve existing knowledge for predict-calibrate
        existing = await self._lc.retriever.retrieve(
            query=f"{episode.title} {episode.content}",
            user_id=user_id,
            top_k=self._lc.max_statements_for_prediction,
        )

        # 5. Extract novel knowledge
        extracted = await self._lc.extractor.extract(
            episode=episode,
            existing_knowledge=existing.retrieved_knowledge,
        )

        # 6. Backfill temporal fields from temporal_info
        for item in extracted:
            if item.temporal_info:
                item.valid_at, item.invalid_at = backfill_temporal_fields(
                    item.temporal_info,
                    item.valid_at,
                    item.invalid_at,
                    episode.end_time,
                )

        # 7. Filter out low-quality extractions
        extracted = [item for item in extracted if self._validate_extraction(item)]

        # 8. Convert to SemanticKnowledge and store with embeddings
        if not extracted:
            return 0

        # Batch embed all statements
        statements = [item.statement for item in extracted]
        embeddings = await self._lc.embedder.embed_batch(statements)

        # 9. Process each extracted item
        stored_count = 0
        for item, embedding in zip(extracted, embeddings, strict=True):
            # Handle contradictions
            if item.knowledge_type == "contradiction":
                await self._invalidate_contradicted_knowledge(embedding, user_id)

            # Check for duplicates if enabled
            if self._lc.enable_knowledge_dedup:
                is_duplicate, score = await self._is_duplicate_knowledge(embedding, user_id)
                if is_duplicate:
                    logger.info(f"Skipping duplicate: '{item.statement[:50]}...' (score={score:.3f})")
                    continue

            knowledge = SemanticKnowledge(
                statement=item.statement,
                source_episode_id=episode.id,
                importance_score=item.confidence,
                embedding=embedding,
                valid_at=item.valid_at,
                invalid_at=item.invalid_at,
            )

            await self._lc.knowledge.add(knowledge)
            await self._lc.vector_index.add(knowledge.id, embedding, user_id)
            await self._lc.text_index.add(knowledge.id, knowledge.statement, user_id)
            stored_count += 1

        return stored_count

    def _validate_extraction(self, item: ExtractedKnowledge) -> bool:
        """Filter low-confidence extractions."""
        if item.confidence < 0.7:
            logger.debug("Rejected (low confidence %.2f): %s", item.confidence, item.statement[:60])
            return False

        return True

    async def _is_duplicate_knowledge(self, embedding: list[float], user_id: str) -> tuple[bool, float]:
        """Check if knowledge with this embedding already exists for this user."""
        similar = await self._lc.vector_index.search_with_scores(embedding, top_k=1, user_id=user_id)

        if not similar:
            return False, 0.0

        _top_id, top_score = similar[0]
        return top_score >= self._lc.knowledge_dedup_threshold, top_score

    async def _invalidate_contradicted_knowledge(self, new_embedding: list[float], user_id: str) -> None:
        """Find and invalidate existing knowledge that contradicts the new statement."""
        similar = await self._lc.vector_index.search_with_scores(new_embedding, top_k=1, user_id=user_id)

        if not similar:
            return

        top_id, top_score = similar[0]
        contradiction_threshold = 0.7
        if top_score >= contradiction_threshold:
            await self._lc.knowledge.invalidate(top_id)
