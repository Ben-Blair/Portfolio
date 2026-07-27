import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { AI_ENV_VAR, buildSystemPrompt, chatModel, isChatConfigured } from "@/lib/ai";
import { profile } from "@content/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 24;
const MAX_CHARS = 1500;

/** Crude per-IP limiter. Fine for a portfolio; swap for Upstash if this ever gets real traffic. */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

export async function POST(req: Request) {
  if (!isChatConfigured()) {
    return Response.json(
      {
        error: "chat_unconfigured",
        message: `Chat is offline — no ${AI_ENV_VAR} is set. Reach me at ${profile.email}.`,
      },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return Response.json(
      {
        error: "rate_limited",
        message: `That's a lot of questions — give it a minute, or just email me at ${profile.email}.`,
      },
      { status: 429 },
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
  } catch {
    return Response.json({ error: "bad_request", message: "Malformed request." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "bad_request", message: "No messages." }, { status: 400 });
  }

  // Keep only the tail of a long conversation, and reject anything pasted in bulk.
  const trimmed = messages.slice(-MAX_MESSAGES);
  const tooLong = trimmed.some((message) =>
    message.parts?.some((part) => part.type === "text" && part.text.length > MAX_CHARS),
  );
  if (tooLong) {
    return Response.json(
      { error: "too_long", message: `Keep it under ${MAX_CHARS} characters.` },
      { status: 413 },
    );
  }

  const result = streamText({
    model: chatModel(),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(trimmed),
    temperature: 0.7,
    onError({ error }) {
      console.error("[chat] stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse();
}

/** Lets the client render the offline state before anyone types anything. */
export async function GET() {
  return Response.json({ configured: isChatConfigured() });
}
