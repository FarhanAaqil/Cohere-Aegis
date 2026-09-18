import { jsonRequest } from "@/lib/http";

const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=work-sessions`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-sessions`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export interface ReportRow {
  session_id: string;
  user_id: string;
  employee: string;
  email: string;
  department: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number;
  break_seconds: number;
  late: boolean;
  early: boolean;
  ip_address: string;
  login_type: string;
  notes: string;
  manager_comment: string;
}

export interface ReportParams {
  from: string;
  to: string;
  user_id?: string;
  department_id?: string;
  status?: string;
}

export interface AnalyticsData {
  month_start: string;
  month_end: string;
  total_hours: number;
  avg_hours_per_day: number;
  avg_break_seconds: number;
  late_count: number;
  early_count: number;
  wfh_count: number;
  site_count: number;
  leave_count: number;
  daily: { date: string; hours: number }[];
}

export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const reportsApi = {
  getReport: (params: ReportParams): Promise<{ rows: ReportRow[] }> => {
    const q = new URLSearchParams({ from: params.from, to: params.to });
    if (params.user_id) q.set("user_id", params.user_id);
    if (params.department_id) q.set("department_id", params.department_id);
    if (params.status && params.status !== "ALL") q.set("status", params.status);
    return request(`reports?${q.toString()}`);
  },
  getDepartments: (): Promise<{ departments: { id: string; name: string }[] }> =>
    request("departments"),
  getAnalytics: (): Promise<AnalyticsData> => request("analytics"),
};
