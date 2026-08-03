import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const supabase = getSupabaseClient();

// 生成8位唯一用户ID
const generateUserId = async (): Promise<string> => {
  const maxAttempts = 100;
  for (let i = 0; i < maxAttempts; i++) {
    const userId = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const { data } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    if (!data) return userId;
  }
  throw new Error('Failed to generate unique user ID');
};

// 注册
router.post('/register', async (req, res) => {
  try {
    const { user_name, password } = req.body;
    
    if (!user_name || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }
    
    // 生成唯一用户ID
    const user_id = await generateUserId();
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 插入用户
    const { data, error } = await supabase
      .from('users')
      .insert({ user_id, user_name, password: hashedPassword })
      .select()
      .single();
    
    if (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: '注册失败' });
    }
    
    // 返回用户信息（包含明文密码，用于展示）
    res.json({
      success: true,
      data: {
        user_id: data.user_id,
        user_name: data.user_name,
        password: password // 返回明文密码供用户查看
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { user_id, password } = req.body;
    
    if (!user_id || !password) {
      return res.status(400).json({ error: '用户ID和密码不能为空' });
    }
    
    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '密码错误' });
    }
    
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        user_name: user.user_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await db.query(users).where(eq(users.user_id, userId)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        user_id: user[0].user_id,
        user_name: user[0].user_name
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
