import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

// 获取笔记的所有评论
router.get('/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '获取评论失败' });
  }
});

// 添加评论
router.post('/', async (req, res) => {
  try {
    const { note_id, content } = req.body;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('comments')
      .insert({ note_id, content })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '添加评论失败' });
  }
});

// 删除评论
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除评论失败' });
  }
});

export default router;
