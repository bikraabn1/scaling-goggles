import { useState } from "react";
import { Check, Copy, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { DailyReport } from "~/lib/llm.server";

interface ReportFormProps {
  initialReport?: DailyReport;
}

export function ReportForm({ initialReport }: ReportFormProps) {
  const [kegiatan, setKegiatan] = useState(initialReport?.uraian_kegiatan || "");
  const [pembelajaran, setPembelajaran] = useState(initialReport?.pembelajaran || "");
  const [kendala, setKendala] = useState(initialReport?.kendala || "");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin ke clipboard", err);
    }
  };

  const copyAll = async () => {
    const formatted = `1. Uraian Kegiatan:\n${kegiatan}\n\n2. Pembelajaran yang Diperoleh:\n${pembelajaran}\n\n3. Kendala:\n${kendala}`;
    await copyToClipboard(formatted, "all");
  };

  const renderBadge = (charCount: number) => {
    const isValid = charCount >= 150 && charCount <= 200;
    const isTooShort = charCount > 0 && charCount < 150;
    const isTooLong = charCount > 200;

    return (
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={`font-mono text-[11px] font-medium px-2 py-0.5 transition-colors ${
            isValid
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : isTooLong
              ? "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10"
              : isTooShort
              ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              : "border-border text-muted-foreground bg-muted/40"
          }`}
        >
          {isValid && <CheckCircle2 className="h-3 w-3 text-emerald-500 mr-0.5" />}
          {charCount} / 200 huruf
        </Badge>
        {isTooShort && (
          <span className="hidden sm:inline-flex text-[11px] text-amber-600 dark:text-amber-400 items-center gap-0.5">
            <AlertCircle className="h-3 w-3" /> Kurang {150 - charCount}
          </span>
        )}
        {isTooLong && (
          <span className="hidden sm:inline-flex text-[11px] text-rose-600 dark:text-rose-400 items-center gap-0.5">
            <AlertCircle className="h-3 w-3" /> Lebih {charCount - 200}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">Draft Laporan Harian</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Target ketat: 150 - 200 huruf per poin. Live indicator menandai kesesuaian draf.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyAll}
          disabled={!kegiatan && !pembelajaran && !kendala}
          className="h-8 gap-1.5 text-xs font-medium self-start sm:self-auto cursor-pointer border-border hover:bg-muted"
        >
          {copiedKey === "all" ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Semua Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-blue-500" />
              <span>Salin Semua (Format Monev)</span>
            </>
          )}
        </Button>
      </div>

      {/* Field 1: Uraian Kegiatan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
              1
            </span>
            <label className="text-xs font-semibold text-foreground">
              Uraian Kegiatan
            </label>
          </div>
          <div className="flex items-center gap-2">
            {renderBadge(kegiatan.length)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(kegiatan, "kegiatan")}
              disabled={!kegiatan}
              title="Salin Uraian Kegiatan"
              className="cursor-pointer"
            >
              {copiedKey === "kegiatan" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <Textarea
          value={kegiatan}
          onChange={(e) => setKegiatan(e.target.value)}
          placeholder="Rangkuman pekerjaan teknis yang dikerjakan hari ini..."
          rows={3}
          className="min-h-[92px] text-xs leading-relaxed resize-none bg-background focus-visible:ring-1 focus-visible:border-blue-500/50"
        />
      </div>

      {/* Field 2: Pembelajaran yang Diperoleh */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
              2
            </span>
            <label className="text-xs font-semibold text-foreground">
              Pembelajaran yang Diperoleh
            </label>
          </div>
          <div className="flex items-center gap-2">
            {renderBadge(pembelajaran.length)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(pembelajaran, "pembelajaran")}
              disabled={!pembelajaran}
              title="Salin Pembelajaran"
              className="cursor-pointer"
            >
              {copiedKey === "pembelajaran" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <Textarea
          value={pembelajaran}
          onChange={(e) => setPembelajaran(e.target.value)}
          placeholder="Insight teknis, arsitektur, atau pemahaman flow yang didapat..."
          rows={3}
          className="min-h-[92px] text-xs leading-relaxed resize-none bg-background focus-visible:ring-1 focus-visible:border-purple-500/50"
        />
      </div>

      {/* Field 3: Kendala */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
              3
            </span>
            <label className="text-xs font-semibold text-foreground">
              Kendala yang Dihadapi
            </label>
          </div>
          <div className="flex items-center gap-2">
            {renderBadge(kendala.length)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => copyToClipboard(kendala, "kendala")}
              disabled={!kendala}
              title="Salin Kendala"
              className="cursor-pointer"
            >
              {copiedKey === "kendala" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <Textarea
          value={kendala}
          onChange={(e) => setKendala(e.target.value)}
          placeholder="Kendala yang dihadapi (atau 'Tidak ada kendala yang berarti dalam pengerjaan tugas hari ini')..."
          rows={3}
          className="min-h-[92px] text-xs leading-relaxed resize-none bg-background focus-visible:ring-1 focus-visible:border-amber-500/50"
        />
      </div>
    </div>
  );
}
