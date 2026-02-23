# CrewAI

Integrates memv into a CrewAI agent. Memory context is injected into the agent's backstory before each task.

```bash
uv run python examples/crewai_agent.py
```

Requires: `pip install crewai`

## The Pattern

CrewAI agents have a `backstory` field that shapes their behavior. Memory context is appended to the base backstory, and a fresh agent/crew is created per turn:

```python
agent = Agent(
    role="Personal Assistant",
    goal="Help the user using knowledge from past conversations.",
    backstory=backstory,  # Includes memory context
    llm="openai/gpt-4o-mini",
    verbose=False,
)
task = Task(
    description=user_message,
    expected_output="A helpful response.",
    agent=agent,
)
crew = Crew(agents=[agent], tasks=[task], verbose=False)
```

## Integration

```python
async def chat(self, user_message: str) -> str:
    # 1. Retrieve context
    result = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

    # 2. Build backstory with context
    backstory = BASE_BACKSTORY
    context_prompt = result.to_prompt()
    if context_prompt:
        backstory += f"\n\n{context_prompt}"

    # 3. Create agent and run crew
    agent = Agent(
        role="Personal Assistant",
        goal="Help the user using knowledge from past conversations.",
        backstory=backstory,
        llm="openai/gpt-4o-mini",
        verbose=False,
    )
    task = Task(description=user_message, expected_output="A helpful response.", agent=agent)
    crew = Crew(agents=[agent], tasks=[task], verbose=False)

    # CrewAI's kickoff is synchronous
    loop = asyncio.get_event_loop()
    crew_result = await loop.run_in_executor(None, crew.kickoff)

    # 4. Store exchange
    await self.memory.add_exchange(
        user_id=self.user_id,
        user_message=user_message,
        assistant_message=str(crew_result),
    )

    return str(crew_result)
```

## Notes

- CrewAI's `kickoff()` is synchronous, so it's run in an executor to avoid blocking the async loop
- A fresh agent/crew is created per turn to inject updated memory context
- For multi-agent crews, you could have a dedicated "memory retrieval" agent that feeds context to other agents

See the [full source](https://github.com/vstorm-co/memv/blob/main/examples/crewai_agent.py) for the complete interactive example.
