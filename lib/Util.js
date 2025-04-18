import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');
const CACHE_PATH = path.join(__dirname, '..', 'cache.json');

function log(message) {
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }).replace('T', ' ');
    console.log(`[${now}] ${message}`);
}

function jsonToMap(jsonObj, depth = 0) {
    if (depth >= 2 || typeof jsonObj !== 'object' || jsonObj === null || Array.isArray(jsonObj)) {
        return jsonObj;
    }

    const map = new Map();
    for (const key of Object.keys(jsonObj)) {
        map.set(key, jsonToMap(jsonObj[key], depth + 1));
    }
    return map;
}

function mapToJson(map) {
    const obj = {};
    for (const [key, value] of map) {
        obj[key] = value instanceof Map ? mapToJson(value) : value;
    }
    return obj;
}

async function loadCache() {
    try {
        await fs.access(CACHE_PATH, fs.constants.R_OK);
        const data = await fs.readFile(CACHE_PATH, 'utf-8');
        return jsonToMap(JSON.parse(data));
    } catch {
        return null;
    }
}

async function saveCache(participantsMap) {
    const jsonData = mapToJson(participantsMap);
    await fs.writeFile(CACHE_PATH, JSON.stringify(jsonData, null, 2));
}

async function updateEnvToken(token) {
    const tokenLine = `GITHUB_TOKEN=${token}`;

    try {
        await fs.access(ENV_PATH, fs.constants.R_OK);

        const envContent = await fs.readFile(ENV_PATH, 'utf-8');
        const lines = envContent.split('\n');
        let tokenUpdated = false;
        let hasTokenKey = false;

        const newLines = lines.map(line => {
            if (line.startsWith('GITHUB_TOKEN=')) {
                hasTokenKey = true;
                const existingToken = line.split('=')[1];
                if (existingToken !== token) {
                    tokenUpdated = true;
                    return tokenLine;
                } else {
                    log('.env 파일에 이미 동일한 토큰이 등록되어 있습니다.');
                    return line;
                }
            }
            return line;
        });

        if (hasTokenKey && tokenUpdated) {
            await fs.writeFile(ENV_PATH, newLines.join('\n'));
            log('.env 파일의 토큰이 업데이트되었습니다.');
        }

        if (!hasTokenKey) {
            await fs.writeFile(ENV_PATH, `${tokenLine}\n`);
            log('.env 파일에 토큰이 저장되었습니다.');
        }
    } catch {
        await fs.writeFile(ENV_PATH, `${tokenLine}\n`);
        log('.env 파일이 생성되고 토큰이 저장되었습니다.');
    }
}

export {
    log,
    jsonToMap,
    mapToJson,
    loadCache,
    saveCache,
    updateEnvToken
};
