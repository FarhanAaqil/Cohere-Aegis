import { workSessionsApi } from "@/lib/work-sessions-api";
import { attendanceApi } from "@/lib/attendance-api";
import { leaveApi } from "@/lib/leave-api";
import { shiftsApi } from "@/lib/shifts-api";
import { isManagerOrAbove } from "@/lib/roles";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(Math.max(0, totalSeconds) / 3600);
  const m = Math.floor((Math.max(0, totalSeconds) % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function weekdayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: "short" });
}

async function answerWorkingNow(role?: string | null): Promise<string> {
  if (!isManagerOrAbove(role)) {
    const status = await workSessionsApi.getStatus();
    if (status.is_working) {
      const loc = status.session?.login_type === "SITE" ? "Office" : status.session?.login_type === "WFH" ? "WFH" : "";
      return `You are clocked in${status.on_break ? " (on break)" : ""}${loc ? ` · ${loc}` : ""} since ${formatTime(status.session?.start_time)}.\n\nTeam “who’s working” is available to managers and admins.`;
    }
    return "You are not clocked in right now.\n\nTeam “who’s working” is available to managers and admins.";
  }

  const data = await workSessionsApi.getActiveNow();
  const sessions: Array<{
    start_time: string;
    on_break?: boolean;
    login_type?: string | null;
    user: { first_name: string; last_name: string } | null;
  }> = data?.active_sessions ?? [];

  if (sessions.length === 0) {
    return "Nobody is clocked in right now.";
  }

  const lines = sessions.map((s) => {
    const name = s.user ? `${s.user.first_name} ${s.user.last_name}` : "Unknown";
    const loc = s.login_type === "SITE" ? " · Office" : s.login_type === "WFH" ? " · WFH" : "";
    const brk = s.on_break ? " · on break" : "";
    return `• ${name} — since ${formatTime(s.start_time)}${loc}${brk}`;
  });

  return `Currently clocked in (${sessions.length}):\n${lines.join("\n")}`;
}

async function answerAttendance(role?: string | null): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = todayLocal();

  if (isManagerOrAbove(role)) {
    try {
      const team = await workSessionsApi.getTeamOverview("today");
      if (team?.hasTeam === false) {
        return team.message || "No team assigned, so I can’t show team attendance.";
      }
      const members: Array<{
        first_name: string;
        last_name: string;
        is_working: boolean;
        today_session: { start_time: string; end_time: string | null } | null;
        today_seconds: number;
      }> = team?.members ?? [];
      const working = members.filter((m) => m.is_working);
      const done = members.filter((m) => !m.is_working && m.today_session);
      const notStarted = members.filter((m) => !m.today_session);

      const nameList = (arr: typeof members) =>
        arr.slice(0, 8).map((m) => `• ${m.first_name} ${m.last_name}`).join("\n") || "—";

      return [
        `Today's team attendance (${members.length} people):`,
        `• Working now: ${working.length}`,
        `• Finished: ${done.length}`,
        `• Not started: ${notStarted.length}`,
        working.length ? `\nWorking now:\n${nameList(working)}` : "",
        notStarted.length ? `\nNot started:\n${nameList(notStarted)}` : "",
        "\nOpen Team or Attendance for the full view.",
      ].filter(Boolean).join("\n");
    } catch {
      /* fall through to personal */
    }
  }

  const data = await attendanceApi.getAttendance(month, year);
  const todayRec = data.records.find((r) => r.date === today);
  const s = data.summary;
  const todayLine = todayRec
    ? `Today (${today}): ${todayRec.status}${todayRec.clock_in ? ` · in ${formatTime(todayRec.clock_in)}` : ""}${todayRec.clock_out ? ` · out ${formatTime(todayRec.clock_out)}` : ""}${typeof todayRec.total_hours === "number" ? ` · ${todayRec.total_hours}h` : ""}`
    : `Today (${today}): no record yet`;

  return [
    todayLine,
    "",
    `This month so far:`,
    `• Present: ${s.present}`,
    `• Absent: ${s.absent}`,
    `• Leave: ${s.leave}`,
    `• Holiday: ${s.holiday}`,
    "",
    "Open Attendance for the calendar and corrections.",
  ].join("\n");
}

