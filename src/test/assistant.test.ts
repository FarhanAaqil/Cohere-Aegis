import { describe, it, expect, vi, beforeEach } from "vitest";
import { answerAssistantQuery } from "@/lib/assistant";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { leaveApi } from "@/lib/leave-api";
import { shiftsApi } from "@/lib/shifts-api";

vi.mock("@/lib/work-sessions-api", () => ({
  workSessionsApi: {
    getStatus: vi.fn(),
    getActiveNow: vi.fn(),
    getHistory: vi.fn(),
    getTeamOverview: vi.fn(),
  },
}));

vi.mock("@/lib/leave-api", () => ({
  leaveApi: {
    getMyLeaves: vi.fn(),
  },
}));

vi.mock("@/lib/shifts-api", () => ({
  shiftsApi: {
    getMyShift: vi.fn(),
  },
}));

describe("answerAssistantQuery routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes 'who is working now' to working now handler", async () => {
    vi.mocked(workSessionsApi.getActiveNow).mockResolvedValue({
      active_sessions: [
        {
          start_time: "2026-09-18T09:00:00Z",
          on_break: false,
          login_type: "SITE",
          user: { first_name: "Alice", last_name: "Wonder" },
        },
      ],
    } as unknown as Awaited<ReturnType<typeof workSessionsApi.getActiveNow>>);

    const response = await answerAssistantQuery("who is working now", "ADMIN");

    expect(workSessionsApi.getActiveNow).toHaveBeenCalled();
    expect(response).toContain("Currently clocked in");
    expect(response).toContain("Alice Wonder");
  });

  it("routes 'my leave' to leaveApi handler", async () => {
    vi.mocked(leaveApi.getMyLeaves).mockResolvedValue({
      leaves: [
        {
          id: "leave-1",
          date: "2026-09-20",
          status: "PENDING",
          reason: "Doctor appointment",
        },
      ],
    } as unknown as Awaited<ReturnType<typeof leaveApi.getMyLeaves>>);

    const response = await answerAssistantQuery("my leave", "EMPLOYEE");

    expect(leaveApi.getMyLeaves).toHaveBeenCalled();
    expect(response).toContain("Your leave requests");
    expect(response).toContain("Doctor appointment");
  });

  it("routes 'what\\'s my shift' to shiftsApi handler", async () => {
    vi.mocked(shiftsApi.getMyShift).mockResolvedValue({
      shift: {
        id: "shift-1",
        name: "Morning Shift",
        start_time: "09:00:00",
        end_time: "17:00:00",
      },
    } as unknown as Awaited<ReturnType<typeof shiftsApi.getMyShift>>);

    const response = await answerAssistantQuery("what's my shift", "EMPLOYEE");

    expect(shiftsApi.getMyShift).toHaveBeenCalled();
    expect(response).toContain("Assigned shift: Morning Shift");
  });

  it("routes 'explain my timesheet' to timesheet handler", async () => {
    vi.mocked(workSessionsApi.getStatus).mockResolvedValue({
      is_working: false,
      session: null,
      on_break: false,
    } as unknown as Awaited<ReturnType<typeof workSessionsApi.getStatus>>);
    vi.mocked(workSessionsApi.getHistory).mockResolvedValue({
      sessions: [],
    } as unknown as Awaited<ReturnType<typeof workSessionsApi.getHistory>>);

    const response = await answerAssistantQuery("explain my timesheet", "EMPLOYEE");

    expect(workSessionsApi.getStatus).toHaveBeenCalled();
    expect(workSessionsApi.getHistory).toHaveBeenCalledWith(7);
    expect(response).toContain("This week (active time):");
    expect(response).toContain("Week total:");
  });

  it("falls through to help text on an unmatched query", async () => {
    const response = await answerAssistantQuery("order me a pizza", "EMPLOYEE");

    expect(response).toContain("I use live Cohere Aegis data");
    expect(response).toContain("I didn’t match that to a live report");
    expect(workSessionsApi.getActiveNow).not.toHaveBeenCalled();
    expect(leaveApi.getMyLeaves).not.toHaveBeenCalled();
    expect(shiftsApi.getMyShift).not.toHaveBeenCalled();
  });
});
