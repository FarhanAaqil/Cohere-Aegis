import { getAccessToken, getAuthHeaders } from "@/lib/auth";

export async function jsonRequest(url: string, options?: RequestInit) {
  const token = getAccessToken();
  const proxyAuthHeaders =
    url.startsWith("/supabase-proxy.php") && token
      ? { "X-LC-Authorization": `Bearer ${token}` }
      : {};

  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...proxyAuthHeaders,
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => ({} as { error?: string }));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
