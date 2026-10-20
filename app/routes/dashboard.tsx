import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { requireUserSession, sessionStorage } from "~/lib/auth.server";
import { fetchTodayGitLabCommits } from "~/lib/gitlab.server";
import { generateDailyReportFromCommits, type DailyReport } from "~/lib/llm.server";
import { submitToMonevMagangHub, type MonevSubmissionResult } from "~/lib/monev.server";
import { CommitList } from "~/components/commit-list";
import { ReportForm } from "~/components/report-form";
import { Button } from "~/components/ui/button";
import { AppLogo } from "~/components/app-logo";
import { Sparkles, RefreshCw, LogOut, Calendar, AlertTriangle, CheckCircle2, User } from "lucide-react";
import type { Route } from "./+types/dashboard";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUserSession(request);

  const gitlabData = await fetchTodayGitLabCommits();

  // Tanggal hari ini dalam format Bahasa Indonesia
  const now = new Date();
  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);

  return {
    user,
    dateFormatted,
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

    // If token was refreshed during submission, persist new tokens into cookie session
    let headers: HeadersInit | undefined;
    if (submission.newAccessToken) {
      session.set("monev_access_token", submission.newAccessToken);
      if (submission.newRefreshToken) {
        session.set("monev_refresh_token", submission.newRefreshToken);
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

  const report: DailyReport | undefined = actionData?.report;
  const activeCount = selectedSource === "today" ? loaderData.commits.length : loaderData.recentCommits.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <AppLogo size="sm" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">ngabsennn</h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                v1.2 • SIAPkerja Connected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3 w-3" />
              </div>
              <span className="font-medium text-foreground max-w-[150px] truncate">
                {loaderData.user.name}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>{loaderData.dateFormatted}</span>
            </div>

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
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Warning if GitLab API Error */}
        {loaderData.gitlabError && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Konfigurasi GitLab Belum Lengkap / Error</p>
              <p className="text-[11px] opacity-90 mt-0.5">{loaderData.gitlabError}</p>
            </div>
          </div>
        )}

        {/* Action Error if any */}
        {actionData?.error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Gagal Generate Laporan</p>
              <p className="text-[11px] opacity-90 mt-0.5">{actionData.error}</p>
            </div>
          </div>
        )}

        {/* Monev Submission Success Banner */}
        {actionData?.monevSuccess && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300 shadow-xs">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                Presensi & Log Harian Berhasil Disubmit ke MagangHub!
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Peserta: <span className="font-bold">{loaderData.user.name}</span> • Status: <span className="font-bold">{actionData.monevData?.status}</span> • Approval: <span className="font-bold">{actionData.monevData?.approval_status}</span> (ID Presensi: {actionData.monevData?.id})
              </p>
            </div>
          </div>
        )}

        {/* Monev Submission Error Banner */}
        {actionData?.monevError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive shadow-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Gagal Mengirim ke Monev MagangHub</p>
              <p className="text-xs opacity-90">{actionData.monevError}</p>
            </div>
          </div>
        )}

        {/* Section 1: GitLab Commits Harvester */}
        <div className="space-y-3">
          <CommitList
            commits={loaderData.commits}
            recentCommits={loaderData.recentCommits}
            filteredCount={loaderData.filteredCount}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              {selectedSource === "today"
                ? loaderData.commits.length > 0
                  ? "Siap merangkum commit hari ini menjadi laporan formal via LLM."
                  : "Belum ada commit hari ini. Beralih ke tab '5 Terakhir' untuk generate draf."
                : "Akan merangkum 5 commit terakhir repository menjadi draf laporan harian."}
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="generate" />
              <input type="hidden" name="source" value={selectedSource} />
              <Button
                type="submit"
                size="default"
                disabled={isGenerating || activeCount === 0}
                className="gap-2 text-xs font-semibold cursor-pointer shadow-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white border-0 transition-all self-end sm:self-auto"
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
        </div>

        {/* Section 2: Report Form Workspace */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
          <ReportForm
            key={report ? JSON.stringify(report) : "empty"}
            initialReport={report}
            hasEnvCredentials={true}
            isSubmittingMonev={isSubmittingMonev}
          />
        </div>
      </main>
    </div>
  );
}
