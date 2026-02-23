# Configuration

All configuration lives in `MemoryConfig`. Pass it to `Memory()` directly, or override individual parameters.

## MemoryConfig

```python
from memv import Memory, MemoryConfig

config = MemoryConfig(
    max_statements_for_prediction=5,
    enable_episode_merging=False,
)
memory = Memory(config=config, embedding_client=embedder, llm_client=llm)
```

Individual params override `config` values:

```python
# config says auto_process=False, but this overrides it
memory = Memory(config=config, auto_process=True, ...)
```

## Reference

### Database

| Parameter | Default | Description |
|-----------|---------|-------------|
| `db_path` | `".db/memory.db"` | SQLite database file path. Parent directories are auto-created. |
| `embedding_dimensions` | `1536` | Vector dimensions. Must match your embedding model. |

### Processing Triggers

| Parameter | Default | Description |
|-----------|---------|-------------|
| `auto_process` | `False` | Enable automatic background processing when message threshold is reached. |
| `batch_threshold` | `10` | Number of messages that triggers auto-processing. |
| `max_retries` | `1` | Retry attempts on processing failure. |

### Segmentation

| Parameter | Default | Description |
|-----------|---------|-------------|
| `segmentation_threshold` | `20` | Maximum messages per episode. |
| `time_gap_minutes` | `30` | Time gap (minutes) that triggers a new episode boundary. |

### Episode Merging

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enable_episode_merging` | `True` | Merge similar episodes to reduce redundancy. |
| `merge_similarity_threshold` | `0.9` | Embedding similarity threshold for merging (0-1). |

### Knowledge Deduplication

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enable_knowledge_dedup` | `True` | Deduplicate similar knowledge entries. |
| `knowledge_dedup_threshold` | `0.8` | Similarity threshold for deduplication (0-1). |

### Predict-Calibrate

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_statements_for_prediction` | `10` | How many existing knowledge statements to use during prediction. More = better predictions, higher token cost. |

### Embedding Cache

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enable_embedding_cache` | `True` | Cache query embeddings to reduce API calls. |
| `embedding_cache_size` | `1000` | Max entries in the LRU cache. |
| `embedding_cache_ttl_seconds` | `600` | Cache entry TTL (10 minutes). |

## Common Configurations

### High-throughput chat agent

```python
memory = Memory(
    auto_process=True,
    batch_threshold=20,
    enable_episode_merging=True,
    enable_knowledge_dedup=True,
    enable_embedding_cache=True,
    # ...
)
```

### Precision extraction (slower, more accurate)

```python
memory = Memory(
    max_statements_for_prediction=20,
    knowledge_dedup_threshold=0.95,
    merge_similarity_threshold=0.95,
    # ...
)
```

### Minimal (no optional processing)

```python
memory = Memory(
    enable_episode_merging=False,
    enable_knowledge_dedup=False,
    enable_embedding_cache=False,
    # ...
)
```
