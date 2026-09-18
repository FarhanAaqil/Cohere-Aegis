import { getAccessToken, getStoredUser } from "@/lib/auth";

const EXTENSION_IDS = [
  import.meta.env.VITE_EXTENSION_ID,
  "knficjgnnobghcolkkhdljidamomnhec",
].filter((id): id is string => typeof id === "string" && id.length > 0);

export interface ActivatePayload {
  token: string;
  user: { id: string; email?: string; first_name?: string; last_name?: string };
}

function postToExtension(type: string, extra: Record<string, unknown> = {}) {
  try {
    window.postMessage(
      { source: "lc-monitor", type, ...extra },
      window.location.origin,
    );
  } catch {
    /* ignore */
  }

  try {
    const c = (globalThis as { chrome?: { runtime?: { sendMessage?: (...args: unknown[]) => void; lastError?: unknown } } }).chrome;
    if (!c?.runtime?.sendMessage) return;
    for (const id of EXTENSION_IDS) {
      c.runtime.sendMessage(id, { type, ...extra }, () => {
        try {
          void c.runtime?.lastError;
        } catch {
          /* Extension was reloaded/updated while the page was sending a message. */
        }
      });
    }
  } catch {
    /* ignore */
  }
}

/** Store JWT only. Does not start screenshots or history. */
export function saveExtensionSession(payload: ActivatePayload) {
  if (!payload?.token || !payload.user?.id) return;
  postToExtension("SAVE_SESSION", { token: payload.token, user: payload.user });
}

export function activateMonitorExtension(payload: ActivatePayload) {
  saveExtensionSession(payload);
}

export function deactivateMonitorExtension() {
  postToExtension("DEACTIVATE_MONITORING");
}

export function notifyExtensionClockedIn() {
  const token = getAccessToken();
  const user = getStoredUser();
  postToExtension("CLOCKED_IN", {
    token,
    user,
  });
}

export function notifyExtensionClockedOut() {
  postToExtension("CLOCKED_OUT");
}

function replyToContentScriptPing() {
  const token = getAccessToken();
  const user = getStoredUser();
  if (!token || !user) return;
  saveExtensionSession({ token, user });
}

if (typeof window !== "undefined" && !(window as Window & { __lcMonitorPageHook?: boolean }).__lcMonitorPageHook) {
  (window as Window & { __lcMonitorPageHook?: boolean }).__lcMonitorPageHook = true;
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    if (event.data?.source === "lc-monitor-ext" && event.data?.type === "LC_MONITOR_PING") {
      replyToContentScriptPing();
    }
  });
}
