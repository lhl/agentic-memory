# Contributing to memv

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/vstorm-co/memv.git
cd memv
make install
```

## Running Tests

```bash
make test        # Run tests
make all         # Run format + lint + typecheck + test
```

## Requirements

All PRs must:

- **Pass Ruff** — `make lint`
- **Pass ty** — `make typecheck`
- **Pass tests** — `make test`

## Quick Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make test` | Run tests |
| `make lint` | Run Ruff linter |
| `make typecheck` | Run ty |
| `make all` | Run all checks |
| `make docs-serve` | Serve docs locally |

## Running Specific Tests

```bash
# Single test
uv run pytest tests/test_models.py::test_function_name -v

# Single file
uv run pytest tests/test_models.py -v

# With debug output
uv run pytest tests/test_models.py -v -s
```

## Code Style

- Line length: 135 characters
- [Ruff](https://github.com/astral-sh/ruff) for linting and formatting
- Run `make lint` to check and `make format` to auto-format
- Follow existing patterns in the codebase

## Pull Request Process

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Ensure `make all` passes
4. Submit a PR with a clear description

## Questions?

Open an issue on [GitHub](https://github.com/vstorm-co/memv/issues).
