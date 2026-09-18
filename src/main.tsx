import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./index.css";

const rootEl = document.getElementById("root");

function showBootError(err: unknown) {
  const message = err instanceof Error ? `${err.message}\n${err.stack || ""}` : String(err);
  if (rootEl) {
    rootEl.innerHTML = `<pre style="padding:24px;font:13px/1.4 ui-monospace,monospace;white-space:pre-wrap;color:#b91c1c">${message.replace(/</g, "&lt;")}</pre>`;
  }
}

window.addEventListener("error", (e) => showBootError(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => showBootError(e.reason));

try {
  if (!rootEl) throw new Error("Missing #root");
  createRoot(rootEl).render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
} catch (err) {
  showBootError(err);
}
