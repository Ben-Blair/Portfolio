import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  AI_ENV_VAR,
  CHAT_PROVIDER_OPTIONS,
  buildSystemPrompt,
  chatErrorMessage,
  chatModel,
  isChatConfigured,
} from "@/lib/ai";
import { clientIp, rateLimited } from "@/lib/rateLimit";
import { profile } from "@content/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 24;
const MAX_CHARS = 1500;

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

  if (rateLimited(clientIp(req))) {
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
    providerOptions: CHAT_PROVIDER_OPTIONS,
    onError({ error }) {
      console.error("[chat] stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse({ onError: chatErrorMessage });
}

/** Lets the client render the offline state before anyone types anything. */
export async function GET() {
  return Response.json({ configured: isChatConfigured() });
}
