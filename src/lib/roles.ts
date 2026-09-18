export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMIN" | "HR_MANAGER";

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "HR_MANAGER";
}

export function isManagerOrAbove(role?: string | null): boolean {
  return role === "MANAGER" || isAdminRole(role);
}

export function roleLabel(role?: string | null): string {
  if (role === "HR_MANAGER") return "HR Manager";
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  if (role === "EMPLOYEE") return "Employee";
  return role || "";
}
