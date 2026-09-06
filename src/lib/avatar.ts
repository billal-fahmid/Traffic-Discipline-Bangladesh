/**
 * Deterministic placeholder avatar for any user who hasn't uploaded a
 * profile photo — same person always gets the same initials/color
 * (keyed off their user id), so it reads as "their" avatar rather than
 * a random one that changes on every reload.
 *
 * Colors are shades within the app's own disciplined green/slate
 * palette (see globals.css) rather than arbitrary hues — red is
 * reserved for alerts/destructive actions and is never used here.
 */

const AVATAR_COLORS = [
  "#006A4E", // primary BD-flag green
  "#0B8968",
  "#0F766E", // teal
  "#14532D", // deep green
  "#155E63",
  "#374151", // slate
  "#4B5563",
] as const;

export function getInitials(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index]!;
}
