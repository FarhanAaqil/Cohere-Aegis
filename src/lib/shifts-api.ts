import { jsonRequest } from "@/lib/http";

const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=work-sessions`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-sessions`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  created_at?: string;
}

export interface ShiftAssignment {
  id: string;
  user_id: string;
  shift_id: string;
  effective_from: string;
  employee_name?: string;
  employee_email?: string | null;
  shift_name?: string;
}

export const shiftsApi = {
  getMyShift: (): Promise<{ shift: Shift | null; assignment: ShiftAssignment | null }> =>
    request("shifts/mine"),

  getAllShifts: (): Promise<{ shifts: Shift[]; assignments: ShiftAssignment[] }> =>
    request("shifts"),

  createShift: (name: string, start_time: string, end_time: string): Promise<{ shift: Shift }> =>
    request("shifts", { method: "POST", body: JSON.stringify({ name, start_time, end_time }) }),

  updateShift: (
    id: string,
    body: { name?: string; start_time?: string; end_time?: string },
  ): Promise<{ shift: Shift }> =>
    request(`shifts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  assignShift: (user_id: string, shift_id: string): Promise<{ assignment: ShiftAssignment }> =>
    request("shifts/assign", { method: "POST", body: JSON.stringify({ user_id, shift_id }) }),
};
