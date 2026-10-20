export interface MonevSubmissionPayload {
  date: string;
  status: "PRESENT";
  activity_log: string;
  lesson_learned: string;
  obstacles: string;
  latitude: number;
  longitude: number;
}

export interface MonevSubmissionResult {
  success: boolean;
  data?: {
    id: number;
    participant_id: string;
    date: string;
    status: string;
    approval_status: string;
    daily_log?: {
      id: number;
      activity_log: string;
      lesson_learned: string;
      obstacles: string;
      state: string;
    };
  };
  error?: string;
  code?: number;
}

/**
 * Submit daily attendance and log directly to Monev MagangHub API
 */
export async function submitToMonevMagangHub(params: {
  activity_log: string;
  lesson_learned: string;
  obstacles: string;
  customToken?: string;
}): Promise<MonevSubmissionResult> {
  const token = params.customToken?.trim() || process.env.MONEV_ACCESS_TOKEN?.trim();

  if (!token) {
    return {
      success: false,
      error: "MONEV_ACCESS_TOKEN belum diisi di .env atau form. Silakan masukkan token aktif.",
      code: 401,
    };
  }

  // Calculate WIB Date (UTC+7)
  const now = new Date();
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibDate = new Date(now.getTime() + wibOffsetMs);
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  // Office coordinates (fallback to defaults if not set)
  const latitude = parseFloat(process.env.MONEV_LATITUDE || "-7.565374884700425");
  const longitude = parseFloat(process.env.MONEV_LONGITUDE || "110.81394969592333");

  const payload: MonevSubmissionPayload = {
    date: dateStr,
    status: "PRESENT",
    activity_log: params.activity_log.trim(),
    lesson_learned: params.lesson_learned.trim(),
    obstacles: params.obstacles.trim(),
    latitude,
    longitude,
  };

  try {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token;

    const response = await fetch(
      "https://monev-api.maganghub.kemnaker.go.id/api/v1/attendances/with-daily-log",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          Origin: "https://maganghub.kemnaker.go.id",
          Referer: "https://maganghub.kemnaker.go.id/",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data: any = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        data?.message ||
        data?.error ||
        `Gagal mengirim presensi (HTTP ${response.status})`;
      return {
        success: false,
        error: errMsg,
        code: response.status,
      };
    }

    return {
      success: true,
      data: data?.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error: ${err.message || String(err)}`,
    };
  }
}
