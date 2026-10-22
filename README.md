# ngabsennn ⚡

> **Personal Daily Attendance & MagangHub Monev Automation Tool**  
> Mengambil commit pengerjaan kode dari GitLab, merangkumnya menjadi draf laporan magang formal via LLM (150–200 huruf per poin), dan mengirim presensi otomatis langsung ke portal resmi **Monev MagangHub Kemnaker**.

---

## 🌟 Fitur Utama

- 🔐 **Official Kemnaker SIAPkerja SSO Integration**: Login langsung menggunakan akun SIAPkerja Kemnaker via alur OAuth2 otomatis. Tidak perlu menyalin token manual atau menyimpan password di database.
- 🔄 **30-Day Auto Refresh Token**: Sesi aktif hingga 30 hari. Token akses diperbarui secara senyap (*silent background refresh*) saat mengirim laporan.
- 🦊 **GitLab Commit Harvester**: Mengambil commit pengerjaan harian berdasarkan rentang waktu **00:00:00 WIB**, lengkap dengan filter author dan tab switcher (*Hari Ini* vs *5 Commit Terakhir*).
- 🤖 **AI-Powered Report Generator**: Rangkuman harian otomatis dengan batasan karakter ketat Kemnaker:
  - **Uraian Kegiatan**: 150 – 200 karakter.
  - **Pembelajaran yang Diperoleh**: 150 – 200 karakter.
  - **Kendala**: 150 – 200 karakter.
- 📡 **One-Click Direct Submission ke Monev**: Kirim presensi (status `PRESENT` + koordinat GPS kantor + 3 poin laporan) langsung ke API Kemnaker dengan modal dialog konfirmasi Shadcn UI resmi.
- 📱 **Mobile-First & Clean UI**: Didesain responsif untuk penggunaan harian dari smartphone maupun laptop, menggunakan preset neutral Shadcn UI.

---

## 🛠️ Tech Stack

- **Framework**: [React Router v7](https://reactrouter.com/) (Full-stack SSR)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Dialog, Alert, Card, Button, Input, Textarea, Badge)
- **Icons**: Lucide React
- **Runtime & Language**: Node.js & TypeScript
- **HTTP / Fetching**: Native Fetch + Undici dispatcher (dukungan internal GitLab self-signed SSL)

---

## 📋 Prasyarat (Prerequisites)

Sebelum memasang aplikasi, pastikan Anda memiliki:
1. **Node.js** versi `v20.x` atau lebih baru.
2. **GitLab Personal Access Token** dengan scope minimal `read_api` atau `read_repository`.
3. **API Key LLM** yang mendukung OpenAI-compatible endpoint (Google Gemini, Groq, OpenRouter, Kenari, dll).
4. **Akun SIAPkerja Kemnaker** yang aktif terdaftar pada program MagangHub.

---

## 🚀 Panduan Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/username/ngabsennn.git
cd ngabsennn
```

### 2. Pasang Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Salin template file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` dan sesuaikan konfigurasinya:

```env
# ------------------------------------------------------------------------------
# Keamanan Sesi Cookie
# ------------------------------------------------------------------------------
# String acak minimal 32 karakter untuk sign cookie sesi terenkripsi
SESSION_SECRET=buat_string_acak_panjang_minimal_32_karakter_bebas

# ------------------------------------------------------------------------------
# Konfigurasi GitLab
# ------------------------------------------------------------------------------
# URL instance GitLab kantor/kampus Anda (tanpa garis miring di akhir)
GITLAB_BASE_URL=https://gitlab.com

# ID project di GitLab (angka ID repository)
GITLAB_PROJECT_ID=

# Personal Access Token GitLab
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# (Opsional) Filter nama author atau email commit Anda
GITLAB_AUTHOR_NAME=nama_username_anda

# ------------------------------------------------------------------------------
# Konfigurasi LLM API (OpenAI-compatible)
# ------------------------------------------------------------------------------
# Contoh: Google Gemini / Groq / OpenRouter / Provider lokal
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=AIzaSy_your_gemini_api_key
LLM_MODEL=gemini-1.5-flash

# ------------------------------------------------------------------------------
# Koordinat GPS Kantor MagangHub
# ------------------------------------------------------------------------------
# Koordinat kantor untuk presensi GPS Kemnaker
MONEV_LATITUDE=-70.134234540700425
MONEV_LONGITUDE=10.81394960985433
```

> **Catatan Keamanan**: Anda **tidak perlu** menuliskan email atau password Kemnaker di file `.env`. Autentikasi dilakukan langsung saat login di browser.

---

## 💻 Menjalankan Aplikasi

### Mode Pengembangan (Development)

Jalankan development server:

```bash
npm run dev
```

Buka browser Anda di `http://localhost:5173`.

### Mode Produksi (Production)

Kompilasi aplikasi dan jalankan server production:

```bash
npm run build
npm start
```

---

## 📖 Cara Penggunaan

1. **Masuk ke Aplikasi**: Buka halaman login di `/login`. Masukkan **email dan password akun SIAPkerja Kemnaker** Anda.
2. **Lihat Commit Pengerjaan**: Di dashboard, aplikasi akan otomatis memuat commit GitLab Anda sejak pukul `00:00 WIB` hari ini (atau beralih ke tab `5 Terakhir`).
3. **Generate Draf Laporan**: Klik tombol **"Generate dari Commit Hari Ini"**. AI akan menyusun Uraian Kegiatan, Pembelajaran, dan Kendala sesuai format baku 150–200 huruf.
4. **Periksa & Edit**: Sesuaikan teks jika diperlukan pada masing-masing textarea (indikator karakter akan berwarna hijau jika tepat di rentang 150–200 huruf).
5. **Kirim Presensi ke MagangHub**: Klik **"Kirim Langsung ke Monev MagangHub"**. Modal konfirmasi akan muncul menampilkan preview data; konfirmasi untuk mengirim presensi dan laporan harian ke server Kemnaker.

---

## 🗺️ Roadmap Pengembangan Berikutnya

- [ ] **Multi-User Database**: Dukungan basis data (SQLite / Drizzle ORM) agar satu instance web app dapat digunakan oleh rekan-rekan magang lainnya dengan akun terpisah.
- [ ] **Scheduled Webhook / Cron Auto-Submit**: Otomatisasi generate dan submit presensi pada jam tertentu (misal 14:00 atau 15:00 WIB) menggunakan refresh token yang tersimpan di database.
- [ ] **History & Analytics**: Riwayat log harian yang sudah terkirim beserta status approval pembimbing.
- [ ] **Notification Gateway**: Pengingat absen harian otomatis melalui WhatsApp atau Telegram.

---

## 📄 Lisensi

Distributed under the MIT License.
