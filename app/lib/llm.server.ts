export interface DailyReport {
  uraian_kegiatan: string;
  pembelajaran: string;
  kendala: string;
}

export interface GenerateReportResult {
  report?: DailyReport;
  error?: string;
}

export async function generateDailyReportFromCommits(
  commitMessages: string[],
  options?: {
    additionalActivity?: string | null;
    isFallbackReview?: boolean;
  }
): Promise<GenerateReportResult> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "anthropic/claude-3.5-haiku";

  if (!apiKey) {
    return {
      error: "LLM_API_KEY belum diset di environment variables.",
    };
  }

  const systemPrompt = `Anda adalah asisten pembuat laporan harian magang profesional di instansi/perusahaan.
Tugas Anda adalah merangkum aktivitas berdasarkan log commit teknis dan catatan aktivitas tambahan menjadi laporan formal berbahasa Indonesia.

ATURAN PANJANG KARAKTER SANGAT KETAT:
Setiap bagian (uraian_kegiatan, pembelajaran, kendala) WAJIB berada di rentang 150 sampai 200 karakter (termasuk spasi dan tanda baca).
- Jangan kurang dari 150 karakter.
- Jangan lebih dari 200 karakter.
- Hitung karakter dengan seksama sebelum memberikan output.

Format Output WAJIB berupa JSON murni dengan schema:
{
  "uraian_kegiatan": "string (150-200 karakter)",
  "pembelajaran": "string (150-200 karakter)",
  "kendala": "string (150-200 karakter)"
}

Panduan Konten:
1. uraian_kegiatan: Menjelaskan implementasi fitur, perbaikan bug, refactor, review kode, atau pengujian yang dikerjakan secara profesional tanpa jargon commit kotor.
2. pembelajaran: Menjelaskan pemahaman baru mengenai alur sistem, arsitektur, teknik koding, atau optimasi yang dipelajari hari ini.
3. kendala: Menjelaskan kendala teknis yang dihadapi. Jika tidak ada kendala berarti, buat kalimat profesional seperti: "Tidak ada kendala yang berarti dalam pengerjaan tugas hari ini, semua proses implementasi dan integrasi berjalan lancar." (sesuaikan panjangnya agar 150-200 karakter).`;

  const commitListText =
    commitMessages.length > 0
      ? `Daftar commit git:\n${commitMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n")}`
      : "Tidak ada commit git baru hari ini.";

  const additionalText = options?.additionalActivity?.trim()
    ? `\n\nCatatan Aktivitas Tambahan / Non-Coding:\n${options.additionalActivity.trim()}`
    : "";

  const reviewNotice = options?.isFallbackReview
    ? "\n\nCATATAN KHUSUS MODE FALLBACK: Hari ini tidak ada commit baru langsung. Fokuskan uraian kegiatan pada: code review, verifikasi integrasi sistem, bug hunting, dan quality assurance (QA testing) terhadap 5 commit terakhir tersebut."
    : "";

  const userPrompt = `Berikut adalah data aktivitas kerja hari ini:
${commitListText}${additionalText}${reviewNotice}

Tolong generate laporan harian dalam format JSON sesuai aturan ketat panjang 150-200 karakter per bagian.`;

  try {
    const isGeminiNative = baseUrl.includes("generativelanguage.googleapis.com");
    let content = "";

    if (isGeminiNative) {
      // Native Google Gemini REST API (v1beta)
      // Supports baseUrl format: https://generativelanguage.googleapis.com/v1beta
      const targetModel = model.replace(/^models\//, "");
      const endpoint = `${baseUrl}/models/${targetModel}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          error: `Gemini API Error (${response.status}): ${errText.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // OpenAI-compatible endpoint (OpenRouter, Groq, Gemini OpenAI-compatible, OpenAI)
      const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          error: `LLM API Error (${response.status}): ${errText.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      content = json.choices?.[0]?.message?.content;
    }

    if (!content) {
      return { error: "LLM tidak mengembalikan teks respon." };
    }

    // Parse JSON safely
    const parsed = JSON.parse(content);
    return {
      report: {
        uraian_kegiatan: (parsed.uraian_kegiatan || "").trim(),
        pembelajaran: (parsed.pembelajaran || "").trim(),
        kendala: (parsed.kendala || "").trim(),
      },
    };
  } catch (err: any) {
    return {
      error: `Gagal memproses LLM: ${err.message || String(err)}`,
    };
  }
}
