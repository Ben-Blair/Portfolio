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
import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/components/chat/useReducedMotion";
import { warmMediaUrl, warmPanel } from "@/components/chat/warm";
import { useProjectPreloadUrl } from "@/components/site/ProjectPreloadContext";
import { cn } from "@/lib/utils";
import { profile } from "@content/profile";

/**
 * How far the lozenge stretches along its direction of travel, as a fraction of its own size, and
 * how far it has to move to earn the maximum.
 *
 * This is the "liquid" in liquid glass and it has to be driven by *distance*, not by the width
 * difference between the two pills. Letting the width transition lag behind the position one
 * sounds like it should produce the stretch for free, and it doesn't: the pills here differ by
 * about 30px in width and sit up to 400px apart, so the lag is worth a couple of percent of the
 * shape and the lozenge just slides. Measured mid-flight, both edges arrived within 1% of each
 * other. So the stretch is its own animation, scaled by how far the thing actually travelled.
 *
 * The vertical squash is what makes it read as a volume rather than a rectangle being scaled.
 */
const STRETCH_MAX = 0.16;
/** Roughly the width of the row: the longest hop it can make is the one that earns the full 16%. */
const STRETCH_FULL_TRAVEL = 420;
const STRETCH_SQUASH = 0.35;
/** Below this it's a nudge, not a journey, and stretching for it just looks like a wobble. */
const STRETCH_MIN_TRAVEL = 8;
/** Matches the `transform` transition on `.lens-travel` in `globals.css` — keep the two in step. */
const TRAVEL_MS = 420;

type LensBox = Record<"--lens-x" | "--lens-y" | "--lens-w" | "--lens-h", string>;

/**
 * The last two places the lozenge has been, kept outside React on purpose.
 *
 * This row is mounted in two different trees — `ChatView` renders its own `DockShell` on `/chat`,
 * the `(docked)` layout renders one for every other page — so crossing between them unmounts one
 * and mounts the other. Every pill but Projects points at `/chat`, which makes that crossing the
 * common case rather than the edge one, and a freshly mounted lozenge has no previous position to
 * travel from: it can only appear, already arrived. That was the bug — "the animation doesn't
 * happen when I switch to Projects" was really "the element switching to Projects has never
 * existed before".
 *
 * Two slots rather than one because of a race that a single slot can't survive. During one of these
 * crossings the *outgoing* row re-renders with the new pathname and runs its own effect first,
 * writing the destination down before React unmounts it. The incoming row then restores from where
 * the old one was already heading and has nowhere left to travel — which looks exactly like no
 * animation at all. With two slots the incoming row can ask for whichever position isn't the one
 * it's arriving at, and it no longer matters which row got there first.
 *
 * Module-level rather than state or a ref because it has to survive the unmount, which is the one
 * thing React storage cannot do. Safe as a singleton: only the `inline` variant draws a lozenge,
 * and only one of those is on screen at a time.
 */
let lastBox: LensBox | null = null;
let previousBox: LensBox | null = null;

/**
 * Whether a pill has been through layout yet.
 *
 * A pill that hasn't measures zero on every axis, and zero is a position like any other as far as
 * the lozenge is concerned — it will happily start an entrance from the left edge of the row and
 * slide right, which is the one movement that reads as broken rather than as navigation. Nothing
 * downstream can tell "at x=0" from "not measured yet", so the distinction has to be made here.
 */
function laidOut(pill: HTMLAnchorElement) {
  return pill.offsetWidth > 0 && pill.offsetHeight > 0;
}

/** Reads a pill's geometry into the same shape `lastBox`/`previousBox` store. */
function measureBox(pill: HTMLAnchorElement): LensBox {
  return {
    "--lens-x": `${pill.offsetLeft}px`,
    "--lens-y": `${pill.offsetTop}px`,
    "--lens-w": `${pill.offsetWidth}px`,
    "--lens-h": `${pill.offsetHeight}px`,
  };
}

/**
 * Shifts `box` into the two-slot history, unless it's the position already in `lastBox` — a
 * resize that re-places the lozenge where it already was shouldn't push the position it came
 * from out of the second slot.
 */
