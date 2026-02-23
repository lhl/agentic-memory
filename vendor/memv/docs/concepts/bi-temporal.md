# Bi-Temporal Validity

memv tracks knowledge across two independent timelines. Based on [Graphiti](https://github.com/getzep/graphiti).

## Two Timelines

| Timeline | Fields | Question it answers |
|----------|--------|-------------------|
| **Event time** | `valid_at` / `invalid_at` | When was this fact true in the world? |
| **Transaction time** | `created_at` / `expired_at` | When did memv learn/record this? |

### Example

A user says "I work at Anthropic" in January, then says "I just moved to OpenAI" in March.

| Statement | valid_at | invalid_at | created_at | expired_at |
|-----------|----------|------------|------------|------------|
| Works at Anthropic | Jan 1 | Mar 1 | Jan 1 | Mar 1 |
| Works at OpenAI | Mar 1 | *None* | Mar 1 | *None* |

- The Anthropic fact has `invalid_at=Mar 1` (no longer true) and `expired_at=Mar 1` (superseded)
- The OpenAI fact has `invalid_at=None` (still true) and `expired_at=None` (current record)

## Contradiction Handling

When predict-calibrate detects a contradiction, it doesn't delete the old fact. Instead:

1. The old `SemanticKnowledge` entry gets `expired_at` set to now
2. A new entry is created with the updated information
3. Full history is preserved

```python
# Check if a knowledge entry is still current
knowledge.is_current()  # expired_at is None

# Check if a fact was true at a specific time
knowledge.is_valid_at(datetime(2024, 2, 1))
```

## Point-in-Time Queries

The bi-temporal model enables querying knowledge as it was at any moment:

```python
from datetime import datetime

# What did we know about user's job in January 2024?
result = await memory.retrieve(
    "Where does user work?",
    user_id="user-123",
    at_time=datetime(2024, 1, 1),
)

# Show full history including superseded facts
result = await memory.retrieve(
    "Where does user work?",
    user_id="user-123",
    include_expired=True,
)
```

## Why Not Just Overwrite?

Overwriting loses information. With bi-temporal tracking:

- You can reconstruct what you knew at any point in time
- You can see how a user's situation evolved
- Debugging is easier — you can trace when and why knowledge changed
- Rollback is possible — superseded records still exist
