import { Router } from 'express';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// AI 写作助手固定账号 ID
export const AI_ASSISTANT_USER_ID = '20260509';

// 构建写作助手 Prompt
function buildWriterPrompt(currentContent: string, userInstruction: string): string {
  return `你是一个写作助手，请严格遵守用户的指令，用户目前已写的内容是'${currentContent}'，用户的指令是'${userInstruction}'，你的回答应严格按照以下格式：{output:"你修改或写好后的文章完整全文，注意合理的分段"}不要有任何多余内容`;
}

// 从 LLM 输出中提取 {output:"..."} 中的内容
// 支持标准 JSON 与带换行/引号/多行的自然格式
function extractOutput(text: string): string | null {
  // 1) 尝试解析为合法 JSON
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.output === 'string') return obj.output;
  } catch {
    // ignore
  }
  // 2) 允许前后有 markdown 代码块或其他多余字符
  const trimmed = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj.output === 'string') return obj.output;
  } catch {
    // ignore
  }
  // 3) 正则提取 {output:"..."}，兼容换行、转义引号
  const match = text.match(/\{\s*output\s*:\s*"([\s\S]*?)"\s*\}/);
  if (match) {
    // 反转义常见 JSON 字符
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }
  return null;
}

// 流式接口：SSE 输出
// POST /api/v1/notes/ai-assistant/stream
router.post('/stream', async (req, res) => {
  const { currentContent, userInstruction } = req.body || {};

  // 参数校验
  if (typeof currentContent !== 'string') {
    res.status(400).json({ success: false, error: 'currentContent is required' });
    return;
  }
  if (typeof userInstruction !== 'string' || !userInstruction.trim()) {
    res.status(400).json({ success: false, error: 'userInstruction is required' });
    return;
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (data: string) => {
    if (!res.writableEnded) {
      res.write(`data: ${data}\n\n`);
    }
  };

  try {
    const config = new Config();
    const client = new LLMClient(config);

    const prompt = buildWriterPrompt(currentContent, userInstruction);
    const messages = [
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.7,
    });

    let fullText = '';
    for await (const chunk of stream) {
      // chunk 来自 @langchain/core/messages 的 AIMessageChunk
      const piece = typeof chunk.content === 'string'
        ? chunk.content
        : (chunk.content as any)?.text || '';
      if (piece) {
        fullText += piece;
        sendEvent(piece);
      }
    }

    // 流结束后再发一次解析后的完整 output
    const parsed = extractOutput(fullText);
    sendEvent(`__END__${parsed || fullText}`);
    sendEvent('[DONE]');
    res.end();
  } catch (error: any) {
    console.error('[AI-Assistant] stream error:', error);
    try {
      sendEvent(`__ERROR__${error.message}`);
      sendEvent('[DONE]');
      res.end();
    } catch {
      // ignore
    }
  }
});

// 把 AI 写作助手固定账号加入笔记协作者
// POST /api/v1/notes/ai-assistant/mark
// Body: { noteId: string | number }
router.post('/mark', async (req, res) => {
  try {
    const { noteId } = req.body || {};
    if (noteId === undefined || noteId === null || noteId === '') {
      res.status(400).json({ success: false, error: 'noteId is required' });
      return;
    }

    const client = getSupabaseClient();
    const { data: note, error: noteError } = await client
      .from('notes')
      .select('id, user, collaborators')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError) {
      res.status(500).json({ success: false, error: `查询笔记失败: ${noteError.message}` });
      return;
    }
    if (!note) {
      res.status(404).json({ success: false, error: 'Note not found' });
      return;
    }

    // 解析现有协作者
    let collaboratorIds: string[] = [];
    try {
      collaboratorIds = JSON.parse(note.collaborators || '[]');
    } catch {
      collaboratorIds = [];
    }

    // 已是协作者：幂等返回
    if (collaboratorIds.includes(AI_ASSISTANT_USER_ID)) {
      res.json({ success: true, data: { alreadyAdded: true } });
      return;
    }

    // 不能将 AI 账号添加为笔记作者
    if (note.user === AI_ASSISTANT_USER_ID) {
      res.status(400).json({ success: false, error: 'AI 账号已成为作者，无需重复加入协作者' });
      return;
    }

    collaboratorIds.push(AI_ASSISTANT_USER_ID);
    const { error: updateError } = await client
      .from('notes')
      .update({ collaborators: JSON.stringify(collaboratorIds) })
      .eq('id', noteId);

    if (updateError) {
      res.status(500).json({ success: false, error: `更新失败: ${updateError.message}` });
      return;
    }

    res.json({ success: true, data: { alreadyAdded: false, collaboratorCount: collaboratorIds.length } });
  } catch (error: any) {
    console.error('[AI-Assistant] mark error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