async function answerTimesheet(): Promise<string> {
  const [status, history] = await Promise.all([
    workSessionsApi.getStatus(),
    workSessionsApi.getHistory(7),
  ]);

  const from = weekStartMonday();
  const sessions: Array<{
    date: string;
    start_time: string;
    end_time: string | null;
    total_active_seconds: number;
  }> = history?.sessions ?? [];

  const byDate: Record<string, number> = {};
  for (const s of sessions) {
    if (s.date < from) continue;
    if (s.end_time) {
      byDate[s.date] = (byDate[s.date] || 0) + (s.total_active_seconds || 0);
    }
  }

  const today = todayLocal();
  let liveToday = byDate[today] || 0;
  if (status.is_working && status.session?.start_time) {
    const start = new Date(status.session.start_time).getTime();
    const live = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const breakSec = status.total_break_seconds || 0;
    liveToday = (status.total_completed_seconds || 0) + Math.max(0, live - breakSec);
    byDate[today] = liveToday;
  }

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${from}T12:00:00`);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (key > today) break;
    const sec = byDate[key] || 0;
    const tag = key === today ? " (today)" : "";
    days.push(`• ${weekdayLabel(key)}: ${formatDuration(sec)}${tag}`);
  }

  const weekSec = Object.values(byDate).reduce((a, b) => a + b, 0);
  const clock = status.is_working
    ? status.on_break
      ? "On break"
      : "Clocked in"
    : "Not clocked in";

  return [
    `Your status: ${clock}`,
    status.session?.start_time ? `Session started: ${formatTime(status.session.start_time)}` : "",
    "",
    "This week (active time):",
    ...days,
    "",
    `Week total: ${formatDuration(weekSec)}`,
    "Open My Timesheet for session notes and history.",
  ].filter((line) => line !== "").join("\n");
}

async function answerLeave(): Promise<string> {
  const data = await leaveApi.getMyLeaves();
  const leaves = data?.leaves ?? [];
  if (leaves.length === 0) {
    return "You have no leave requests yet.\nOpen Leave Requests to submit one.";
  }
  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const lines = leaves.slice(0, 6).map((l) => `• ${l.date} — ${l.status}${l.reason ? `: ${l.reason.slice(0, 80)}` : ""}`);
  return `Your leave requests (${leaves.length}, ${pending} pending):\n${lines.join("\n")}\n\nOpen Leave Requests for the full list.`;
}

async function answerShift(): Promise<string> {
  const data = await shiftsApi.getMyShift();
  const shift = data?.shift;
  if (!shift) {
    return "No shift is assigned to you yet. Ask an admin to assign one on Shift Scheduling.";
  }
  return `Assigned shift: ${shift.name}\n${String(shift.start_time).slice(0, 5)} – ${String(shift.end_time).slice(0, 5)}\n\nLate/early flags use these times when you clock in/out.`;
}

async function answerStatus(): Promise<string> {
  const status = await workSessionsApi.getStatus();
  const loc =
    status.session?.login_type === "SITE"
      ? "Working from Office"
      : status.session?.login_type === "WFH"
        ? "Working from Home"
        : null;

  if (!status.is_working) {
    return `You are not clocked in.\nSessions today: ${status.session_count ?? 0}\nOpen My Workday to clock in.`;
  }

  return [
    status.on_break ? "You are on break." : "You are clocked in.",
    loc,
    status.session?.start_time ? `Since ${formatTime(status.session.start_time)}` : null,
    status.session?.ip_address ? `IP ${status.session.ip_address}` : null,
    `Sessions today: ${status.session_count ?? 0}`,
  ].filter(Boolean).join("\n");
}

function helpText(): string {
  return [
    "I use live Lemon Host Monitor data. You can ask:",
    "• Who is working now?",
    "• Today's attendance",
    "• Explain my timesheet / hours this week",
    "• Am I clocked in?",
    "• My leave requests",
    "• What’s my shift?",
  ].join("\n");
}

export async function answerAssistantQuery(input: string, role?: string | null): Promise<string> {
  const q = input.toLowerCase().trim();

  try {
    if (
      q.includes("who is working") ||
      q.includes("working now") ||
      q.includes("who's working") ||
      q.includes("whos working") ||
      q.includes("clocked in")
    ) {
      if (q.includes("am i") || q.includes("i clocked") || q === "clocked in") {
        return await answerStatus();
      }
      return await answerWorkingNow(role);
    }

    if (q.includes("attendance") || q.includes("present") || q.includes("absent")) {
      return await answerAttendance(role);
    }

    if (
      q.includes("timesheet") ||
      q.includes("hours") ||
      q.includes("this week") ||
      q.includes("explain")
    ) {
      return await answerTimesheet();
    }

    if (q.includes("leave")) {
      return await answerLeave();
    }

    if (q.includes("shift")) {
      return await answerShift();
    }

    if (
      q.includes("status") ||
      q.includes("clock") ||
      q.includes("break") ||
      q.includes("workday")
    ) {
      return await answerStatus();
    }

    if (q.includes("help") || q.includes("what can")) {
      return helpText();
    }

    return `${helpText()}\n\nI didn’t match that to a live report. Try a quick action above.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    return `I couldn’t load that from Lemon Host Monitor: ${msg}`;
  }
}
