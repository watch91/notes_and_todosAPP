import express from 'express';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = express.Router();

// POST /api/v1/voice/transcribe - 语音转文字
router.post('/transcribe', async (req, res) => {
  try {
    const { audio, format = 'm4a' } = req.body;

    if (!audio) {
      return res.status(400).json({ success: false, error: 'audio is required' });
    }

    const config = new Config();
    const client = new LLMClient(config);

    // 根据格式设置正确的 MIME type
    const mimeType = format === 'webm' ? 'audio/webm' : 'audio/m4a';

    // 使用支持音频的模型进行语音识别
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请将以下音频内容转录为文字。只需要输出转录的文字内容，不需要任何额外说明。如果音频中没有可识别的语音内容，请输出"无内容"。',
          },
          {
            type: 'audio_url',
            audio_url: {
              url: `data:${mimeType};base64,${audio}`,
            },
          },
        ],
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: 0.1,
    });

    const text = response.content.trim();

    if (text === '无内容' || text === '') {
      return res.json({ success: false, error: '无法识别语音内容' });
    }

    res.json({ success: true, text });
  } catch (error) {
    console.error('Voice transcribe error:', error);
    res.status(500).json({ success: false, error: '语音识别失败' });
  }
});

export default router;
