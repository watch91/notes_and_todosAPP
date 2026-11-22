import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import notesRouter from "./routes/notes.js";
import todosRouter from "./routes/todos.js";
import versionRouter from "./routes/version.js";
import feedbackRouter from "./routes/feedback.js";
import commentsRouter from "./routes/comments.js";
import publicApiRouter from "./routes/public-api.js";
import llmRouter from "./routes/llm.js";
import picturesRouter from "./routes/pictures.js";
import authRouter from "./routes/auth.js";
import voiceRouter from "./routes/voice.js";
import dailyNotesRouter from "./routes/daily-notes.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/todos', todosRouter);
app.use('/api/v1/version', versionRouter);
app.use('/api/v1/feedback', feedbackRouter);
app.use('/api/v1/comments', commentsRouter);
app.use('/api/v1/llm', llmRouter);
app.use('/api/v1/pictures', picturesRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/voice', voiceRouter);
app.use('/api/v1/daily-notes', dailyNotesRouter);
app.use('/api/public', publicApiRouter);

// ===== 静态资源 & SPA 兜底（生产环境） =====
// 生产部署时，veFaaS 平台只启动本 Express 服务（server/dist/index.js），
// Expo Web 导出产物位于 ../../client/dist，必须由本服务托管，否则 Web 端无入口。
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webDistDir = resolve(__dirname, "../../client/dist");

if (existsSync(webDistDir)) {
  console.log(`[Static] Serving Expo web build from: ${webDistDir}`);
  // 静态资源（JS/CSS/图片等）
  app.use(express.static(webDistDir, { maxAge: "1h", index: false }));

  // SPA 兜底：非 /api/* 路径全部回退到 index.html
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    const indexPath = join(webDistDir, "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  console.log(`[Static] Expo web build not found at ${webDistDir} (dev mode, skipping static serving)`);
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
