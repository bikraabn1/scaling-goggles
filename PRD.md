# Product Requirement Document (PRD)
## Project: Ngabsennn (Daily Intern Report & MagangHub Monev Automation)

---

### 1. Overview & Objective
**Ngabsennn** adalah platform otomatisasi presensi dan penyusunan draf laporan harian magang nasional (Monev MagangHub Kemnaker).
Platform ini menyelesaikan kendala repetitive manual kerja harian peserta magang:
1. Mengambil log commit pengerjaan kode harian dari **GitLab** secara otomatis (zona waktu WIB / UTC+7).
2. Meringkas commit menjadi draf laporan formal terstruktur melalui model bahasa (LLM) dengan batasan karakter ketat (150 – 200 huruf per bagian).
3. Mengotentikasi peserta langsung ke **Identity Provider resmi Kemnaker (SIAPkerja SSO)** tanpa menyimpan kredensial/password di server atau database.
4. Melakukan pengiriman presensi harian (GPS check-in + 3 poin laporan) langsung ke API Monev MagangHub Kemnaker secara one-click dengan konfirmasi modal.
5. Mendukung rotasi token otomatis (*refresh token rotation*) hingga 30 hari tanpa perlu login berulang.

---

### 2. User Persona & Scope
- **Current Persona**: Peserta magang Kemnaker / MagangHub yang bekerja menggunakan GitLab dan wajib mengisi log harian monev setiap hari kerja.
- **Platform Scope**: Web application mobile-first responsive (dioptimalkan untuk akses via smartphone maupun laptop).
- **Security Scope**: Zero-credential storage (password hanya digunakan saat proses handshake OAuth2 Kemnaker lalu dibuang; token disimpan di signed encrypted HTTP-only session cookie).

---

### 3. Current Implemented Features

#### 3.1. Official Kemnaker SIAPkerja SSO Handshake
- **Handshake Flow**:
  1. `GET https://account.kemnaker.go.id/auth` (manual redirect tracking) untuk mengoleksi initial OAuth session cookies (`acw_tc`, `kemnaker_ri_session`).
  2. `GET /auth/login` membawa cookies sesi untuk auto-scrape CSRF token segar dari tag `<meta name="csrf-token">` tanpa input manual.
  3. `POST https://account.kemnaker.go.id/auth/login` memvalidasi kredensial pengguna dengan dynamic CSRF token.
  4. Mengambil OAuth `code` dan `state` via authorize redirect.
  5. Callback exchange ke `https://monev-api.maganghub.kemnaker.go.id/api/v1/auth/login/callback` dengan cookie `monev_oauth_state`.
- **Token Management**:
  - `access_token` (JWT, berlaku 6 jam).
  - `monev_refresh_token` (berlaku 30 hari).
  - Nama dan ID peserta magang resmi ditampilkan di dashboard header.
- **Silent Auto-Refresh**:
  - Jika `access_token` kedaluwarsa saat aksi submit, sistem otomatis memanggil `POST /api/v1/auth/refresh` menggunakan `monev_refresh_token` dan menyimpan token baru ke session tanpa menginterupsi pengguna.

#### 3.2. GitLab Commit Harvester
- Mengambil commit dari GitLab API v4 (`/projects/:id/repository/commits`).
- Mendukung self-signed SSL/internal instance via undici dispatcher.
- Filter tanggal berbasis WIB (UTC+7) mulai pukul 00:00:00 WIB hari berjalan.
- Filter author (email atau display name pengguna) agar tidak tercampur di repo tim/kolaboratif.
- Tabs switchable: **Hari Ini** vs **5 Commit Terakhir** (memudahkan generate jika belum ada commit baru di hari bersangkutan).
- Commit badges visual (Conventional Commits: `feat`, `fix`, `refactor`, `chore`, `docs`, dll).

#### 3.3. AI Daily Report Generator
- Engine: OpenAI-compatible endpoint (Google Gemini, Groq, Kenari, OpenRouter, dll).
- Constraint karakter ketat:
  1. **Uraian Kegiatan**: 150 – 200 karakter.
  2. **Pembelajaran**: 150 – 200 karakter.
  3. **Kendala**: 150 – 200 karakter.
- Real-time character counter & status validasi visual.
- Tombol One-Click Copy per bagian maupun gabungan.

#### 3.4. Direct Monev MagangHub Submission
- Endpoint: `POST https://monev-api.maganghub.kemnaker.go.id/api/v1/attendances/with-daily-log`.
- Payload otomatis: `date` (WIB), `status: PRESENT`, koordinat kantor GPS (`latitude`, `longitude`), serta 3 poin laporan.
- **Shadcn Confirmation Dialog**: Konfirmasi popup pra-kirim dengan preview teks dan jumlah huruf untuk mencegah salah submit.
- **Shadcn Alerts**: Notifikasi feedback visual (sukses, error API, atau error autentikasi).

