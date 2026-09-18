import { jsonRequest } from "@/lib/http";

// In production, route through local PHP proxy to bypass Edge Function CORS
const IS_PROD = import.meta.env.PROD;
const BASE = IS_PROD
  ? `/supabase-proxy.php?path=chat`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function request(path: string, options?: RequestInit) {
  return jsonRequest(`${BASE}/${path}`, options);
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  created_by: string;
  created_at: string;
}

export interface ChatMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: { id: string; email: string; first_name: string; last_name: string } | null;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  sender: { id: string; email: string; first_name: string; last_name: string } | null;
}

export const chatApi = {
  getGroups: (): Promise<{ groups: ChatGroup[] }> => request("groups"),

  createGroup: (body: {
    name: string;
    description?: string;
    group_type?: string;
    member_ids?: string[];
  }): Promise<{ group: ChatGroup }> =>
    request("groups", { method: "POST", body: JSON.stringify(body) }),

  getMembers: (groupId: string): Promise<{ members: ChatMember[] }> =>
    request(`groups/${groupId}/members`),

  addMembers: (groupId: string, userIds: string[]): Promise<{ success: boolean }> =>
    request(`groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),

  removeMember: (groupId: string, userId: string): Promise<{ success: boolean }> =>
    request(`groups/${groupId}/members`, {
      method: "DELETE",
      body: JSON.stringify({ user_id: userId }),
    }),

  getMessages: (groupId: string, limit = 50, before?: string): Promise<{ messages: ChatMessage[] }> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return request(`groups/${groupId}/messages?${params}`);
  },

  sendMessage: (groupId: string, messageText: string): Promise<{ message: ChatMessage }> =>
    request(`groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message_text: messageText }),
    }),

  searchMessages: (query: string): Promise<{ messages: (ChatMessage & { group: { id: string; name: string; group_type: string } | null })[] }> => {
    const params = new URLSearchParams({ q: query });
    return request(`search?${params}`);
  },

  startDirect: (targetUserId: string): Promise<{ group: ChatGroup; created: boolean }> =>
    request("direct", {
      method: "POST",
      body: JSON.stringify({ target_user_id: targetUserId }),
    }),
};
