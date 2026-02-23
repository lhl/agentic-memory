# PydanticAI

Integrates memv into a PydanticAI agent using the dependency injection system.

```bash
uv run python examples/pydantic_ai_agent.py
```

## The Pattern

PydanticAI uses a `deps_type` for injecting runtime context into agents. Memory context fits naturally here:

```python
@dataclass
class MemoryContext:
    user_id: str
    context_prompt: str


agent: Agent[MemoryContext, str] = Agent(
    "openai:gpt-4o-mini",
    deps_type=MemoryContext,
    system_prompt="You are a helpful assistant with memory.",
)

@agent.system_prompt
def add_memory_context(ctx: RunContext[MemoryContext]) -> str:
    if ctx.deps.context_prompt:
        return f"\n\n{ctx.deps.context_prompt}"
    return ""
```

## Integration

The `chat` method follows the standard retrieve-inject-store pattern:

```python
async def chat(self, user_message: str) -> str:
    # 1. Retrieve context
    result = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

    # 2. Inject via dependency
    deps = MemoryContext(
        user_id=self.user_id,
        context_prompt=result.to_prompt(),
    )
    response = await self.agent.run(user_message, deps=deps)

    # 3. Store exchange
    await self.memory.add_exchange(
        user_id=self.user_id,
        user_message=user_message,
        assistant_message=response.output,
    )

    return response.output
```

## Why PydanticAI?

PydanticAI's `@agent.system_prompt` decorator cleanly separates memory injection from the base system prompt. The dependency system means you don't need global state or closures — context flows through the framework.

See the [full source](https://github.com/vstorm-co/memv/blob/main/examples/pydantic_ai_agent.py) for the complete interactive example.
