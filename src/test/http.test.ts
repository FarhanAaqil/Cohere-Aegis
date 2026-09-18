import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jsonRequest } from "@/lib/http";
import * as auth from "@/lib/auth";

describe("jsonRequest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws with server error message on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ error: "Access denied by policy" }),
    } as unknown as Response);

    await expect(jsonRequest("/api/test")).rejects.toThrow("Access denied by policy");
  });

  it("falls back to default 'Request failed' when non-ok response has no error field", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(jsonRequest("/api/test")).rejects.toThrow("Request failed");
  });

  it("does not crash on malformed JSON and falls back to empty object on ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token < in JSON at position 0")),
    } as unknown as Response);

    const result = await jsonRequest("/api/test");
    expect(result).toEqual({});
  });

  it("returns parsed JSON on successful response", async () => {
    const payload = { success: true, count: 42 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload),
    } as unknown as Response);

    const result = await jsonRequest("/api/test");
    expect(result).toEqual(payload);
  });

  it("includes proxy auth headers when targeting /supabase-proxy.php with active token", async () => {
    vi.spyOn(auth, "getAccessToken").mockReturnValue("mock-jwt-token");
    vi.spyOn(auth, "getAuthHeaders").mockReturnValue({ Authorization: "Bearer legacy-token" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    await jsonRequest("/supabase-proxy.php?path=test");

    expect(fetchMock).toHaveBeenCalledWith(
      "/supabase-proxy.php?path=test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Aegis-Authorization": "Bearer mock-jwt-token",
          "X-LC-Authorization": "Bearer mock-jwt-token",
        }),
      })
    );
  });
});
