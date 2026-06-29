import cron from 'node-cron';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

// 预设笔记池，每天随机从中选取插入
const notePool = [
  { title: '今日小记：保持好心情', content: '每天都是新的一天，保持积极的心态，生活会更美好。' },
  { title: '健康小贴士', content: '多喝水、多运动、早睡早起，身体是革命的本钱。' },
  { title: '读书笔记', content: '今天读了一本好书，收获颇丰。分享是最好的学习。' },
  { title: '工作效率提升', content: '番茄工作法：专注25分钟，休息5分钟，提高效率的好方法。' },
  { title: '生活感悟', content: '慢下来，感受生活中的小确幸。一杯咖啡、一缕阳光，都是幸福。' },
  { title: '学习新技能', content: '每天进步一点点，积累起来就是巨大的成长。' },
  { title: '周末计划', content: '周末去户外走走，呼吸新鲜空气，放松身心。' },
  { title: '美食记录', content: '今天尝试了一道新菜，味道不错！下次再做。' },
  { title: '运动打卡', content: '坚持运动第N天，感觉精力更充沛了。' },
  { title: '感恩日记', content: '感谢身边每一个关心我的人，有你们真好。' },
  { title: '旅行回忆', content: '翻看以前的照片，回忆起那些美好的旅行时光。' },
  { title: '音乐分享', content: '今天听到一首很好听的歌，推荐给朋友们。' },
  { title: '电影推荐', content: '昨晚看了一部精彩的电影，剧情引人入胜。' },
  { title: '季节变化', content: '天气渐凉，记得添衣保暖，照顾好自己。' },
  { title: '目标设定', content: '新的一年，设定新的目标，努力去实现。' },
  { title: '时间管理', content: '合理规划时间，做事更有条理，效率更高。' },
  { title: '人际关系', content: '多与家人朋友沟通，珍惜每一份情谊。' },
  { title: '自我反思', content: '每天花几分钟反思自己，不断改进，成为更好的自己。' },
  { title: '创意灵感', content: '灵感来了就要赶紧记下来，不然一会儿就忘了。' },
  { title: '晚安语录', content: '今天辛苦了，好好休息，明天又是充满希望的一天。' },
  { title: '晨间习惯', content: '早起一杯温水，开启元气满满的一天。' },
  { title: '阅读时光', content: '每天坚持阅读30分钟，一年就能读很多本书。' },
  { title: '断舍离', content: '定期整理房间，扔掉不需要的东西，心情也会变好。' },
  { title: '理财小记', content: '每月存一点钱，积少成多，为未来做准备。' },
  { title: '宠物日常', content: '家里的小家伙今天又做了可爱的事情，治愈了一天。' },
  { title: '园艺记录', content: '阳台的花开了，每天浇水施肥，看着它们成长很开心。' },
  { title: '手工DIY', content: '今天做了一个小手工，虽然不太完美但很有成就感。' },
  { title: '天气记录', content: '今天阳光明媚，适合出门散步。' },
  { title: '美食探店', content: '发现了一家很好吃的小店，下次带朋友一起来。' },
  { title: '年度总结', content: '回顾这一年，有收获也有遗憾，继续前行吧。' },
];

// 每天随机选取指定数量的笔记
function pickRandomNotes(count: number) {
  const shuffled = [...notePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 插入笔记到数据库
async function insertDailyNotes() {
  try {
    const client = getSupabaseClient();
    const notes = pickRandomNotes(3);
    
    const records = notes.map(n => ({
      title: n.title,
      content: n.content,
    }));

    const { data, error } = await client.from('notes').insert(records).select();
    if (error) {
      console.error('[DailyNotes] 插入失败:', error.message);
    } else {
      console.log(`[DailyNotes] 成功插入 ${data.length} 条笔记`);
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
  console.log('[DailyNotes] 定时任务已启动，每天 00:05 自动插入笔记');
}
