import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

// 获取笔记的所有评论（包含用户名）
router.get('/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('comments')
      .select('*, user_id')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    // 批量获取用户名
    const userIds = [...new Set((data || []).map((c: any) => c.user_id).filter(Boolean))];
    let usernames: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('user_profiles').select('user_id, username').in('user_id', userIds);
      if (profiles) {
        profiles.forEach((p: any) => { usernames[p.user_id] = p.username; });
      }
    }
    const result = (data || []).map((c: any) => ({
      ...c,
      username: usernames[c.user_id] || '匿名用户'
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 添加评论
router.post('/', async (req, res) => {
  try {
    const { note_id, content } = req.body;
    const supabase = getSupabaseClient();
    const userId = req.headers['x-session'] as string || '';
    const insertData: any = { note_id, content };
    if (userId) insertData.user_id = userId;
    const { data, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    // 获取用户名
    let username = '匿名用户';
    if (userId) {
      const { data: profile } = await supabase.from('user_profiles').select('username').eq('user_id', userId).single();
      if (profile) username = profile.username;
    }
    res.json({ ...data, username });
  } catch (error) {
    res.status(500).json({ error: '添加评论失败' });
  }
});

// 删除评论（只能删除自己的）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-session'] as string || '';
    const supabase = getSupabaseClient();
    // 如果有 userId，只能删除自己的评论
    if (userId) {
      const { data: comment } = await supabase.from('comments').select('user_id').eq('id', id).single();
      if (comment && comment.user_id && comment.user_id !== userId) {
        return res.status(403).json({ error: '只能删除自己的评论' });
      }
    }
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除评论失败' });
  }
});

export default router;
