import { MessageActivity } from '@microsoft/teams.api';
import type { ActivityContext } from './types.js';
import { VENUE_REPLY } from '../data/venues.js';

// Sentinel `text` value the bot receives when the user clicks the
// "📣 Post to chat" chip on the targeted reply. The chip is a
// `messageBack` suggested action, so the user-visible chat text is
// `displayText` (a friendly "Sharing this with the group…" line),
// while the bot sees this token in `activity.text` and routes to
// handlePromoteToChat.
//
// Why messageBack and not Action.Execute on an Adaptive Card?
// The Teams targeted-message preview endpoint rejects activities that
// combine markdown text with an attachment (`BadSyntax: field is in
// the wrong format: text`), so the silent-invoke pattern can't ride on
// the same bubble as the venue reply. messageBack with displayText
// gets us close — one brief user-side message (the displayText) then
// the bot's public reply. Revisit when the targeted endpoint accepts
// attachments.
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
 * Mirror the incoming message's targeting: if the user invoked us with a
 * targeted (slash-command / private) message, reply privately to the same
 * user via the SDK's canonical `withRecipient(account, isTargeted)`
 * overload.
 *
 * Call this as the *last* builder step before `send` so no other builder
 * call accidentally clobbers the targeting state.
 */
function applyTargetingIfNeeded(ctx: ActivityContext, message: MessageActivity): MessageActivity {
  const isTargeted = Boolean(ctx.activity.recipient?.isTargeted);
  const from = ctx.activity.from;
  if (isTargeted && from) {
    message.withRecipient(from, true);
  }
  return message;
}

/**
 * Build the standard Relecloud venue reply: markdown body + AI label +
 * three citations + thumbs feedback + suggested-action chips. Optionally
 * prepends the "📣 Post to chat" chip (messageBack with friendly
 * displayText) so the targeted reply gives the user a one-click way to
 * promote the suggestion publicly.
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
            type: 'messageBack' as const,
            title: '📣 Post to chat',
            // Bot-only: routed in index.ts via text comparison.
            text: POST_TO_CHAT_TOKEN,
            value: POST_TO_CHAT_TOKEN,
            // User-visible text in the chat instead of the raw token.
            displayText: '📣 Sharing this with the group…',
          } as any,
          ...followUpActions,
        ]
      : followUpActions,
  });

  return reply;
}

/**
 * Group / channel slash-command handler. Sends a single targeted
 * (private) reply: markdown venue list + AI metadata + citations +
 * thumbs feedback + Post-to-chat chip + three follow-up chips.
 */
export async function handleGroupSlashCommand(
  ctx: ActivityContext,
): Promise<void> {
  const reply = buildVenueReply(ctx, /* includePostToChatChip */ true);
  // Apply targeting last so no other builder call drops it.
  applyTargetingIfNeeded(ctx, reply);
  await ctx.send(reply);
}

/**
 * Fired when the user clicks the "📣 Post to chat" chip on the targeted
 * reply. The click arrives as a regular incoming message with
 * `activity.text === POST_TO_CHAT_TOKEN` (and `displayText` shows the
 * friendly "Sharing this with the group…" in the chat). The bot
 * responds with the same content as a public message visible to the
 * whole group — AI metadata + citations + feedback preserved.
 */
export async function handlePromoteToChat(ctx: ActivityContext): Promise<void> {
  const reply = buildVenueReply(ctx, /* includePostToChatChip */ false);
  // No `withRecipient(..., true)` — this is the public version.
  await ctx.send(reply);
}
