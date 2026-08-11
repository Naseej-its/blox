---
name: blox-wizard
description: >-
  BLOX wizard implementation for templates and blocks: use this whenever the user wants
  to create, add, wire, or implement an interactive wizard, questionnaire, setup flow,
  or prompt-driven project configuration for a BLOX template or block. Make target,
  location, and execution explicit, then generate a structured wizard layout
  (questions.ts, index.ts, scripts/) using @naseej/blox/sdk and existing lifecycle or
  project execution paths instead of inventing a separate wizard engine.
---

# BLOX Wizard Implementation

## When to use

Use this skill when the user asks to:

- create a wizard for a BLOX template or block
- ask setup questions during `init`, `add`, `update`, or `remove`
- add interactive project configuration to a BLOX workflow
- generate a prompt-driven setup script for a BLOX project
- implement custom wizard logic as template or block code

This skill is for implementing a real wizard in project code. Do not use it to redesign the BLOX CLI or create a second wizard framework.

## Core rules

1. Understand the requested wizard behavior before writing code.
2. Determine the wizard target before choosing any files to create or modify.
3. Use `@naseej/blox/sdk` primitives instead of custom prompt, logging, spinner, filesystem, or process abstractions when the SDK already provides them.
4. Distinguish target, location, and execution as separate decisions.
5. Use a structured custom wizard layout: `questions.ts`, `index.ts`, and `scripts/`.
6. Keep the implementation specific to the user's requested questions and outcomes.
7. Prefer the smallest readable implementation that satisfies the requirement.
8. Execute resolved scripts in the same order as their corresponding questions.
9. Do not put project-modification logic in `questions.ts`.
10. Do not put all project customization directly in `index.ts`.
11. Integrate with existing BLOX lifecycle hooks when the wizard is part of a BLOX workflow.
12. Do not expose or import internal BLOX CLI services.
13. Do not replace or unnecessarily modify any existing declarative BLOX wizard mechanism.

## Required SDK import surface

SDK imports must come from:

```ts
import { input } from '@naseej/blox/sdk';
```

Never import prompt or utility APIs from internal BLOX CLI modules.

## Supported SDK utilities

Use the SDK when it covers the job:

- Prompts: `input`, `confirm`, `select`, `multiSelect`
- Logging: `log.info`, `log.success`, `log.warn`, `log.error`
- Spinner: `spinner().start`, `spinner().message`, `spinner().stop`
- Spinner aliases: `spinner().success`, `spinner().fail`, `spinner().finish`
- Filesystem: `exists`, `mkdir`, `copy`, `move`, `remove`
- JSON: `readJson`, `writeJson`, `updateJson`
- Process/path: `exec`, `join`, `resolve`

If the SDK already provides the needed primitive, use it instead of hand-rolled wrappers.

## Clarify only what is missing

Do not ask the user to repeat information they already provided. Clarify only if one of these is still unresolved:

1. What questions or interactions the wizard should provide.
2. Whether the wizard belongs to the template root or a specific block.
3. Which block it belongs to, if the request is block-level.
4. How the wizard should be invoked.
5. Which directory should contain the wizard implementation.

If the target scope is unclear, ask:

> Should this wizard be created at the template level or inside a specific block? If it is for a block, which block?

If the execution path is unclear, ask a tight question such as:

- Should this run from a BLOX lifecycle hook like `init`, `add`, `update`, or `remove`?
- Should it be called by another existing project command or script?
- Or is it intended to be invoked manually?

If the directory is not specified, use the default directory for the selected target.

## Keep these decisions separate

Do not collapse these into one choice:

1. **Target**: where the wizard belongs.
  - template root
  - a specific block under `blocks/<block-name>/`
2. **Location**: where the wizard script is stored relative to the selected target.
  - default wizard directory
  - custom user-provided directory
3. **Execution**: how the wizard is invoked.
  - BLOX lifecycle hook
  - another project command or script
  - manual invocation

The target decides the base path. The location decides the script directory inside that target. The execution decision decides which existing hook or command invokes the wizard, if any.

## Custom wizard structure (required)

Do not generate a single wizard file that mixes all prompts and project changes.

Generate this structure by default for template-level wizard targets:

```text
scripts/wizard/
├── questions.ts
├── index.ts
└── scripts/
  ├── ...
  └── ...
```

Generate the same structure relative to block targets:

```text
blocks/<block-name>/scripts/wizard/
├── questions.ts
├── index.ts
└── scripts/
  ├── ...
  └── ...
```

If the user provides a custom wizard directory, use it relative to the selected target, and still keep the same file split (`questions.ts`, `index.ts`, `scripts/`).

### File responsibilities

- `questions.ts`: question definitions only
- `index.ts`: orchestration only
- `scripts/*`: project modifications only

`questions.ts` must not contain shell commands, filesystem operations, or project-modification logic.

