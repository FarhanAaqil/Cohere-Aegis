import { adminApi } from "@/lib/admin-api";
import { workSessionsApi } from "@/lib/work-sessions-api";

export const policiesApi = {
  getPolicies: () => workSessionsApi.getPolicies(),
  createPolicy: (title: string, content: string) => adminApi.createPolicy(title, content),
  updatePolicy: (id: string, title: string, content: string) =>
    adminApi.updatePolicy(id, title, content),
  deletePolicy: (id: string) => adminApi.deletePolicy(id),
};
