import { describe, it, expect } from "vitest";
import { isAdminRole, isManagerOrAbove, roleLabel } from "@/lib/roles";

describe("roles helper functions", () => {
  describe("isAdminRole", () => {
    it("returns true for ADMIN and HR_MANAGER", () => {
      expect(isAdminRole("ADMIN")).toBe(true);
      expect(isAdminRole("HR_MANAGER")).toBe(true);
    });

    it("returns false for EMPLOYEE and MANAGER", () => {
      expect(isAdminRole("EMPLOYEE")).toBe(false);
      expect(isAdminRole("MANAGER")).toBe(false);
    });

    it("returns false for null, undefined, or empty values", () => {
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
      expect(isAdminRole("")).toBe(false);
      expect(isAdminRole("UNKNOWN_ROLE")).toBe(false);
    });
  });

  describe("isManagerOrAbove", () => {
    it("returns true for MANAGER, ADMIN, and HR_MANAGER", () => {
      expect(isManagerOrAbove("MANAGER")).toBe(true);
      expect(isManagerOrAbove("ADMIN")).toBe(true);
      expect(isManagerOrAbove("HR_MANAGER")).toBe(true);
    });

    it("returns false for EMPLOYEE", () => {
      expect(isManagerOrAbove("EMPLOYEE")).toBe(false);
    });

    it("returns false for null, undefined, or invalid roles", () => {
      expect(isManagerOrAbove(null)).toBe(false);
      expect(isManagerOrAbove(undefined)).toBe(false);
      expect(isManagerOrAbove("")).toBe(false);
      expect(isManagerOrAbove("GUEST")).toBe(false);
    });
  });

  describe("roleLabel", () => {
    it("formats all standard roles correctly", () => {
      expect(roleLabel("EMPLOYEE")).toBe("Employee");
      expect(roleLabel("MANAGER")).toBe("Manager");
      expect(roleLabel("ADMIN")).toBe("Admin");
      expect(roleLabel("HR_MANAGER")).toBe("HR Manager");
    });

    it("handles null, undefined, and unrecognized strings", () => {
      expect(roleLabel(null)).toBe("");
      expect(roleLabel(undefined)).toBe("");
      expect(roleLabel("")).toBe("");
      expect(roleLabel("CUSTOM_ROLE")).toBe("CUSTOM_ROLE");
    });
  });
});
