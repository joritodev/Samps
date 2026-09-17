export function muralAnnouncementId(id: string) {
  return `announcement:${id}`;
}

export function muralBirthdayId(b: { id: string; kindOf: "client" | "user" }) {
  return `birthday:${b.kindOf}:${b.id}`;
}

export function rememberIds(seen: string[], ids: string[]): string[] {
  return Array.from(new Set([...seen, ...ids]));
}

export function diffNewIds(current: string[], seen: string[]): string[] {
  const set = new Set(seen);
  return current.filter((id) => !set.has(id));
}
