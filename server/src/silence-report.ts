// 静音 coze-coding-dev-sdk 内部 ReportClient 的噪音日志
// 必须在任何 import 'coze-coding-dev-sdk' 之前执行（本文件需在 index.ts 顶部最先 import）

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 在 SDK 加载之前，把 server/.env（gitignored，存放 COZE_API_TOKEN 等密钥）注入 process.env。
// 采用零依赖的极简解析，避免 dotenv 未列入生产依赖导致运行期缺失；
// 且只填充尚未存在的变量，绝不覆盖平台（veFaaS）已注入的真实环境变量。
function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
// dev(tsx 跑 src/) 与 prod(esbuild 产物 dist/) 下，'../.env' 均指向 server/.env
loadDotEnv(resolve(here, '../.env'));
loadDotEnv(resolve(here, '.env'));

const originalError = console.error;
const originalWarn = console.warn;

// 仅过滤报表客户端相关的噪音，保留其它真实错误
const REPORT_NOISE_PATTERNS = [
  'ReportClient not configured',
  '[report]',
  'COZE_API_TOKEN',
];

function isReportNoise(args: unknown[]): boolean {
  return args.some(
    (a) =>
      typeof a === 'string' &&
      REPORT_NOISE_PATTERNS.some((p) => a.includes(p)),
  );
}

console.error = (...args: unknown[]) => {
  if (isReportNoise(args)) return;
  originalError(...args);
};

console.warn = (...args: unknown[]) => {
  if (isReportNoise(args)) return;
  originalWarn(...args);
};
