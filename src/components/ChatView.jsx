import { useState, useEffect, useRef, useCallback } from 'react'
import {
  messagesByContact,
  contacts,
  favorites,
  projectNorthwind,
  chatList,
  channelPostsByContact,
  sessionMessages,
  promptSuggestions,
  copilotAgent,
  designerAgent,
  pollyAgent,
  breakthuAgent,
} from '../data'
import { TypingIndicator } from './common'
import MessageRow from './MessageRow'
import SessionsRail from './SessionsRail'
import AgentsRail from './AgentsRail'
import PromptSuggestions from './PromptSuggestions'
import ChannelThreadRail from './ChannelThreadRail'
import ChatHeader from './ChatHeader'
import Compose from './Compose'
import './ChatView.css'

// Convert a channel post (root + replies) into the message shape MessageRow
// expects, attaching a threadReply badge built from the replies' unique
// senders. Replies themselves are not shown in the main canvas — clicking the
// badge opens ChannelThreadRail.
function postToMessage(post) {
  const replyCount = post.replies?.length || 0
  if (!replyCount) return { ...post }
  const seen = new Set()
  const participantIds = []
  for (const r of post.replies) {
    if (seen.has(r.senderId)) continue
    seen.add(r.senderId)
    participantIds.push(r.senderId)
    if (participantIds.length === 3) break
  }
  return { ...post, threadReply: { participantIds, count: replyCount } }
}

function parseDraft(d) {
  // Recognized slash-command mentions for the prototype: Jira (disabled
  // demo) and Relecloud (active demo). Match the canonical mention name so
  // the pill renders as "/Relecloud" / "/Jira" regardless of input casing.
  const slashMentions = { jira: 'Jira', relecloud: 'Relecloud' }
  const m = d.match(/^\/([A-Za-z]+)\b\s*/)
  if (m && slashMentions[m[1].toLowerCase()]) {
    return { mention: slashMentions[m[1].toLowerCase()], text: d.slice(m[0].length) }
  }
  return { mention: null, text: d }
}

// ── Relecloud demo flow ────────────────────────────────────────────────
// The Relecloud agent (contact id 34) lives in the "Northwind kickoff
// offsite" group (id 35). When the user sends a `/Relecloud …` message
// there, the message is rendered as a targeted (private) message, the bot
// reacts, and a markdown reply lands as another targeted message with a
// "Post to chat" action that promotes the content to the whole group.
const RELECLOUD_AGENT_ID = 34
const RELECLOUD_DEMO_CHAT_ID = 35

const relecloudReply = {
  reactionEmoji: '👀',
  markdown:
    '## Three offsite venues near Seattle\n' +
    '\n' +
    'Pulled options that fit 7 people, 2 nights in mid-May, with real meeting space (not a hotel boardroom).\n' +
    '\n' +
    '### Salish Lodge & Spa — *Snoqualmie Falls* [1]\n' +
    '- ~30 min drive from Seattle, easiest logistics\n' +
    '- **$2,940/night** group block · 7 rooms held\n' +
    '- Dedicated team room with whiteboards, fireplace lounge for evenings\n' +
    '- [Check availability May 12–13](#)\n' +
    '\n' +
    '### Suncadia Resort — *Cle Elum* [2]\n' +
    '- 1h 20m drive, more "leave town" feel\n' +
    '- **$2,440/night** group block · 2-bedroom suites\n' +
    '- Full conference center + hiking trails, fire pits, optional river float\n' +
    '- [Check availability May 14–15](#)\n' +
    '\n' +
    '### Roche Harbor Resort — *San Juan Island* [3]\n' +
    '- 3h via ferry, longer travel day but a real milestone trip\n' +
    '- **$3,180/night** waterfront cottages\n' +
    '- Sea kayaking, sunset dinner cruise, quietest of the three\n' +
    '- [Check availability May 19–20](#)\n' +
    '\n' +
    'My pick: **Suncadia.** Best balance of drive time, cost, and dedicated meeting space — and the off-site feel is stronger than Salish. Want me to draft a 2-day itinerary?',
  citations: [
    {
      title: 'Salish Lodge & Spa — group rates & meeting rooms',
      abstract: 'Group block pricing, meeting-room inventory, and seasonal availability for May 2026.',
      source: 'salishlodge.com · Groups',
    },
    {
      title: 'Suncadia Resort — corporate retreats',
      abstract: 'Conference-center floorplan, 2-bedroom suite layout, and weekday group rates for spring 2026.',
      source: 'destinationhotels.com/suncadia',
    },
    {
      title: 'Roche Harbor Resort — meetings & events',
      abstract: 'Waterfront cottage availability, ferry-day logistics, and dinner-cruise add-on pricing.',
      source: 'rocheharbor.com · Groups',
    },
  ],
  suggestedActions: [
    'Draft a 2-day Suncadia itinerary',
    'Compare flights vs. driving',
    'Send a hold request to Suncadia',
  ],
}

