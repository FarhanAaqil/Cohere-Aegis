/**
 * Shared formatting helpers used across the Lemon Host Monitor frontend.
 */

/**
 * Converts a string to Title Case.
 * e.g. "fareeha zareen" -> "Fareeha Zareen"
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

/**
 * Formats an ISO date string (YYYY-MM-DD or full ISO) into DD/MM/YYYY.
 * Falls back to the raw value on parse failure.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Converts an HH:MM 24-hour time string (as stored in DB) to 12-hour
 * display with AM/PM.  e.g. "09:00" -> "09:00 AM"   "18:00" -> "06:00 PM"
 */
export function formatTime12h(time: string | null | undefined): string {
  if (!time) return "-";
  const parts = time.slice(0, 5).split(":");
  if (parts.length < 2) return time;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return time;
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}
