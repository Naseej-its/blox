# BLOX CLI agent skills

This directory holds **agent skills** for the BLOX CLI: reusable instructions that tell AI assistants how to **invoke and explain** `blox` commands correctly.

Use `blox-commands/` for a **single bundled skill** that covers all BLOX commands in one installable folder.

Command-specific folders (`blox-add/`, `blox-update/`, etc.) are also kept for granular usage.

## Install

Install skills from this repository with:

```bash
npx skills add <repo-url>
```

Replace `<repo-url>` with the Git URL of this project (or a fork) as needed.

## Compatibility

These skills are **not tied to a specific editor or product**. They work across tools that support skill-style instructions. Metadata marks agents as `generic` for broad use.
