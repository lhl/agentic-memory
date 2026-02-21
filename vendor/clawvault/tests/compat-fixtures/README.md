# Compatibility Fixtures

This directory is reserved for compatibility-fixture testing.

The previous fixture/validator script stack referenced by older docs (`scripts/*.mjs`, extended compat report validators) is not present in this checkout and is currently considered inactive.

Current stability checks should use:

- `clawvault compat` for runtime OpenClaw/skill/hook compatibility diagnostics.
- `npm run ci` for repository quality checks (typecheck, unit tests, build).

If fixture-based compatibility validation is reintroduced, this README should be updated alongside the script restoration in the same change.
