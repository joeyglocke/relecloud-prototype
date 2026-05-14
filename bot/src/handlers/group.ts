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
 * Best-effort: tag the outgoing message as a targeted reply when the user's
 * incoming slash command was targeted.
 *
 * **Important SDK caveat (preview-12):** the installed `@microsoft/teams.api`
 * doesn't yet expose first-class targeted-message sending. `withRecipient`
 * only takes one argument; there's no flag, no `isTargetedActivity` option
 * on `ActivityParams`, and the REST query param the Bot Framework requires
 * (`?isTargetedActivity=true`) isn't surfaced. Until the SDK ships proper
 * support, we do two things:
 *   1. Set `recipient` to the invoking user — semantically correct, and a
 *      no-op if the SDK ignores it for group replies.
 *   2. Stuff a loose `targetedActivity: true` hint into channelData — the
 *      type allows arbitrary properties, and if Teams' service honors it,
 *      we get a targeted reply for free; if not, no harm done.
 * When the SDK adds `.withRecipient(account, true)` (or equivalent),
 * replace this helper with the proper call.
 */
function applyTargetingIfNeeded(ctx: ActivityContext, message: MessageActivity): MessageActivity {
  const isTargeted = Boolean(ctx.activity.recipient?.isTargeted);
  const from = ctx.activity.from;
  if (isTargeted && from) {
    message.withRecipient(from);
    // Loose-typed escape hatch — see comment block above.
    message.withChannelData({ targetedActivity: true } as any);
  }
  return message;
}

/**
 * Build the standard Relecloud venue reply: markdown body + AI label +
 * three citations + feedback buttons + the suggested-action chip row
 * (with the "📣 Post to chat" sentinel chip prepended).
 */
function buildVenueReply(ctx: ActivityContext, includePostToChatChip: boolean): MessageActivity {
  const reply = new MessageActivity(VENUE_REPLY.markdown)
    .addAiGenerated()
    .addFeedback();

  VENUE_REPLY.citations.forEach((c, i) => {
    reply.addCitation(i + 1, {
      name: c.name,
      abstract: c.abstract,
    });
  });

  const followUpActions = VENUE_REPLY.suggestedActions.map((s) => ({
    type: 'imBack' as const,
    title: s,
    value: s,
  }));

  reply.withSuggestedActions({
    to: [ctx.activity.from.id],
    actions: includePostToChatChip
      ? [
          {
            type: 'imBack' as const,
            title: '📣 Post to chat',
            value: POST_TO_CHAT_TOKEN,
          },
          ...followUpActions,
        ]
      : followUpActions,
  });

  return reply;
}

/**
 * Group / channel handler. The slash command becomes a targeted (private)
 * reply with the markdown venue list, AI metadata, citations, feedback,
 * and a "Post to chat" suggested action that promotes the content to the
 * whole group.
 */
export async function handleGroupSlashCommand(
  ctx: ActivityContext,
): Promise<void> {
  // Include the "📣 Post to chat" chip in the targeted reply so the user
  // can broadcast Relecloud's suggestion if it's useful to the group.
  const reply = buildVenueReply(ctx, /* includePostToChatChip */ true);
  // Always apply targeting LAST so no other builder call accidentally drops it.
  applyTargetingIfNeeded(ctx, reply);
  await ctx.send(reply);
}

/**
 * Fired when the user clicks the "Post to chat" chip on the previous
 * targeted message. The same content is re-sent as a regular (public)
 * message visible to the whole group, with AI metadata + citations
 * preserved — the content is still AI-generated even after promotion.
 *
 * Public on purpose: no `withRecipient` here. The follow-up chips stay
 * attached so anyone in the group can riff on them.
 */
export async function handlePromoteToChat(ctx: ActivityContext): Promise<void> {
  const reply = buildVenueReply(ctx, /* includePostToChatChip */ false);
  await ctx.send(reply);
}
