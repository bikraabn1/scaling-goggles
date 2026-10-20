import { useState } from "react";
import { GitCommit, Filter, Sparkles, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { GitLabCommit } from "~/lib/gitlab.server";

interface CommitListProps {
  commits: GitLabCommit[];
  recentCommits?: GitLabCommit[];
  filteredCount: number;
  onSelectSource?: (source: "today" | "recent") => void;
  selectedSource?: "today" | "recent";
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  feat: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  fix: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
  refactor: {
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  perf: {
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    dot: "bg-teal-500",
  },
  docs: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    dot: "bg-sky-500",
  },
  chore: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  test: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  style: {
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500/30",
    dot: "bg-fuchsia-500",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-blue-500/10 dark:bg-blue-500/15",
  text: "text-blue-700 dark:text-blue-300",
  border: "border-blue-500/30",
  dot: "bg-blue-500",
};

function parseCommit(title: string) {
  const match = title.match(/^([a-zA-Z_-]+)(?:\\(([^)]+)\\))?:\\s*(.*)$/);
  if (!match) {
    return { type: "git", scope: null, message: title };
  }
  return {
    type: match[1].toLowerCase(),
    scope: match[2] || null,
    message: match[3] || title,
  };
}

function formatCommitDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getUTCDate() === now.getUTCDate() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCFullYear() === now.getUTCFullYear();

  const timeStr = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  if (isToday) return `Hari ini, ${timeStr}`;

  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);

  return `${dateFormatted}, ${timeStr}`;
}

export function CommitList({
  commits,
  recentCommits = [],
  filteredCount,
  onSelectSource,
  selectedSource = commits.length > 0 ? "today" : "recent",
}: CommitListProps) {
  const [tab, setTab] = useState<"today" | "recent">(
    commits.length > 0 ? "today" : "recent"
  );

  const currentTab = onSelectSource ? selectedSource : tab;
  const activeList = currentTab === "today" ? commits : recentCommits;

  const handleTabChange = (newTab: "today" | "recent") => {
    setTab(newTab);
    onSelectSource?.(newTab);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-xs space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">GitLab Commits</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg bg-muted/60 p-1 border border-border/60 self-stretch sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => handleTabChange("today")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer ${
              currentTab === "today"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Hari Ini</span>
            <span
              className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                commits.length > 0
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {commits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("recent")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer ${
              currentTab === "recent"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>5 Terakhir</span>
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 font-mono text-[10px] font-bold">
              {recentCommits.length}
            </span>
          </button>
        </div>
      </div>

      {/* Info notice if viewing recent commits */}
      {currentTab === "recent" && commits.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold shrink-0">Belum ada commit hari ini.</span>
            <span className="text-[11px] sm:text-xs text-amber-700/80 dark:text-amber-300/80">
              Menampilkan 5 commit terakhir untuk pembuatan draf laporan.
            </span>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] shrink-0 font-normal self-start sm:self-auto">
            Preview Mode
          </Badge>
        </div>
      )}

      {/* Commit Table / Responsive Feed */}
      {activeList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/10">
          <GitCommit className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">
            Tidak ada commit yang ditemukan.
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pastikan repository memiliki commit dan token memiliki izin baca.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Table Header (Desktop only) */}
          <div className="hidden sm:grid sm:grid-cols-[100px_1fr_170px] items-center border-b border-border bg-muted/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Tipe</span>
            <span>Uraian Commit Message</span>
            <span className="text-right">Hash / Waktu</span>
          </div>

          {/* Table Rows / Mobile Cards */}
          <div className="divide-y divide-border/60">
            {activeList.map((commit, idx) => {
              const parsed = parseCommit(commit.title);
              const style = TYPE_STYLES[parsed.type] || DEFAULT_STYLE;

              return (
                <div
                  key={commit.id || idx}
                  className="flex flex-col sm:grid sm:grid-cols-[100px_1fr_170px] sm:items-start gap-2.5 sm:gap-3 p-3 sm:px-4 sm:py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Col 1: Type & Scope */}
                  <div className="flex items-center sm:flex-col sm:items-start gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {parsed.type}
                    </span>
                    {parsed.scope && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/70 max-w-[120px] truncate">
                        {parsed.scope}
                      </span>
                    )}
                  </div>

                  {/* Col 2: Message & Detail */}
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground leading-relaxed break-words">
                      {parsed.message}
                    </p>
                    {commit.message && commit.message.trim() !== commit.title.trim() && (
                      <p className="text-[11px] text-muted-foreground leading-normal whitespace-pre-wrap rounded bg-muted/40 p-2 border border-border/40 font-mono">
                        {commit.message.trim()}
                      </p>
                    )}
                  </div>

                  {/* Col 3: Metadata (Hash & Time) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/40 text-[11px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 border border-border/60">
                        {commit.short_id}
                      </span>
                      <span className="text-xs font-sans text-muted-foreground/80 sm:hidden">
                        • {commit.author_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatCommitDate(commit.authored_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtered Count footer */}
      {filteredCount > 0 && (
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {filteredCount} commit (merge / wip) disaring secara otomatis
          </span>
          <span className="text-[10px]">
            Target: 150 - 200 huruf per section
          </span>
        </div>
      )}
    </div>
  );
}
