import { MessageActivity } from '@microsoft/teams.api';
import type { ActivityContext } from './types.js';
import { VENUE_REPLY } from '../data/venues.js';

// Token written into the suggested-action `value` so the bot can recognize
// the user clicking "Post to chat" from a regular utterance and respond
// with a public version of the previously-targeted reply.
export const POST_TO_CHAT_TOKEN = '__relecloud_post_to_chat__';

// Heuristic for slash-command invocations across clients. Some Teams
// surfaces pass `/relecloud …` verbatim in `activity.text`; others rewrite
// to `<at>Relecloud</at> …` via the mention object. Treat either as the
// same invocation.
export function isRelecloudSlashCommand(text: string): boolean {
  if (!text) return false;
  return /^\s*\/relecloud\b/i.test(text);
}

/**
 * Group / channel handler. The first slash-command from a user becomes a
 * targeted (private) reply with the markdown venue list, AI metadata,
 * citations, and a "Post to chat" suggested action that promotes the
 * content to the whole group.
 */
export async function handleGroupSlashCommand(
  ctx: ActivityContext,
): Promise<void> {
  const { activity, send } = ctx;

  // Build the targeted message body. The markdown carries inline [1]/[2]/[3]
  // citation markers; addCitation(n, …) wires each marker to a hover card.
  const reply = new MessageActivity(VENUE_REPLY.markdown).addAiGenerated();

  VENUE_REPLY.citations.forEach((c, i) => {
    reply.addCitation(i + 1, {
      name: c.name,
      abstract: c.abstract,
    });
  });

  // Mark the reply as targeted to the invoking user only — this is the
  // canonical "only you can see this" SDK pattern from the Targeted
  // Messages doc.
  reply.withRecipient(activity.from, true);

  // Suggested actions appear as chips below the reply. The "Post to chat"
  // chip carries a sentinel value the bot recognizes on the next inbound
  // message to fire the public follow-up.
  reply.withSuggestedActions({
    to: [activity.from.id],
    actions: [
      {
        type: 'imBack',
        title: '📣 Post to chat',
        value: POST_TO_CHAT_TOKEN,
      },
      ...VENUE_REPLY.suggestedActions.map((s) => ({
        type: 'imBack' as const,
        title: s,
        value: s,
      })),
    ],
  });

  await send(reply);
}

/**
 * Fired when the user clicks the "Post to chat" chip on the previous
 * targeted message. The same content is re-sent as a regular (public)
 * message visible to the whole group, with AI metadata + citations
 * preserved — the content is still AI-generated even after promotion.
 *
 * The user's chip click itself surfaces as a short text message ("Post to
 * chat"); that's how `imBack`-style suggested actions work in Teams.
 */
export async function handlePromoteToChat(ctx: ActivityContext): Promise<void> {
  const reply = new MessageActivity(VENUE_REPLY.markdown).addAiGenerated();

  VENUE_REPLY.citations.forEach((c, i) => {
    reply.addCitation(i + 1, {
      name: c.name,
      abstract: c.abstract,
    });
  });

  // Note: no `withRecipient(..., true)` — this is the public version.
  // Suggested actions still attach (everyone can riff on them now).
  reply.withSuggestedActions({
    to: [ctx.activity.from.id],
    actions: VENUE_REPLY.suggestedActions.map((s) => ({
      type: 'imBack' as const,
      title: s,
      value: s,
    })),
  });

  await ctx.send(reply);
}
