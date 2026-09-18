const AEGIS_CONTENT_VERSION = 3;

if (window.__aegisContentVersion !== AEGIS_CONTENT_VERSION) {
  window.__aegisContentVersion = AEGIS_CONTENT_VERSION;

  function sendRuntimeMessage(message) {
    try {
      if (!chrome?.runtime?.id || !chrome.runtime.sendMessage) return;
      chrome.runtime.sendMessage(message, () => {
        try {
          void chrome.runtime.lastError;
        } catch {
          /* Extension was reloaded/updated while this content script was still active. */
        }
      });
    } catch {
      /* Ignore stale content scripts after extension reload/update. */
    }
  }

  function pingPageForSession() {
    window.postMessage(
      { source: "cohere-aegis-ext", type: "AEGIS_PING" },
      window.location.origin,
    );
    window.postMessage(
      { source: "lc-monitor-ext", type: "LC_MONITOR_PING" },
      window.location.origin,
    );
  }

  [0, 500, 1500, 3000].forEach((delay) => {
    window.setTimeout(pingPageForSession, delay);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || (data.source !== "cohere-aegis" && data.source !== "lc-monitor")) return;

    const type = data.type === "AEGIS_ACTIVATE" || data.type === "LC_MONITOR_ACTIVATE" || data.type === "ACTIVATE_MONITORING"
      ? "SAVE_SESSION"
      : data.type === "AEGIS_DEACTIVATE" || data.type === "LC_MONITOR_DEACTIVATE"
        ? "DEACTIVATE_MONITORING"
        : data.type === "AEGIS_CLOCKED_IN" || data.type === "LC_MONITOR_CLOCKED_IN"
          ? "CLOCKED_IN"
          : data.type === "AEGIS_CLOCKED_OUT" || data.type === "LC_MONITOR_CLOCKED_OUT"
            ? "CLOCKED_OUT"
            : data.type;

    if (!type) return;

    sendRuntimeMessage({ type, token: data.token, user: data.user });
  });
}
