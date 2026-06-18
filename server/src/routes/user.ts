import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.json({ user: null });
    }

    const supabase = getSupabaseClient(req);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json({ user: data || { user_id: userId, username: null } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 设置用户名
router.post('/set-username', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { username } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }

    const supabase = getSupabaseClient(req);
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, username: username.trim() });

    if (error) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
