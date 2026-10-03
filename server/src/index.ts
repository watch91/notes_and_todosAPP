import express from "express";
import cors from "cors";
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