`index.ts` should:

1. load questions from `questions.ts`
2. run prompts via BLOX SDK utilities
3. collect answers
4. resolve scripts based on answers
5. execute resolved scripts sequentially
6. pass required context to each script
7. handle errors clearly

Each script file in `scripts/` should focus on one answer-driven behavior and use BLOX SDK utilities for process, filesystem, JSON, path, and logging operations.

## Question schema guidance

Use strongly typed question definitions that include:

- `id`
- `type` (`input`, `select`, `multiSelect`, `confirm`)
- `message`
- `options` where applicable
- associated `script` metadata for answer-driven execution

Preserve the order and intent of user-provided questions.

## Implementation workflow

Follow this sequence.

### 1. Determine and validate the target

Identify the wizard target before deciding the wizard directory or execution wiring.

#### A. Template-level target

Use the BLOX project root when the wizard belongs to the template or project itself.

- the target directory is the directory containing `.blox`
- validate that the selected template root actually contains `.blox`
- do not treat the current working directory as the target unless that validation passes

Default wizard directory for a template target:

```text
scripts/wizard/
```

#### B. Block-level target

Use a specific block directory when the wizard belongs to one block inside the BLOX project.

- the target directory must be `blocks/<block-name>/`
- require the block name if the user says the wizard is for a block but does not name it
- validate that `blocks/<block-name>/` exists and represents the requested block before implementation
- do not assume a block request belongs at the template root

Default wizard directory for a block target:

```text
blocks/<block-name>/scripts/wizard/
```

If the target cannot be determined, ask instead of guessing.

### 2. Inspect the target project

Start from the nearest concrete anchor that controls execution.

- First inspect the target root that was selected and validated.
- If the user mentioned a lifecycle hook, inspect the BLOX definition file that owns that hook.
- If the user mentioned an existing command or script, inspect the file or config that invokes it.
- If the location is unclear, inspect the minimal local surfaces needed to determine the existing mechanism.

Typical files to inspect:

- `.blox`
- `block.json`
- `template.json`
- `package.json`
- existing `scripts/` or hook files

Work locally from the owning execution path. Do not broadly explore the repo once the integration point is known.

### 3. Determine wizard location

Choose the script directory relative to the selected target.

Default directories:

| Target | Default wizard directory |
| --- | --- |
| Template root | `scripts/wizard/` |
| Block target | `blocks/<block-name>/scripts/wizard/` |

If the user explicitly provides another directory, use that directory instead.

Interpret a custom location relative to the selected target. For example:

- template target + `custom/setup/` -> `custom/setup/`
- block target `authentication` + `custom/setup/` -> `blocks/authentication/custom/setup/`

Do not automatically create `scripts/wizard/` when the user explicitly requested another path.

When creating files, keep this split in the selected wizard directory:

- `questions.ts`
- `index.ts`
- `scripts/` with one or more focused script files

### 4. Determine execution model

Choose the implementation path that matches the project.

#### A. BLOX lifecycle hook

If the wizard should run during `init`, `add`, `update`, or `remove`:

- integrate it into the existing hook mechanism
- reuse the hook already supported by the template or block
- update the owning definition to invoke the wizard script if needed
- do not create a separate CLI command path unless the project already uses one
- do not introduce automatic BLOX discovery of arbitrary wizard scripts

#### B. Existing project command or script

If the wizard should run from another explicit project entrypoint:

- follow the existing script invocation mechanism
- wire the wizard into current package scripts or command loaders only when necessary
- keep the implementation project-local rather than extending BLOX internals

#### C. Manual invocation

If the user wants the wizard to be run manually:

- create the wizard in the selected target directory
- do not wire it into a lifecycle hook automatically
- do not create a new BLOX execution path for discovery
- document the exact command or file path the user should run manually

### 5. Ensure the SDK dependency exists

Before writing or wiring the wizard:

1. Detect whether `@naseej/blox` is already installed.
2. Check the selected target or owning project for that dependency.
3. Determine the package manager from existing project signals when possible.
4. If the package is missing, install it as a development dependency with the existing package manager.
5. Verify imports resolve from `@naseej/blox/sdk`.

Preferred package manager detection signals:

- `packageManager` field in `package.json`
- lockfiles such as `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`
- existing repo scripts or documented tooling

If detection is ambiguous, make the smallest reasonable choice and state it clearly in the final report, or ask only if the choice would materially affect the implementation.

### 6. Translate requirements into prompts

Map each user requirement to the narrowest suitable SDK prompt.

- Free text or names: `input`
- Yes/no: `confirm`
- Single choice: `select`
- Multiple optional features: `multiSelect`

Preserve the order and intent of the user's requested questions.

Do not invent extra prompts unless they are required to make the workflow function.

Encode question-to-script intent in `questions.ts` so `index.ts` can resolve script execution without hardcoding unrelated business logic.

