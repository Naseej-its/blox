---
name: blox-cli
description: >-
    BLOX CLI and registry-first feature triage: any add/build/install/integration request
    must list addable blocks from get-blocks-context before blox add or custom code.
    Full CLI reference (init, add, update, conf, migrate, detach, contribute, upgrade).
---

# Feature request gate (read this first)

For **BLOX apps** (projects with a `.blox` directory): this skill is the **mandatory pre-read** whenever the user asks for a **feature, capability, integration, module, screen, widget**, or to **add / build / implement / install / create** something new. Aligns with the user rule to **check skills before** implementing.

### When this gate applies

Triggers include (non-exhaustive): add auth, add payments, PDF viewer, new dashboard, hook up API, integrate Stripe, build a form wizard, install UI block, “create X”, “support Y”.

### Order of operations (hard)

Do **not** start editing application or template source for the requested capability until you have completed steps 2–4 below, **unless** the user explicitly waives the registry scan after you have offered it.

1. **Read this skill** end-to-end for command details.
2. **Resolve the block catalog** (canonical source):

    - From a shell whose working directory is the **BLOX app root** (folder that contains `.blox`), run:

        ```bash
        node <SKILL_DIR>/scripts/get-blocks-context.mjs
        ```

    - Or pass the app root explicitly:

        ```bash
        node <SKILL_DIR>/scripts/get-blocks-context.mjs /path/to/app-with-.blox
        ```

    - Replace `<SKILL_DIR>` with the directory that contains this `SKILL.md` (same folder as `scripts/`).

    - **Stdout** is a single JSON line. Parse it in the agent (or pipe to a JSON pretty-printer). Shape:

        - `templates`: string[] — template names known from synced registries.
        - `blocks`: array of `{ name, description, category, source, template }` — **all** blocks available for the app’s template (including merged **bases**). Use `name`, `description`, and `category` for matching; `source` only for disambiguation.

3. **If there is no `.blox`** (script errors or wrong directory): stop and tell the user that registry discovery requires a BLOX app root. Do **not** invent block names. Optionally suggest configuring registries (`blox conf`) and running again from the correct directory.

4. **Registry scan (required user-visible section):** Always show the user a **Registry scan** before `blox add` or custom code:

    - If the catalog is small enough: list **every** block as `name` — `category` — `description` (table or bullets).
    - If the catalog is large: show a **filtered shortlist** (candidates whose name/description/category match the user’s goal), then state **full catalog: N blocks** and that the agent filtered from the script output (user can ask for the full list or re-run the script locally).

    Then add **Best matches:** rank the top 1–3 blocks with a **one-line rationale** each vs the user’s wording.

