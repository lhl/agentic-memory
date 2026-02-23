# LangGraph

Integrates memv into a LangGraph `StateGraph`. Memory context is injected as a system message in the graph state.

```bash
uv run python examples/langgraph_agent.py
```

Requires: `pip install langgraph langchain-openai`

## The Pattern

LangGraph uses typed state dicts. Memory context goes into the messages list as a system message before graph invocation:

```python
class State(TypedDict):
    messages: Annotated[list, add_messages]


def build_graph(llm: ChatOpenAI) -> StateGraph:
    def chatbot(state: State) -> dict:
        return {"messages": [llm.invoke(state["messages"])]}

    builder = StateGraph(State)
    builder.add_node("chatbot", chatbot)
    builder.add_edge(START, "chatbot")
    builder.add_edge("chatbot", END)
    return builder.compile()
```

## Integration

```python
async def chat(self, user_message: str) -> str:
    # 1. Retrieve context
    result = await self.memory.retrieve(user_message, user_id=self.user_id, top_k=5)

    # 2. Build messages with context as system message
    system_content = BASE_SYSTEM_PROMPT
    context_prompt = result.to_prompt()
    if context_prompt:
        system_content += f"\n\n{context_prompt}"

    messages = [
        ("system", system_content),
        ("user", user_message),
    ]

    # 3. Invoke graph
    response = await self.graph.ainvoke({"messages": messages})
    assistant_message = response["messages"][-1].content

    # 4. Store exchange
    await self.memory.add_exchange(
        user_id=self.user_id,
        user_message=user_message,
        assistant_message=assistant_message,
    )

    return assistant_message
```

## Notes

- Memory context is rebuilt per turn — each invocation gets fresh context from retrieval
- The graph itself is stateless with respect to memory; state management lives in memv
- For multi-node graphs, you could retrieve context in a dedicated node before the chatbot node

See the [full source](https://github.com/vstorm-co/memv/blob/main/examples/langgraph_agent.py) for the complete interactive example.
