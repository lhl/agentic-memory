"""Main Textual app for the Memory Dashboard."""

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Grid
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Footer, Header, Input, Label, Select, Static, TabbedContent, TabPane, Tree

from memv import Memory
from memv.embeddings import OpenAIEmbedAdapter
from memv.llm import PydanticAIAdapter
from memv.models import Episode, Message, MessageRole, SemanticKnowledge
from memv.storage import EpisodeStore, KnowledgeStore, MessageStore, TextIndex, VectorIndex


class ConfirmDeleteScreen(ModalScreen[bool]):
    """Modal screen for delete confirmation."""

    CSS = """
    ConfirmDeleteScreen {
        align: center middle;
    }

    #confirm-dialog {
        width: 60;
        height: auto;
        border: thick $error;
        background: $surface;
        padding: 1 2;
    }

    #confirm-dialog Label {
        width: 100%;
        text-align: center;
        margin-bottom: 1;
    }

    #confirm-dialog .preview {
        width: 100%;
        text-align: center;
        margin-bottom: 1;
        color: $text-muted;
    }

    #confirm-buttons {
        width: 100%;
        height: auto;
        grid-size: 2;
        grid-gutter: 1;
    }

    #confirm-buttons Button {
        width: 100%;
    }
    """

    def __init__(self, item_type: str, item_preview: str) -> None:
        super().__init__()
        self.item_type = item_type
        self.item_preview = item_preview[:60] + "..." if len(item_preview) > 60 else item_preview

    def compose(self) -> ComposeResult:
        with Container(id="confirm-dialog"):
            yield Label(f"[bold red]Delete {self.item_type}?[/]")
            yield Static(self.item_preview, classes="preview")
            with Grid(id="confirm-buttons"):
                yield Button("Cancel", variant="default", id="cancel")
                yield Button("Delete", variant="error", id="delete")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        self.dismiss(event.button.id == "delete")


