import fs from 'node:fs';
import path from 'node:path';

import envPaths from 'env-paths';

const appPaths = envPaths('blox', { suffix: '' });
const configFilePath = path.join(appPaths.config, 'config.json');
const registriesDataPath = path.join(appPaths.data, 'registries');

const defaultConfig = {
    registries: ['https://tfs.aas.com.sa/Medad/BLOX/_git/default-registry'],
};

function getLocalConfig() {
    try {
        return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    } catch {
        return defaultConfig;
    }
}

export { getLocalConfig, registriesDataPath };
