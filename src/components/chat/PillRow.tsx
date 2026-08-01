import {
  Briefcase,
  Layers,
  PartyPopper,
  Smile,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { profile } from "@content/profile";

/** Icon names usable in `profile.pills`. Add to both sides to add a new one. */
const PILL_ICONS: Record<string, LucideIcon> = {
  smile: Smile,
  briefcase: Briefcase,
  layers: Layers,
  party: PartyPopper,
  "user-search": UserSearch,
};

/**
 * `stacked` is the hero's tall pill; `inline` is the shorter one that shares the chat page's
 * bottom bar with the input and has to leave room for it.
 */
const VARIANTS = {
  stacked: "min-w-[104px] flex-col gap-2 px-5 py-3.5",
  inline: "gap-2 px-4 py-2.5",
} as const;

/**
 * Me / Projects / Skills / Fun / Contact — the site's whole navigation, since there's no nav
 * bar. Edit `profile.pills` in `content/profile.ts` to change it.
 *
 * A pill with a `panel` answers at `/chat?panel=…` without leaving the conversation; one without
 * goes to its page. The hero and the chat page render the same row, so a pill behaves identically
 * from either.
 */
export function PillRow({
  variant = "stacked",
  className,
  /**
   * Rendered as the last item in the row. Inside the flex container rather than beside it so a
   * trailing control wraps with the pills instead of stranding itself on a line of its own.
   */
  trailing,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <nav
      aria-label="Site navigation"
      className={cn("flex flex-wrap justify-center gap-2 sm:gap-3", className)}
    >
      {profile.pills.map((pill) => {
        const Icon = PILL_ICONS[pill.icon] ?? Smile;

        return (
          <Link
            key={pill.label}
            href={`/chat?panel=${pill.panel}`}
            className={cn(
              "glass flex items-center rounded-2xl text-[13px] font-medium text-neutral-700 hover:-translate-y-0.5",
              VARIANTS[variant],
            )}
            data-glass
            suppressHydrationWarning
          >
            <Icon className="size-5" style={{ color: pill.color }} strokeWidth={1.75} />
            {pill.label}
          </Link>
        );
      })}
      {trailing}
    </nav>
  );
}
