import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
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
import aiRouter from "./routes/ai.js";
import { startDailyNotesTask } from "./tasks/daily-notes.js";

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
app.use('/api/v1/notes/ai-assistant', aiRouter);
app.use('/api/public', publicApiRouter);

// ===== 静态资源 & SPA 兜底（生产环境） =====
// Expo web 导出目录：../../client/dist
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webDistDir = resolve(__dirname, '../../client/dist');

if (existsSync(webDistDir)) {
  console.log(`[Static] Serving Expo web build from: ${webDistDir}`);
  // 静态资源（JS/CSS/图片等）
  app.use(express.static(webDistDir, { maxAge: '1h', index: false }));

  // SPA 兜底：非 /api/* 路径全部回退到 index.html
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    const indexPath = join(webDistDir, 'index.html');
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
  startDailyNotesTask();
});
