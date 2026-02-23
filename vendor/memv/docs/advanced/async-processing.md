# Async Processing

memv supports both synchronous and non-blocking processing modes.

## Synchronous Processing

The simplest approach — call `process()` and wait:

```python
count = await memory.process(user_id)
print(f"Extracted {count} knowledge entries")
```

This blocks until all messages are processed. Fine for scripts and batch jobs.

## Non-Blocking Processing

For interactive agents, use `process_async()` to avoid blocking the response loop:

```python
task = memory.process_async(user_id)

# Do other work while processing runs...
await some_other_operation()

# Check status without blocking
if task.done:
    print(f"Status: {task.status}, Count: {task.knowledge_count}")

# Or wait for completion
count = await task.wait()
```

### ProcessTask

The returned `ProcessTask` tracks processing state:

| Property | Type | Description |
|----------|------|-------------|
| `user_id` | `str` | User being processed |
| `status` | `ProcessStatus` | `PENDING`, `RUNNING`, `COMPLETED`, or `FAILED` |
| `knowledge_count` | `int` | Entries extracted (after completion) |
| `error` | `str \| None` | Error message if failed |
| `done` | `bool` | `True` if `COMPLETED` or `FAILED` |

## Auto-Processing

Enable `auto_process` to trigger processing automatically when messages accumulate:

```python
memory = Memory(
    auto_process=True,
    batch_threshold=10,  # Process after 10 messages (5 exchanges)
    # ...
)

async with memory:
    # Just add exchanges — processing happens in background
    for user_msg, assistant_msg in exchanges:
        await memory.add_exchange(user_id, user_msg, assistant_msg)
    # After 10 messages, processing triggers automatically
```

This is the recommended mode for interactive agents. The agent keeps responding while knowledge extraction runs in the background.

## Flushing

Force processing of buffered messages regardless of threshold:

```python
# Process everything pending, wait for completion
count = await memory.flush(user_id)
```

Useful when ending a session — you don't want unprocessed messages left behind:

```python
async with memory:
    # ... chat loop ...

    # On exit, flush remaining messages
    count = await memory.flush(user_id)
```

## Waiting for Background Tasks

If you need to ensure all background processing is done:

```python
count = await memory.wait_for_processing(user_id, timeout=30)
```

This waits for any in-flight `process_async` tasks to complete, with an optional timeout in seconds.
