/**
 * 静音 coze-coding-dev-sdk 内部埋点组件 ReportClient 的噪音日志。
 *
 * 背景：
 *   SDK 在模块加载阶段会构造 ReportClient，若缺少开发期凭证 COZE_API_TOKEN
 *   （生产 veFaaS 环境本就不会注入），会打印：
 *     [report] ReportClient not configured: COZE_API_TOKEN is missing
 *   以及后续：
 *     [report] batchReport skipped: ...
 *   这些仅是埋点降级提示，不影响 LLM 调用、Supabase 读写等任何业务功能。
 *
 * 处理方式：
 *   精准过滤以 "[report]" 开头的 console.error/warn 输出，其余日志原样保留。
 *   必须在所有其它 import（尤其间接引入 SDK 的路由）之前加载，
 *   以确保 patch 在 SDK 模块体执行前生效。
 */

const REPORT_NOISE_PREFIX = '[report]';

const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

function isReportNoise(args: unknown[]): boolean {
  const first = args[0];
  return typeof first === 'string' && first.startsWith(REPORT_NOISE_PREFIX);
}

console.error = (...args: unknown[]) => {
  if (isReportNoise(args)) return;
  originalError(...args);
};

console.warn = (...args: unknown[]) => {
  if (isReportNoise(args)) return;
  originalWarn(...args);
};

export {};
