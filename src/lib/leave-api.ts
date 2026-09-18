import { jsonRequest } from "@/lib/http";

const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=work-sessions`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-sessions`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string;
  status: LeaveStatus;
  reviewer_id?: string | null;
  reviewer_comment?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  employee_name?: string | null;
  employee_email?: string | null;
}

export const leaveApi = {
  getMyLeaves: (): Promise<{ leaves: LeaveRequest[] }> => request("leave/mine"),

  submitLeave: (date: string, reason: string): Promise<{ leave: LeaveRequest }> =>
    request("leave", { method: "POST", body: JSON.stringify({ date, reason }) }),

  getTeamLeaves: (): Promise<{ leaves: LeaveRequest[] }> => request("leave/all"),

  reviewLeave: (
    id: string,
    action: "APPROVED" | "REJECTED",
    comment?: string,
  ): Promise<{ leave: LeaveRequest }> =>
    request(`leave/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ action, comment }),
    }),
};
