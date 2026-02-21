# Templates

This folder holds copy/paste templates for producing consistent research artifacts in this repo.

## When to use which template

- `templates/REFERENCE-paper.md` → create a new `references/*.md` summary for an academic/industry paper.
- `templates/ANALYSIS-paper.md` → create a root-level `ANALYSIS-*.md` deep dive for that paper (mechanism-first, synthesis-ready).

## Naming suggestions (keep stable + unique)

These are conventions, not hard rules:

- Reference summary: `references/<firstauthor>-<shortslug>.md`
  - Example: `references/hu-evermembench.md`
  - Put the arXiv/DOI in frontmatter.

- Analysis: `ANALYSIS-arxiv-<id>-<shortslug>.md`
  - Example: `ANALYSIS-arxiv-2602.01313-evermembench.md`

## Paper artifacts

Store PDFs (and optional extracted text snapshots) under:

- `references/papers/<paper-id>.pdf`
- `references/papers/<paper-id>.md`

Keep the “paper-id” stable (e.g., `arxiv-2602.01313`, `doi-10.1145-...`).
