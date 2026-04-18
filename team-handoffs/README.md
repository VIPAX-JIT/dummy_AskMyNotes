# Team Push Handoff

Since this is a group project, use the following split to ensure all 4 members have equal commit history and contributions when pushing to the main `AI_Intelligence` repo.

## 1. Jatin (Project Foundation & Database)
**Responsibilities:** Project initialization, core configurations, and database layer.
**Files to push:**
- `README.md` and `.gitignore`
- `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`
- `frontend/package.json`, `frontend/tsconfig.json`, `frontend/next.config.ts`, `frontend/tailwind.config.ts` (if any)
- `backend/src/store.ts` and the `backend/data/` directory
- `team-handoffs/` directory

## 2. Harshit (Backend Architecture & AI Services)
**Responsibilities:** Express server setup, API routes, authentication, and Gemini/Pinecone integrations.
**Files to push:**
- `backend/src/server.ts`, `backend/src/types.ts`
- `backend/src/auth.ts`, `backend/src/research.ts`, `backend/src/study.ts`
- `backend/src/services/` (entire folder including `gemini.ts`, `pinecone.ts`, `researchEngine.ts`, `studyEngine.ts`, `sourceDiscovery.ts`)

## 3. Pushkar (Frontend Design System & Components)
**Responsibilities:** UI components, global styling, preloader animations, and base layouts.
**Files to push:**
- `frontend/app/globals.css`, `frontend/app/layout.tsx`
- `frontend/src/components/` (entire folder, including `Preloader.tsx`, `ProjectLogo.tsx`, `FeatureCard`, etc.)
- `frontend/src/contexts/` (AuthContext, etc.)
- `frontend/src/lib/api.ts`

## 4. Krrish (Frontend Application Routes & Dashboards)
**Responsibilities:** The main application pages, authentication screens, and the interactive dashboards.
**Files to push:**
- `frontend/app/page.tsx` (Landing Page)
- `frontend/app/login/page.tsx` & `frontend/app/register/page.tsx` (Auth Pages)
- `frontend/app/research/page.tsx` (ResearchPilot Dashboard)
- `frontend/app/study/page.tsx` (Study Copilot Dashboard)

---

### How to use this guide:
1. Each member clones the empty main repo.
2. When it's your turn, copy *only* your assigned files from this dummy repo into your local clone of the main repo.
3. Add, commit, and push your branch/files.
4. This guarantees that GitHub accurately tracks everyone's contributions!
