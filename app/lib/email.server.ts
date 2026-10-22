import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Ngabsennn <onboarding@resend.dev>";

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Kirim email notifikasi sukses presensi harian
 */
export async function sendAttendanceSuccessEmail(params: {
  to: string;
  userName: string;
  dateStr: string;
  monevId?: string;
  isFallbackReview?: boolean;
  activityLog: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("[EmailService] RESEND_API_KEY tidak disetel. Email sukses di-skip.");
    return { success: false, error: "RESEND_API_KEY tidak disetel." };
  }

  const subject = params.isFallbackReview
    ? `[Ngabsennn] Presensi Berhasil (Mode Review Commit) - ${params.dateStr}`
    : `[Ngabsennn] Presensi MagangHub Berhasil - ${params.dateStr}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0d9488; margin-top: 0;">Presensi Harian Berhasil Disubmit</h2>
      <p>Halo <b>${params.userName}</b>,</p>
      <p>Laporan presensi MagangHub Anda untuk tanggal <b>${params.dateStr}</b> telah berhasil dikirim ke Kemnaker.</p>

      ${
        params.isFallbackReview
          ? `<div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #92400e;">
               <b>Info Mode Fallback:</b> Karena tidak ada commit baru hari ini setelah penundaan 2 jam, sistem merangkum aktivitas review & QA testing berdasarkan 5 commit terakhir Anda.
             </div>`
          : ""
      }

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #475569;">Ringkasan Uraian Kegiatan:</p>
        <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.5;">${params.activityLog}</p>
        ${params.monevId ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">ID Presensi Kemnaker: #${params.monevId}</p>` : ""}
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Email ini dikirim otomatis oleh bot sistem Ngabsennn.
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      console.error("[EmailService] Gagal kirim email sukses:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Exception kirim email sukses:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Kirim email notifikasi bahwa commit hari ini 0, sistem menunda 2 jam
 */
export async function sendWaitingCommitEmail(params: {
  to: string;
  userName: string;
  dateStr: string;
  retryTimeStr: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("[EmailService] RESEND_API_KEY tidak disetel. Email waiting di-skip.");
    return { success: false, error: "RESEND_API_KEY tidak disetel." };
  }

  const subject = `[Ngabsennn] Perhatian: Belum Ada Commit Hari Ini (${params.dateStr})`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #f59e0b; margin-top: 0;">Belum Ada Commit Terdeteksi</h2>
      <p>Halo <b>${params.userName}</b>,</p>
      <p>Sistem otomatis Ngabsennn mencoba menjalankan presensi MagangHub untuk tanggal <b>${params.dateStr}</b>, namun <b>belum ada git commit</b> yang terdeteksi di repository Anda hari ini.</p>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #b45309; line-height: 1.5;">
        <b>Tindakan Sistem:</b><br />
        Sistem akan <b>menunda presensi selama 2 jam</b> (sekitar pukul <b>${params.retryTimeStr}</b>) untuk memberi Anda waktu melakukan commit kode.<br /><br />
        <i>Jika sampai jadwal retry tetap belum ada commit baru, sistem akan otomatis merangkum presensi dengan mode "Review & Testing 5 Commit Terakhir" agar presensi Anda tidak terlewat.</i>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Email ini dikirim otomatis oleh bot sistem Ngabsennn.
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      console.error("[EmailService] Gagal kirim email waiting:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Exception kirim email waiting:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Kirim email darurat jika terjadi error/kegagalan presensi
 */
export async function sendAttendanceErrorEmail(params: {
  to: string;
  userName: string;
  dateStr: string;
  errorMessage: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn("[EmailService] RESEND_API_KEY tidak disetel. Email error di-skip.");
    return { success: false, error: "RESEND_API_KEY tidak disetel." };
  }

  const subject = `[Ngabsennn PENTING] Gagal Melakukan Presensi Otomatis - ${params.dateStr}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 8px;">
      <h2 style="color: #ef4444; margin-top: 0;">Presensi Otomatis Gagal Disubmit!</h2>
      <p>Halo <b>${params.userName}</b>,</p>
      <p>Terjadi kendala saat sistem mencoba mengirimkan presensi harian MagangHub Anda untuk tanggal <b>${params.dateStr}</b>.</p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #991b1b; font-family: monospace;">
        <b>Detail Error:</b><br />
        ${params.errorMessage}
      </div>

      <p style="font-size: 13px; color: #334155;">
        <b>Langkah yang disarankan:</b> Silakan buka aplikasi Ngabsennn secara manual sekarang, periksa status login atau submit laporan secara manual sebelum batas jam presensi ditutup.
      </p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Email ini dikirim otomatis oleh bot darurat sistem Ngabsennn.
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      console.error("[EmailService] Gagal kirim email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[EmailService] Exception kirim email error:", err);
    return { success: false, error: err.message };
  }
}
