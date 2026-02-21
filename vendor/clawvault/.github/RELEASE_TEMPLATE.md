# Release Notes Template

Follow the OpenClaw release format: https://github.com/openclaw/openclaw/releases

## Format Rules

1. **Title:** `vX.Y.Z — Short Description`
2. **Sections:** `### Changes`, `### Fixes`, `### Stats` (omit empty sections)
3. **Each bullet:**
   - Start with the area/scope in bold or plain text (e.g., "Config:", "Search:", "Tasks:")
   - Describe the change in one clear sentence
   - Link the PR: `([#N](https://github.com/Versatly/clawvault/pull/N))`
   - Credit external contributors: `Thanks [@username](https://github.com/username).`
   - Internal work (our own commits) does NOT get "Thanks" — only external contributors
4. **Stats section:** test count, file count

## Example

```markdown
### Changes

- Config: add `clawvault config get/set/list/reset` for runtime configuration management. ([#15](https://github.com/Versatly/clawvault/pull/15))

- Tasks: add `--due`, `--tags`, and `--description` flags to `task add` for richer task metadata. ([#18](https://github.com/Versatly/clawvault/pull/18))

### Fixes

- Search: strip node-llama-cpp GPU fallback warnings from qmd stdout before JSON parsing. ([#14](https://github.com/Versatly/clawvault/pull/14)) Thanks [@jbencook](https://github.com/jbencook).

### Stats

- 394 tests passing (58 files)
```

## Contributor Credit

**Always thank external contributors by name with GitHub link.** This is non-negotiable.
Community PRs are what makes open source work. Every external PR gets a "Thanks @user" in the release notes, period.
