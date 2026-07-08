import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registriesDataPath } from './local-config.mjs';
import { syncRegistries } from './sync-registries.mjs';

/**
 * Walk up from `startDir` to the filesystem root; return the first directory that contains `.blox`, or `null`.
 * @param {string} [startDir]
 * @returns {string | null}
 */
function findBloxAppRoot(startDir = process.cwd()) {
    let dir = path.resolve(startDir);
    const root = path.parse(dir).root;
    for (;;) {
        if (fs.existsSync(path.join(dir, '.blox'))) {
            return dir;
        }
        if (dir === root) {
            return null;
        }
        dir = path.dirname(dir);
    }
}

function mergeTemplates(target, source) {
    return {
        ...target,
        ...source,
        blocks: {
            ...(target.blocks || {}),
            ...(source.blocks || {}),
        },
    };
}

function loadAvailableTemplates(registriesPath) {
    const templates = {};

    if (!fs.existsSync(registriesPath)) {
        return templates;
    }

    const registries = fs.readdirSync(registriesPath);

    for (const registry of registries) {
        const indexPath = path.join(registriesPath, registry, 'index.json');

        if (!fs.existsSync(indexPath)) continue;

        const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

        for (const [templateName, template] of Object.entries(data.templates || {})) {
            const normalizedTemplate = {
                ...template,
                name: templateName,
            };

            for (const [blockName, block] of Object.entries(normalizedTemplate.blocks || {})) {
                if (!block.source) {
                    block.source = `/block-${templateName}-${blockName}`;
                }

                if (block.source.startsWith('/')) {
                    block.source = data.baseUrl + block.source;
                }
            }

            if (templates[templateName]) {
                templates[templateName] = mergeTemplates(
                    templates[templateName],
                    normalizedTemplate,
                );
            } else {
                templates[templateName] = normalizedTemplate;
            }
        }
    }

    return templates;
}

function loadAvailableBlocks(templateInfo, templates) {
    const template = templates[templateInfo.name];

    if (!template) {
        return {};
    }

    const blocks = {
        ...(template.blocks || {}),
    };

    for (const base of templateInfo.bases || []) {
        const baseTemplate = templates[base.name];

        if (!baseTemplate) continue;

        for (const [k, v] of Object.entries(baseTemplate.blocks || {})) {
            blocks[k] = v;
        }
    }

    return blocks;
}

/**
 * @typedef {{ name: string, description: string, category: string, source: string, template: string }} BlockContextItem
 * @typedef {{ templates: string[], blocks: BlockContextItem[] }} BlockContext
 */

/**
 * @param {{ registriesPath?: string, templateInfo: { name: string, bases?: { name: string }[] } }} args
 * @returns {Promise<BlockContext>}
 */
async function getBlocksContext({ registriesPath, templateInfo }) {
    const resolvedRegistriesPath = registriesPath ?? registriesDataPath;

    if (!registriesPath) {
        await syncRegistries();
    }

    const templates = loadAvailableTemplates(resolvedRegistriesPath);

    const blocksMap = loadAvailableBlocks(templateInfo, templates);

    const blocks = Object.entries(blocksMap).map(([name, block]) => ({
        name,
        description: block.description || '',
        category: block.category || 'general',
        source: block.source,
        template: templateInfo.name,
    }));

    return {
        templates: Object.keys(templates),
        blocks,
    };
}

/**
 * Read `definition` from `.blox` in cwd (same shape the BLOX CLI uses for the app template).
 * @param {string} [cwd]
 */
function loadTemplateInfoFromCwd(cwd = process.cwd()) {
    const bloxPath = path.join(cwd, '.blox');
    if (!fs.existsSync(bloxPath)) {
        throw new Error(
            `No .blox at ${bloxPath}. Use a BLOX app directory, or pass: node get-blocks-context.mjs <app-dir>`,
        );
    }
    const data = JSON.parse(fs.readFileSync(bloxPath, 'utf8'));
    const definition = data.definition;
    if (!definition || typeof definition.name !== 'string') {
        throw new Error('`.blox` must contain definition.name');
    }
    return definition;
}

/**
 * When run as a script: optional `process.argv[2]` = BLOX app root; otherwise search upward for `.blox` from cwd.
 * @returns {string}
 */
function resolveBloxAppDirForMain() {
    const arg = process.argv[2];
    if (arg) {
        const root = path.resolve(arg);
        if (!fs.existsSync(path.join(root, '.blox'))) {
            throw new Error(
                `No .blox in ${root}. Pass the directory that contains a BLOX app (where you would run \`blox add\`).`,
            );
        }
        return root;
    }
    const found = findBloxAppRoot();
    if (found) {
        return found;
    }
    throw new Error(
        'No .blox in the current directory or any parent. cd into a BLOX app, or run: node skills/blox-commands/scripts/get-blocks-context.mjs <path-to-app>',
    );
}

/** Invoked when the file is run directly: print BlockContext JSON to stdout (one line). */
async function main() {
    const appDir = resolveBloxAppDirForMain();
    const templateInfo = loadTemplateInfoFromCwd(appDir);
    const blockContext = await getBlocksContext({ templateInfo });
    process.stdout.write(`${JSON.stringify(blockContext)}\n`);
}

const __filename = fileURLToPath(import.meta.url);
const isMain =
    process.argv[1] !== undefined && path.resolve(__filename) === path.resolve(process.argv[1]);

if (isMain) {
    main().catch((err) => {
        process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    });
}
