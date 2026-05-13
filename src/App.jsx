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
          subtitle="A prototype of a Teams agent showcasing the modern UX investments the Teams SDK now offers — targeted messages, reactions, markdown, and promote-to-chat."
          onDismiss={dismissFre}
          dismissLabel="Start the demo"
        >
          <h3 className="fre-section-title">The scenario</h3>
          <p>
            You're Alex Morgan, planning a 2-day post-launch offsite with the
            Northwind core team. Rachel kicked off the thread asking for a
            venue shortlist. Rather than crowd the group with half-baked
            options, you quietly ask Relecloud — the new Teams travel
            concierge agent — for help.
          </p>

          <h3 className="fre-section-title">What to look for</h3>
          <p>
            The chat opens with a draft already in the compose box: a
            <strong> /Relecloud </strong> slash command. Hit <strong>Send</strong>
            and watch the four investments fire in sequence:
          </p>
          <div className="fre-feature-list">
            <div className="fre-feature">
              <span className="fre-feature-check">1</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Targeted message</div>
                <div className="fre-feature-desc">
                  Your slash command lands as a private bubble — only you and
                  Relecloud can see it. The lock disclaimer names the agent
                  explicitly.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">2</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Reaction acknowledgement</div>
                <div className="fre-feature-desc">
                  Relecloud reacts <span aria-hidden="true">👀</span> on your
                  message to signal it's working — no extra "got it" bubble
                  needed.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">3</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Markdown reply</div>
                <div className="fre-feature-desc">
                  Relecloud responds in another targeted bubble using real
                  markdown — headings, bullets, bold, italics, links — so
                  scannable structured content feels native to chat.
                </div>
              </div>
            </div>
            <div className="fre-feature">
              <span className="fre-feature-check">4</span>
              <div className="fre-feature-text">
                <div className="fre-feature-title">Promote to chat</div>
                <div className="fre-feature-desc">
                  Click <strong>Post to chat</strong> on Relecloud's reply to
                  share it with the whole group — attributed as
                  "Shared from Relecloud" so everyone can see where it came
                  from. Try reacting to it once it lands.
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
