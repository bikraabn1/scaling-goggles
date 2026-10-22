import type { Route } from "./+types/api.cron.attendance";
import { db } from "~/db/index.server";
import { users, userConfigs, attendanceLogs, attendanceRetryQueue } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchTodayGitLabCommits } from "~/lib/gitlab.server";
import { generateDailyReportFromCommits } from "~/lib/llm.server";
import { submitToMonevMagangHub } from "~/lib/monev.server";
import {
  sendAttendanceSuccessEmail,
  sendWaitingCommitEmail,
  sendAttendanceErrorEmail,
} from "~/lib/email.server";

export async function action({ request }: Route.ActionArgs) {
  // Hanya menerima POST
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  // Verifikasi Secret Token
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized: Invalid CRON_SECRET" }, { status: 401 });
  }

  // Waktu saat ini dalam WIB (UTC+7)
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffsetMs);
  const currentHourWIB = wibDate.getUTCHours();
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibDate.getUTCDate()).padStart(2, "0");
  const todayDateStr = `${year}-${month}-${day}`;

  const results: Array<{
    userId: string;
    userName: string;
    status: string;
    message?: string;
  }> = [];

  try {
    // Ambil semua user yang mengaktifkan autoAttendanceEnabled
    const activeConfigs = await db
      .select({
        user: users,
        config: userConfigs,
      })
      .from(userConfigs)
      .innerJoin(users, eq(userConfigs.userId, users.id))
      .where(eq(userConfigs.autoAttendanceEnabled, true));

    for (const item of activeConfigs) {
      const { user, config } = item;
      const targetEmail = config.notifyEmail?.trim() || user.email;

      // 1. Guard: Cek apakah user sudah absen hari ini
      const existingAttendance = await db
        .select()
        .from(attendanceLogs)
        .where(and(eq(attendanceLogs.userId, user.id), eq(attendanceLogs.date, todayDateStr)))
        .limit(1);

      if (existingAttendance.length > 0) {
        results.push({
          userId: user.id,
          userName: user.name,
          status: "ALREADY_SUBMITTED",
          message: "Presensi hari ini sudah pernah disubmit.",
        });
        continue;
      }

      // 2. Cek apakah ada antrean retry 2 jam
      const retryRecord = await db
        .select()
        .from(attendanceRetryQueue)
        .where(
          and(
            eq(attendanceRetryQueue.userId, user.id),
            eq(attendanceRetryQueue.date, todayDateStr),
            eq(attendanceRetryQueue.status, "WAITING_RETRY")
          )
        )
        .limit(1);

      const isScheduledHour = config.scheduledHour === currentHourWIB;
      const hasRetryWaiting = retryRecord.length > 0;

      // Jika bukan jam jadwalnya dan juga tidak sedang menunggu retry -> skip
      if (!isScheduledHour && !hasRetryWaiting) {
        continue;
      }

      let isFallbackReview = false;

      // Jika ada retry queue, cek apakah sudah melewati 2 jam (2 * 60 * 60 * 1000 ms)
      if (hasRetryWaiting) {
        const retry = retryRecord[0];
        const elapsedMs = now.getTime() - new Date(retry.firstAttemptAt).getTime();
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (elapsedMs < twoHoursMs) {
          // Belum 2 jam, tunggu run berikutnya
          results.push({
            userId: user.id,
            userName: user.name,
            status: "WAITING_2H_COOLDOWN",
            message: `Masih dalam periode tunggu 2 jam (${Math.round((twoHoursMs - elapsedMs) / 60000)} menit tersisa).`,
          });
          continue;
        }

        // Sudah lewat 2 jam! Tandai mode fallback jika nanti tetap tidak ada commit
        isFallbackReview = true;
      }

      // 3. Ambil commit GitLab
      const gitlabData = await fetchTodayGitLabCommits({
        baseUrl: config.gitlabBaseUrl,
        projectId: config.gitlabProjectId,
        token: config.gitlabToken,
        authorName: config.gitlabAuthorName,
      });

      if (gitlabData.error) {
        await sendAttendanceErrorEmail({
          to: targetEmail,
          userName: user.name,
          dateStr: todayDateStr,
          errorMessage: `Gagal mengambil commit GitLab: ${gitlabData.error}`,
        });

        results.push({
          userId: user.id,
          userName: user.name,
          status: "GITLAB_ERROR",
          message: gitlabData.error,
        });
        continue;
      }

      // 4. Skenario Commit 0
      if (gitlabData.commits.length === 0) {
        // Percobaan pertama (belum pernah masuk retry queue hari ini)
        if (!hasRetryWaiting) {
          // Masukkan ke retry queue
          await db.insert(attendanceRetryQueue).values({
            userId: user.id,
            date: todayDateStr,
            firstAttemptAt: now,
            status: "WAITING_RETRY",
          });

          // Hitung estimasi jam retry (+2 jam)
          const retryDate = new Date(wibDate.getTime() + 2 * 60 * 60 * 1000);
          const retryTimeStr = `${String(retryDate.getUTCHours()).padStart(2, "0")}:${String(retryDate.getUTCMinutes()).padStart(2, "0")} WIB`;

          await sendWaitingCommitEmail({
            to: targetEmail,
            userName: user.name,
            dateStr: todayDateStr,
            retryTimeStr,
          });

          results.push({
            userId: user.id,
            userName: user.name,
            status: "PENDING_RETRY_QUEUED",
            message: "Commit 0 terdeteksi. Jadwal retry 2 jam telah diantrekan dan email dikirim.",
          });
          continue;
        }

        // Sudah lewat 2 jam dan tetap 0 commit -> Masuk fallback 5 commit terakhir
        if (gitlabData.recentCommits.length === 0) {
          await sendAttendanceErrorEmail({
            to: targetEmail,
            userName: user.name,
            dateStr: todayDateStr,
            errorMessage: "Tidak ada commit baru maupun recent commits di repository GitLab.",
          });
          continue;
        }
      }

      // 5. Tentukan commits target
      const targetCommits =
        gitlabData.commits.length > 0 ? gitlabData.commits : gitlabData.recentCommits;

      const commitMessages = targetCommits.map((c) => c.title);

      // 6. Generate laporan via AI LLM
      const aiResult = await generateDailyReportFromCommits(commitMessages, {
        additionalActivity: config.defaultNonCodingActivity,
        isFallbackReview: gitlabData.commits.length === 0,
      });

      if (aiResult.error || !aiResult.report) {
        await sendAttendanceErrorEmail({
          to: targetEmail,
          userName: user.name,
          dateStr: todayDateStr,
          errorMessage: `Gagal menghasilkan ringkasan AI: ${aiResult.error || "Laporan kosong"}`,
        });
        continue;
      }

      // 7. Submit ke MagangHub Kemnaker
      const accessToken = user.monevAccessToken || "";
      const refreshToken = user.monevRefreshToken || undefined;

      const submission = await submitToMonevMagangHub({
        activity_log: aiResult.report.uraian_kegiatan,
        lesson_learned: aiResult.report.pembelajaran,
        obstacles: aiResult.report.kendala,
        accessToken,
        refreshToken,
        latitude: config.officeLatitude,
        longitude: config.officeLongitude,
      });

      if (!submission.success) {
        await sendAttendanceErrorEmail({
          to: targetEmail,
          userName: user.name,
          dateStr: todayDateStr,
          errorMessage: `Gagal submit ke Monev MagangHub: ${submission.error}`,
        });

        results.push({
          userId: user.id,
          userName: user.name,
          status: "MONEV_SUBMIT_FAILED",
          message: submission.error,
        });
        continue;
      }

      // 8. Simpan log presensi sukses ke database
      await db.insert(attendanceLogs).values({
        userId: user.id,
        date: todayDateStr,
        activityLog: aiResult.report.uraian_kegiatan,
        lessonLearned: aiResult.report.pembelajaran,
        obstacles: aiResult.report.kendala,
        monevAttendanceId: submission.data?.id ? String(submission.data.id) : null,
        approvalStatus: "SUBMITTED",
        submittedAt: now,
      });

      // Update antrean retry jika ada
      if (hasRetryWaiting) {
        await db
          .update(attendanceRetryQueue)
          .set({ status: "RETRIED", updatedAt: now })
          .where(
            and(
              eq(attendanceRetryQueue.userId, user.id),
              eq(attendanceRetryQueue.date, todayDateStr)
            )
          );
      }

      // 9. Kirim email konfirmasi sukses
      await sendAttendanceSuccessEmail({
        to: targetEmail,
        userName: user.name,
        dateStr: todayDateStr,
        monevId: submission.data?.id ? String(submission.data.id) : undefined,
        isFallbackReview: gitlabData.commits.length === 0,
        activityLog: aiResult.report.uraian_kegiatan,
      });

      results.push({
        userId: user.id,
        userName: user.name,
        status: "SUCCESS",
        message: gitlabData.commits.length === 0 ? "Sukses via fallback 5 commit." : "Sukses normal.",
      });
    }

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      currentHourWIB,
      todayDateStr,
      processed: results.length,
      results,
    });
  } catch (globalErr: any) {
    console.error("[CronWebhook] Uncaught error:", globalErr);
    return Response.json({ error: globalErr.message }, { status: 500 });
  }
}
