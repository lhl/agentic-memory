.DEFAULT_GOAL := all

.PHONY: .uv
.uv: ## Check that uv is installed
	@uv --version || echo 'Please install uv: https://docs.astral.sh/uv/getting-started/installation/'

.PHONY: .pre-commit
.pre-commit: ## Check that pre-commit is installed
	@pre-commit -V || echo 'Please install pre-commit: https://pre-commit.com/'

.PHONY: install
install: .uv .pre-commit ## Install the package, dependencies, and pre-commit for local development
	uv sync --frozen --group dev --group docs
	uv run pre-commit install --install-hooks

.PHONY: sync
sync: .uv ## Update local packages and uv.lock
	uv sync --group dev --group docs

.PHONY: format
format: ## Format the code
	uv run ruff format src/
	uv run ruff check --fix --fix-only src/

.PHONY: lint
lint: ## Lint the code
	uv run ruff format --check src/
	uv run ruff check src/

.PHONY: typecheck
typecheck: ## Run static type checking
	uv run ty check src/

.PHONY: test
test: ## Run tests
	uv run pytest

.PHONY: docs
docs: ## Build the documentation
	uv run mkdocs build --strict

.PHONY: docs-serve
docs-serve: ## Build and serve the documentation
	uv run mkdocs serve

.PHONY: all
all: format lint typecheck test ## Run formatting, linting, type checks, and tests

.PHONY: help
help: ## Show this help (usage: make help)
	@echo "Usage: make [recipe]"
	@echo "Recipes:"
	@awk '/^[a-zA-Z0-9_-]+:.*?##/ { \
		helpMessage = match($$0, /## (.*)/); \
		if (helpMessage) { \
			recipe = $$1; \
			sub(/:/, "", recipe); \
			printf "  \033[36m%-20s\033[0m %s\n", recipe, substr($$0, RSTART + 3, RLENGTH); \
		} \
	}' $(MAKEFILE_LIST)
