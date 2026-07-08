import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { getLocalConfig, registriesDataPath } from './local-config.mjs';

const execFileAsync = promisify(execFile);

let upToDate = false;

function getRepoName(registry) {
    return registry.split('/').pop() || '';
}

async function runGit(args, cwd) {
    try {
        await execFileAsync('git', args, { cwd });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to run git ${args.join(' ')}: ${message}`);
    }
}

async function syncRegistries(branch) {
    if (upToDate) return;
    upToDate = true;

    fs.mkdirSync(registriesDataPath, { recursive: true });

    const config = getLocalConfig();

    await Promise.all(
        config.registries.map(async (registry) => {
            const repoName = getRepoName(registry);
            if (!repoName) {
                throw new Error(`Invalid registry URL: ${registry}`);
            }

            const repoDir = path.join(registriesDataPath, repoName);

            if (!fs.existsSync(repoDir)) {
                const cloneArgs = ['clone', '--depth', '1'];
                if (branch) {
                    cloneArgs.push('--branch', branch);
                }
                cloneArgs.push(registry, repoName);
                await runGit(cloneArgs, registriesDataPath);
                return;
            }

            if (fs.existsSync(path.join(repoDir, '.git'))) {
                await runGit(['pull', '--ff-only'], repoDir);
            }
        }),
    );
}

export { syncRegistries };
