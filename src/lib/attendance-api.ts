import { jsonRequest } from "@/lib/http";

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=work-sessions`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-sessions`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "HOLIDAY" | "WEEKEND";

export interface AttendanceRecord {
  date: string;          // YYYY-MM-DD
  status: AttendanceStatus;
  clock_in?: string;     // ISO timestamp
  clock_out?: string;    // ISO timestamp
  total_hours?: number;  // decimal hours
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  leave: number;
  holiday: number;
  total_working_days: number;
}

export interface AttendanceMonthData {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  month: number;
  year: number;
}

export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AttendanceCorrection {
  id: string;
  user_id: string;
  date: string;          // YYYY-MM-DD
  reason: string;
  status: CorrectionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  // joined fields (when manager fetches all corrections)
  employee_name?: string;
  employee_email?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const attendanceApi = {
  /**
   * Get the authenticated employee's attendance for a given month/year.
   * Returns a full calendar grid with status per day + summary counts.
   */
  getAttendance: (month: number, year: number): Promise<AttendanceMonthData> =>
    request(`attendance?month=${month}&year=${year}`),

  /**
   * Get corrections submitted by the authenticated employee.
   */
  getMyCorrections: (): Promise<AttendanceCorrection[]> =>
    request("attendance/corrections/mine"),

  /**
   * Submit a new attendance correction request.
   */
  submitCorrection: (date: string, reason: string): Promise<AttendanceCorrection> =>
    request("attendance/corrections", {
      method: "POST",
      body: JSON.stringify({ date, reason }),
    }),

  /**
   * Get ALL pending corrections (MANAGER / ADMIN only).
   */
  getAllCorrections: (): Promise<AttendanceCorrection[]> =>
    request("attendance/corrections/all"),

  /**
   * Approve or reject a correction (MANAGER / ADMIN only).
   */
  reviewCorrection: (id: string, action: "APPROVED" | "REJECTED"): Promise<AttendanceCorrection> =>
    request(`attendance/corrections/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }),
};
