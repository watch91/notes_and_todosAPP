import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// 请配置你的邮箱 SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

router.post('/', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '反馈内容不能为空' });
    }

    const mailOptions = {
      from: process.env.SMTP_USER || 'feedback@app.com',
      to: process.env.FEEDBACK_EMAIL || 'your-email@example.com',
      subject: '【笔记应用】用户问题反馈',
      text: `用户反馈内容：\n\n${content.trim()}\n\n发送时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: '反馈已发送' });
  } catch (error) {
    console.error('发送邮件失败:', error);
    res.status(500).json({ error: '发送失败，请稍后重试' });
  }
});

export default router;
