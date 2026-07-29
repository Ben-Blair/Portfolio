import { profile } from "@content/profile";

const FALLBACK_ERROR = `Something went wrong. Try again, or email me at ${profile.email}.`;

/**
 * The route explains its own failures — a hit daily quota reads differently from a real bug —
 * so show what it said rather than one generic line.
 *
 * Two shapes arrive here: the pre-flight guards reject with a JSON body, while errors raised
 * mid-stream come through as plain text from `chatErrorMessage`. Anything unrecognized falls
 * back, so a stray stack trace or empty string can never reach a visitor.
 */
function errorText(error: Error): string {
  const raw = error.message?.trim();
  if (!raw) return FALLBACK_ERROR;

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      return typeof parsed.message === "string" && parsed.message ? parsed.message : FALLBACK_ERROR;
    } catch {
      return FALLBACK_ERROR;
    }
  }

  // A bare "An error occurred." is the AI SDK's own placeholder, not something worth showing.
  // The length cap is only there to stop a stack trace or dumped response body from rendering;
  // it's well clear of the longest message `chatErrorMessage` produces.
  return raw.length < 400 && raw !== "An error occurred." ? raw : FALLBACK_ERROR;
}

/** Every failure message points at email, so keep that address clickable wherever it lands. */
export function ErrorLine({ error }: { error: Error }) {
  const [before, ...rest] = errorText(error).split(profile.email);

  return (
    <p className="text-[14.5px] leading-relaxed text-red-600">
      {before}
      {rest.length > 0 && (
        <>
          <a className="underline" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
          {rest.join(profile.email)}
        </>
      )}
    </p>
  );
}
