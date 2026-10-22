import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { requireUserSession, sessionStorage } from "~/lib/auth.server";
import { fetchTodayGitLabCommits } from "~/lib/gitlab.server";
import { generateDailyReportFromCommits, type DailyReport } from "~/lib/llm.server";
import { submitToMonevMagangHub, type MonevSubmissionResult } from "~/lib/monev.server";
import { db } from "~/db/index.server";
import { attendanceLogs, users, type AttendanceLog } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { CommitList } from "~/components/commit-list";
import { ReportForm } from "~/components/report-form";
import { Button } from "~/components/ui/button";
import { AppLogo } from "~/components/app-logo";
import { ThemeToggle } from "~/components/theme-toggle";
import { Sparkles, RefreshCw, LogOut, Calendar, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { Route } from "./+types/dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUserSession(request);

  const gitlabData = await fetchTodayGitLabCommits();

  // Tanggal hari ini dalam format Bahasa Indonesia & WIB date string
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffsetMs);
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibDate.getUTCDate()).padStart(2, "0");
  const todayDateStr = `${year}-${month}-${day}`;

  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);

  let todayAttendance: AttendanceLog | null = null;
  let recentAttendances: AttendanceLog[] = [];

  try {
    const todayLogs = await db
      .select()
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.userId, user.userId), eq(attendanceLogs.date, todayDateStr)))
      .limit(1);

    if (todayLogs.length > 0) {
      todayAttendance = todayLogs[0];
    }

    recentAttendances = await db
      .select()
      .from(attendanceLogs)
      .where(eq(attendanceLogs.userId, user.userId))
      .orderBy(desc(attendanceLogs.submittedAt))
      .limit(5);
  } catch (dbErr) {
    console.error("Gagal membaca riwayat presensi dari Supabase:", dbErr);
  }

  return {
    user,
    dateFormatted,
    todayDateStr,
    todayAttendance,
    recentAttendances,
    commits: gitlabData.commits,
    recentCommits: gitlabData.recentCommits,
    filteredCount: gitlabData.filteredCount,
    gitlabError: gitlabData.error,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { session, user } = await requireUserSession(request);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const source = formData.get("source")?.toString();

  if (intent === "generate") {
    const gitlabData = await fetchTodayGitLabCommits();

    if (gitlabData.error) {
      return { error: `Gagal ambil commit: ${gitlabData.error}` };
    }

    const targetCommits =
      source === "recent" || (gitlabData.commits.length === 0 && gitlabData.recentCommits.length > 0)
        ? gitlabData.recentCommits
        : gitlabData.commits;

    if (targetCommits.length === 0) {
      return {
        error: "Tidak ada commit yang ditemukan. Pastikan sudah ada commit di repository.",
      };
    }

    const messages = targetCommits.map((c) => c.title);
    const result = await generateDailyReportFromCommits(messages);

    if (result.error) {
      return { error: result.error };
    }

    return { report: result.report };
  }

  if (intent === "submit_monev") {
    const activity_log = formData.get("activity_log")?.toString() || "";
    const lesson_learned = formData.get("lesson_learned")?.toString() || "";
    const obstacles = formData.get("obstacles")?.toString() || "";
    const customToken = formData.get("customToken")?.toString() || "";

    const activeToken = customToken.trim() || user.monevAccessToken;
    const refreshToken = user.monevRefreshToken;

    const submission = await submitToMonevMagangHub({
      activity_log,
      lesson_learned,
      obstacles,
      accessToken: activeToken,
      refreshToken,
    });

    // If token was refreshed during submission, persist new tokens into cookie session & Supabase
    let headers: HeadersInit | undefined;
    if (submission.newAccessToken) {
      session.set("monev_access_token", submission.newAccessToken);
      if (submission.newRefreshToken) {
        session.set("monev_refresh_token", submission.newRefreshToken);
        try {
          await db
            .update(users)
            .set({ monevRefreshToken: submission.newRefreshToken, updatedAt: new Date() })
            .where(eq(users.id, user.userId));
        } catch (dbErr) {
          console.error("Gagal update refresh token ke Supabase:", dbErr);
        }
      }
      headers = {
        "Set-Cookie": await sessionStorage.commitSession(session),
      };
    }

    if (!submission.success) {
      const responseData = {
        monevError: submission.error || "Gagal mengirimkan laporan ke Monev MagangHub.",
        report: {
          uraian_kegiatan: activity_log,
          pembelajaran: lesson_learned,
          kendala: obstacles,
        },
      };
      return headers ? new Response(JSON.stringify(responseData), { headers }) : responseData;
    }

    // Persist successful submission to Supabase attendance_logs
    try {
      const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const wibDateStr = `${nowWib.getUTCFullYear()}-${String(nowWib.getUTCMonth() + 1).padStart(2, "0")}-${String(nowWib.getUTCDate()).padStart(2, "0")}`;

      await db.insert(attendanceLogs).values({
        userId: user.userId,
        date: submission.data?.date || wibDateStr,
        activityLog: activity_log,
        lessonLearned: lesson_learned,
        obstacles: obstacles,
        monevAttendanceId: String(submission.data?.id || ""),
        approvalStatus: submission.data?.approval_status || "PENDING",
      });
    } catch (dbErr) {
      console.error("Gagal mencatat log presensi ke Supabase:", dbErr);
    }

    const responseData = {
      monevSuccess: true,
      monevData: submission.data,
      report: {
        uraian_kegiatan: activity_log,
        pembelajaran: lesson_learned,
        kendala: obstacles,
      },
    };

    return headers ? new Response(JSON.stringify(responseData), { headers }) : responseData;
  }

  return null;
}

