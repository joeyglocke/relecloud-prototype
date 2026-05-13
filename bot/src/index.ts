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

// The App orchestrator builds its own HTTP server internally — pass the
// Bot Framework client credentials (BOT_ID + BOT_PASSWORD written by
// `teams app create --env .env`) and call `app.start(port)` to listen.
const app = new App({
  clientId: process.env.BOT_ID ?? '',
  clientSecret: process.env.BOT_PASSWORD ?? '',
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

// ───────────── Boot ─────────────

await app.start(PORT);
// eslint-disable-next-line no-console
console.log(`relecloud agent listening on http://localhost:${PORT}/api/messages`);
