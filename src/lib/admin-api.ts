import { jsonRequest } from "@/lib/http";

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=admin`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export const adminApi = {
  getStats: () => request("stats"),
  
  getUsers: () => request("users"),
  createUser: (body: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    team_id?: string | null;
    department_id?: string | null;
    status?: string;
    job_title?: string | null;
  }) => request("users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: string, body: Record<string, unknown>) =>
    request(`users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getTeams: () => request("teams"),
  createTeam: (body: { name: string; manager_id?: string | null }) =>
    request("teams", { method: "POST", body: JSON.stringify(body) }),
  updateTeam: (id: string, body: Record<string, unknown>) =>
    request(`teams/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getTeamMembers: (teamId: string) => request(`teams/${teamId}/members`),
  addTeamMembers: (teamId: string, userIds: string[]) =>
    request(`teams/${teamId}/members`, { method: "POST", body: JSON.stringify({ user_ids: userIds }) }),
  removeTeamMember: (teamId: string, userId: string) =>
    request(`teams/${teamId}/members`, { method: "DELETE", body: JSON.stringify({ user_id: userId }) }),
  getDepartments: () => request("departments"),
  createDepartment: (name: string) =>
    request("departments", { method: "POST", body: JSON.stringify({ name }) }),
  updateDepartment: (id: string, name: string) =>
    request(`departments/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteDepartment: (id: string) =>
    request(`departments/${id}`, { method: "DELETE" }),
  getPolicies: () => request("policies"),
  createPolicy: (title: string, content: string) =>
    request("policies", { method: "POST", body: JSON.stringify({ title, content }) }),
  updatePolicy: (id: string, title: string, content: string) =>
    request(`policies/${id}`, { method: "PUT", body: JSON.stringify({ title, content }) }),
  deletePolicy: (id: string) => request(`policies/${id}`, { method: "DELETE" }),
  getIpRanges: () => request("ip-ranges"),
  createIpRange: (cidr: string, label?: string) =>
    request("ip-ranges", { method: "POST", body: JSON.stringify({ cidr, label }) }),
  deleteIpRange: (id: string) => request(`ip-ranges/${id}`, { method: "DELETE" }),
  getAuditLogs: (params: { from?: string; to?: string; user_id?: string; offset?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.user_id) q.set("user_id", params.user_id);
    if (params.offset != null) q.set("offset", String(params.offset));
    if (params.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request(qs ? `audit-logs?${qs}` : "audit-logs");
  },
};
