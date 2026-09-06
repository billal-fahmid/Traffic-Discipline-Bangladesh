import { getAvatarColor, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Shows the user's uploaded photo, or a deterministic initials avatar if they haven't set one. */
export function UserAvatar({
  avatarUrl,
  name,
  seed,
  className,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  /** Stable id (usually the user id) the placeholder color is derived from. Falls back to name. */
  seed: string;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />
    );
  }

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-medium text-white", className)}
      style={{ backgroundColor: getAvatarColor(seed || name || "?") }}
    >
      {getInitials(name)}
    </div>
  );
}
