import { jsonRequest } from "@/lib/http";

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=tasks`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tasks`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignee_id: string;
  created_by: string;
  team_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; first_name: string; last_name: string; email: string } | null;
  creator?: { id: string; first_name: string; last_name: string } | null;
}

export const tasksApi = {
  list: (params?: { status?: string; assignee?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.assignee) qs.set("assignee", params.assignee);
    const query = qs.toString();
    return request(`tasks${query ? `?${query}` : ""}`);
  },

  create: (data: { title: string; description?: string; assignee_id: string; priority?: string; due_date?: string; status?: string }) =>
    request("tasks", { method: "POST", body: JSON.stringify(data) }),

  update: (data: { id: string; title?: string; description?: string; status?: string; priority?: string; assignee_id?: string; due_date?: string; position?: number }) =>
    request("tasks", { method: "PATCH", body: JSON.stringify(data) }),

  delete: (id: string) =>
    request("tasks", { method: "DELETE", body: JSON.stringify({ id }) }),

  activity: (taskId: string) => request(`activity?task_id=${encodeURIComponent(taskId)}`),
};

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: string; first_name: string; last_name: string } | null;
}