// ── Scripted Jira demo flow (disabled) ─────────────────────────────────────
// Kept as a reference pattern for scripted agent flows. Flip JIRA_FLOW_ENABLED
// and restore the `draft: '/Jira …'` entry in chatList to re-enable. See
// CLAUDE.md for policy on this flow.
const JIRA_FLOW_ENABLED = false

const jiraScript = [
  {
    text: 'You have 1 blocker for the April 25 milestone — the PR is in review with all signoffs and CI passing. Want me to merge it?',
    link: {
      source: 'jira',
      title: 'Handle delegation timeout during agent handoff',
      subtitle: 'JIRA-4552 · In review · Due April 22',
      url: '#',
    },
    seed: 'Yes',
  },
  {
    text: 'Merged — here\'s the PR:',
    link: {
      source: 'github',
      title: 'Handle delegation timeout during agent handoff',
      subtitle: 'teams/agent-handoff #4552 · Merged',
      url: '#',
    },
    seed: null,
  },
]

export default function ChatView({
  activeChatId,
  onSelectChat,
  sessions,
  addSession,
  updateSession,
  updateSessionMessages,
  dynamicSessionMessages,
  navIntent,
  clearNavIntent,
}) {
  const activeContact = contacts.find((c) => c.id === activeChatId)
  const baseMessages = messagesByContact[activeChatId] || []
  const participantCount = activeContact.isGroup || activeContact.isChannel
    ? activeContact.memberCount ?? new Set(baseMessages.map((m) => m.senderId)).size
    : 2
  const allChats = [...favorites, ...projectNorthwind, ...chatList]
  const chatEntry = allChats.find((c) => c.contactId === activeChatId)
  const draft = chatEntry?.draft || ''
  const parsedDraft = parseDraft(draft)

  const isAgent = activeContact.isAgent && !activeContact.isGroup
  const isChannel = !!activeContact.isChannel
  const isGroup = !!activeContact.isGroup
  const channelPosts = isChannel ? channelPostsByContact[activeChatId] || [] : null
  const hasSessions = isAgent && sessions[activeChatId]

  const [extraMessages, setExtraMessages] = useState({})
  const [inputValue, setInputValue] = useState(parsedDraft.text)
  const [composeMention, setComposeMention] = useState(parsedDraft.mention)
  const [showSessions, setShowSessions] = useState(hasSessions)
  const [showAgents, setShowAgents] = useState(false)
  const [selectedRailAgent, setSelectedRailAgent] = useState(null)
  const [agentChatMessages, setAgentChatMessages] = useState({})
  const [railComposeHint, setRailComposeHint] = useState(null)
  const [railTypingAgentId, setRailTypingAgentId] = useState(null)
  const [railJiraStep, setRailJiraStep] = useState(0)
  const [jiraGroupSessionId, setJiraGroupSessionId] = useState(null)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [jiraThreadAnchorId, setJiraThreadAnchorId] = useState(null)
  const [mainTypingAgentId, setMainTypingAgentId] = useState(null)
  // Tracks which chat the current typing indicator belongs to so an agent
  // typing in a group chat (Relecloud in chat 35) doesn't get filtered out
  // by the legacy "mainTypingAgentId === activeChatId" check that assumed
  // typing only happens in 1:1 agent chats.
  const [mainTypingChatId, setMainTypingChatId] = useState(null)
  // Streaming state for the Relecloud 1:1. The ref carries the full target
  // markdown + position; the state slot triggers the streaming effect.
  // Per the Teams SDK, streaming is 1:1-only — don't reuse this in groups.
  const streamingRef = useRef(null)
  const [streamingKey, setStreamingKey] = useState(null)
  const [channelThreadPostId, setChannelThreadPostId] = useState(null)
  const [threadRailOpen, setThreadRailOpen] = useState(false)
  const [highlightMessageId, setHighlightMessageId] = useState(null)
  const messagesEndRef = useRef(null)

  // Reset per-chat ephemeral state when activeChatId changes. Using the
  // render-phase state-adjustment pattern (rather than useEffect) avoids the
  // cascade-render warning and lands the new state in the first paint.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [chatIdCursor, setChatIdCursor] = useState(activeChatId)
  const [navIntentCursor, setNavIntentCursor] = useState(navIntent)
  if (chatIdCursor !== activeChatId) {
    setChatIdCursor(activeChatId)
    setInputValue(parsedDraft.text)
    setComposeMention(parsedDraft.mention)
    setShowAgents(false)
    setSelectedRailAgent(null)
    setRailJiraStep(0)
    setRailComposeHint(null)
    setRailTypingAgentId(null)
    setJiraThreadAnchorId(null)
    setChannelThreadPostId(null)
    setThreadRailOpen(false)
    setHighlightMessageId(null)
    const intentMatches = navIntent && navIntent.chatId === activeChatId
    const intentHasSession = intentMatches && 'sessionId' in navIntent
    if (intentHasSession) {
      setShowSessions(true)
      setActiveSessionId(navIntent.sessionId || null)
    } else {
      setShowSessions(!!hasSessions)
      const agentSessionList = sessions[activeChatId]
      setActiveSessionId(agentSessionList?.length > 0 ? agentSessionList[0].id : null)
    }
    if (intentMatches && navIntent.channelThreadPostId) {
      setChannelThreadPostId(navIntent.channelThreadPostId)
      setThreadRailOpen(true)
    }
    if (intentMatches && navIntent.highlightMessageId) {
      setHighlightMessageId(navIntent.highlightMessageId)
    }
    if (intentMatches) clearNavIntent()
  } else if (navIntent !== navIntentCursor && navIntent?.chatId === activeChatId) {
    setNavIntentCursor(navIntent)
    if ('sessionId' in navIntent) {
      setShowSessions(true)
      if (navIntent.sessionId) setActiveSessionId(navIntent.sessionId)
    }
    if (navIntent.channelThreadPostId) {
      setChannelThreadPostId(navIntent.channelThreadPostId)
      setThreadRailOpen(true)
    }
    if (navIntent.highlightMessageId) {
      setHighlightMessageId(navIntent.highlightMessageId)
    }
    clearNavIntent()
  }

  useEffect(() => {
    if (highlightMessageId) {
      // Activity-navigation: scroll the triggering message into view and
      // flash it briefly so the user sees where the notification landed.
      const el = document.querySelector(
        `[data-message-id="${CSS.escape(String(highlightMessageId))}"]`
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('message-row-highlight')
        const t = setTimeout(() => {
          el.classList.remove('message-row-highlight')
          setHighlightMessageId(null)
        }, 1800)
        return () => clearTimeout(t)
      }
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [extraMessages, activeChatId, activeSessionId, mainTypingAgentId, highlightMessageId])

  // Mirror the rail's Jira thread messages back into the source chat's
  // session so the conversation is discoverable from Jira's sessions list.
  useEffect(() => {
    if (!jiraGroupSessionId) return
    const msgs = agentChatMessages[4] || []
    const converted = msgs
      .filter((m) => !String(m.id).startsWith('intro-'))
      .map((m) => ({
        id: m.id,
        senderId: m.from === 'me' ? 'me' : 4,
        text: m.text,
        time: m.time,
        link: m.link,
      }))
    updateSessionMessages(jiraGroupSessionId, converted)
  }, [agentChatMessages, jiraGroupSessionId, updateSessionMessages])

  const sessionMsgs = activeSessionId && (dynamicSessionMessages[activeSessionId] || sessionMessages[activeSessionId])
  const displayBaseMessages = sessionMsgs || baseMessages
  // Per-session bucket for in-canvas messages so switching to a new pending
  // session starts with a blank canvas instead of inheriting the previous
  // session's messages. Non-session chats fall back to the chat id.
  const canvasKey = activeSessionId || activeChatId
  const messages = [...displayBaseMessages, ...(extraMessages[canvasKey] || [])]
  // Messages with `replies` arrays power the threads list/detail view in
  // group chats. Channels use channelPosts for the same purpose.
  const groupThreadablePosts = isGroup ? messages.filter((m) => m.replies?.length > 0) : []

  const activeSession = hasSessions && sessions[activeChatId]?.find((s) => s.id === activeSessionId)
  const sourceChat = activeSession?.sourceChatId ? contacts.find((c) => c.id === activeSession.sourceChatId) : null

  const { agentsInConversation, recommendedAgents } = (() => {
    if (activeChatId === 11) {
      const jira = contacts.find((c) => c.id === 4)
      return {
        agentsInConversation: [copilotAgent, jira, designerAgent],
        recommendedAgents: [pollyAgent, breakthuAgent],
      }
    }
    const agentsById = new Map(contacts.filter((c) => c.isAgent).map((a) => [a.id, a]))
    const agentsByName = new Map(contacts.filter((c) => c.isAgent).map((a) => [a.name.toLowerCase(), a]))
    const found = new Map()
    if (activeContact.isAgent) found.set(activeContact.id, activeContact)
    for (const m of baseMessages) {
      if (agentsById.has(m.senderId)) found.set(m.senderId, agentsById.get(m.senderId))
      if (Array.isArray(m.text)) {
        for (const part of m.text) {
          if (part && typeof part === 'object' && part.type === 'mention') {
            const agent = agentsByName.get(part.name.toLowerCase())
            if (agent) found.set(agent.id, agent)
          }
        }
      }
    }
    return { agentsInConversation: Array.from(found.values()), recommendedAgents: [] }
  })()

  const handleNewSession = () => {
    // Only one pending "New conversation" per agent — if one already exists,
    // just switch to it instead of creating another. It becomes a real session
    // once the user sends their first message (see finalizePendingSession).
    const existingPending = (sessions[activeChatId] || []).find((s) => s.isPending)
    if (existingPending) {
      setActiveSessionId(existingPending.id)
      return
    }
    const now = new Date()
    const sessionId = `s-new-${Date.now()}`
    const newSession = {
      id: sessionId,
      name: 'New conversation',
      time: now.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      preview: '',
      isPending: true,
    }
    addSession(activeChatId, newSession, [])
    setActiveSessionId(sessionId)
  }

  const finalizePendingSession = (firstText, nameHint) => {
    if (!isAgent || !activeSessionId) return
    const current = (sessions[activeChatId] || []).find((s) => s.id === activeSessionId)
    if (!current?.isPending) return
    const trimmed = String(firstText || '').trim()
    const name = (nameHint && nameHint.trim()) || trimmed.slice(0, 60) || 'New conversation'
    const preview = trimmed.slice(0, 100)
    const now = new Date()
    updateSession(activeChatId, activeSessionId, {
      name,
      preview,
      time: now.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      isPending: false,
    })
  }

  const nowTimeStr = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const selectRailAgent = (agent) => {
    setSelectedRailAgent(agent)
    if (agent && !agentChatMessages[agent.id]) {
      const intro = {
        id: `intro-${agent.id}`,
        from: 'agent',
        text: `Hi! I'm ${agent.name}. Ask me anything in the context of ${activeContact.name}.`,
        time: nowTimeStr(),
      }
      setAgentChatMessages((prev) => ({ ...prev, [agent.id]: [intro] }))
    }
  }

  const bumpThreadReply = (anchorId, participantId) => {
    if (!anchorId) return
    setExtraMessages((prev) => {
      const list = prev[activeChatId] || []
      if (!list.some((m) => m.id === anchorId)) return prev
      return {
        ...prev,
        [activeChatId]: list.map((m) => {
          if (m.id !== anchorId) return m
          const existingIds = m.threadReply?.participantIds || []
          const participantIds = existingIds.includes(participantId)
            ? existingIds
            : [...existingIds, participantId]
          return {
            ...m,
            threadReply: {
              participantIds,
              count: (m.threadReply?.count || 0) + 1,
            },
          }
        }),
      }
    })
  }

  const scheduleJiraResponse = (index, anchorIdOverride) => {
    if (index < 0 || index >= jiraScript.length) return
    // Callers that just queued a setJiraThreadAnchorId in the same tick pass
    // the id explicitly; otherwise fall back to the latest committed state.
    const anchorId = anchorIdOverride ?? jiraThreadAnchorId
    setRailTypingAgentId(4)
    setTimeout(() => {
      const step = jiraScript[index]
      const jiraMsg = {
        id: `l2j-${Date.now()}`,
        from: 'agent',
        text: step.text,
        link: step.link,
        time: nowTimeStr(),
      }
      setAgentChatMessages((prev) => ({ ...prev, [4]: [...(prev[4] || []), jiraMsg] }))
      setRailTypingAgentId(null)
      setRailComposeHint(step.seed ? { agentId: 4, text: step.seed } : null)
      setRailJiraStep(index + 1)
      bumpThreadReply(anchorId, 4)

      if (index === jiraScript.length - 1) {
        setInputValue('Had 1 blocker, but just merged the fix — all set now!')
        setComposeMention(null)
      }
    }, 3200)
  }

  const sendInRail = (text) => {
    if (!selectedRailAgent) return
    const agentId = selectedRailAgent.id
    setAgentChatMessages((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), { id: `l2-${Date.now()}`, from: 'me', text, time: nowTimeStr() }],
    }))
    setRailComposeHint(null)
    // User replies on the Jira thread count too (and pull the current user's
    // avatar into the reply indicator).
    if (agentId === 4) bumpThreadReply(jiraThreadAnchorId, 'me')
    if (agentId === 4 && railJiraStep > 0 && railJiraStep < jiraScript.length) {
      scheduleJiraResponse(railJiraStep)
    }
  }

  const openJiraThread = () => {
    // The reply indicator acts as a toggle: if the rail is already showing
    // the Jira thread, collapse it; otherwise open it on Jira.
    if (showAgents && selectedRailAgent?.id === 4) {
      setShowAgents(false)
      return
    }
    const jira = contacts.find((c) => c.id === 4)
    if (!jira) return
    setSelectedRailAgent(jira)
    setShowAgents(true)
  }

  const startJiraDemoFlow = (sentText) => {
    const parts = []
    let remaining = sentText
    const regex = /\/Jira/i
    let match
    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > 0) parts.push(remaining.slice(0, match.index))
      parts.push({ type: 'mention', name: 'Jira' })
      remaining = remaining.slice(match.index + match[0].length)
    }
    if (remaining) parts.push(remaining)
    const messageText = parts.length > 1 || typeof parts[0] !== 'string' ? parts : sentText

    const userTime = nowTimeStr()
    const userMsgId = `thread-u-${Date.now()}`

    // The user's message is the anchor of a new thread in the main canvas.
    // It's flagged private so the bubble shows the "Only you can see this
    // conversation" disclaimer and the subtle gray border — both indicate
    // the thread is visible only to the user and the agent.
    setExtraMessages((prev) => ({
      ...prev,
      [activeChatId]: [
        ...(prev[activeChatId] || []),
        { id: userMsgId, senderId: 'me', text: messageText, time: userTime, isPrivate: true },
      ],
    }))
    setJiraThreadAnchorId(userMsgId)

    // Seed the rail thread so it shows the anchor at the top when it opens.
    setAgentChatMessages((prev) => ({
      ...prev,
      4: [{ id: userMsgId, from: 'me', text: messageText, time: userTime }],
    }))

    // Create the session so the thread is discoverable later from Jira's
    // sessions list.
    const jira = contacts.find((c) => c.id === 4)
    const now = new Date()
    const sessionId = `s4-group-${Date.now()}`
    const previewText = Array.isArray(messageText)
      ? messageText.map((p) => (typeof p === 'string' ? p : `/${p.name}`)).join('')
      : messageText
    const sessionName = previewText.replace(/^\/?jira\s*/i, '').trim().slice(0, 60) || 'Blocker discussion'
    addSession(4, {
      id: sessionId,
      name: sessionName,
      time: now.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      preview: previewText,
      sourceChatId: activeChatId,
    })
    setJiraGroupSessionId(sessionId)

    // Open the rail with Jira selected and start the reply.
    setSelectedRailAgent(jira)
    setShowAgents(true)
    scheduleJiraResponse(0, userMsgId)
  }

  // ── Relecloud demo flow handlers ──────────────────────────────────────
  // Adds a reaction emoji to a message already in extraMessages for the
  // current chat. Used to seed the bot's reaction on the user's slash-
  // command message — visualizes "the agent saw your targeted ask".
  const addReactionToMessage = (chatId, msgId, emoji) => {
    setExtraMessages((prev) => {
      const list = prev[chatId] || []
      return {
        ...prev,
        [chatId]: list.map((m) => {
          if (m.id !== msgId) return m
          const existing = m.reactions || []
          const found = existing.find((r) => r.emoji === emoji)
          const reactions = found
            ? existing.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r))
            : [...existing, { emoji, count: 1 }]
          return { ...m, reactions }
        }),
      }
    })
  }

  const startRelecloudDemoFlow = (sentText) => {
    const chatId = activeChatId
    const userMsgId = `rc-u-${Date.now()}`
    const userTime = nowTimeStr()
    // Render the user's slash command as a styled mention pill + remaining text,
    // matching the existing "/Jira ..." pattern.
    const trimmed = sentText.trim()
    const stripped = trimmed.replace(/^\/Relecloud\s*/i, '')
    const messageText = [{ type: 'mention', name: 'Relecloud' }, stripped ? ' ' + stripped : '']

    // Targeted message: only the user + Relecloud can see this exchange.
    // `privateWithAgentId` swaps the disclaimer text to name the agent.
    setExtraMessages((prev) => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] || []),
        {
          id: userMsgId,
          senderId: 'me',
          text: messageText,
          time: userTime,
          isPrivate: true,
          privateWithAgentId: RELECLOUD_AGENT_ID,
        },
      ],
    }))

    // Step 1 — bot reacts to the targeted ask after a short beat.
    setTimeout(() => addReactionToMessage(chatId, userMsgId, relecloudReply.reactionEmoji), 700)

    // Step 2 — bot starts typing.
    setTimeout(() => {
      setMainTypingAgentId(RELECLOUD_AGENT_ID)
      setMainTypingChatId(chatId)
    }, 1400)

    // Step 3 — bot replies in a targeted markdown message with a "Post to chat" action.
    // Includes AI metadata: ai-generated label, citations, and suggested actions.
    setTimeout(() => {
      setMainTypingAgentId((prev) => (prev === RELECLOUD_AGENT_ID ? null : prev))
      setMainTypingChatId((prev) => (prev === chatId ? null : prev))
      setExtraMessages((prev) => ({
        ...prev,
        [chatId]: [
          ...(prev[chatId] || []),
          {
            id: `rc-r-${Date.now()}`,
            senderId: RELECLOUD_AGENT_ID,
            markdown: relecloudReply.markdown,
            time: nowTimeStr(),
            isPrivate: true,
            privateWithAgentId: RELECLOUD_AGENT_ID,
            canPromote: true,
            aiGenerated: true,
            citations: relecloudReply.citations,
            suggestedActions: relecloudReply.suggestedActions,
          },
        ],
      }))
    }, 3600)
  }

  const promoteMessage = (message) => {
    if (!message?.markdown) return
    const chatId = activeChatId
    setExtraMessages((prev) => ({
      ...prev,
      [chatId]: [
        // Mark the original private reply as promoted so the action row
        // swaps to the "Posted to chat" confirmation.
        ...(prev[chatId] || []).map((m) =>
          m.id === message.id ? { ...m, promoted: true } : m
        ),
        // Append the same content as a regular (non-private) message from
        // the current user, attributed to the source agent. AI metadata
        // travels with the content — it's still AI-generated and the
        // citations + feedback are just as relevant in the public copy.
        {
          id: `promoted-${Date.now()}`,
          senderId: 'me',
          markdown: message.markdown,
          time: nowTimeStr(),
          sharedFromAgentId: RELECLOUD_AGENT_ID,
          aiGenerated: true,
          citations: message.citations,
          suggestedActions: message.suggestedActions,
        },
      ],
    }))
  }

  // ── Streaming engine (Relecloud 1:1) ───────────────────────────────────
  // Per Microsoft's docs, streaming is supported in 1:1 conversations only,
  // not group chats. The engine adds a placeholder message with markdown:''
  // and streaming:true, then ticks the markdown forward one character at a
  // time. When the target text is fully revealed, the placeholder is
  // finalized with the supplied AI metadata (aiGenerated, citations,
  // suggestedActions) — that's what flips the message into its "finished"
  // visual state (label, references list, feedback, suggested-action chips).
  const startStreaming = useCallback(({ chatId, fullMarkdown, finalize }) => {
    const messageId = `rc-stream-${Date.now()}`
    setExtraMessages((prev) => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] || []),
        {
          id: messageId,
          senderId: RELECLOUD_AGENT_ID,
          markdown: '',
          time: nowTimeStr(),
          streaming: true,
        },
      ],
    }))
    streamingRef.current = { chatId, messageId, fullMarkdown, charIndex: 0, finalize }
    setStreamingKey(messageId)
  }, [])

  useEffect(() => {
    if (!streamingKey) return
    const tick = setInterval(() => {
      const s = streamingRef.current
      if (!s) { clearInterval(tick); return }
      // Reveal a few characters per tick — fast enough to feel real-time
      // but slow enough to register as streaming, not as a paste.
      const advance = 3
      const next = Math.min(s.charIndex + advance, s.fullMarkdown.length)
      s.charIndex = next
      const partial = s.fullMarkdown.slice(0, next)
      const done = next >= s.fullMarkdown.length
      setExtraMessages((prev) => ({
        ...prev,
        [s.chatId]: (prev[s.chatId] || []).map((m) =>
          m.id === s.messageId
            ? done
              ? { ...m, markdown: partial, streaming: false, ...s.finalize }
              : { ...m, markdown: partial }
            : m
        ),
      }))
      if (done) {
        clearInterval(tick)
        streamingRef.current = null
        setStreamingKey(null)
      }
    }, 28)
    return () => clearInterval(tick)
  }, [streamingKey])

  const handleSend = () => {
    if (!composeMention && !inputValue.trim()) return

    const chatId = activeChatId
    const bucket = canvasKey
    const sentText = composeMention
      ? `/${composeMention}${inputValue ? ' ' + inputValue.trimStart() : ''}`
      : inputValue
    setInputValue('')
    setComposeMention(null)

    const isJiraInvocation = JIRA_FLOW_ENABLED && chatId === 11 && sentText.toLowerCase().includes('jira')
    if (isJiraInvocation) {
      startJiraDemoFlow(sentText)
      return
    }

    const isRelecloudInvocation =
      chatId === RELECLOUD_DEMO_CHAT_ID && /^\/relecloud\b/i.test(sentText.trim())
    if (isRelecloudInvocation) {
      startRelecloudDemoFlow(sentText)
      return
    }

    const myMessage = {
      id: `extra-${Date.now()}`,
      senderId: 'me',
      text: sentText,
      time: nowTimeStr(),
    }
    setExtraMessages((prev) => ({
      ...prev,
      [bucket]: [...(prev[bucket] || []), myMessage],
    }))
    finalizePendingSession(sentText)

    // Sarah Chen (id 1) scripted auto-response — exercises the typing
    // indicator flow end-to-end from a regular 1:1 chat.
    if (chatId === 1) {
      setMainTypingAgentId(chatId)
      setMainTypingChatId(chatId)
      setTimeout(() => {
        setMainTypingAgentId((prev) => (prev === chatId ? null : prev))
        setMainTypingChatId((prev) => (prev === chatId ? null : prev))
        setExtraMessages((prev) => ({
          ...prev,
          [bucket]: [...(prev[bucket] || []), {
            id: `sarah-reply-${Date.now()}`,
            senderId: 1,
            text: 'got it — taking a look now, will ping you in a bit',
            time: nowTimeStr(),
          }],
        }))
      }, 2000)
    }
  }

  const sendPromptSuggestion = (suggestion) => {
    const chatId = activeChatId
    const bucket = canvasKey
    const myMessage = {
      id: `extra-${Date.now()}`,
      senderId: 'me',
      text: suggestion.text,
      time: nowTimeStr(),
    }
    setExtraMessages((prev) => ({
      ...prev,
      [bucket]: [...(prev[bucket] || []), myMessage],
    }))
    finalizePendingSession(suggestion.text, suggestion.title)

    // Relecloud 1:1 — when a prompt card carries a `streaming` block, use
    // the streaming engine instead of the typing-then-canned-response path.
    // This is the 1:1-only streaming surface (per Teams SDK docs).
    if (chatId === RELECLOUD_AGENT_ID && suggestion.streaming) {
      // Brief beat after the user's message before the stream starts —
      // mimics the "thinking" pause real assistants show.
      setTimeout(() => {
        startStreaming({
          chatId,
          fullMarkdown: suggestion.streaming.markdown,
          finalize: {
            aiGenerated: true,
            citations: suggestion.streaming.citations,
            suggestedActions: suggestion.streaming.suggestedActions,
          },
        })
      }, 500)
      return
    }

    // Typing indicator then the prepared response.
    setMainTypingAgentId(chatId)
    setMainTypingChatId(chatId)
    const delay = 2000 + Math.floor(Math.random() * 1000)
    setTimeout(() => {
      setMainTypingAgentId((prev) => (prev === chatId ? null : prev))
      setMainTypingChatId((prev) => (prev === chatId ? null : prev))
      const agentMessage = {
        id: `extra-${Date.now()}-r`,
        senderId: chatId,
        text: suggestion.response,
        time: nowTimeStr(),
      }
      setExtraMessages((prev) => ({
        ...prev,
        [bucket]: [...(prev[bucket] || []), agentMessage],
      }))
    }, delay)
  }

  const agentSuggestions = isAgent ? promptSuggestions[activeChatId] : null
  const showPromptSuggestions =
    !!agentSuggestions && messages.length === 0 && mainTypingChatId !== activeChatId

  return (
    <div className="chat-view">
      <div className="chat-view-main">
        <ChatHeader
          activeContact={activeContact}
          isChannel={isChannel}
          isGroup={isGroup}
          participantCount={participantCount}
          hasSessions={hasSessions}
          showSessions={showSessions}
          onToggleSessions={() => setShowSessions((prev) => !prev)}
          showThreads={threadRailOpen && channelThreadPostId === null}
          onToggleThreads={() => {
            if (threadRailOpen && channelThreadPostId === null) {
              setThreadRailOpen(false)
            } else {
              setChannelThreadPostId(null)
              setThreadRailOpen(true)
            }
          }}
        />

        <div className="chat-messages">
          {isChannel ? (
            <div className="messages-container messages-container-channel">
              {channelPosts.map((post) => (
                <MessageRow
                  key={post.id}
                  message={postToMessage(post)}
                  activeContact={activeContact}
                  onOpenThread={() => {
                    if (threadRailOpen && channelThreadPostId === post.id) {
                      setThreadRailOpen(false)
                      setChannelThreadPostId(null)
                    } else {
                      setChannelThreadPostId(post.id)
                      setThreadRailOpen(true)
                    }
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : showPromptSuggestions ? (
            <PromptSuggestions
              agent={activeContact}
              suggestions={agentSuggestions}
              onSelectPrompt={sendPromptSuggestion}
            />
          ) : (
            <div className="messages-container">
              {sourceChat && (
                <div className="session-source-banner">
                  Started conversation from{' '}
                  <a
                    className="session-source-banner-link"
                    href="#"
                    onClick={(e) => { e.preventDefault(); onSelectChat(sourceChat.id) }}
                  >{sourceChat.name}</a>
                  <br />
                  Recent context from the conversation has been shared with this session.
                </div>
              )}
              {messages.map((msg) => {
                const isThreaded = isGroup && msg.replies?.length > 0
                return (
                  <MessageRow
                    key={msg.id}
                    message={isThreaded ? postToMessage(msg) : msg}
                    activeContact={activeContact}
                    onPromote={promoteMessage}
                    onOpenThread={isThreaded ? () => {
                      if (threadRailOpen && channelThreadPostId === msg.id) {
                        setThreadRailOpen(false)
                        setChannelThreadPostId(null)
                      } else {
                        setChannelThreadPostId(msg.id)
                        setThreadRailOpen(true)
                      }
                    } : openJiraThread}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="chat-compose-area">
          {mainTypingChatId === activeChatId && mainTypingAgentId && (
            <TypingIndicator
              contact={
                mainTypingAgentId === activeContact.id
                  ? activeContact
                  : contacts.find((c) => c.id === mainTypingAgentId) || activeContact
              }
              className="chat-compose-typing"
            />
          )}
          <Compose
            value={inputValue}
            mention={composeMention}
            onChange={setInputValue}
            onClearMention={() => setComposeMention(null)}
            onSend={handleSend}
            isChannel={isChannel}
          />
        </div>
      </div>

      {showSessions && (
        <SessionsRail
          sessions={sessions[activeChatId] || []}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onClose={() => setShowSessions(false)}
          onNewSession={handleNewSession}
        />
      )}
      {showAgents && (
        <AgentsRail
          agents={agentsInConversation}
          recommended={recommendedAgents}
          selectedAgent={selectedRailAgent}
          onSelectAgent={selectRailAgent}
          messages={selectedRailAgent ? agentChatMessages[selectedRailAgent.id] || [] : []}
          onSendMessage={sendInRail}
          composeHint={railComposeHint}
          typingAgentId={railTypingAgentId}
          onClose={() => setShowAgents(false)}
        />
      )}
      {threadRailOpen && (
        <ChannelThreadRail
          posts={isChannel ? channelPosts : groupThreadablePosts}
          initialPostId={channelThreadPostId}
          activeContact={activeContact}
          onClose={() => {
            setThreadRailOpen(false)
            setChannelThreadPostId(null)
          }}
        />
      )}
    </div>
  )
}
