import cron from 'node-cron';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 主题池，AI 会从中随机选择主题生成笔记
const topicPool = [
  '人工智能基础概念',
  '机器学习入门',
  '深度学习原理',
  'Python 编程技巧',
  'JavaScript 高级特性',
  '数据结构与算法',
  '数据库基础知识',
  '网络安全常识',
  '云计算入门',
  '区块链原理',
  '物联网技术',
  '量子计算科普',
  '宇宙探索',
  '黑洞奥秘',
  '太阳系知识',
  '地球科学',
  '生物多样性',
  '基因工程',
  '进化论基础',
  '心理学常识',
  '经济学原理',
  '历史事件解读',
  '哲学思想',
  '文学名著赏析',
  '艺术流派介绍',
  '音乐理论基础',
  '摄影技巧',
  '绘画基础',
  '健康饮食指南',
  '运动科学知识',
  '睡眠与健康',
  '心理健康维护',
  '时间管理方法',
  '高效学习技巧',
  '记忆术训练',
  '思维导图使用',
  '项目管理基础',
  '团队协作技巧',
  '沟通表达方法',
  '领导力培养',
  '某游戏攻略',
  '电脑使用教程',
  '某软件使用教程'
];

// 随机选取主题
function pickRandomTopics(count: number) {
  const shuffled = [...topicPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 调用 AI 生成笔记
async function generateNoteWithAI(topic: string): Promise<{ title: string; content: string } | null> {
  try {
    const config = new Config();
    const client = new LLMClient(config);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: '你是一个知识渊博的科普作者，擅长用通俗易懂的语言解释复杂概念。请生成一篇关于指定主题的科普/学习/教程类笔记。',
      },
      {
        role: 'user',
        content: `请围绕主题"${topic}"写一篇笔记。要求：
1. 标题简洁吸引人，15字以内
2. 内容200-400字，通俗易懂，有知识性
3. 直接输出，格式为：
标题：xxx
内容：xxx`,
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.8,
    });

    const text = response.content.trim();
    const titleMatch = text.match(/标题[：:]\s*(.+)/);
    const contentMatch = text.match(/内容[：:]\s*([\s\S]+)/);

    if (titleMatch && contentMatch) {
      return {
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim(),
      };
    }

    // 如果解析失败，使用默认格式
    return {
      title: topic,
      content: text,
    };
  } catch (error: any) {
    console.error(`[DailyNotes] AI 生成失败 (主题: ${topic}):`, error.message);
    return null;
  }
}

// 插入笔记到数据库
async function insertDailyNotes() {
  try {
    const topics = pickRandomTopics(2);
    console.log('[DailyNotes] 今日主题:', topics.join(', '));

    const notes: { title: string; content: string; user: string }[] = [];

    for (const topic of topics) {
      const note = await generateNoteWithAI(topic);
      if (note) {
        notes.push({ ...note, user: '20260509' });
      }
    }

    if (notes.length === 0) {
      console.log('[DailyNotes] 没有成功生成笔记');
      return;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.from('notes').insert(notes).select();
    if (error) {
      console.error('[DailyNotes] 插入失败:', error.message);
    } else {
      console.log(`[DailyNotes] 成功插入 ${data.length} 条 AI 生成笔记`);
    }
  } catch (error: any) {
    console.error('[DailyNotes] 异常:', error.message);
  }
}

// 启动定时任务：每天凌晨 0:05 执行
export function startDailyNotesTask() {
  cron.schedule('5 0 * * *', () => {
    console.log('[DailyNotes] 开始执行每日笔记任务...');
    insertDailyNotes();
  });
  console.log('[DailyNotes] 定时任务已启动，每天 00:05 自动生成并插入2条 AI 笔记');
}
