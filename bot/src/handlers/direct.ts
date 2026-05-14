import { MessageActivity } from '@microsoft/teams.api';
import type { ActivityContext } from './types.js';
import { STREAMING_PROMPTS, WELCOME_MARKDOWN, type StreamingPrompt } from '../data/prompts.js';

// Look up the two prompts we route to. Title-based lookup so the data
// shape can grow without breaking this handler.
const DIETARY_PROMPT = STREAMING_PROMPTS.find(
  (p) => p.title.toLowerCase() === 'dietary options at suncadia',
);
const OFFSITE_PROMPT = STREAMING_PROMPTS.find(
  (p) => p.title.toLowerCase() === 'activities for 2-day offsite',
);

/**
 * 1:1 direct-message handler. Per the Teams SDK, streaming is supported in
 * 1:1 conversations only — so this is the only path that uses
 * `ctx.stream.emit(...)`.
 *
 * Routing for the demo:
 *   • Anything mentioning "dietary" (or an exact match to the dietary
 *     prompt's title or chip text) → stream the dietary-accommodations
 *     response.
 *   • Everything else (including any free-form input) → stream the
 *     2-day offsite plan. This makes the demo "always rewarding" —
 *     no dead-end fallbacks, every send produces a rich AI-labeled
 *     reply with citations and follow-up chips.
 *
 * Adds a 👀 (`1f440_eyes`) reaction on the user's message right away —
 * mirrors the React UI prototype's "agent saw your ask" affordance and
 * makes the long-running streaming response feel acknowledged from the
 * first beat. Fire-and-forget so a reaction failure never blocks the
 * actual reply (the reactions API is preview / experimental).
 */
export async function handleDirectMessage(ctx: ActivityContext): Promise<void> {
  const { activity, stream, send, api } = ctx;
  const text: string = activity.text?.trim() ?? '';

  // 👀 reaction on the user's message. No await — let it fly in parallel
  // with the response so the bot still streams a reply if reactions fail.
  void api?.reactions
    ?.add(activity.conversation.id, activity.id, '1f440_eyes')
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('reaction add failed:', err);
    });

  // Pick which canned response to stream. Dietary is the one carve-out;
  // anything else funnels to the offsite plan.
  const lower = text.toLowerCase();
  const isDietaryAsk =
    !!DIETARY_PROMPT &&
    (lower === DIETARY_PROMPT.title.toLowerCase() ||
      lower === DIETARY_PROMPT.text.toLowerCase() ||
      lower.includes('dietary'));

  const prompt = isDietaryAsk ? DIETARY_PROMPT : OFFSITE_PROMPT;

  if (!prompt) {
    // Defensive — should never hit unless data/prompts.ts is mis-edited.
    await send(
      new MessageActivity('Working on it.').addAiGenerated().addFeedback(),
    );
    return;
  }

  if (stream) {
    await streamPromptResponse(ctx, prompt);
    return;
  }

  // No stream available (edge case in a 1:1 — shouldn't normally happen).
  // Send the same content as a regular message so the user still gets
  // the AI-labeled + cited response.
  const fallback = new MessageActivity(prompt.markdown)
    .addAiGenerated()
    .addFeedback();
  prompt.citations.forEach((c, i) =>
    fallback.addCitation(i + 1, { name: c.name, abstract: c.abstract }),
  );
  fallback.withSuggestedActions({
    to: [activity.from.id],
    actions: prompt.suggestedActions.map((s) => ({
      type: 'imBack' as const,
      title: s,
      value: s,
    })),
  });
  await send(fallback);
}

/**
 * Stream a prompt response token-by-token. Each `stream.emit` chunk is a
 * small slice of the final markdown. The Teams client renders the partial
 * content with a caret and finalizes when the stream closes — the final
 * message carries the AI-generated label, citations, and suggested
 * actions.
 *
 * The TS Teams SDK lets you emit MessageActivity instances on the stream
 * so the final activity (the one that includes the metadata) lands as
 * the closing emit. We build the content up as a single accumulating
 * MessageActivity, emit text incrementally, then emit the fully-decorated
 * activity at the end.
 */
async function streamPromptResponse(
  ctx: ActivityContext,
  prompt: StreamingPrompt,
): Promise<void> {
  const { stream, activity } = ctx;
  if (!stream) return;

  // Stream the markdown body in small chunks. The SDK takes care of
  // showing the caret / streaming visual on the client.
  for (const chunk of chunkify(prompt.markdown, 3)) {
    stream.emit(chunk);
    await sleep(28);
  }

  // Closing emit — full activity with AI metadata, citations, feedback
  // buttons, and the suggested-action follow-up chips. This is what the
  // Teams client displays once the stream finishes.
  const final = new MessageActivity(prompt.markdown)
    .addAiGenerated()
    .addFeedback();

  prompt.citations.forEach((c, i) => {
    final.addCitation(i + 1, { name: c.name, abstract: c.abstract });
  });

  final.withSuggestedActions({
    to: [activity.from.id],
    actions: prompt.suggestedActions.map((s) => ({
      type: 'imBack' as const,
      title: s,
      value: s,
    })),
  });

  stream.emit(final);
}

/**
 * First-install / new-conversation welcome. Sends an intro + four
 * suggested-action chips that map to the streaming prompt cards. Click a
 * chip → the user's message arrives at `handleDirectMessage` with the
 * chip's `value` as `activity.text`. Routing in `handleDirectMessage`
 * funnels every send to the offsite plan unless the text mentions
 * "dietary" (or matches the dietary prompt's title/text exactly), in
 * which case the dietary-accommodations response is streamed instead.
 */
export async function sendDirectWelcome(ctx: ActivityContext): Promise<void> {
  const welcome = new MessageActivity(WELCOME_MARKDOWN);

  welcome.withSuggestedActions({
    to: [ctx.activity.from.id],
    actions: STREAMING_PROMPTS.map((p) => ({
      type: 'imBack' as const,
      title: p.title,
      value: p.text,
    })),
  });

  await ctx.send(welcome);
}

// ────────────────────────── utilities ──────────────────────────

function* chunkify(text: string, size: number): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
