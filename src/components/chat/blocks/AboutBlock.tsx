import Image from "next/image";

import { Fade, Typed } from "@/components/chat/reveal";
import { profile } from "@content/profile";

import { PanelLink } from "./PanelLink";

/** How long the name and the photo take to become legible. Also when the lines under them start. */
const NAME_FADE_MS = 480;

/** How long they keep travelling after that. Longer than the fade, and the reason for both. */
const NAME_LIFT_MS = 760;

/** The photo's head start in reverse: enough to read as following the name, not racing it. */
const PHOTO_DELAY_MS = 180;

/** The hello. Slower than the name it arrives under — it's more to read, and it's the last mover. */
const INTRO_FADE_MS = 520;
const INTRO_LIFT_MS = 760;

/**
 * The chips, timed against the hello rather than chosen: they come up while it's still fading and
 * finish on the frame it stops moving, so the column arrives complete in one instant instead of
 * trailing a last small thing behind it.
 *
 * Both numbers fall out of the lead. Start them earlier and they fade for longer — the landing is
 * fixed, so the only thing that moves is where they begin. This particular lead is the one that
 * makes the two fades the same length: the chips take exactly as long to arrive as the hello does,
 * they just start later and stop travelling sooner.
 */
const CHIPS_LEAD_MS = 280;
const CHIPS_START_MS = INTRO_FADE_MS - CHIPS_LEAD_MS;
const CHIPS_FADE_MS = INTRO_LIFT_MS - CHIPS_START_MS;

/**
 * The Me panel: the short version of `/about`, in the same words.
 *
 * The header arrives into an empty page — the question bubble and the dots have finished leaving
 * before any of this mounts. The name and the line under it lift into place, and the photo does
 * the same a beat later: two things arriving in the same movement rather than one, which is what
 * keeps a portrait this size from reading as the whole layout still settling.
 *
 * The lift is longer than the fade on purpose (see `.reveal-lift`). The name is fully legible
 * while it's still moving, and that instant — not the end of the movement — is when the lines
 * under it are allowed to start, travelling the same way. Overlapping the two that far means the
 * column reads as one thing still rising rather than as two things sliding in turn.
 *
 * The chips close it out on the other end: they start while the hello is still fading and are
 * timed to finish on the frame it stops moving, so the whole column lands at once instead of
 * leaving one last row to catch up.
 *
 * The flex row itself isn't a step. It has to exist from the start so the right column can fill
 * in beside the photo instead of below it. Spacing rides on each step's own `className`, so a
 * step that hasn't arrived leaves no gap waiting for it.
 */
export function AboutBlock() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Fade
          step={0}
          fadeMs={NAME_FADE_MS}
          liftMs={NAME_LIFT_MS}
          delayMs={PHOTO_DELAY_MS}
          className="shrink-0"
        >
          <div className="relative w-56 overflow-hidden rounded-2xl aspect-[716/1002]">
            <Image
              src="/me-photo.webp"
              alt={profile.fullName}
              fill
              sizes="224px"
              className="object-contain"
            />
          </div>
        </Fade>

        {/* Same step as the photo — one number, two things, arriving in one movement. This one
            sets the pace: `hold` releases the next step on the end of its fade, while it's still
            travelling. */}
        <Fade
          step={0}
          fadeMs={NAME_FADE_MS}
          liftMs={NAME_LIFT_MS}
          hold={NAME_FADE_MS}
          className="min-w-0 pt-1"
        >
          <p className="font-display text-2xl font-bold tracking-tight text-neutral-900">
            {profile.fullName}
          </p>

          <p className="mt-1 text-[14.5px] text-neutral-500">
            {profile.age} years old <span className="px-1.5 text-neutral-300">•</span>{" "}
            {profile.location}
          </p>

          {/* Its own step, arriving on the seam where the name finished fading, and travelling the
              same way it does — the column keeps moving as it fills in rather than the movement
              belonging to the header alone. It releases the chips a beat before its own fade is
              done, so the two overlap rather than queue. */}
          <Fade
            step={1}
            fadeMs={INTRO_FADE_MS}
            liftMs={INTRO_LIFT_MS}
            hold={CHIPS_START_MS}
            className="mt-4 space-y-2"
          >
            {profile.intro.map((line) => (
              <p key={line} className="text-[15px] leading-relaxed text-neutral-700">
                {line}
              </p>
            ))}
          </Fade>

          {/* The chips repeat what the prose already says, on purpose: they're what someone
              skimming takes away when they don't read the paragraphs. They only fade — the hello
              above them is still travelling, and a second thing moving under it would read as the
              column not knowing where it's meant to settle. */}
          <Fade step={2} fadeMs={CHIPS_FADE_MS} className="mt-5">
            <ul className="flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-neutral-100 px-3 py-1.5 text-[13px] text-neutral-600"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Fade>
        </Fade>
      </div>

      {/* Blank lines rather than a paragraph each: the answer renderer splits them itself, and
          that's what keeps one run of typing going through the breaks instead of restarting. */}
      <Typed step={3} text={profile.about.join("\n\n")} />

      <Fade step={4} className="mt-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <PanelLink href="/about">More about me</PanelLink>
          <PanelLink href="/resume">Read the resume</PanelLink>
        </div>
      </Fade>
    </div>
  );
}
