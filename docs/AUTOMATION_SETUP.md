# Panduan Setup Automasi Presensi, Webhook & Email Fallback (Ngabsennn)

Dokumen ini menjelaskan cara kerja sistem automasi presensi (bot), integrasi webhook, penundaan retry 2 jam, fallback 5 commit terakhir, dan cara mendapatkan **API Key Resend**.

---

## 1. Cara Mendapatkan API Key Resend (Email Provider)

Resend digunakan untuk mengirim email notifikasi harian, peringatan penundaan 2 jam (saat commit 0), dan alert darurat saat presensi gagal. Layanan ini **gratis 3.000 email/bulan**.

### Langkah-langkah:
1. Kunjungi [resend.com](https://resend.com) dan buat akun (bisa langsung login menggunakan akun GitHub atau Google).
2. Di dashboard Resend, buka menu **API Keys** di sidebar kiri.
3. Klik tombol **"Create API Key"**:
   - Berikan nama key, misalnya: `ngabsennn-bot`.
   - Pilih permission: **Full access** (default).
   - Klik **Add**.
4. Salin string key yang muncul (dimulai dengan `re_...`). **Catat key ini karena hanya ditampilkan sekali**.
5. Masukkan ke file `.env` di server hosting (atau Vercel Environment Variables):
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL="Ngabsennn <onboarding@resend.dev>"
   ```
   *(Catatan: Domain bawaan `onboarding@resend.dev` gratis dan bisa langsung dipakai untuk mengirim email ke alamat email yang Anda daftarkan di akun Resend).*

---

## 2. Alur Kerja Logika Webhook & Fallback

Endpoint webhook: `POST /api/cron/attendance`

### Mekanisme Eksekusi:
1. **Guard Presensi:** Cek ke Supabase apakah user sudah pernah submit presensi hari ini. Jika sudah, sistem langsung melewati (*skip*) agar tidak ada duplikasi.
2. **Pengecekan Commit Git:**
   - **Kondisi A (Ada Commit):** AI merangkum log commit + catatan aktivitas non-coding $\rightarrow$ Submit ke MagangHub $\rightarrow$ Kirim email sukses.
   - **Kondisi B (0 Commit - Percobaan Pertama):**
     - Sistem **tidak langsung submit**.
     - Sistem mencatat antrean ke tabel `attendance_retry_queue`.
     - Sistem mengirim email notifikasi ke user: *"Hari ini belum ada commit. Sistem akan menunggu dan mencoba ulang otomatis 2 jam lagi."*
   - **Kondisi C (0 Commit - Setelah Lewat 2 Jam):**
     - Jika sampai 2 jam kemudian masih belum ada commit baru, sistem mengaktifkan **Mode Fallback 5 Commit Terakhir**.
     - AI diinstruksikan merangkum draf dengan fokus: *Code review, QA/testing verifikasi sistem, dan bug hunting dari 5 commit terakhir*.
     - Submit ke MagangHub $\rightarrow$ Kirim email laporan fallback sukses.
3. **Emergency Fallback (Error Alert):**
   - Jika token login Kemnaker kedaluwarsa atau server Kemnaker error, sistem langsung mengirimkan email peringatan darurat ke email user agar segera membuka web secara manual sebelum portal presensi tutup.

---

## 3. Setup GitHub Actions Cron (Trigger Otomatis)

Workflow telah disediakan di `.github/workflows/attendance-cron.yml`.

### Pengaturan di Repository GitHub:
1. Buka repo Anda di GitHub $\rightarrow$ Masuk ke tab **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Tambahkan 2 repository secret:
   - `APP_URL`: Domain website Vercel Anda tanpa `https://` (contoh: `ngabsennn.vercel.app`).
   - `CRON_SECRET`: String token rahasia yang sama dengan yang disetel di `.env` (contoh: `kunci_rahasia_webhook_bebas_acak_123`).
3. Jadwal otomatis akan berjalan dari GitHub Actions setiap hari **Senin – Jumat** pada jam:
   - 15:00 WIB (08:00 UTC)
   - 16:00 WIB (09:00 UTC)
   - 17:00 WIB (10:00 UTC)
   - 18:00 WIB (11:00 UTC)
   - 19:00 WIB (12:00 UTC)
4. Anda juga bisa mencoba menjalankan workflow secara manual kapan saja melalui tab **Actions** $\rightarrow$ **Trigger Auto Attendance Cron** $\rightarrow$ **Run workflow**.
