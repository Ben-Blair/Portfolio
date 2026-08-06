import { FunVideo } from "@/components/chat/blocks/FunVideo";
import { Fade, Typed } from "@/components/chat/reveal";
import { profile } from "@content/profile";

/** Long enough for a full-width still to become a picture rather than a rectangle turning on. */
const MEDIA_FADE_MS = 520;
const MEDIA_LIFT_MS = 760;

/**
 * The Fun panel. Content lives in `profile.fun` — there's no standalone `/fun` page behind it,
 * this panel is the whole answer.
 *
 * One subject, not a list. The question is "what do you do for fun" and the honest answer is a
 * film, so the film is the answer: the cut itself at full width, a caption underneath it, and the
 * reason for it after that. The prose goes last and types itself, which is the point of the
 * arrangement — the thing being talked about is already on screen by the time the talking starts.
 *
 * The video leads rather than the heading so it lands as high on screen as possible — less to
 * scroll past before the prose underneath it. The heading and the video share step 0 the way the
 * name and the photo do in `AboutBlock`: a title under a picture is one thing arriving, not two.
 *
 * The cut plays itself on mount, no click-to-play facade — the frame is the film rather than a
 * thumbnail of it. `warmPanel("fun")` fetches its bytes ahead of the panel finishing its entrance,
 * fired back when the pill was hovered or the panel key first appeared in the URL, so the request
 * that starts here starts warm. See `src/components/chat/warm.ts`.
 */
export function FunBlock() {
  const { title, body, video } = profile.fun;

  return (
    <div>
      {/* Pulls up against `ChatView`'s shared `pt-28 sm:pt-32` — that padding clears the fixed
          info button for every panel, but only Fun is a video wanting to sit as high as it can;
          this cancels part of it here rather than shrinking the padding for every other panel. */}
      <Fade
        step={0}
        fadeMs={MEDIA_FADE_MS}
        liftMs={MEDIA_LIFT_MS}
        hold={MEDIA_FADE_MS}
        className="-mt-12 sm:-mt-16"
      >
        <FunVideo src={video.src} poster={video.poster} title={video.title} aspect={video.aspect} />

        <h3 className="mt-4 font-display text-[22px] font-bold tracking-tight text-neutral-900">
          {title}
        </h3>
      </Fade>

      {/* Blank lines rather than a paragraph each: the answer renderer splits them itself, and
          that's what keeps one run of typing going through the breaks instead of restarting. */}
      <div className="mt-6">
        <Typed step={1} text={body.join("\n\n")} />
      </div>
    </div>
  );
}
