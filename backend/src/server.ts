import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "./auth.js";
import { expandTopic, generateResearchReport, getResearchHistory } from "./research.js";
import { askStudyQuestion, createSubject, generateQuiz, listSubjectFiles, listSubjects, uploadSubjectFile } from "./study.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "askmynotes-backend",
    status: "ok"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);
app.get("/api/auth/me", getCurrentUser);
app.post("/api/auth/logout", logoutUser);

app.get("/api/subjects", listSubjects);
app.post("/api/subjects", createSubject);
app.get("/api/subjects/:subjectId/files", listSubjectFiles);
app.post("/api/subjects/:subjectId/files", upload.single("file"), uploadSubjectFile);
app.post("/api/ask", askStudyQuestion);
app.post("/api/subjects/:subjectId/quiz", generateQuiz);

app.post("/api/research/report", generateResearchReport);
app.post("/api/research/expand", expandTopic);
app.get("/api/research/history", getResearchHistory);

app.listen(port, () => {
  console.log(`ASKMYNOTES backend listening on port ${port}`);
});
