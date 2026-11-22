import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number.parseInt(process.env.PORT || "9091", 10);
const host = process.env.HOST || "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[Server] Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const routeDefinitions = [
  { path: "/api/v1/notes", load: async () => (await import("./routes/notes.js")).default },
  { path: "/api/v1/todos", load: async () => (await import("./routes/todos.js")).default },
  { path: "/api/v1/version", load: async () => (await import("./routes/version.js")).default },
  { path: "/api/v1/feedback", load: async () => (await import("./routes/feedback.js")).default },
  { path: "/api/v1/comments", load: async () => (await import("./routes/comments.js")).default },
  { path: "/api/v1/llm", load: async () => (await import("./routes/llm.js")).default },
  { path: "/api/v1/pictures", load: async () => (await import("./routes/pictures.js")).default },
  { path: "/api/v1/auth", load: async () => (await import("./routes/auth.js")).default },
  { path: "/api/v1/voice", load: async () => (await import("./routes/voice.js")).default },
  { path: "/api/v1/daily-notes", load: async () => (await import("./routes/daily-notes.js")).default },
  { path: "/api/public", load: async () => (await import("./routes/public-api.js")).default },
] as const;

async function registerApiRoutes(): Promise<void> {
  const results = await Promise.allSettled(
    routeDefinitions.map(async ({ path, load }) => {
      const router = await load();
      app.use(path, router);
      return path;
    }),
  );

  results.forEach((result, index) => {
    const path = routeDefinitions[index].path;
    if (result.status === "fulfilled") {
      console.log(`[Routes] Registered ${path}`);
    } else {
      console.error(`[Routes] Failed to register ${path}:`, result.reason);
    }
  });
}

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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

const server = app.listen(port, host, () => {
  console.log(`Server listening at http://${host}:${port}/`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(`[Server] Failed to listen on ${host}:${port}:`, error.code, error.message);
  process.exit(1);
});

void registerApiRoutes();

let isShuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Server] ${signal} received, shutting down...`);

  server.close((error) => {
    if (error) {
      console.error("[Server] Shutdown error:", error);
    }
    process.exit(error ? 1 : 0);
  });

  setTimeout(() => process.exit(0), 5000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