#### 3.5. Responsive 2-Column Workbench & Design System
- **Preset `b5dyaqxe6` + Style `Sera`**:
  - Filosofi editorial/print-design dengan tipografi kuat, sudut tegas tajam (`--radius: 0.25rem`), aksen mist neutral dan teal brand accents.
  - Tracking uppercase monospace pada subheadings dan badge status.
- **Dark / Light Theme Toggle**:
  - Tombol toggle berbasis icon `Contrast` (Lucide React) dengan micro-interaction rotasi halus.
  - Script inline anti-FOUC di `<head>` untuk transisi instan tanpa kedipan putih.
- **Eliminasi Blank Space**:
  - Layout diperluas menjadi `max-w-7xl` (1280px).
  - Pada desktop (`lg`+), antarmuka terbagi menjadi 2 kolom proporsional (5:7):
    - Kolom Kiri: Feed commit GitLab (scrollable compact) + Tombol generate AI sticky.
    - Kolom Kanan: Workspace form laporan 3 poin dan aksi submit Monev.
  - Pada mobile/tablet, kembali tersusun vertikal adaptif 1 kolom yang fleksibel.

---

### 4. Technical Architecture

```
app/
├── components/
│   ├── ui/                 # Shadcn UI primitives (alert, dialog, button, card, input, textarea, badge, etc.)
│   ├── app-logo.tsx        # Vector monogram SVG app icon
│   ├── commit-list.tsx     # Feed & table commit harvester + tabs filter
│   └── report-form.tsx     # 3-field editor + live char counter + Shadcn confirmation dialog
├── lib/
│   ├── auth.server.ts      # Encrypted session cookie management (30-day max-age)
│   ├── gitlab.server.ts    # Fetcher commit GitLab API v4 + WIB time range filter
│   ├── kemnaker-auth.server.ts # OAuth2 SSO handshake automation & refresh token handler
│   ├── llm.server.ts       # LLM structured prompt generator
│   ├── monev.server.ts     # MagangHub direct submission service
│   └── utils.ts            # UI helper classnames
├── routes/
│   ├── _index.tsx          # Root redirector
│   ├── login.tsx           # SIAPkerja Kemnaker SSO login gate
│   ├── logout.tsx          # Session destruction & sign-out handler
│   └── dashboard.tsx       # Main workbench (commits, report editor, Monev actions)
└── app.css                 # Tailwind v4 + Shadcn neutral color tokens
```

---

### 5. Future Roadmap

#### Phase 3: Multi-User Architecture & Database Persistence
- **Database**: SQLite (via Turso/libSQL untuk cloud edge, atau local SQLite) menggunakan **Drizzle ORM**.
- **User Management**:
  - Menyimpan profil peserta yang login (`user_id`, `name`, `email`).
  - Menyimpan `monev_refresh_token` per user secara terenkripsi di database agar sesi background tetap berjalan.
  - Dukungan multi-user: rekan magang lain dapat menggunakan satu deployment web app yang sama dengan akun SIAPkerja masing-masing.
- **Config per User**:
  - Masing-masing user dapat mengatur target GitLab Project ID, Personal Access Token, dan koordinat kantor mereka sendiri.

#### Phase 4: Automated Webhook & Scheduled Auto-Submit (Cron)
- **Daily Scheduled Job**:
  - Cron trigger harian (misal pukul 14:00 atau 15:00 WIB).
  - Mengambil commit hari itu secara headless → generate laporan via LLM → auto-submit presensi ke MagangHub menggunakan refresh token yang tersimpan di DB.
- **Webhook Endpoint**:
  - `POST /api/webhook/auto-submit` dilindungi oleh `WEBHOOK_SECRET` untuk integrasi dengan GitHub Actions, Cron-job.org, atau server crontab.
- **Custom Schedule Settings**: Pengguna dapat memilih jam submit otomatis sesuai jam pulang kantor masing-masing.

#### Phase 5: History, Analytics & Notification
- **History Laporan**: Dashboard riwayat presensi yang sudah disubmit ke MagangHub (status approval, draf log per tanggal).
- **Multi-Repo GitLab**: Dukungan memanen commit dari lebih dari 1 repository sekaligus untuk digabungkan ke laporan harian.
- **Notification Reminder**: Pengingat otomatis via WhatsApp (Fonnte/WA Gateway) atau Telegram Bot jika presensi belum terisi menjelang batas akhir harian.
