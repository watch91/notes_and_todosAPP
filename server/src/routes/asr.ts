import { Router } from 'express';
import type { Request, Response } from 'express';
import { ASRClient, Config } from 'coze-coding-dev-sdk';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { audio_data, uid = 'user_001' } = req.body;

    if (!audio_data) {
      res.status(400).json({ success: false, error: '缺少音频数据' });
      return;
    }

    const config = new Config();
    const client = new ASRClient(config);

    const result = await client.recognize({
      uid,
      base64Data: audio_data,
    });

    res.json({
      success: true,
      data: { text: result.text, duration: result.duration },
    });
  } catch (error) {
    console.error('ASR error:', error);
    res.status(500).json({ success: false, error: '语音识别失败' });
  }
});

export default router;
