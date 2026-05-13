# Relecloud — Teams agent

Sideloadable Teams bot mirroring the React UI prototype's two scenarios end‑to‑end on real Teams. Same mock data, same Northwind‑offsite scenario, same Relecloud branding.

What this showcases:

| Feature | Where | Teams SDK API |
|---|---|---|
| Slash command (`/relecloud …`) | Group chat | `commandLists.triggers: ['slash']` in manifest, server detects `/relecloud` prefix |
| Targeted message ("Only you can see this") | Group chat | `MessageActivity.withRecipient(activity.from, true)` |
| AI‑generated label | Both | `MessageActivity.addAiGenerated()` |
| Citations with hover cards (`[1]`, `[2]`, `[3]`) | Both | `MessageActivity.addCitation(n, { name, abstract })` |
| Suggested‑action follow‑up chips | Both | `MessageActivity.withSuggestedActions({ to, actions })` |
| Post to chat (promote private → public) | Group chat | Suggested action with a sentinel value; bot re‑sends as public |
| Streaming (token‑by‑token) | 1:1 only | `stream.emit(chunk)` |

Streaming is intentionally 1:1 only — per the [Teams SDK streaming doc](https://microsoft.github.io/teams-sdk/typescript/essentials/sending-messages/), streaming isn't supported in group chats or channels.

## Prerequisites

- **Node.js 20+** (Vite & the Teams SDK both require it)
- A Microsoft 365 tenant where you're allowed to upload custom Teams apps (Teams Admin Center → App management → "Upload custom apps" enabled)
- [Teams CLI](https://microsoft.github.io/teams-sdk/cli/getting-started/installation): `npm install -g @microsoft/teams.cli@preview`
- A tunneling tool to expose your local port 3978 to a public URL. Microsoft's `devtunnel` is the easiest:
  ```
  winget install Microsoft.Devtunnel
  devtunnel user login
  ```

## Quickstart (Teams CLI path)

```bash
cd bot
npm install

# 1) Register a bot in your tenant and write BOT_ID / BOT_PASSWORD to .env.
#    The CLI handles the Microsoft Entra app + Bot Service registration.
teams app create --name "Relecloud" --env .env

# 2) Start a dev tunnel so the bot is reachable from Teams' cloud.
devtunnel host -p 3978 --allow-anonymous
#   → copy the https:// URL it prints, e.g.
#     https://abcd1234-3978.use.devtunnels.ms

# 3) Set the bot's messaging endpoint to your tunnel URL + /api/messages.
#    Either in the Azure Bot resource the CLI created (Configuration →
#    Messaging endpoint) or via:
teams app update --endpoint https://<your-tunnel>.devtunnels.ms/api/messages

# 4) Run the agent locally.
npm run dev

# 5) Build the sideload package.
npm run package
#   → produces appPackage/relecloud.zip with BOT_ID + TEAMS_APP_ID
#     substituted into manifest.json.

# 6) Sideload it. In Teams: Apps → Manage your apps → Upload an app →
#    "Upload a custom app" → pick appPackage/relecloud.zip.
```

## Manual sideload (no Teams CLI)

If you'd rather not use the CLI:

1. **Register a bot** at [dev.botframework.com](https://dev.botframework.com/) or via Azure Bot Service. You need the bot's **Microsoft App ID** (= `BOT_ID`) and a **client secret** (= `BOT_PASSWORD`).
2. Copy `.env.example` → `.env` and paste them in.
3. Open `appPackage/manifest.json` and replace `${{BOT_ID}}` (twice — `bots[0].botId`) and `${{TEAMS_APP_ID}}` (the top‑level `id` — any fresh UUID works). Keep them consistent.
4. Start the tunnel: `devtunnel host -p 3978 --allow-anonymous`. Set the bot's **messaging endpoint** (in the Azure Bot resource's Configuration blade) to `https://<your-tunnel>.devtunnels.ms/api/messages`.
5. Install deps and start: `npm install && npm run dev`
6. Build the zip: `npm run package`
7. Sideload `appPackage/relecloud.zip` in Teams (Apps → Manage your apps → Upload a custom app).

## Try the two scenarios

### Part 1 — Group chat (slash command + Post to chat)

1. Add Relecloud to a group chat or team (`+ Add people` / install the app to a channel).
2. Type: `/relecloud find a 2-day offsite venue near Seattle for 7 people in May`
3. Relecloud replies as a **targeted message** — only you see it. The reply has:
   - Markdown body (headings, bullets, bold, links)
   - **AI‑generated** sparkle label
   - Inline `[1]` `[2]` `[3]` citation markers — hover for the source card
   - Thumbs up / thumbs down feedback
   - A **📣 Post to chat** suggested‑action chip + three follow‑up chips
4. Click **📣 Post to chat** — Relecloud re‑sends the same content as a public message visible to the whole group, AI label and citations preserved.

### Part 2 — 1:1 chat (streaming)

1. Open Relecloud as a personal chat (after sideloading, click the app in the rail).
2. On first open you get a welcome message with four prompt chips. Click any one, e.g. **Weather at Snoqualmie Pass**.
3. Relecloud's response **streams** in token‑by‑token. Once complete, the **AI‑generated** label, citation hover cards, and three more suggested‑action chips attach to the message.
4. The follow‑up chips replay back to the bot as new messages — try one to stream another response. Free‑form messages get a brief streamed acknowledgement.

## Project layout

```
bot/
├── README.md
├── package.json              # Node 20+, "preview" SDK packages
├── tsconfig.json
├── .env.example              # BOT_ID / BOT_PASSWORD slots
├── appPackage/
│   ├── manifest.json         # Teams app manifest with ${{BOT_ID}} placeholders
│   ├── color.png             # 192×192 Relecloud-blue cloud
│   └── outline.png           # 32×32 white-cloud outline
├── scripts/
│   ├── generate-icons.mjs    # writes the two PNG icons from scratch
│   └── package-app.mjs       # zips appPackage/ → relecloud.zip
└── src/
    ├── index.ts              # App init, message + conversationUpdate handlers
    ├── handlers/
    │   ├── types.ts          # ActivityContext alias
    │   ├── group.ts          # slash command + Post-to-chat
    │   └── direct.ts         # 1:1 streaming + welcome
    └── data/
        ├── venues.ts         # group reply (markdown + citations + chips)
        └── prompts.ts        # 1:1 prompt cards (4 streamed responses)
```

## How the pieces map to the SDK

`src/handlers/group.ts` — group / channel slash command:

```ts
const reply = new MessageActivity(VENUE_REPLY.markdown).addAiGenerated();

VENUE_REPLY.citations.forEach((c, i) => {
  reply.addCitation(i + 1, { name: c.name, abstract: c.abstract });
});

reply.withRecipient(activity.from, true);     // targeted (private)
reply.withSuggestedActions({
  to: [activity.from.id],
  actions: [
    { type: 'imBack', title: '📣 Post to chat', value: POST_TO_CHAT_TOKEN },
    // ... three more chips
  ],
});

await send(reply);
```

`src/handlers/direct.ts` — 1:1 streaming:

```ts
for (const chunk of chunkify(prompt.markdown, 3)) {
  stream.emit(chunk);
  await sleep(28);
}

const final = new MessageActivity(prompt.markdown).addAiGenerated();
prompt.citations.forEach((c, i) =>
  final.addCitation(i + 1, { name: c.name, abstract: c.abstract }),
);
final.withSuggestedActions({ to: [activity.from.id], actions: /* … */ });
stream.emit(final);
```

## Troubleshooting

- **The bot doesn't see my slash command.** Slash commands are in [public developer preview](https://learn.microsoft.com/en-us/microsoftteams/platform/agents-in-teams/agent-slash-commands). Make sure your tenant is opted into developer preview, and that the manifest's `commandLists[*].triggers` includes `"slash"`.
- **`withRecipient` errors with "BotNotInConversationRoster".** The bot must be installed in the group / channel before sending a targeted message. Add the app via `+` in the chat / channel members.
- **Stream emits in a group chat have no effect.** Streaming is 1:1 only by design. The bot here guards against this — group chats use the typed targeted‑message pattern.
- **Custom app upload disabled.** Ask a Teams admin to enable "Upload custom apps" in the Teams admin center, or use a Microsoft 365 dev tenant where it's on by default.

## Related

- React UI prototype: [`../`](../) — same scenarios, same mock data, served at [joeyglocke.github.io/relecloud-prototype](https://joeyglocke.github.io/relecloud-prototype/).
