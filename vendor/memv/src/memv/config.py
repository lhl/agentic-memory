"""Configuration dataclass for AgentMemory."""

from dataclasses import dataclass


@dataclass
class MemoryConfig:
    """Configuration for Memory system.

    Provides centralized configuration with sensible defaults.
    Can be passed to Memory() or individual params can be overridden.

    Example:
        ```python
        config = MemoryConfig(
            max_statements_for_prediction=5,
            enable_episode_merging=False,
        )
        memory = Memory(config=config, embedding_client=embedder, llm_client=llm)
        ```
    """

    # Database
    db_path: str = ".db/memory.db"
    embedding_dimensions: int = 1536

    # Processing triggers
    auto_process: bool = False
    batch_threshold: int = 10
    max_retries: int = 1

    # Segmentation
    segmentation_threshold: int = 20
    time_gap_minutes: int = 30
    use_legacy_segmentation: bool = False

    # Episode merging
    enable_episode_merging: bool = True
    merge_similarity_threshold: float = 0.9

    # Knowledge deduplication
    enable_knowledge_dedup: bool = True
    knowledge_dedup_threshold: float = 0.8

    # Prediction-calibrate
    max_statements_for_prediction: int = 10

    # Embedding cache
    enable_embedding_cache: bool = True
    embedding_cache_size: int = 1000
    embedding_cache_ttl_seconds: int = 600
