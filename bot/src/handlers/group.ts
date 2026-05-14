import { MessageActivity, cardAttachment } from '@microsoft/teams.api';
import { AdaptiveCard, ExecuteAction, TextBlock } from '@microsoft/teams.cards';
import type { ActivityContext } from './types.js';
import { VENUE_REPLY } from '../data/venues.js';

// Verb on the Adaptive Card Action.Execute button. The bot routes the
// resulting `adaptiveCard/action` invoke via this verb. Keep in sync
// with the route registered in src/index.ts.
export const POST_TO_CHAT_VERB = 'postToChat';

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
 * Build a small Adaptive Card whose only purpose is to carry a silent
 * `Action.Execute` button for "📣 Post to chat". Clicking the button
 * fires an `adaptiveCard/action` invoke to the bot — there's no visible
 * user-side message in between, unlike an `imBack` suggested-action
 * chip.
 */
function buildPostToChatCard(): ReturnType<typeof cardAttachment<'adaptive'>> {
  const card = new AdaptiveCard(
    new TextBlock({
      text: 'Share Relecloud\'s recommendation with the group?',
      wrap: true,
      size: 'Small',
      isSubtle: true,
    } as any),
  ).withOptions({
    actions: [
      new ExecuteAction({
        title: '📣 Post to chat',
        verb: POST_TO_CHAT_VERB,
      }),
    ],
  } as any);

  return cardAttachment('adaptive', card);
}

/**
 * Build the standard Relecloud venue reply body: markdown text + AI
 * label + three citations + thumbs feedback + three follow-up chips
 * (Draft itinerary / Compare flights / Send hold request) as imBack
 * suggested actions. The Post-to-chat card rides on a separate activity
 * (see handleGroupSlashCommand) — combining text + Adaptive Card
 * attachment in a single targeted activity is rejected by the preview
 * targeted-message endpoint with `BadSyntax: field is in the wrong
 * format: text`.
 */
function buildVenueReply(ctx: ActivityContext): MessageActivity {
  const reply = new MessageActivity(VENUE_REPLY.markdown)
    .addAiGenerated()
    .addFeedback();

  VENUE_REPLY.citations.forEach((c, i) => {
    reply.addCitation(i + 1, {
      name: c.name,
      abstract: c.abstract,
    });
  });

  reply.withSuggestedActions({
    to: [ctx.activity.from.id],
    actions: VENUE_REPLY.suggestedActions.map((s) => ({
      type: 'imBack' as const,
      title: s,
      value: s,
    })),
  });

  return reply;
}

/**
 * Group / channel slash-command handler. Sends two targeted activities:
 *   1. The markdown venue reply with AI metadata, citations, thumbs
 *      feedback, and three follow-up imBack chips.
 *   2. A second tiny targeted activity carrying only the Post-to-chat
 *      Adaptive Card (Action.Execute → silent invoke). Split out from
 *      (1) because the preview targeted-message endpoint refuses a
 *      payload that combines markdown text with an Adaptive Card
 *      attachment.
 */
export async function handleGroupSlashCommand(
  ctx: ActivityContext,
): Promise<void> {
  const reply = buildVenueReply(ctx);
  applyTargetingIfNeeded(ctx, reply);
  await ctx.send(reply);

  const cardMsg = new MessageActivity('').addAttachments(buildPostToChatCard());
  applyTargetingIfNeeded(ctx, cardMsg);
  await ctx.send(cardMsg);
}

/**
 * Fired when the user clicks "📣 Post to chat" on the targeted reply's
 * Adaptive Card. The click arrives as an `adaptiveCard/action` invoke
 * (silent — no visible user message in the chat), and we respond by
 * sending the same content as a regular (public) message to the whole
 * group. AI metadata + citations + feedback carry over.
 */
export async function handlePromoteToChat(ctx: ActivityContext): Promise<void> {
  const reply = buildVenueReply(ctx);
  // No `withRecipient(..., true)` — this is the public version.
  await ctx.send(reply);
}
