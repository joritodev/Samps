export function canCreateExtraDemand(permissions: string[]): boolean {
  return (
    permissions.includes("demands.extra_create") ||
    permissions.includes("demands.create")
  );
}
