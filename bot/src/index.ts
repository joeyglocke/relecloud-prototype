// Relecloud — Teams agent prototype entry point.
//
// Mirrors the React UI prototype's two scenarios end-to-end on real Teams:
//   1. Group chat: `/relecloud <ask>` → targeted message with AI label,
//      citations, feedback chips, and a "Post to chat" promote action.
//   2. 1:1 direct chat: free-form or canned prompts → streamed markdown
//      response with AI label and citations attached at completion.
//
// Per the Teams SDK docs, streaming is 1:1 only — the group flow uses a
// non-streamed targeted reply.

import 'dotenv/config';
import { App } from '@microsoft/teams.apps';

import {
  handleGroupSlashCommand,
  handlePromoteToChat,
  isRelecloudSlashCommand,
  POST_TO_CHAT_TOKEN,
} from './handlers/group.js';
import { handleDirectMessage, sendDirectWelcome } from './handlers/direct.js';

const PORT = Number(process.env.PORT ?? 3978);

// The App orchestrator builds its own HTTP server internally. Credentials
// come from .env:
//   • Teams CLI (preview) writes CLIENT_ID / CLIENT_SECRET / TENANT_ID
//   • Manual setups sometimes use BOT_ID / BOT_PASSWORD
// Accept either pair so the bot starts cleanly regardless.
const clientId = process.env.CLIENT_ID ?? process.env.BOT_ID ?? '';
const clientSecret =
  process.env.CLIENT_SECRET ?? process.env.BOT_PASSWORD ?? '';
const tenantId = process.env.TENANT_ID;

const app = new App({
  clientId,
  clientSecret,
  ...(tenantId ? { tenantId } : {}),
});

// ───────────── Inbound message handler ─────────────

app.on('message', async (ctx: any) => {
  const text: string = ctx.activity.text?.trim() ?? '';
  const convoType: string | undefined =
    ctx.activity.conversation?.conversationType;
  const isOneOnOne = convoType === 'personal' || !convoType;

  // 1:1 direct chat — streaming surface.
  if (isOneOnOne) {
    await handleDirectMessage(ctx);
    return;
  }

  // Group / channel — promote-to-chat takes priority (the user clicked
  // the chip on a prior targeted reply).
  if (text === POST_TO_CHAT_TOKEN) {
    await handlePromoteToChat(ctx);
    return;
  }

  // Slash command in a group → targeted message reply. The canonical
  // signal is `recipient.isTargeted` (set by Teams when the user invokes
  // via `/`), with the `/relecloud` text prefix as a fallback for clients
  // that don't yet pass the flag through.
  const isTargeted = Boolean(ctx.activity.recipient?.isTargeted);
  if (isTargeted || isRelecloudSlashCommand(text)) {
    await handleGroupSlashCommand(ctx);
    return;
  }

  // Anything else in a group is left alone — bots that respond to every
  // group message turn into noise. The slash command is the explicit
  // invocation surface.
});

// ───────────── Conversation lifecycle ─────────────

// When the user installs / opens the bot 1:1 for the first time, send
// the welcome message with prompt-suggestion chips.
app.on('conversationUpdate', async (ctx: any) => {
  const added = ctx.activity.membersAdded ?? [];
  const botId: string | undefined = ctx.activity.recipient?.id;
  const convoType = ctx.activity.conversation?.conversationType;
  if (convoType !== 'personal') return;

  const userAdded = added.find((m: any) => m.id !== botId);
  if (userAdded) {
    await sendDirectWelcome(ctx);
  }
});

// ───────────── Feedback (thumbs up / down) ─────────────
//
// Bot messages that called `.addFeedback()` get thumbs up / down buttons in
// Teams. When the user clicks one and submits the optional comment dialog,
// Teams sends a `message.submit.feedback` invoke activity here. The
// `activity.value.actionValue` carries the reaction (`like` / `dislike`)
// and a JSON-encoded `feedback` string with the user's comment.
//
// For the prototype we log + keep a small in-memory store keyed by the
// agent message id. Swap in real persistence (Cosmos, blob, etc.) before
// shipping anything user-facing.

type FeedbackRecord = {
  likes: number;
  dislikes: number;
  comments: string[];
};

const feedbackStore = new Map<string, FeedbackRecord>();

app.on('message.submit.feedback', async (ctx: any) => {
  const value = ctx.activity?.value?.actionValue ?? {};
  const reaction: string | undefined = value.reaction;
  const feedbackJson: string | undefined = value.feedback;
  const replyToId: string | undefined = ctx.activity?.replyToId;

  if (!replyToId) {
    // eslint-disable-next-line no-console
    console.warn('feedback: no replyToId on activity', ctx.activity?.id);
    return;
  }

  let parsedComment = '';
  if (feedbackJson) {
    try {
      const parsed = JSON.parse(feedbackJson);
      parsedComment = parsed.feedbackText ?? '';
    } catch {
      parsedComment = feedbackJson;
    }
  }

  const existing = feedbackStore.get(replyToId) ?? {
    likes: 0,
    dislikes: 0,
    comments: [],
  };
  const updated: FeedbackRecord = {
    likes: existing.likes + (reaction === 'like' ? 1 : 0),
    dislikes: existing.dislikes + (reaction === 'dislike' ? 1 : 0),
    comments: parsedComment ? [...existing.comments, parsedComment] : existing.comments,
  };
  feedbackStore.set(replyToId, updated);

  // eslint-disable-next-line no-console
  console.log(
    `feedback received: reaction=${reaction} replyToId=${replyToId} ` +
      `comment=${JSON.stringify(parsedComment)} ` +
      `totals={likes:${updated.likes}, dislikes:${updated.dislikes}}`,
  );
});

// ───────────── Boot ─────────────

await app.start(PORT);
// eslint-disable-next-line no-console
console.log(`relecloud agent listening on http://localhost:${PORT}/api/messages`);
