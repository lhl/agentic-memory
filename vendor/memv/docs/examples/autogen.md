# AutoGen

Integrates memv into a Microsoft AutoGen `AssistantAgent`. Memory context is injected into the agent's system message.

```bash
uv run python examples/autogen_agent.py
```

Requires: `pip install autogen-agentchat autogen-ext[openai]`

## The Pattern

AutoGen agents accept a `system_message` at creation. Memory context is appended to the base message, and a fresh agent is created per turn:

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(model="gpt-4o-mini")

agent = AssistantAgent(
    name="assistant",
    model_client=model_client,
    system_message=system_message,  # Includes memory context
)
```

## Integration

```python
async def chat(self, user_message: str) -> str:
    # 1. Retrieve context
    result = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

    # 2. Build system message with context
    system_message = BASE_SYSTEM_PROMPT
    context_prompt = result.to_prompt()
    if context_prompt:
        system_message += f"\n\n{context_prompt}"

    # 3. Create agent and run
    agent = AssistantAgent(
        name="assistant",
        model_client=self.model_client,
        system_message=system_message,
    )
    task_result = await agent.run(task=user_message)
    assistant_message = task_result.messages[-1].content

    # 4. Store exchange
    await self.memory.add_exchange(
        user_id=self.user_id,
        user_message=user_message,
        assistant_message=assistant_message,
    )

    return assistant_message
```

## Notes

- The `model_client` is reused across turns; only the agent is recreated with fresh context
- For multi-agent conversations (GroupChat), inject memory context into the initiating agent's system message
- AutoGen's built-in memory/teachability features work differently — memv provides predict-calibrate extraction as an alternative

See the [full source](https://github.com/vstorm-co/memv/blob/main/examples/autogen_agent.py) for the complete interactive example.
