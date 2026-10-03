import { Router } from 'express';
import { triggerDailyNotes } from '../tasks/daily-notes.js';

const router = Router();

// 手动触发每日笔记生成（由开发者模式调用，不再使用 cron 自动执行）
router.post('/trigger', async (req, res) => {
  try {
    const result = await triggerDailyNotes();
    res.json(result);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;