function rememberBox(box: LensBox) {
  if (!lastBox || lastBox["--lens-x"] !== box["--lens-x"] || lastBox["--lens-y"] !== box["--lens-y"]) {
    previousBox = lastBox;
    lastBox = box;
  }
}

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
 * same pixels, which is what made the bar read as moulded plastic rather than one surface.
 *
 * Its hover *brightens* rather than darkens. A dark tint on a lit translucent panel reads as a
 * smudge on the surface; light reads as the surface catching more of it, which is the thing the
 * material is pretending to be. `active:scale` is the other half of that — glass you press should
 * give slightly.
 *
 * Both variants are tighter below `sm:`, for the same reason in two shapes: five of these do not fit
 * across a phone at the desktop sizing. The inline row needs ~495px and has 334px, and the stacked
 * tiles need ~550px of the hero's 350px, so both wrapped to "Me / Projects / Skills" over "Fun /
 * Contact" — which costs a whole extra row of height to say nothing new, on the one screen with no
 * height to spare. The mobile numbers below put all five on one line in each case.
 *
 * Both are additionally a fixed `w-[…]` *below* `sm:` only — every other size in both variants is
 * the padding-driven, content-hugging width the rest of the site uses, and content-hugging is why
 * "Me" and "Contact" used to read as visibly different-sized buttons: a short label gets a short
 * button. On a phone this row is the whole nav — the one place on the site meant to read as a set
 * of equal buttons rather than a sentence — so the mismatch showed there in a way it doesn't
 * elsewhere. Fixed to the widest label's own measured width at each variant's mobile sizing
 * (`inline`: 50px of text, icon hidden below `sm:` — `ICON_VARIANTS`; `stacked`: same 50px text,
 * icon stacked above it rather than beside it so it doesn't add to the width) plus enough padding
 * that the label isn't touching the edges. `items-center` (below, shared by both) centers the
 * shorter labels inside that same box on the cross axis; nothing additional is needed for `stacked`,
 * whose icon-over-label layout only has a cross axis to center. `inline`'s icon sits beside the
 * label instead, so it needs `justify-center` for the same centering on its main axis.
 *
 * `sm:w-auto` and the rest of each variant's `sm:` classes are not new sizing, they're turning the
 * fixed width back off — landing on exactly the classes each variant had before, unchanged. Desktop
 * was asked to stay as it is.
 *
 * Both widths are sized to the narrowest phone actually in the current iPhone lineup — the SE, at
 * 375px — not the wider one (390px) it's easy to end up testing against instead. The gap between
 * those two is bigger than it looks: `inline` sits inside the dock's own padding on top of the
 * page's, so its track shrinks by 56px at 375px width against the hero's 40px, and a size that
 * clears 390px with room to spare can still wrap at 375px. Checked at 375/390/393/402/428/430 — the
 * SE/mini through the Pro Max — rather than just the one phone that happened to be at hand.
 */
const VARIANTS = {
  stacked:
    "glass min-w-0 w-[63px] flex-col gap-1 rounded-2xl px-1 py-2.5 hover:-translate-y-0.5 sm:w-auto sm:min-w-[104px] sm:gap-2 sm:px-5 sm:py-3.5",
  inline:
    "w-[60px] justify-center gap-2 rounded-xl [corner-shape:squircle] px-0.5 py-2 hover:bg-white/45 active:scale-[0.97] sm:w-auto sm:justify-start sm:px-3.5",
} as const;

/**
 * The label is what identifies a pill, so on a phone the icon is what gives way — dropping it buys
 * ~34px per pill, which is most of the ~160px the row has to lose, and it costs only decoration.
 * Icon-only was the other way to fit five across, and it doesn't survive the question "which of
 * these is Me?" — a smiley and a magnifying-glass-over-a-person are not a navigation.
 *
 * The hero's tiles keep theirs at every width: they're two lines tall by construction, so the icon
 * is not what makes them too wide, and it's doing much more of the work up there.
 */
const ICON_VARIANTS = {
  stacked: "size-5",
  inline: "hidden size-5 sm:block",
} as const;

/**
 * The current page's pill only changes its *text*. Its background is the lozenge below, which is
 * one element for the whole row rather than a tint on each — the point of it is that it travels
 * between them, and five separate backgrounds fading in and out can't travel anywhere.
 */
const ACTIVE_VARIANTS = {
  stacked: "",
  inline: "text-neutral-900",
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
   * Whether the row is on screen, when the caller is collapsing it — `DockShell` on a phone. The
   * clip is the caller's; this is just the pills' own part of the movement, so they travel *with*
   * the closing edge instead of standing still while it passes over them.
   *
   * Defaults open, which is every other caller: the hero spreads this row out below its input and
   * has nothing to collapse it into.
   */
  open = true,
  /**
   * Rendered as the last item in the row. Inside the flex container rather than beside it so a
   * trailing control wraps with the pills instead of stranding itself on a line of its own.
   */
  trailing,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  activePanel?: string;
  open?: boolean;
  trailing?: React.ReactNode;
}) {
  const pathname = usePathname();
  const projectPreloadUrl = useProjectPreloadUrl();

  const reducedMotion = useReducedMotion();

  const navRef = useRef<HTMLElement>(null);
  const pillRefs = useRef(new Map<string, HTMLAnchorElement>());
  const lensRef = useRef<HTMLSpanElement>(null);

  /** False until the lozenge has been put somewhere at least once by this mount. */
  const placed = useRef(false);

  // A pill is current either because you're somewhere under the page behind it or because its
  // panel is the one open in the chat.
  //
  // `href` carries a query on the Projects pill (`?ask=1`) and `usePathname` never does, so
  // compare against the path alone — otherwise arriving at `/projects` by any other route would
  // leave the row pointing nowhere. The prefix match is what keeps Projects lit on
  // `/projects/presence-scan`: a project page is somewhere inside Projects, and a nav that goes
  // blank one level down is worse than no nav at all.
  const currentPill = profile.pills.find((pill) => {
    const path = pill.href.split("?")[0];
    // `/chat` itself is shared by every panel — Me's own `href` reduces to it since it has no
    // standalone page of its own — so a plain pathname match can't tell one panel pill from
    // another there. `activePanel` is the only thing that can, and it's what the third condition
    // below already checks; matching on `path` too would let Me's `/chat?panel=me` win by pathname
    // alone before a later pill's `activePanel` check is even reached.
    if (path === "/chat") return "panel" in pill && Boolean(activePanel) && activePanel === pill.panel;
    return (
      pathname === path ||
      pathname.startsWith(`${path}/`) ||
      ("panel" in pill && Boolean(activePanel) && activePanel === pill.panel)
    );
  });

  /**
   * Freezes wherever the lozenge currently sits into the two-slot history, the instant a pill is
   * clicked — before the navigation it triggers has done anything.
   *
   * The effect below is the other place that updates this history, and normally that's enough.
   * It isn't when clicks come fast enough to outrun it: `useEffect` is passive, so if a click
   * away from Contact lands before Contact's own render has had its effect turn, that effect
   * never runs at all — Contact's arrival is skipped, not delayed. `lastBox` is left pointing at
   * whatever the pill before Contact was, and the next mount flies in from there instead, which
   * reads as the lozenge skipping the pill you were just on. Capturing here doesn't have that
   * gap: a click handler can't be pre-empted by the click after it.
   */
  function rememberCurrentPosition() {
    const pill = currentPill ? pillRefs.current.get(currentPill.label) : undefined;
    if (pill && laidOut(pill)) rememberBox(measureBox(pill));
  }

  /**
   * Point the lozenge at the current pill by measuring it.
   *
   * `offsetTop` as well as `offsetLeft`, because the row wraps at narrow widths and a lozenge that
   * only knows about x strands itself on the first line.
   *
   * `useEffect` rather than `useLayoutEffect` (which would warn on every server render). Nothing
   * here depends on running before paint: on a mount the from-state and the target are both written
   * inside this one effect, with a forced style flush between them, so the browser has both values
   * before it paints either. That's what makes the transition start from the right place without
   * the wrong place ever reaching the screen.
   *
   * The observer is what keeps it honest afterwards: a resized window reflows the row, and a font
   * arriving late changes the pill's width without moving anything else. Observing the pill itself
   * as well as the nav catches both.
   */
  useEffect(() => {
    const nav = navRef.current;
    const lens = lensRef.current;
    const pill = currentPill ? pillRefs.current.get(currentPill.label) : undefined;
    if (!nav || !lens || !pill) return;

    const write = (box: LensBox) => {
      for (const [name, value] of Object.entries(box)) lens.style.setProperty(name, value);
    };

    const place = () => {
      if (!laidOut(pill)) return;
      const box = measureBox(pill);
      rememberBox(box);
      write(box);
    };

    /**
     * The whole placement, as one thing that can be run again.
     *
     * It has to be re-runnable because it can arrive too early. This effect fires as soon as the
     * row commits, which is not the same as the row having been laid out — on a heavy page the
     * dock can still be at zero size at that point. Measuring then gives `offsetLeft: 0`, and a
     * lozenge told to start at 0 flies in from the left edge of the row, which is the bug this
     * guard exists to prevent. Bailing without setting `placed` leaves the mount unclaimed, so
     * whichever observer callback sees the real geometry first runs the entrance properly.
     */
    const run = () => {
      if (!laidOut(pill)) return;

      const target = measureBox(pill);

      if (placed.current) {
        place();
        return;
      }

      placed.current = true;

      // Pick up wherever the previous mount left off. `lastBox` is the destination rather than the
      // origin whenever the outgoing row processed this navigation before unmounting, so take the
      // slot that isn't the place we're arriving at — see the note on `previousBox`.
      const candidate = lastBox && lastBox["--lens-x"] !== target["--lens-x"] ? lastBox : previousBox;
      const from = candidate && candidate["--lens-x"] !== target["--lens-x"] ? candidate : null;

      // Establish a starting style with transitions off, flush it so the browser adopts it as the
      // "before", and only then let the transition back on. The flush is load-bearing: without it
      // both writes collapse into one style recalc and nothing animates at all.
      //
      // On a cold load the starting style is the target itself, not nothing. An unplaced lozenge
      // sits at x=0 with zero width, so switching the transition on before the first placement
      // makes every fresh page load fly it in from the left edge — which is the one movement it
      // should never make.
      lens.removeAttribute("data-travel");
      write(from ?? target);
      // Read the resolved transform back before letting transitions on. The thing that has to be
      // settled is the *transform*, and it is computed from the custom properties written above
      // rather than from layout — so a plain `offsetWidth` reflow doesn't necessarily pin it down.
      // Reading it makes it the value the transition starts from; without this the browser is free
      // to resolve it for the first time only once `data-travel` is on, and the animation then
      // starts from the unset default (0), flying in from the left edge of the row.
      void getComputedStyle(lens).transform;
      lens.setAttribute("data-travel", "");

      place();

      // The gel. On the `scale` property rather than inside `transform`, so it composes with the
      // translate the CSS transition is driving instead of fighting it for the same declaration.
      // Peaks early — the stretch belongs to the launch, and by the time the spring is settling the
      // shape should already be back.
      const travelled = from ? Math.abs(pill.offsetLeft - parseFloat(from["--lens-x"])) : 0;

      if (!reducedMotion && travelled > STRETCH_MIN_TRAVEL) {
        const stretch = Math.min(travelled / STRETCH_FULL_TRAVEL, 1) * STRETCH_MAX;
        lens.animate(
          [
            { scale: "1 1" },
            { scale: `${1 + stretch} ${1 - stretch * STRETCH_SQUASH}`, offset: 0.35 },
            { scale: "1 1" },
          ],
          { duration: TRAVEL_MS, easing: "ease-out" },
        );
      }
    };

    run();

    const observer = new ResizeObserver(run);
    observer.observe(nav);
    observer.observe(pill);
    return () => observer.disconnect();
  }, [currentPill, reducedMotion]);

  return (
    <nav
      ref={navRef}
      aria-label="Site navigation"
      className={cn(
        // Centred in both variants. The inline row is narrower than the shell that holds it, so
        // starting it at the left edge left a third of the bar empty on one side and read as the
        // pills having slid off-centre rather than as a deliberate alignment.
        //
        // `relative` because it's the offset parent the lozenge below is measured against.
        //
        // `gap-1` below `sm:` on both variants, not the `gap-2` an earlier pass here tried on the
        // hero for more visual breathing room. That was tuned against one viewport (a 390px window)
        // and broke on a narrower real one: the smallest iPhone still sold, the SE/mini at 375px, has
        // 15px less track, and `gap-2`'s five 63px tiles need 347px against the 335px that leaves —
        // it would wrap on exactly the device this was for. `gap-1` fits with margin all the way down
        // to 375px; see the arithmetic on `stacked`'s width above.
        "relative flex flex-wrap justify-center gap-1 sm:gap-3",
        // The pills' half of the collapse. The clip alone would hold them still while its edge
        // travelled over them, which reads as a shutter closing; moving them down into the field as
        // it shuts is what makes it the pills that went somewhere.
        //
        // The fade is faster than the slide and front-loaded, so they're transparent well before the
        // clip would show a row of half-guillotined labels. Both reset at `sm:` alongside the track.
        //
        // Scoped to `inline` rather than written unconditionally, because the hero's row must not
        // carry a transform. Its pills are the only `.glass` on the site with something worth
        // refracting behind them, and a transformed ancestor is the kind of thing that establishes a
        // backdrop root and quietly cuts the fluid sim out of what they sample. The hero also has
        // nothing to collapse into, so the classes would only ever be the resting half anyway.
        variant === "inline" && [
          "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          open
            ? "translate-y-0 opacity-100"
            : "translate-y-1.5 opacity-0 duration-150 sm:translate-y-0 sm:opacity-100",
        ],
        className,
      )}
    >
      {/* The travelling selection. Only the inline row has a current page to point at; the hero
          renders the same component with nowhere to be. */}
      {variant === "inline" && (
        <span
          ref={lensRef}
          aria-hidden
          data-visible={currentPill ? "" : undefined}
          // `data-travel` and the four geometry vars are both written by the effect rather than
          // rendered. They have to land in a specific order with a style flush between them, which
          // is a sequence rather than a value — not something a render can express.
          className="glass-lens lens-travel rounded-xl [corner-shape:squircle]"
        />
      )}

      {profile.pills.map((pill) => {
        const Icon = PILL_ICONS[pill.icon] ?? Smile;
        const current = pill === currentPill;

        // Hover and focus are the same signal — the earliest one there is short of the click —
        // so both events get this. What "ready" means is the warm module's problem, not the
        // row's: a panel pill warms whatever its panel needs, and Projects warms the video its
        // first section will play. See `src/components/chat/warm.ts`.
        const warm =
          "panel" in pill
            ? () => warmPanel(pill.panel)
            : pill.href.startsWith("/projects")
              ? () => warmMediaUrl(projectPreloadUrl)
              : undefined;

        return (
          <Link
            key={pill.label}
            ref={(node) => {
              if (node) pillRefs.current.set(pill.label, node);
              else pillRefs.current.delete(pill.label);
            }}
            // `in` rather than a truthiness check: `profile.pills` is `as const`, so a pill
            // without a `panel` is a different type rather than one with an empty field.
            href={"panel" in pill ? `/chat?panel=${pill.panel}` : pill.href}
            onClick={rememberCurrentPosition}
            onMouseEnter={warm}
            onFocus={warm}
            aria-current={current ? "page" : undefined}
            className={cn(
              // `relative` keeps the label and icon above the lozenge, which is positioned and so
              // would otherwise paint over them.
              "relative flex items-center text-[13px] font-medium text-neutral-700",
              "transition-[background-color,color,transform] duration-200",
              VARIANTS[variant],
              current && ACTIVE_VARIANTS[variant],
            )}
            data-glass={variant === "stacked" ? "" : undefined}
            suppressHydrationWarning
          >
            <Icon
              className={ICON_VARIANTS[variant]}
              style={{ color: pill.color }}
              strokeWidth={1.75}
            />
            {pill.label}
          </Link>
        );
      })}
      {trailing}
    </nav>
  );
}
