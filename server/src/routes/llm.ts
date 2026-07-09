import express from 'express';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = express.Router();

// POST /api/v1/llm/chat - AI 对话
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'doubao-seed-2-0-mini-260215' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const config = new Config();
    const client = new LLMClient(config);

    const response = await client.invoke(messages, {
      model,
      temperature: 0.8,
    });

    res.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: response.content,
          },
        },
      ],
    });
  } catch (error) {
    console.error('LLM chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
