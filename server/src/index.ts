import express from "express";
import cors from "cors";
import notesRouter from "./routes/notes.js";
import todosRouter from "./routes/todos.js";
import versionRouter from "./routes/version.js";
import asrRouter from "./routes/asr.js";

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
app.use('/api/v1/asr', asrRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
