import { notifyExtensionClockedIn, notifyExtensionClockedOut } from "@/lib/extension-activate";
import { jsonRequest } from "@/lib/http";

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=work-sessions`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-sessions`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export const workSessionsApi = {
  getStatus: () => request("status"),
  clockIn: async () => {
    const data = await request("clock-in", { method: "POST" });
    notifyExtensionClockedIn();
    return data;
  },
  clockOut: async () => {
    const data = await request("clock-out", { method: "POST" });
    notifyExtensionClockedOut();
    return data;
  },
  breakIn: () => request("break-in", { method: "POST" }),
  breakOut: () => request("break-out", { method: "POST" }),
  getActiveNow: () => request("active-now"),
  getTeamOverview: (period: "today" | "week" = "today") =>
    request(`team-overview?period=${period}`),
  getHistory: (days = 14) => request(`history?days=${days}`),
  updateNotes: (session_id: string, notes: string) =>
    request("notes", { method: "PATCH", body: JSON.stringify({ session_id, notes }) }),
  updateManagerComment: (session_id: string, comment: string) =>
    request("manager-comment", { method: "PATCH", body: JSON.stringify({ session_id, comment }) }),
  getPolicies: () => request("policies"),
  getBrowserHistory: (userId: string, date: string) =>
    request(`browser-history?user_id=${userId}&date=${date}`),
  addBrowserHistory: (history: Array<{ url: string; title?: string; duration_seconds: number; visited_at: string; session_id?: string }>) =>
    request("browser-history", { method: "POST", body: JSON.stringify(history) }),
  getScreenshots: (userId: string, date: string) =>
    request(`screenshots?user_id=${userId}&date=${date}`),
};