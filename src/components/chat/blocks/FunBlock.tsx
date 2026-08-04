import { Fade, Typed } from "@/components/chat/reveal";
import { YouTubeBlock } from "@/components/media/VideoBlock";
import { profile } from "@content/profile";

/** Long enough for a full-width still to become a picture rather than a rectangle turning on. */
const MEDIA_FADE_MS = 520;
const MEDIA_LIFT_MS = 760;

/**
 * The Fun panel. Content lives in `profile.fun` — there's no standalone `/fun` page behind it,
 * this panel is the whole answer.
 *
 * One subject, not a list. The question is "what do you do for fun" and the honest answer is a
 * film, so the film is the answer: a heading, the cut itself at full width, and the reason for it
 * underneath. The prose goes last and types itself, which is the point of the arrangement — the
 * thing being talked about is already on screen by the time the talking starts.
 *
 * The heading and the video share step 0 the way the name and the photo do in `AboutBlock`: a
 * title over a picture is one thing arriving, not two.
 *
 * `loop` gives up `YouTubeBlock`'s click-to-play facade on purpose — the cut plays itself, so the
 * frame is the film rather than a thumbnail of it — which means this block asks youtube.com for a
 * player the moment it mounts, and it only mounts once the panel has finished being thought about.
 * `warmPanel("fun")` is what covers that: the connection is opened back when the pill was hovered
 * or the panel key first appeared in the URL, so the request that starts here starts on bytes. See
 * `src/components/chat/warm.ts`.
 */
export function FunBlock() {
  const { title, body, video } = profile.fun;

  return (
    <div>
      <Fade step={0} fadeMs={MEDIA_FADE_MS} liftMs={MEDIA_LIFT_MS} hold={MEDIA_FADE_MS}>
        <h3 className="mb-4 font-display text-[22px] font-bold tracking-tight text-neutral-900">
          {title}
        </h3>

        <YouTubeBlock
          type="youtube"
          id={video.id}
          title={video.title}
          aspect={video.aspect}
          loop
          heroOnly={false}
        />
      </Fade>

      {/* Blank lines rather than a paragraph each: the answer renderer splits them itself, and
          that's what keeps one run of typing going through the breaks instead of restarting. */}
      <div className="mt-6">
        <Typed step={1} text={body.join("\n\n")} />
      </div>
    </div>
  );
}
