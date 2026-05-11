import { Router } from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await getSupabaseClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const { data: newUser, error } = await getSupabaseClient()
      .from('users')
      .insert({ email, password: hashedPassword })
      .select('id, email, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: '注册失败' });
    }

    // 生成 token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: { id: newUser.id, email: newUser.email },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 查找用户
    const { data: user, error } = await getSupabaseClient()
      .from('users')
      .select('id, email, password')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成 token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const { data: user } = await getSupabaseClient()
      .from('users')
      .select('id, email, created_at')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Token 无效' });
  }
});

export default router;
