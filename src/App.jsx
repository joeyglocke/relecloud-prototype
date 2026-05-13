import { useState, useCallback } from 'react'
import { agentSessions as initialSessions, activityEvents as seedActivityEvents } from './data'
import NavRail from './components/NavRail'
import ChatList from './components/ChatList'
import ChatView from './components/ChatView'
import ActivityList from './components/ActivityList'
import TitleBar from './components/TitleBar'
import { FreModal } from './components/common'
import './App.css'

export default function App() {
  const [activeView, setActiveView] = useState('chat') // 'chat' | 'activity'
  // Open the Relecloud demo group (id 35) by default so the prototype lands
  // ready to send the `/Relecloud` draft on first load.
  const [activeChatId, setActiveChatId] = useState(35)
  const [readChatIds, setReadChatIds] = useState(() => new Set([35]))
  const [sessions, setSessions] = useState(initialSessions)
  const [dynamicSessionMessages, setDynamicSessionMessages] = useState({})
  // Activity feed: persist which events the user has opened so unread decorations clear.
  const [activityEvents, setActivityEvents] = useState(seedActivityEvents)
  const [activeActivityId, setActiveActivityId] = useState(null)
  // When navigating to a chat, optionally tell ChatView to open a specific
  // session (sessions rail), open a specific channel thread, or flash a
  // specific message so the user can see where a notification landed.
  const [navIntent, setNavIntent] = useState(null)
  // FRE shows on every load while iterating on the prototype — dismiss only
  // hides it for the current session. Swap to localStorage gating later if a
  // real first-run-only behavior is needed.
  const [showFre, setShowFre] = useState(true)

  const dismissFre = useCallback(() => setShowFre(false), [])

  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId)
    setReadChatIds(prev => (prev.has(chatId) ? prev : new Set(prev).add(chatId)))
  }, [])

  const navigateToChat = useCallback((chatId, { showSessions, sessionId } = {}) => {
    selectChat(chatId)
    if (showSessions) setNavIntent({ chatId, sessionId: sessionId || null })
  }, [selectChat])

  const clearNavIntent = useCallback(() => setNavIntent(null), [])

  const addSession = useCallback((agentId, session, messages) => {
    setSessions(prev => ({
      ...prev,
      [agentId]: [session, ...(prev[agentId] || [])],
    }))
    if (messages) {
      setDynamicSessionMessages(prev => ({ ...prev, [session.id]: messages }))
    }
  }, [])

  const updateSession = useCallback((agentId, sessionId, updates) => {
    setSessions(prev => ({
      ...prev,
      [agentId]: (prev[agentId] || []).map(s =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    }))
  }, [])

  const updateSessionMessages = useCallback((sessionId, messages) => {
    setDynamicSessionMessages(prev => ({ ...prev, [sessionId]: messages }))
  }, [])

  const selectActivity = useCallback((event) => {
    setActiveActivityId(event.id)
    setActivityEvents(prev =>
      prev.map(e => (e.id === event.id && e.unread ? { ...e, unread: false } : e))
    )
    setActiveChatId(event.chatId)
    setReadChatIds(prev => (prev.has(event.chatId) ? prev : new Set(prev).add(event.chatId)))
    setNavIntent({
      chatId: event.chatId,
      channelThreadPostId: event.postId || null,
      highlightMessageId: event.messageId || null,
    })
  }, [])

  const activityUnreadCount = activityEvents.reduce((n, e) => n + (e.unread ? 1 : 0), 0)

  return (
    <div className="app">
      <TitleBar onShowFre={() => setShowFre(true)} />
      <div className="app-body">
        <NavRail
          activeView={activeView}
          onSelectView={setActiveView}
          activityUnreadCount={activityUnreadCount}
        />
        {activeView === 'activity' ? (
          <ActivityList
            events={activityEvents}
            activeEventId={activeActivityId}
            onSelectEvent={selectActivity}
          />
        ) : (
          <ChatList
            activeChatId={activeChatId}
            onSelectChat={selectChat}
            readChatIds={readChatIds}
          />
        )}
        <ChatView
          activeChatId={activeChatId}
          onSelectChat={navigateToChat}
          sessions={sessions}
          addSession={addSession}
          updateSession={updateSession}
          updateSessionMessages={updateSessionMessages}
          dynamicSessionMessages={dynamicSessionMessages}
          navIntent={navIntent}
          clearNavIntent={clearNavIntent}
        />
      </div>
      {showFre && (
        <FreModal
          title="Meet Relecloud"
          subtitle="A prototype showcasing seven modern UX investments the Teams SDK now offers — across a group chat and a 1:1 with Relecloud, the new travel concierge agent."
          onDismiss={dismissFre}
          dismissLabel="Start the demo"
        >
          <h3 className="fre-section-title">The scenario</h3>
          <p>
            You're Alex Morgan, planning a 2-day post-launch offsite with the
            Northwind core team. Rachel asked for a venue shortlist in the
            group; rather than crowd the chat with half-baked options, you
            quietly ask Relecloud for help — first targeted-in-group, then 1:1.
          </p>

          <h3 className="fre-section-title">Part 1 — Group chat: targeted ask → promote-to-chat</h3>
          <p>
            Hit <strong>Send</strong> on the preloaded
            <strong> /Relecloud </strong>
            draft. Five things fire in sequence:
          </p>
          <div className="fre-feature-list">
            <div className="fre-feature">
              <span className="fre-feature-check">1</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Targeted message</div>
                <div className="fre-feature-desc">
                  Your slash command lands as a private bubble — only you and
                  Relecloud can see it.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">2</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Reaction acknowledgement</div>
                <div className="fre-feature-desc">
                  Relecloud reacts <span aria-hidden="true">👀</span> on your
                  ask to signal it's working.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">3</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Markdown reply with AI label, citations &amp; feedback</div>
                <div className="fre-feature-desc">
                  A targeted markdown response — headings, bullets, bold,
                  links — with a sparkle <strong>AI-generated</strong> label,
                  inline <strong>[1]</strong> citation markers (hover for the
                  source), a References list, suggested actions, and thumbs
                  up/down feedback.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">4</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Promote to chat</div>
                <div className="fre-feature-desc">
                  Click <strong>Post to chat</strong> to share Relecloud's
                  reply with the group — attributed as "Shared from Relecloud."
                  The AI label and citations carry over.
                </div>
              </div>
            </div>
          </div>

          <h3 className="fre-section-title">Part 2 — 1:1 with Relecloud: streaming UX</h3>
          <p>
            Open the <strong>Relecloud</strong> chat in the sidebar and click
            one of the prompt suggestion cards. Per the Teams SDK, streaming
            is supported in 1:1 conversations only.
          </p>
          <div className="fre-feature-list">
            <div className="fre-feature">
              <span className="fre-feature-check">5</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Token-by-token streaming</div>
                <div className="fre-feature-desc">
                  Relecloud's response builds up incrementally with a blinking
                  caret — long answers feel responsive from the first word.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">6</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Citations + feedback land on completion</div>
                <div className="fre-feature-desc">
                  Once the stream finishes, the AI label, hoverable citations,
                  References list, and thumbs up/down attach to the message —
                  matching the prescribed Teams agent message pattern.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">7</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Suggested follow-ups</div>
                <div className="fre-feature-desc">
                  Each response ends with a row of suggested next-step chips,
                  matching the SDK's <code>withSuggestedActions</code> pattern.
                </div>
              </div>
            </div>
          </div>

          <p className="fre-modal-footnote">
            All data is mocked. Relecloud, Northwind Traders, and the persona
            are fictional. Built on the Microsoft Teams Shell.
          </p>
        </FreModal>
      )}
    </div>
  )
}
