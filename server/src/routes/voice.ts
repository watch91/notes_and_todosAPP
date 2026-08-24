import express from 'express';
import type { Request, Response } from 'express';
import { ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

/**
 * POST /api/v1/voice/transcribe
 * 语音识别 - 将录音转换为文字
 * Body: { audioBase64: string, format: 'webm' | 'm4a' }
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, format = 'm4a' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        error: '缺少音频数据'
      });
    }

    // 使用 ASRClient 进行语音识别
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const asrClient = new ASRClient(config, customHeaders);

    const result = await asrClient.recognize({
      uid: 'voice-record-user',
      base64Data: audioBase64
    });

    console.log('ASR 识别结果:', result.text);

    res.json({
      success: true,
      text: result.text || '',
      duration: result.duration
    });
  } catch (error) {
    console.error('语音识别失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '语音识别失败'
    });
  }
});

export default router;
