import { MessageActivity } from '@microsoft/teams.api';
import type { ActivityContext } from './types.js';
import { matchPrompt, STREAMING_PROMPTS, WELCOME_MARKDOWN } from '../data/prompts.js';

/**
 * 1:1 direct-message handler. Per the Teams SDK, streaming is supported in
 * 1:1 conversations only — so this is the only path that uses
 * `ctx.stream.emit(...)`. Any free-form message that doesn't match a
 * canned prompt gets a brief targeted-style acknowledgement.
 */
export async function handleDirectMessage(ctx: ActivityContext): Promise<void> {
  const { activity, stream, send } = ctx;
  const text: string = activity.text?.trim() ?? '';

  // Suggested-action chips sent from a finalized streaming message replay
  // the chip title back to the bot. If the text matches one of our prompt
  // cards, stream that card's response.
  const prompt = matchPrompt(text);
  if (prompt && stream) {
    await streamPromptResponse(ctx, prompt);
    return;
  }

  // Fallback: free-form ask. Stream a short generic acknowledgement so
  // streaming UX is still visible, then close out without citations.
  if (stream) {
    const fallback =
      "Working on it — let me pull a few sources and come back with details. " +
      "In the meantime, the prompt suggestions in this chat are good shortcuts.";
    for (const chunk of chunkify(fallback, 3)) {
      stream.emit(chunk);
    }
    return;
  }

  // No stream available (edge case) — just send a normal message.
  await send(
    new MessageActivity(
      "Working on it — let me pull a few sources and come back.",
    ).addAiGenerated(),
  );
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
  prompt: ReturnType<typeof matchPrompt> & object,
): Promise<void> {
  const { stream, activity } = ctx;
  if (!stream) return;

  // Stream the markdown body in small chunks. The SDK takes care of
  // showing the caret / streaming visual on the client.
  for (const chunk of chunkify(prompt.markdown, 3)) {
    stream.emit(chunk);
    await sleep(28);
  }

  // Closing emit — full activity with AI metadata, citations, and the
  // suggested-action follow-up chips. This is what the Teams client
  // displays once the stream finishes.
  const final = new MessageActivity(prompt.markdown).addAiGenerated();

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
 * chip's `value` as `activity.text` → `matchPrompt` finds it → streams.
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