### 7. Implement with the three-part structure

Implement all three parts in the selected wizard directory.

#### A. `questions.ts`

- define only the wizard questions and answer-to-script mapping metadata
- include options for `select` and `multiSelect` questions where needed
- keep it declarative and strongly typed

#### B. `index.ts`

- execute prompts with BLOX SDK (`input`, `confirm`, `select`, `multiSelect`)
- collect answers into an answers object
- resolve script modules from question definitions and answers
- execute scripts sequentially in question order
- pass shared context into each script

#### C. `scripts/`

- implement project changes in focused files
- use SDK utilities such as `exec`, `exists`, `mkdir`, `readJson`, `updateJson`, `join`, `resolve`, and `log`
- keep scripts independent and easy to maintain

Avoid introducing generic factories, plugin systems, or extra abstraction layers unless the project already has them.

### 8. Add practical error handling

Include error handling that matches the task:

- validate required answers when needed
- handle missing files or directories cleanly
- stop with a clear message if an expected execution hook cannot be wired safely
- surface command failures with useful context

Do not overengineer the error model.

## Implementation guidance

### Dependency installation

If `@naseej/blox` is missing, install it using the detected package manager, for example:

```sh
npm install -D @naseej/blox
```

Use equivalent commands for `pnpm`, `yarn`, or other already-established package managers.

### Import style

Prefer direct imports of only the SDK members the wizard uses, for example:

```ts
import {
  input,
  select,
  confirm,
  multiSelect,
  log,
  exec,
  exists,
  mkdir,
  readJson,
  updateJson,
} from '@naseej/blox/sdk';
```

### Example: `questions.ts`

```ts
export const questions = [
  {
    id: 'packageManager',
    type: 'select',
    message: 'Choose package manager',
    options: [
      { label: 'npm', value: 'npm', script: './scripts/use-npm.ts' },
      { label: 'pnpm', value: 'pnpm', script: './scripts/use-pnpm.ts' },
      { label: 'yarn', value: 'yarn', script: './scripts/use-yarn.ts' },
    ],
  },
  {
    id: 'storybook',
    type: 'confirm',
    message: 'Install Storybook?',
    script: './scripts/add-storybook.ts',
  },
] as const;
```

### Example: `index.ts`

```ts
import { input, select, confirm, multiSelect, log } from '@naseej/blox/sdk';
import { questions } from './questions';

export default async function () {
  const answers: Record<string, unknown> = {};

  // Run question prompts in order and collect answers.
  // Resolve scripts from answers.
  // Execute resolved scripts sequentially with shared context.

  log.success('Wizard completed.');
}
```

### Example: `scripts/add-storybook.ts`

```ts
import { exec, log } from '@naseej/blox/sdk';

export default async function (ctx: { projectDir: string; packageManager: string }) {
  await exec(ctx.packageManager, ['add', '-D', '@storybook/react'], { cwd: ctx.projectDir });
  log.success('Storybook dependency installed.');
}
```

Treat these as shape references, not boilerplate to copy unchanged.

## Execution model

Use this project-owned flow:

```text
questions.ts
  -> index.ts
  -> run questions
  -> collect answers
  -> resolve scripts
  -> execute scripts in question order
  -> done
```

The CLI does not need a new custom-wizard execution engine. `index.ts` is invoked only through the execution mechanism selected for the project (lifecycle hook, existing command, or manual invocation).

## Architectural guardrails

- The SDK provides primitives, not a wizard framework.
- Custom wizard behavior belongs in normal template or block code.
- Lifecycle hooks are the preferred integration point for BLOX workflow execution.
- The CLI should execute only the configured hook or project command.
- The CLI should not automatically discover or execute arbitrary custom wizard scripts.
- Do not create a second wizard engine inside the CLI.
- Do not replace an existing declarative wizard unless the user explicitly wants a migration and the repo structure supports it.

## Editing strategy

When implementing the wizard:

1. Modify only the files required for the selected target and execution path.
2. Keep the wizard implementation close to the validated target root.
3. Always keep question definitions, orchestration, and implementation scripts separated.
4. Reuse existing project utilities only when they already fit the task better than the SDK.
5. Do not create a wizard in an arbitrary directory based only on the current working directory.

## Final response requirements

After implementation, clearly report:

- which target was selected: template root or block
- where the wizard was created
- where and how it is executed
- which SDK APIs are used
- whether `@naseej/blox` had to be installed
- which files, hooks, or configuration entries were added or changed
- how the user can run or test the wizard

## What good output looks like

The finished implementation should be:

- production-oriented
- simple
- specific to the user's requested wizard behavior
- structurally split into `questions.ts`, `index.ts`, and focused `scripts/`
- integrated into the project's real execution path
- maintainable by template authors

If there is an existing BLOX-compatible way to run the wizard, use it rather than introducing a parallel mechanism.
