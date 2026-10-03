/**
 * AI 写作助手结果传递工具
 *
 * 用于在 AI 助手独立页面和笔记编辑页面之间传递 AI 生成的内容。
 * 使用模块级变量（非持久化），页面返回时自动消费并清空。
 */

let pendingResult: string | null = null;

/** AI 助手页面完成写作后，调用此方法暂存结果 */
export const setAiAssistantResult = (result: string) => {
  pendingResult = result;
};

/** 笔记编辑页面 focus 时调用，取出并清空暂存结果（一次性消费） */
export const consumeAiAssistantResult = (): string | null => {
  const r = pendingResult;
  pendingResult = null;
  return r;
};
