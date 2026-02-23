# Installation

## Prerequisites

- Python 3.13+
- OpenAI API key (for default adapters)

## Install from PyPI

```bash
pip install memvee
```

Or with uv:

```bash
uv add memvee
```

## Environment Variables

Set your API key for the default adapters:

```bash
export OPENAI_API_KEY=sk-...
```

Other providers require their own keys:

| Provider | Environment Variable |
|----------|---------------------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_API_KEY` |
| Groq | `GROQ_API_KEY` |

## Development Setup

```bash
git clone https://github.com/vstorm-co/memv.git
cd memv
make install
```

### Running Tests

```bash
uv run pytest
uv run pytest tests/test_models.py::test_name  # Specific test
```

### Code Quality

```bash
make lint
make typecheck
uv run pre-commit run --all-files
```
