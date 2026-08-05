# 🚀 MoonBird Full Deployment & Supabase Migration Guide

This document details the exact steps to deploy **MoonBird** to production and perform the backend migration from local mockup storage to a free **Supabase (PostgreSQL)** backend as a service, confirming the elimination of any Go dependencies for simplified cloud hosting.

---

## 📋 Architecture Overview

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion
- **Database & Auth**: Supabase (PostgreSQL)
  - **Primary Auth Flow**: Passwordless Email OTP (One-Time Password)
  - **Backup Auth Flow**: Traditional Password Login Fallback
  - **Tables**: `profiles`, `challenges`, `completed_challenges`, `journals`, `routines`, `life_goals`, `feed_posts`
- **Hosting**: Vercel, Netlify, Cloud Run, or GitHub Pages

---

## 📁 1. Git & Environment Setup

1. Confirm `.gitignore` includes local build output, environment secrets, and private deployment docs:
   ```gitignore
   node_modules/
   dist/
   .env
   .env.local
   MOONBIRD_DEPLOYMENT.md
   ```

2. Create `.env.example` to document required Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

---

## ⚡ 2. Provision Supabase Database (PostgreSQL)

1. Sign in to [Supabase](https://supabase.com) and create a new project named **MoonBird**.
2. Navigate to the **SQL Editor** in Supabase dashboard and execute the following bootstrap migration script:

```sql
-- 1. Create Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT DEFAULT 'stargazer',
  moonbird_id TEXT UNIQUE NOT NULL,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 1,
  age_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Completed Challenges Ledger
CREATE TABLE public.completed_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  challenge_id TEXT NOT NULL,
  submission_notes TEXT,
  survey_answers JSONB,
  earned_xp INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Custom Challenges Table
CREATE TABLE public.custom_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT DEFAULT 'Level One',
  description TEXT NOT NULL,
  reward_xp INTEGER DEFAULT 100,
  steps JSONB NOT NULL,
  survey_questions JSONB,
  bonus_tasks JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_challenges ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Public profiles read access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own completed challenges" ON public.completed_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert completed challenges" ON public.completed_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read custom challenges" ON public.custom_challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated users insert custom challenges" ON public.custom_challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
```

---

## 🔐 3. Configure Supabase Auth Flows

1. Go to **Authentication -> Providers** in Supabase:
   - **Email Provider**: Enable Email login.
   - **Passwordless OTP**: Enable Email OTP link / 6-digit code verification.
   - **Password Fallback**: Enable password authentication so users have a traditional backup option if email delivery lags.
2. In **Authentication -> URL Configuration**:
   - Set Site URL to your production domain (e.g. `https://moonbird.vercel.app`).
   - Add redirect URLs: `https://moonbird.vercel.app/*`.

---

## 📦 4. Client Integration (Supabase SDK)

Install the `@supabase/supabase-js` library in your repository:

```bash
npm install @supabase/supabase-js
```

Initialize the Supabase client (`/src/lib/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 🌐 5. Deploying the Frontend

### Option A: Deploy to Vercel (Recommended)
1. Push your repository to GitHub.
2. Import project in Vercel.
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will run `npm run build` and publish static assets to Cloud CDN.

### Option B: Deploy to Cloud Run / Docker
Execute standard Vite container build:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## ⚙️ 6. Confirmation of No Go Dependencies

- All application logic, MoonDial calculations, habit trigger logs, vital checks, astronomical calculations, and challenge builders run strictly on standard React/Vite TypeScript.
- Authentication & PostgreSQL database management are completely offloaded to Supabase BaaS.
- No Go binary, server, or container runtime is required.

---

## ✅ Deployment Checklist
- [x] Renamed app to MoonBird in `metadata.json`
- [x] Updated all 8 structured challenges (Perspective Audit, Cut the Habit, Vital Check, Sky Watcher, Life Blueprint)
- [x] Integrated Challenge Builder UI
- [x] Provisioned Supabase schema & SQL setup script
- [x] Ignored `MOONBIRD_DEPLOYMENT.md` in `.gitignore`
