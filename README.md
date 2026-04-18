# ResearchPilot x AskMyNotes

This project now has two connected experiences inside the same codebase:

- `ResearchPilot`: a research assistant that gathers live source metadata, builds structured reports, expands topics, and keeps report history.
- `AskMyNotes Study Copilot`: a second page for the original notes workflow with up to 3 subjects, file uploads, grounded Q and A, and quiz generation.

## Stack

- `frontend/`: Next.js 16 + TypeScript
- `backend/`: Express + TypeScript
- `AI layer`: Gemini API integration with local fallback behavior when no key is configured

## Core Features

### ResearchPilot

- Open-ended research query input
- Live source discovery using academic and reference endpoints
- Structured output:
  - Title
  - Abstract
  - Key Findings
  - Sources
  - Conclusion
  - Follow-up Questions
- Topic expansion
- Session history
- Markdown export

### AskMyNotes Study Copilot

- Up to 3 subjects per user
- Upload PDF, TXT, or MD files
- Text extraction and note summaries
- Ask grounded questions from uploaded notes
- Optional semantic retrieval with Gemini embeddings + Pinecone per subject
- Generate revision quizzes

## Environment

### Backend

Create `backend/.env` from `backend/.env.example`

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
GOOGLE_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
PINECONE_API_KEY=
PINECONE_INDEX_HOST=
```

`GOOGLE_API_KEY` or `GEMINI_API_KEY` is optional but recommended. Without it, the app still runs using local fallback synthesis.

`PINECONE_API_KEY` and `PINECONE_INDEX_HOST` are optional. If set, Study Copilot indexes uploaded chunks per subject and uses semantic retrieval before answering questions.

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 🚀 How to Start and Run the Project

Since this is a full-stack mono-repo, you will need **two terminal windows** open—one for the backend and one for the frontend.

### Step 1: Install Dependencies
First, ensure you have Node.js installed. Then, install dependencies for both sides of the application:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
```

### Step 2: Configure Environment Variables
Before running the app, you need to set up your API keys.

1. **Backend:**
   Copy `backend/.env.example` to a new file named `backend/.env`.
   Add your Gemini and Pinecone API keys (if you don't add them, the app will use local fallback data but won't use AI generation).
2. **Frontend:**
   Copy `frontend/.env.example` to `frontend/.env.local`.

### Step 3: Run the Development Servers
Now start both servers simultaneously:

**Terminal 1 (Backend):**
```bash
# Make sure you are inside the 'backend' folder
npm run dev
```
*(The backend will start on http://localhost:3001)*

**Terminal 2 (Frontend):**
```bash
# Make sure you are inside the 'frontend' folder
npm run dev
```
*(The frontend will start on http://localhost:3000)*

### Step 4: Open the App
Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

*Note: If port 3000 or 3001 is already in use by another app, stop the old process first.*

## Notes

- User data is stored locally in `backend/data/db.json` during development.
- PDF parsing is supported in study mode.
- Gemini is used for richer report generation, topic expansion, note summarization, grounded answers, and quizzes when an API key is configured.
- Pinecone is used only when its environment variables are configured; otherwise the app falls back to local note-context retrieval.
