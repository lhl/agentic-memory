"""Lifecycle management: initialization, open/close, context manager."""

from __future__ import annotations

import warnings
from pathlib import Path
from typing import TYPE_CHECKING

from memv.cache import EmbeddingCache
from memv.config import MemoryConfig
from memv.processing import BatchSegmenter, BoundaryDetector, EpisodeGenerator, EpisodeMerger, PredictCalibrateExtractor
from memv.retrieval import Retriever
from memv.storage import (
    EpisodeStore,
    KnowledgeStore,
    MessageStore,
    TextIndex,
    VectorIndex,
)

if TYPE_CHECKING:
    from memv.protocols import EmbeddingClient, LLMClient


class LifecycleManager:
    """Manages Memory initialization, database connections, and component lifecycle."""

    def __init__(
        self,
        db_path: str | None = None,
        embedding_client: EmbeddingClient | None = None,
        llm_client: LLMClient | None = None,
        embedding_dimensions: int | None = None,
        config: MemoryConfig | None = None,
        # Auto-processing config
        auto_process: bool | None = None,
        batch_threshold: int | None = None,
        max_retries: int | None = None,
        # Segmentation config
        segmentation_threshold: int | None = None,
        time_gap_minutes: int | None = None,
        use_legacy_segmentation: bool | None = None,
        # Deduplication config
        enable_knowledge_dedup: bool | None = None,
        knowledge_dedup_threshold: float | None = None,
        # Episode merging config
        enable_episode_merging: bool | None = None,
        merge_similarity_threshold: float | None = None,
        # Prediction-calibrate config
        max_statements_for_prediction: int | None = None,
        # Cache config
        enable_embedding_cache: bool | None = None,
        embedding_cache_size: int | None = None,
        embedding_cache_ttl_seconds: int | None = None,
    ):
        # Use config or defaults
        cfg = config or MemoryConfig()

        # Determine database path from argument or config
        if db_path is None and embedding_client is None:
            self.db_path = cfg.db_path
        elif db_path is not None:
            self.db_path = db_path
        else:
            self.db_path = cfg.db_path

        if embedding_client is None:
            raise ValueError("embedding_client is required")
        self.embedder = embedding_client
        self.llm = llm_client

        # Use param if provided, else use config value
        self.dimensions = embedding_dimensions if embedding_dimensions is not None else cfg.embedding_dimensions

        # Auto-processing config
        self.auto_process = auto_process if auto_process is not None else cfg.auto_process
        self.batch_threshold = batch_threshold if batch_threshold is not None else cfg.batch_threshold
        self.max_retries = max_retries if max_retries is not None else cfg.max_retries

        # Segmentation config
        self.segmentation_threshold = segmentation_threshold if segmentation_threshold is not None else cfg.segmentation_threshold
        self.time_gap_minutes = time_gap_minutes if time_gap_minutes is not None else cfg.time_gap_minutes
        self.use_legacy_segmentation = use_legacy_segmentation if use_legacy_segmentation is not None else cfg.use_legacy_segmentation

        # Episode merging config
        self.enable_episode_merging = enable_episode_merging if enable_episode_merging is not None else cfg.enable_episode_merging
        self.merge_similarity_threshold = (
            merge_similarity_threshold if merge_similarity_threshold is not None else cfg.merge_similarity_threshold
        )

        # Knowledge deduplication config
        self.enable_knowledge_dedup = enable_knowledge_dedup if enable_knowledge_dedup is not None else cfg.enable_knowledge_dedup
        self.knowledge_dedup_threshold = (
            knowledge_dedup_threshold if knowledge_dedup_threshold is not None else cfg.knowledge_dedup_threshold
        )

        # Prediction-calibrate config
        self.max_statements_for_prediction = (
            max_statements_for_prediction if max_statements_for_prediction is not None else cfg.max_statements_for_prediction
        )

        # Cache config
        self.enable_embedding_cache = enable_embedding_cache if enable_embedding_cache is not None else cfg.enable_embedding_cache
        self.embedding_cache_size = embedding_cache_size if embedding_cache_size is not None else cfg.embedding_cache_size
        self.embedding_cache_ttl_seconds = (
            embedding_cache_ttl_seconds if embedding_cache_ttl_seconds is not None else cfg.embedding_cache_ttl_seconds
        )

        # Ensure parent directory exists
        db_dir = Path(self.db_path).parent
        if db_dir != Path("."):
            db_dir.mkdir(parents=True, exist_ok=True)

        # Stores
        self.messages = MessageStore(self.db_path)
        self.episodes = EpisodeStore(self.db_path)
        self.knowledge = KnowledgeStore(self.db_path)

        # Knowledge indices
        self.vector_index = VectorIndex(self.db_path, dimensions=self.dimensions, name="knowledge")
        self.text_index = TextIndex(self.db_path, name="knowledge")

        # Processing components (initialized in open())
        self.retriever: Retriever | None = None
        self.segmenter: BatchSegmenter | None = None
        self.legacy_boundary_detector: BoundaryDetector | None = None
        self.episode_generator: EpisodeGenerator | None = None
        self.episode_merger: EpisodeMerger | None = None
        self.extractor: PredictCalibrateExtractor | None = None

        # State
        self.is_open = False

    async def open(self) -> None:
        """Open all database connections and initialize components."""
        if self.is_open:
            return

        await self.messages.open()
        await self.episodes.open()
        await self.knowledge.open()
        await self.vector_index.open()
        await self.text_index.open()
        # Create embedding cache if enabled
        embedding_cache = None
        if self.enable_embedding_cache:
            embedding_cache = EmbeddingCache(
                max_size=self.embedding_cache_size,
                ttl_seconds=self.embedding_cache_ttl_seconds,
            )

        self.retriever = Retriever(
            knowledge_store=self.knowledge,
            vector_index=self.vector_index,
            text_index=self.text_index,
            embedding_client=self.embedder,
            embedding_cache=embedding_cache,
        )

        if self.llm is not None:
            if self.use_legacy_segmentation:
                warnings.warn(
                    "BoundaryDetector is deprecated and will be removed in v0.2.0. Use BatchSegmenter instead (default).",
                    DeprecationWarning,
                    stacklevel=3,
                )
                self.legacy_boundary_detector = BoundaryDetector(self.llm)
            else:
                self.segmenter = BatchSegmenter(
                    llm_client=self.llm,
                    batch_threshold=self.segmentation_threshold,
                    time_gap_minutes=self.time_gap_minutes,
                )
            self.episode_generator = EpisodeGenerator(self.llm)
            if self.enable_episode_merging:
                self.episode_merger = EpisodeMerger(
                    llm_client=self.llm,
                    embedding_client=self.embedder,
                    similarity_threshold=self.merge_similarity_threshold,
                )
            self.extractor = PredictCalibrateExtractor(self.llm)

        self.is_open = True

    async def close(self) -> None:
        """Close all database connections."""
        if not self.is_open:
            return

        await self.messages.close()
        await self.episodes.close()
        await self.knowledge.close()
        await self.vector_index.close()
        await self.text_index.close()
        self.is_open = False

    def ensure_open(self) -> None:
        """Raise if not open."""
        if not self.is_open:
            raise RuntimeError("Memory not open. Call await memory.open() first.")
