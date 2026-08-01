"use client";

import {
  Briefcase,
  Layers,
  PartyPopper,
  Smile,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
 * `stacked` is the hero's tall pill — its own glass tile, floating over the fluid, which is the
 * one place on the site where the material has something worth refracting.
 *
 * `inline` is the row inside `DockShell`. It is deliberately *not* glass: the shell around it
 * already is, and glass inside glass stacks two specular rims and two backdrop filters on the
 * same pixels, which is what made the bar read as moulded plastic rather than one surface. A tint
 * on hover is enough to show these are pressable when they sit on a lit panel.
 */
const VARIANTS = {
  stacked: "glass min-w-[104px] flex-col gap-2 rounded-2xl px-5 py-3.5 hover:-translate-y-0.5",
  inline: "gap-2 rounded-xl px-3.5 py-2 hover:bg-black/[0.04]",
} as const;

/** Only the shell's row gets a resting tint for the current page; the hero has no current page. */
const ACTIVE_VARIANTS = {
  stacked: "",
  inline: "bg-black/[0.06] text-neutral-900",
} as const;

/**
 * Me / Projects / Skills / Fun / Contact — the site's whole navigation, since there's no nav
 * bar. Edit `profile.pills` in `content/profile.ts` to change it.
 *
 * A pill with a `panel` answers at `/chat?panel=…` without leaving the conversation; one without
 * goes straight to its `href`. The hero and the chat page render the same row, so a pill behaves
 * identically from either.
 */
export function PillRow({
  variant = "stacked",
  className,
  /**
   * The `?panel=` currently open, when the caller is `/chat`. Passed down rather than read here
   * with `useSearchParams`: this row also renders on the statically prerendered hero, and that
   * hook would force a Suspense boundary around it there or fail the production build.
   */
  activePanel,
  /**
   * Rendered as the last item in the row. Inside the flex container rather than beside it so a
   * trailing control wraps with the pills instead of stranding itself on a line of its own.
   */
  trailing,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  activePanel?: string;
  trailing?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Site navigation"
      className={cn(
        // Centred in both variants. The inline row is narrower than the shell that holds it, so
        // starting it at the left edge left a third of the bar empty on one side and read as the
        // pills having slid off-centre rather than as a deliberate alignment.
        "flex flex-wrap justify-center gap-2 sm:gap-3",
        className,
      )}
    >
      {profile.pills.map((pill) => {
        const Icon = PILL_ICONS[pill.icon] ?? Smile;

        // A pill is current either because you're somewhere under the page behind it or because
        // its panel is the one open in the chat.
        //
        // `href` carries a query on the Projects pill (`?ask=1`) and `usePathname` never does, so
        // compare against the path alone — otherwise arriving at `/projects` by any other route
        // would leave the row pointing nowhere. The prefix match is what keeps Projects lit on
        // `/projects/presence-scan`: a project page is somewhere inside Projects, and a nav that
        // goes blank one level down is worse than no nav at all.
        const path = pill.href.split("?")[0];
        const current =
          pathname === path ||
          pathname.startsWith(`${path}/`) ||
          ("panel" in pill && Boolean(activePanel) && activePanel === pill.panel);

        return (
          <Link
            key={pill.label}
            // `in` rather than a truthiness check: `profile.pills` is `as const`, so a pill
            // without a `panel` is a different type rather than one with an empty field.
            href={"panel" in pill ? `/chat?panel=${pill.panel}` : pill.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center text-[13px] font-medium text-neutral-700 transition-colors",
              VARIANTS[variant],
              current && ACTIVE_VARIANTS[variant],
            )}
            data-glass={variant === "stacked" ? "" : undefined}
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