export default function DashboardPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting" && navigation.formData?.get("intent") === "generate";
  const isSubmittingMonev = navigation.state === "submitting" && navigation.formData?.get("intent") === "submit_monev";

  const [selectedSource, setSelectedSource] = useState<"today" | "recent">(
    loaderData.commits.length > 0 ? "today" : "recent"
  );

  const data = actionData as any;
  const report: DailyReport | undefined =
    data?.report ||
    (loaderData.todayAttendance
      ? {
          uraian_kegiatan: loaderData.todayAttendance.activityLog,
          pembelajaran: loaderData.todayAttendance.lessonLearned,
          kendala: loaderData.todayAttendance.obstacles,
        }
      : undefined);
  const activeCount = selectedSource === "today" ? loaderData.commits.length : loaderData.recentCommits.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">ngabsennn</h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                v1.2 • SIAPkerja Connected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <User className="h-3 w-3" />
              </div>
              <span className="font-medium text-foreground max-w-[150px] truncate">
                {loaderData.user.name}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{loaderData.dateFormatted}</span>
            </div>

            <ThemeToggle />

            <Form method="post" action="/logout">
              <Button variant="ghost" size="sm" type="submit" className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <LogOut className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </Form>
          </div>
        </div>
      </header>

      {/* Main Workbench */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Warning if GitLab API Error */}
        {loaderData.gitlabError && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-semibold">Konfigurasi GitLab Belum Lengkap / Error</AlertTitle>
            <AlertDescription className="text-xs text-amber-700/90 dark:text-amber-300/90">
              {loaderData.gitlabError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Error if any */}
        {data?.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Gagal Generate Laporan</AlertTitle>
            <AlertDescription className="text-xs">
              {data.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Already Submitted Today Banner from Supabase */}
        {loaderData.todayAttendance && !data?.monevSuccess && (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Presensi Hari Ini ({loaderData.todayAttendance.date}) Telah Tersubmit ke MagangHub
            </AlertTitle>
            <AlertDescription className="text-xs text-emerald-700/90 dark:text-emerald-400/90">
              Status Approval: <span className="font-bold text-foreground">{loaderData.todayAttendance.approvalStatus}</span> • ID Presensi: <span className="font-mono font-bold text-foreground">{loaderData.todayAttendance.monevAttendanceId || "-"}</span> • Tersimpan di database Supabase.
            </AlertDescription>
          </Alert>
        )}

        {/* Monev Submission Success Banner */}
        {data?.monevSuccess && (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Presensi & Log Harian Berhasil Disubmit ke MagangHub!
            </AlertTitle>
            <AlertDescription className="text-xs text-emerald-700/90 dark:text-emerald-400/90">
              Peserta: <span className="font-bold text-foreground">{loaderData.user.name}</span> • Status: <span className="font-bold text-foreground">{data.monevData?.status}</span> • Approval: <span className="font-bold text-foreground">{data.monevData?.approval_status}</span> (ID Presensi: {data.monevData?.id})
            </AlertDescription>
          </Alert>
        )}

        {/* Monev Submission Error Banner */}
        {data?.monevError && (
          <Alert variant="destructive" className="shadow-xs">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Gagal Mengirim ke Monev MagangHub</AlertTitle>
            <AlertDescription className="text-xs">
              {data.monevError}
            </AlertDescription>
          </Alert>
        )}

        {/* 2-Column Responsive Workbench Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left Column: GitLab Commits Harvester (col-span-5) */}
          <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-20">
            {/* Quick Action Generate Card (Atas Commit History) */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="space-y-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Rangkum dengan AI
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {selectedSource === "today"
                    ? loaderData.commits.length > 0
                      ? "Rangkum commit hari ini menjadi 3 poin laporan formal (150–200 karakter)."
                      : "Belum ada commit hari ini. Beralih ke tab '5 Terakhir' untuk generate draf."
                    : "Rangkum 5 commit terakhir repository menjadi draf laporan harian."}
                </p>
              </div>

              <Form method="post">
                <input type="hidden" name="intent" value="generate" />
                <input type="hidden" name="source" value={selectedSource} />
                <Button
                  type="submit"
                  size="default"
                  disabled={isGenerating || activeCount === 0}
                  className="w-full gap-2 text-xs font-semibold cursor-pointer shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengenerate Draf Laporan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {selectedSource === "today"
                          ? "Generate dari Commit Hari Ini"
                          : "Generate dari 5 Commit Terakhir"}
                      </span>
                    </>
                  )}
                </Button>
              </Form>
            </div>

            <CommitList
              commits={loaderData.commits}
              recentCommits={loaderData.recentCommits}
              filteredCount={loaderData.filteredCount}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
          </div>

          {/* Right Column: Report Form Workspace (col-span-7) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-lg border border-border bg-card p-5 sm:p-6 shadow-xs">
              <ReportForm
                key={report ? JSON.stringify(report) : "empty"}
                initialReport={report}
                hasEnvCredentials={true}
                isSubmittingMonev={isSubmittingMonev}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
