import { useState } from "react";
import { Form } from "react-router";
import { Check, Copy, AlertCircle, FileText, CheckCircle2, Send, Key, RefreshCw } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { DailyReport } from "~/lib/llm.server";

interface ReportFormProps {
  initialReport?: DailyReport;
  hasEnvCredentials?: boolean;
  isSubmittingMonev?: boolean;
}

export function ReportForm({
  initialReport,
  hasEnvCredentials = false,
  isSubmittingMonev = false,
}: ReportFormProps) {
  const [kegiatan, setKegiatan] = useState(initialReport?.uraian_kegiatan || "");
  const [pembelajaran, setPembelajaran] = useState(initialReport?.pembelajaran || "");
  const [kendala, setKendala] = useState(initialReport?.kendala || "");
  const [customToken, setCustomToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

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

  const canSubmit = kegiatan.trim().length > 0 && pembelajaran.trim().length > 0 && kendala.trim().length > 0;

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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyAll}
            disabled={!kegiatan && !pembelajaran && !kendala}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer border-border hover:bg-muted"
          >
            {copiedKey === "all" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Semua Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-blue-500" />
                <span>Salin Semua</span>
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            title="Pengaturan Token Monev MagangHub"
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Token</span>
          </button>
        </div>
      </div>

      {/* Token Input Drawer/Collapse if needed */}
      {showTokenInput && (
        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-500" />
              Override Bearer Token (Opsional)
            </span>
            {hasEnvCredentials && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Auto-Login SSO Aktif (.env)
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Secara default aplikasi login otomatis via Kemnaker SSO. Isi kolom ini hanya jika ingin override manual dengan token tertentu.
          </p>
          <Input
            type="password"
            placeholder="Paste Bearer token manual jika diperlukan (eyJ...)"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
            className="h-8 text-xs font-mono bg-background"
          />
        </div>
      )}

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

      {/* Form Submission to Monev MagangHub */}
      <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Pastikan draf sudah sesuai sebelum menembak langsung ke server Monev Kemnaker.
        </p>

        <Form method="post" onSubmit={(e) => {
          if (!confirm("Kirim langsung presensi & daily log hari ini ke Monev MagangHub Kemnaker?")) {
            e.preventDefault();
          }
        }}>
          <input type="hidden" name="intent" value="submit_monev" />
          <input type="hidden" name="activity_log" value={kegiatan} />
          <input type="hidden" name="lesson_learned" value={pembelajaran} />
          <input type="hidden" name="obstacles" value={kendala} />
          <input type="hidden" name="customToken" value={customToken} />

          <Button
            type="submit"
            disabled={!canSubmit || isSubmittingMonev}
            className="w-full sm:w-auto gap-2 text-xs font-semibold cursor-pointer shadow-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white border-0 transition-all"
          >
            {isSubmittingMonev ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Mengirim ke MagangHub...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Kirim Langsung ke Monev MagangHub</span>
              </>
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}