5. **Only after the scan:** If a block fits, use the [mandatory response template](#mandatory-response-template-before-blox-add-or-custom-code) and wait for confirmation before `blox add <name>`. If **no** block fits, say why and only then propose **custom / template-local** implementation.

### Mandatory response template (before `blox add` or custom code)

Fill this (or equivalent structure) in the chat **after** you have run `get-blocks-context.mjs` (or failed with a clear reason):

- **User goal:** (one sentence)
- **Blocks available (from registry):** (full list or filtered shortlist + total count)
- **Best match:** (primary block + alternates, each with one-line rationale)
- **Next step:** Ask whether to run `blox add <block-name>` or proceed with custom work.

---

# BLOX CLI & Registry-First Workflows

## Critical: Agent Decision Logic

You are a **Registry-First** agent. When a user asks for a feature, **never** write custom code or implement files manually if a BLOX block can fulfill the request. Follow the [Feature request gate](#feature-request-gate-read-this-first) **before** exploring the repo for implementation patterns.

### Triggering Conditions

- **CLI Help:** User asks how to use, fix, or configure `blox`.
- **Feature Requests:** User asks to "add", "install", "integrate", or "create" a specific functionality—use the gate and **list addable blocks first**.
- **Workflow:** Default to `blox add` after the user confirms a block from the scan.

---

## 1. The `blox add` Strict Workflow (Mandatory)

Before running any installation command:

1. **Registry discovery:** Run `node <SKILL_DIR>/scripts/get-blocks-context.mjs` from the app root (or with app path). Parse the JSON line; `blocks` is the authoritative catalog. Do not rely on guessing or web search for block names.
2. **Analysis:** Examine each candidate’s `description`, `category`, and `name` from that JSON.
3. **Intent matching:** Select the most granular block that fulfills the requirement. Avoid overlapping blocks.
4. **Proposal:** Present the **Registry scan** and best match(es); use the [mandatory response template](#mandatory-response-template-before-blox-add-or-custom-code).
5. **Execution:** Only run `blox add <block-name>` after explicit user confirmation.

---

# BLOX CLI Commands

## When to use

- The user asks how to run, fix, or understand any BLOX CLI command (`init`, `add`, `update`, `contribute`, `conf`, `upgrade`, `migrate`, `detach`).
- The user wants a new capability inside an existing BLOX app—apply the [Feature request gate](#feature-request-gate-read-this-first) and **registry-first block discovery** before suggesting or running `blox add`.
- You want one installable skill folder that bundles all command guidance.

## Global command

```bash
blox --help
```

## Global options

| Option          | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `-V, --version` | Print CLI version.                                               |
| `-h, --help`    | Print help for a subcommand.                                     |
| `-d, --debug`   | Debug mode (affects rollback / error handling in some commands). |
| `-m, --minimal` | Minimal mode (less spinner noise for interactive flows).         |

## Command quick map

| Command           | Alias     |
| ----------------- | --------- |
| `blox init`       | `blox i`  |
| `blox add`        | `blox a`  |
| `blox remove`     | `blox rm` |
| `blox update`     | `blox u`  |
| `blox contribute` | `blox cb` |
| `blox conf`       | `blox c`  |
| `blox upgrade`    | —         |
| `blox migrate`    | —         |
| `blox detach`     | —         |

## `blox init`

- **When:** create a new BLOX app from a template.
- **Command:** `blox init` / `blox i`
- **Options:** `-n, --name`, `-t, --template`, `--branch`
- **Examples:**
  - `blox init`
  - `blox init -n my-app -t my-template --branch main`
- **Notes:** ensure registries are configured first (`blox conf`).

## `blox add`

### When to use

- Install or wire a **registry-defined block** into a BLOX app that already has `.blox` (not greenfield scaffolding—use `blox init` for that).
- The user names a vague goal ("add auth", "payments", "dashboard widget") and expects a concrete block choice.

### Mandatory agent workflow (before `blox add`)

Do **not** guess block names or run `blox add <block>` from user wording alone. For every add request:

1. **Retrieve** blocks by running `node <SKILL_DIR>/scripts/get-blocks-context.mjs` (see [Feature request gate](#feature-request-gate-read-this-first)). Parse stdout JSON; use the `blocks` array (`name`, `description`, `category`, `source`, `template`).
2. **Read** each candidate’s registry fields from that output (not free-form web search).
3. **Match** the user’s requirement to the smallest set of blocks that actually satisfy it; prefer one best fit, note acceptable alternates if ties exist.
4. **Present** the **Registry scan** to the user and fill the [mandatory response template](#mandatory-response-template-before-blox-add-or-custom-code). Wait for confirmation **before** running `blox add`.
5. **Fallback:** If your installed `blox` CLI documents a non-interactive way to list blocks compatible with this workflow, you may use it **in addition** to the script; do not use an unverified interactive flow as the only source.

- **Command:** `blox add [blocks...]` / `blox a [blocks...]`
- **Options:** `--branch`, `--dest` (single values applied to all selected blocks in the run)
- **Examples:**
  - `blox add`
  - `blox add my-block --dest custom-folder`
  - `blox add button card`
  
## `blox remove`

- **When:** remove one or more installed blocks from a BLOX app.
- **Command:** `blox remove [blocks...]` / `blox rm [blocks...]`
- **Options:** `-f, --force` (single global flag applied to all selected blocks)
- **Examples:**
  - `blox remove`
  - `blox remove my-block`
  - `blox remove button card --force`

## `blox update`

- **When:** refresh app, bases, and/or blocks from registries.
- **Command:** `blox update` / `blox u`
- **Options:** `-s, --scope`, `-b, --block`, `--ignore`, `--hard`
- **Examples:**
  - `blox update`
  - `blox update --scope block --block my-block`
- **Notes:** requires clean git tree; may need manual conflict resolution.

## `blox contribute`

- **When:** contribute changes back to template/base/block repos.
- **Command:** `blox contribute` / `blox cb`
- **Options:** `--existing`, `--title`, `--description`, `--commits`, `--force`, `--type`, `--name`
- **Examples:**
  - `blox contribute`
  - `blox contribute --type block --name my-block --title "Fix layout"`
- **Notes:** `--type` values are `template`, `base`, `block`.

## `blox conf`

- **When:** set BLOX local registries config.
- **Command:** `blox conf` / `blox c`
- **Options:** `-r, --registries <registries...>`
- **Examples:**
  - `blox conf -r https://example.com/registry.git`
  - `blox conf --registries https://a.com/r.git https://b.com/r.git`
- **Notes:** updates local BLOX config used by commands that sync registries.

## `blox upgrade`

- **When:** upgrade CLI package itself.
- **Command:** `blox upgrade`
- **Options:** no command-specific options
- **Examples:**
  - `blox upgrade`
  - `blox --version`
- **Notes:** this upgrades the tool, not project files.

## `blox migrate`

- **When:** run BLOX schema migrations on a project.
- **Command:** `blox migrate`
- **Options:** no command-specific options
- **Examples:**
  - `blox migrate`
  - `blox migrate --help`
- **Notes:** run from project root with `.blox`.

## `blox detach`

- **When:** detach app toward a base template.
- **Command:** `blox detach`
- **Options:** `--basic`
- **Examples:**
  - `blox detach`
  - `blox detach --basic`
- **Notes:** requires valid `.blox` with bases.

## Notes

- This unified skill is editor-agnostic and CLI-focused.
- Prefer `blox <command> --help` if there is uncertainty about installed CLI behavior.
