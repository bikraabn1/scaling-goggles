# Product Requirement Document (PRD)
## Project: Ngabsennn (Phase 1 - Daily Report Generator)

---

### 1. Overview & Objective
**Ngabsennn** adalah platform internal pribadi untuk mengotomatisasi pembuatan draf laporan harian magang.
Fokus **Phase 1** adalah:
- Mengambil log commit hari ini dari GitLab instansi (**GitLab Perpuskita**).
- Meng-generate 3 komponen laporan resmi magang via LLM dengan batasan karakter ketat (150 - 200 huruf per poin).
- Menyediakan UI modern, bersih, no-gradient, menggunakan standar Shadcn UI (`base-nova` preset / neutral palette).
- Menyediakan fitur single-password auth via `.env` dan one-click copy untuk memudahkan input ke platform monev.
*(Fitur auto-post ke Monev Maganghub diparkir untuk Phase 2).*

---

### 2. User Persona & Scope
- **User**: Single user (magang pribadi).
- **Deployment**: Vercel (Edge/Node Serverless SSR via React Router v7).
- **Security**: Single static password protection via `.env`.

---

### 3. Core Features (Phase 1)

#### 3.1. Authentication (App Access Guard)
- **Mechanism**: Single password gate.
- **Config**: `APP_PASSWORD` di `.env`.
- **Session**: Signed HTTP-only cookie via React Router session storage.
- **UI**: Minimalist clean login screen jika cookie session tidak valid / expired.

#### 3.2. GitLab Commit Harvester
- **Target**: GitLab API (v4) instance Perpuskita.
- **Config**: 
  - `GITLAB_BASE_URL` (contoh: `https://gitlab.perpuskita.com` atau domain internal).
  - `GITLAB_PROJECT_ID` (ID repo atau URL-encoded path).
  - `GITLAB_TOKEN` (Personal Access Token dengan scope `read_api` / `read_repository`).
  - `GITLAB_AUTHOR_EMAIL` atau `GITLAB_AUTHOR_NAME` (opsional jika token sudah spesifik akun).
- **Filter Logika**:
  - `since`: Awal hari ini (00:00:00 WIB / UTC+7).
  - `until`: Sekarang.
  - Skip merge commit (`Merge branch...`) dan commit kosong.
  - Hanya ambil pesan commit (`commit.title` & `commit.message`), tidak mengambil git diff demi efisiensi token & privasi.

#### 3.3. AI Daily Report Generator
- **Provider**: OpenRouter / Anthropic / Groq / OpenAI (dapat dikonfigurasi via env, misal `LLM_API_KEY`, `LLM_MODEL`).
- **Prompt Spec**:
  - Input: List commit message hari ini.
  - Bahasa: Bahasa Indonesia formal, profesional, dan padat.
  - Output Schema: JSON terstruktur.
- **Batasan Karakter (Strict Constraint)**:
  1. **Uraian Kegiatan**: Rangkuman pekerjaan teknis (150 - 200 karakter).
  2. **Pembelajaran yang Diperoleh**: Insight teknis atau pemahaman sistem/flow yang didapat (150 - 200 karakter).
  3. **Kendala**: Masalah yang dihadapi atau "Tidak ada kendala yang berarti dalam pengerjaan tugas hari ini" jika lancar (150 - 200 karakter).
- **Character Counter**: UI wajib menampilkan live badge counter karakter (contoh: `178 / 200 karakter`, status: valid/warning jika di luar 150-200).

#### 3.4. Dashboard & Workspace UI
- **Design System**: Shadcn UI (`base-nova`, neutral clean, border halus, flat/monochrome elegan, zero tacky gradients).
- **App Icon & Favicon**: Minimalist SVG icon custom (ikon kalender/check/terminal monokrom).
- **Komponen Dashboard**:
  - **Header**: Nama app (`ngabsennn`), status tanggal hari ini (Format: `Senin, 19 Oktober 2026`), status sesi, tombol Logout.
  - **Commit Preview Box**: List commit yang berhasil ditarik hari ini (bisa dicek ulang). Tombol "Fetch Commits" manual jika ada commit baru.
  - **Action Button**: Tombol "Generate Laporan" (dengan loading spinner state).
  - **Editor Form (3 Textarea)**:
    - Textarea 1: Uraian Kegiatan + Live character counter (150-200 target).
    - Textarea 2: Pembelajaran yang Diperoleh + Live character counter (150-200 target).
    - Textarea 3: Kendala + Live character counter (150-200 target).
  - **Copy Actions**:
    - Tombol "Copy All" (format gabungan siap paste).
    - Tombol "Copy" per masing-masing section.

---

### 4. Technical Architecture (React Router v7)

```
app/
├── components/
│   ├── ui/               # Shadcn components (button, textarea, card, badge, dialog, etc.)
│   ├── commit-list.tsx   # Tampilan list commit hari ini
│   ├── report-form.tsx   # Form 3 textarea + live char counter + copy button
│   └── navbar.tsx        # Minimal clean header
├── lib/
│   ├── auth.server.ts    # Cookie session & password check logic
│   ├── gitlab.server.ts  # Fetcher commits dari GitLab API
│   ├── llm.server.ts     # Caller LLM dengan structured output & length prompt
│   └── utils.ts          # Helper classnames & formatters
├── routes/
│   ├── _index.tsx        # Redirect ke /dashboard atau /login
│   ├── login.tsx         # Login gate (input password)
│   ├── dashboard.tsx     # Main workbench (Loader commit, Action generate)
│   └── api.generate.ts   # (Opsional) endpoint action jika via fetcher
└── app.css               # Tailwind v4 + Shadcn base-nova variables
```

---

### 5. Environment Variables

```env
# App Security
APP_PASSWORD=password_rahasia_kamu
SESSION_SECRET=random_session_secret_min_32_chars

# GitLab Perpuskita
GITLAB_BASE_URL=https://gitlab.perpuskita.com
GITLAB_PROJECT_ID=12345
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_AUTHOR_NAME="Bikra" # atau email author

# LLM Generation
LLM_API_KEY=sk-xxxx
LLM_BASE_URL=https://openrouter.ai/api/v1 # atau direct provider
LLM_MODEL=anthropic/claude-3.5-haiku # atau model hemat lainnya
```

---

### 6. Phase 2 Roadmap (Future Extension)
- Simpan history draft ke Supabase / Turso.
- Auto-post & token session handler ke API Monev Maganghub.
- Cron trigger harian jam 17:00 WIB.