class DashboardApp(App):
    """Memory Dashboard TUI Application."""

    CSS = """
    TabbedContent {
        height: 1fr;
    }

    ContentSwitcher {
        height: 1fr;
    }

    TabPane {
        height: 1fr;
        padding: 1;
    }

    DataTable {
        height: 1fr;
    }

    Tree {
        height: 1fr;
    }

    #stats {
        padding: 1;
    }

    .user-select {
        margin-bottom: 1;
    }

    #search-input {
        margin-bottom: 1;
    }

    #search-status {
        margin-bottom: 1;
        color: $text-muted;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("d", "delete", "Delete"),
        Binding("c", "clear_user", "Clear User"),
        Binding("p", "process", "Process"),
    ]

    TITLE = "Memory Dashboard"

    def __init__(self, db_path: str, **kwargs) -> None:
        super().__init__(**kwargs)
        self.db_path = db_path
        self._users: list[str] = []
        self._messages: list[Message] = []
        self._episodes: list[Episode] = []
        self._knowledge: list[SemanticKnowledge] = []
        self._current_messages_user: str | None = None
        self._current_episodes_user: str | None = None

    def compose(self) -> ComposeResult:
        yield Header()
        with TabbedContent(id="tabs"):
            with TabPane("Overview", id="tab-overview"):
                yield Static("Loading...", id="stats")
            with TabPane("Messages", id="tab-messages"):
                yield Select(options=[], prompt="Select user...", id="msg-user-select", classes="user-select")
                yield DataTable(id="msg-table")
            with TabPane("Episodes", id="tab-episodes"):
                yield Select(options=[], prompt="Select user...", id="ep-user-select", classes="user-select")
                yield Tree("Episodes", id="ep-tree")
            with TabPane("Knowledge", id="tab-knowledge"):
                yield DataTable(id="knowledge-table")
            with TabPane("Search", id="tab-search"):
                yield Input(placeholder="Search...", id="search-input")
                yield Static("Enter query to search", id="search-status")
                yield DataTable(id="search-table")
        yield Footer()

    async def on_mount(self) -> None:
        # Setup tables
        msg_table = self.query_one("#msg-table", DataTable)
        msg_table.add_columns("Time", "Role", "Content")
        msg_table.cursor_type = "row"

        knowledge_table = self.query_one("#knowledge-table", DataTable)
        knowledge_table.add_columns("Importance", "Statement", "Created")
        knowledge_table.cursor_type = "row"

        search_table = self.query_one("#search-table", DataTable)
        search_table.add_columns("Type", "Score", "Content")
        search_table.cursor_type = "row"

        # Load initial data
        await self._refresh_all()

    async def _refresh_all(self) -> None:
        await self._load_users()
        await self._load_stats()
        await self._load_knowledge()

    async def _load_users(self) -> None:
        async with MessageStore(self.db_path) as store:
            self._users = await store.list_users()

        options = [(u, u) for u in self._users]

        msg_select = self.query_one("#msg-user-select", Select)
        msg_select.set_options(options)

        ep_select = self.query_one("#ep-user-select", Select)
        ep_select.set_options(options)

        if self._users:
            first = self._users[0]
            msg_select.value = first
            ep_select.value = first
            await self._load_messages(first)
            await self._load_episodes(first)

    async def _load_stats(self) -> None:
        lines = ["[bold]Memory Statistics[/]\n"]

        total_msgs = 0
        total_eps = 0

        async with MessageStore(self.db_path) as store:
            for uid in self._users:
                cnt = await store.count(uid)
                total_msgs += cnt

        async with EpisodeStore(self.db_path) as store:
            for uid in self._users:
                cnt = await store.count(uid)
                total_eps += cnt

        async with KnowledgeStore(self.db_path) as store:
            total_k = await store.count()

        lines.append(f"Messages: {total_msgs}")
        lines.append(f"Episodes: {total_eps}")
        lines.append(f"Knowledge: {total_k}")

        if self._users:
            lines.append(f"\nUsers: {', '.join(self._users)}")

        self.query_one("#stats", Static).update("\n".join(lines))

    async def _load_messages(self, user_id: str) -> None:
        self._current_messages_user = user_id
        async with MessageStore(self.db_path) as store:
            self._messages = await store.get_by_user(user_id)

        table = self.query_one("#msg-table", DataTable)
        table.clear()
        for msg in self._messages:
            time_str = msg.sent_at.strftime("%Y-%m-%d %H:%M")
            role_colors = {MessageRole.USER: "cyan", MessageRole.ASSISTANT: "green", MessageRole.SYSTEM: "yellow"}
            role_style = role_colors.get(msg.role, "white")
            content = msg.content[:80].replace("\n", " ")
            table.add_row(time_str, f"[{role_style}]{msg.role.value}[/]", content)

    async def _load_episodes(self, user_id: str) -> None:
        self._current_episodes_user = user_id
        async with EpisodeStore(self.db_path) as store:
            self._episodes = await store.get_by_user(user_id)

        tree = self.query_one("#ep-tree", Tree)
        tree.clear()
        for ep in self._episodes:
            time_range = f"{ep.start_time.strftime('%m/%d %H:%M')}"
            node = tree.root.add(f"[bold]{ep.title}[/] ({time_range})")
            node.add_leaf(f"[dim]{ep.content[:100]}[/]")
        tree.root.expand_all()

    async def _load_knowledge(self) -> None:
        async with KnowledgeStore(self.db_path) as store:
            self._knowledge = await store.get_all()

        table = self.query_one("#knowledge-table", DataTable)
        table.clear()
        for k in self._knowledge:
            imp = f"{k.importance_score:.2f}" if k.importance_score else "-"
            stmt = k.statement[:100]
            created = k.created_at.strftime("%Y-%m-%d %H:%M")
            table.add_row(imp, stmt, created)

    async def on_select_changed(self, event: Select.Changed) -> None:
        if event.value == Select.BLANK:
            return
        user_id = str(event.value)
        if event.select.id == "msg-user-select":
            await self._load_messages(user_id)
        elif event.select.id == "ep-user-select":
            await self._load_episodes(user_id)

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        if event.input.id == "search-input" and event.value:
            await self._search(event.value)

    async def _search(self, query: str) -> None:
        status = self.query_one("#search-status", Static)
        status.update("Searching...")

        results: list[tuple[str, float, str]] = []
        q = query.lower()

        for k in self._knowledge:
            if q in k.statement.lower():
                score = k.importance_score or 0.5
                results.append(("Knowledge", score, k.statement[:80]))

        for ep in self._episodes:
            if q in ep.title.lower() or q in ep.content.lower():
                results.append(("Episode", 0.5, ep.title))

        results.sort(key=lambda x: x[1], reverse=True)

        table = self.query_one("#search-table", DataTable)
        table.clear()
        for typ, score, content in results:
            table.add_row(typ, f"{score:.2f}", content)

        status.update(f"Found {len(results)} results")

    async def action_refresh(self) -> None:
        await self._refresh_all()
        self.notify("Refreshed")

    async def action_delete(self) -> None:
        tabs = self.query_one("#tabs", TabbedContent)
        active = tabs.active

        if active == "tab-messages":
            await self._delete_message()
        elif active == "tab-episodes":
            await self._delete_episode()
        elif active == "tab-knowledge":
            await self._delete_knowledge()
        else:
            self.notify("Delete not available here", severity="warning")

    async def _delete_message(self) -> None:
        table = self.query_one("#msg-table", DataTable)
        if table.cursor_row is None or table.cursor_row >= len(self._messages):
            self.notify("No message selected", severity="warning")
            return
        msg = self._messages[table.cursor_row]

        def on_confirm(confirmed: bool | None) -> None:
            if confirmed:
                self.run_worker(self._do_delete_message(msg))

        self.push_screen(ConfirmDeleteScreen("message", msg.content), on_confirm)

    async def _do_delete_message(self, msg: Message) -> None:
        async with MessageStore(self.db_path) as store:
            await store.delete(msg.id)
        self.notify("Message deleted")
        if self._current_messages_user:
            await self._load_messages(self._current_messages_user)
        await self._load_stats()

    async def _delete_episode(self) -> None:
        if not self._episodes:
            self.notify("No episode selected", severity="warning")
            return
        # For tree, we'll delete first episode for simplicity
        tree = self.query_one("#ep-tree", Tree)
        if tree.cursor_node is None or tree.cursor_node == tree.root:
            self.notify("Select an episode first", severity="warning")
            return

        # Find which episode is selected (walk up to find root-level node)
        node = tree.cursor_node
        while node.parent and node.parent != tree.root:
            node = node.parent

        idx = list(tree.root.children).index(node) if node in tree.root.children else -1
        if idx < 0 or idx >= len(self._episodes):
            self.notify("No episode selected", severity="warning")
            return

        ep = self._episodes[idx]

        def on_confirm(confirmed: bool | None) -> None:
            if confirmed:
                self.run_worker(self._do_delete_episode(ep))

        self.push_screen(ConfirmDeleteScreen("episode", ep.title), on_confirm)

    async def _do_delete_episode(self, ep: Episode) -> None:
        async with KnowledgeStore(self.db_path) as k_store:
            knowledge = await k_store.get_by_episode(ep.id)
            for k in knowledge:
                await k_store.delete(k.id)
        async with EpisodeStore(self.db_path) as store:
            await store.delete(ep.id)
        self.notify("Episode deleted")
        if self._current_episodes_user:
            await self._load_episodes(self._current_episodes_user)
        await self._load_knowledge()
        await self._load_stats()

    async def _delete_knowledge(self) -> None:
        table = self.query_one("#knowledge-table", DataTable)
        if table.cursor_row is None or table.cursor_row >= len(self._knowledge):
            self.notify("No knowledge selected", severity="warning")
            return
        k = self._knowledge[table.cursor_row]

        def on_confirm(confirmed: bool | None) -> None:
            if confirmed:
                self.run_worker(self._do_delete_knowledge(k))

        self.push_screen(ConfirmDeleteScreen("knowledge", k.statement), on_confirm)

    async def _do_delete_knowledge(self, k: SemanticKnowledge) -> None:
        async with KnowledgeStore(self.db_path) as store:
            await store.delete(k.id)
        self.notify("Knowledge deleted")
        await self._load_knowledge()
        await self._load_stats()

    async def action_clear_user(self) -> None:
        """Clear all data for selected user."""
        if not self._users:
            self.notify("No users found", severity="warning")
            return

        # Use currently selected user from messages tab, or first user
        user_id = self._current_messages_user or (self._users[0] if self._users else None)
        if not user_id:
            self.notify("No user selected", severity="warning")
            return

        def on_confirm(confirmed: bool | None) -> None:
            if confirmed:
                self.run_worker(self._do_clear_user(user_id))

        self.push_screen(ConfirmDeleteScreen("all data for user", user_id), on_confirm)

    async def _do_clear_user(self, user_id: str) -> None:
        """Delete all data for a user including indices."""
        # Get episode IDs first
        async with EpisodeStore(self.db_path) as ep_store:
            episodes = await ep_store.get_by_user(user_id)
            episode_ids = [ep.id for ep in episodes]

        counts: dict[str, int] = {}

        # Clear knowledge indices (vector and text)
        async with VectorIndex(self.db_path, name="knowledge") as vec_idx:
            counts["knowledge_vectors"] = await vec_idx.clear_user(user_id)

        async with TextIndex(self.db_path, name="knowledge") as txt_idx:
            counts["knowledge_text"] = await txt_idx.clear_user(user_id)

        # Clear knowledge by episode IDs
        async with KnowledgeStore(self.db_path) as k_store:
            counts["knowledge"] = await k_store.clear_by_episodes(episode_ids)

        # Clear episodes
        async with EpisodeStore(self.db_path) as ep_store:
            counts["episodes"] = await ep_store.clear_user(user_id)

        # Note: Messages are preserved intentionally to allow re-processing

        total = sum(counts.values())
        self.notify(f"Cleared {total} items for user {user_id}")
        await self._refresh_all()

    async def action_process(self) -> None:
        """Run memory processing for selected user."""
        if not self._users:
            self.notify("No users found", severity="warning")
            return

        user_id = self._current_messages_user or (self._users[0] if self._users else None)
        if not user_id:
            self.notify("No user selected", severity="warning")
            return

        self.notify(f"Processing memories for {user_id}...")
        self.run_worker(self._do_process(user_id))

    async def _do_process(self, user_id: str) -> None:
        """Run memory processing."""
        try:
            embedder = OpenAIEmbedAdapter()
            llm = PydanticAIAdapter("openai:gpt-4o-mini")

            async with Memory(
                db_path=self.db_path,
                embedding_client=embedder,
                llm_client=llm,
            ) as memory:
                count = await memory.process(user_id)

            self.notify(f"Extracted {count} knowledge entries")
            await self._refresh_all()

        except Exception as e:
            self.notify(f"Processing failed: {e}", severity="error")
