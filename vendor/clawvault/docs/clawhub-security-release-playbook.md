# ClawHub Security Release Playbook

This playbook captures what kept the ClawHub/OpenClaw security review stable for `clawvault` and what repeatedly caused "suspicious" regressions.

## Goal

Keep ClawHub scanner classification at least `Benign` by ensuring bundle metadata, SKILL frontmatter, and shipped files stay consistent.

## Known-good frontmatter contract

Use compact, parser-safe frontmatter with documented keys only:

- `name`, `description`, `author`, `source`, `repository`, `homepage`
- `user-invocable`
- `openclaw` (single-line JSON object)
- `metadata` (single-line JSON object with `openclaw`)

For `openclaw` and `metadata.openclaw`, use only documented fields:

- `emoji`
- `requires.bins`
- `requires.env` (can be `[]` if no required env vars)
- `install` (installer spec array)
- `homepage`

Avoid non-spec keys inside `openclaw` metadata (for example ad-hoc fields such as `env_optional`), because strict scanners may treat the metadata block as invalid and fall back to "no requirements/install spec".

## Bundle composition

Always publish a minimal auditable bundle:

- `SKILL.md`
- `hooks/clawvault/HOOK.md`
- `hooks/clawvault/handler.js`

If the hook file is not present in the published bundle, scanners flag a visibility/supply-chain concern.

## Required pre-publish checks

1. Validate SKILL frontmatter is single-line JSON for `openclaw` and `metadata`.
2. Confirm runtime dependencies are declared in both:
   - frontmatter metadata (`requires.bins`, `install`)
   - human docs in SKILL (`Install (Canonical)`, safe install flow)
3. Confirm `source` and `homepage` fields are present and accurate.
4. Confirm hook paths referenced in SKILL exist in the bundle.

## Publish + verify workflow

1. Publish skill patch version to ClawHub.
2. Wait for propagation (`clawhub inspect` can temporarily return `Skill not found`).
3. Verify metadata and files:
   - `npx clawhub inspect clawvault --file SKILL.md`
   - `npx clawhub inspect clawvault --files`
4. Verify page classification in browser snapshot (not just CLI):
   - Open `https://clawhub.ai/G9Pedro/clawvault`
   - Confirm status badge is `Benign` (or better) and review details.

## If scanner regresses

If warning text mentions mismatch between registry metadata and SKILL/docs:

1. Compare scanner claim to frontmatter values first.
2. Remove unsupported keys from metadata block.
3. Re-publish patch version with normalized metadata.
4. Re-check in browser after propagation.

## Security posture notes

Even with clean metadata, this skill can still receive cautionary language because it:

- runs lifecycle hooks,
- reads/modifies OpenClaw session files,
- and relies on external CLI packages (`clawvault`, `qmd`).

That caution is expected and should be addressed with transparent docs, explicit safe-install guidance, and auditable shipped hook code.
