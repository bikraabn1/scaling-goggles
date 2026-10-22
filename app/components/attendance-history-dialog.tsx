import { useState } from "react";
import { History, Copy, Check, Calendar, ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { AttendanceLog } from "~/db/schema";

interface AttendanceHistoryDialogProps {
  attendances: AttendanceLog[];
}

export function AttendanceHistoryDialog({ attendances }: AttendanceHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(attendances[0]?.id || null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const copyLog = async (log: AttendanceLog) => {
    const formatted = `1. Uraian Kegiatan:\n${log.activityLog}\n\n2. Pembelajaran yang Diperoleh:\n${log.lessonLearned}\n\n3. Kendala:\n${log.obstacles}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin log", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Riwayat Presensi MagangHub"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Riwayat</span>
            {attendances.length > 0 && (
              <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {attendances.length}
              </span>
            )}
          </Button>
        }
      />

      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
              <History className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold tracking-tight">
                Riwayat Presensi MagangHub
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Daftar log aktivitas harian yang telah berhasil disubmit ke Kemnaker.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          {attendances.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-muted/10">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs font-medium text-foreground">
                Belum ada riwayat presensi yang tersimpan.
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Presensi yang Anda submit via web app ini akan otomatis tercatat di sini.
              </p>
            </div>
          ) : (
            attendances.map((item) => {
              const isExpanded = expandedId === item.id;
              const isApproved = item.approvalStatus === "APPROVED";

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden transition-all"
                >
                  {/* Item Header */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                        <Calendar className="h-3 w-3" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {item.date}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-medium ${
                              isApproved
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : "border-blue-500/40 text-blue-600 bg-blue-500/10"
                            }`}
                          >
                            {item.approvalStatus || "SUBMITTED"}
                          </Badge>
                        </div>
                        {item.monevAttendanceId && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: #{item.monevAttendanceId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLog(item);
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Salin seluruh draf laporan"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-muted/20 p-3.5 space-y-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          1. Uraian Kegiatan ({item.activityLog.length} huruf)
                        </span>
                        <p className="rounded bg-card p-2 text-foreground/90 border border-border/50 text-xs leading-relaxed">
                          {item.activityLog}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          2. Pembelajaran ({item.lessonLearned.length} huruf)
                        </span>
                        <p className="rounded bg-card p-2 text-foreground/90 border border-border/50 text-xs leading-relaxed">
                          {item.lessonLearned}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          3. Kendala ({item.obstacles.length} huruf)
                        </span>
                        <p className="rounded bg-card p-2 text-foreground/90 border border-border/50 text-xs leading-relaxed">
                          {item.obstacles}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-border flex justify-end">
          <DialogClose
            render={
              <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer">
                Tutup
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
