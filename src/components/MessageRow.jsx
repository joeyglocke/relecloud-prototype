import { useState } from 'react'
import { agentLogos } from '../shared/agentLogos'
import { contacts, currentUser } from '../data/contacts'
import { Avatar, LinkCard, PrivateDisclaimer, Check, ChainOfThought, Markdown } from './common'
import MessageActions from './MessageActions'

// Office-app icon tiles for adaptive cards that represent generated artifacts.
// Letter + brand color is enough at this scale; swap in real Fluent app glyphs
// later if needed.
const CARD_ICONS = {
  word:       { letter: 'W', bg: '#2B579A' },
  excel:      { letter: 'X', bg: '#217346' },
  powerpoint: { letter: 'P', bg: '#B7472A' },
  outlook:    { letter: 'O', bg: '#0078D4' },
  teams:      { letter: 'T', bg: '#5B5FC7' },
}

function CardIcon({ type }) {
  const cfg = CARD_ICONS[type]
  if (!cfg) return null
  return <div className="card-icon" style={{ background: cfg.bg }}>{cfg.letter}</div>
}

// File extensions per type, used to suffix the displayed filename so it
// reads "Brief.docx" but the stored `name` stays clean.
const FILE_EXTENSIONS = {
  word: '.docx',
  excel: '.xlsx',
  powerpoint: '.pptx',
}

const base = import.meta.env.BASE_URL

// Teams-style file artifact card: app logo + filename / visibility subtitle.
// Compact horizontal layout that mirrors `LinkCard` (Figma/Jira/GitHub) so
// shared files and shared links read as the same family of attachment.
function FileCard({ card }) {
  const ext = FILE_EXTENSIONS[card.fileType] || ''
  return (
    <div className={`file-card file-card-${card.fileType}`}>
      <img
        className="file-card-logo"
        src={`${base}file-icons/${card.fileType}.png`}
        alt=""
      />
      <div className="file-card-text">
        <div className="file-card-title">{card.name}{ext}</div>
        <div className="file-card-subtitle">{card.subtitle}</div>
      </div>
    </div>
  )
}

function CardBadge({ text, tone = 'neutral' }) {
  return <span className={`card-badge card-badge-${tone}`}>{text}</span>
}

function CardSteps({ steps }) {
  return (
    <ol className="card-steps">
      {steps.map((step, i) => (
        <li key={i} className={`card-step card-step-${step.status || 'pending'}`}>
          <span className="card-step-marker" aria-hidden="true">
            {step.status === 'done' ? <Check size={11} /> : i + 1}
          </span>
          <span className="card-step-text">{step.text}</span>
        </li>
      ))}
    </ol>
  )
}

function CardFacts({ facts }) {
  return (
    <div className="card-facts">
      {facts.map((fact, j) => (
        <span key={j} className="card-fact">
          <span className="card-fact-label">{fact.label}:</span> {fact.value}
        </span>
      ))}
    </div>
  )
}

function CardMetrics({ metrics }) {
  return (
    <div className="card-metrics">
      {metrics.map((m, j) => (
        <div key={j} className="card-metric">
          <div className="card-metric-value">{m.value}</div>
          <div className="card-metric-label">{m.label}</div>
          {m.delta && (
            <div className={`card-metric-delta card-metric-delta-${m.deltaTone || 'neutral'}`}>
              {m.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CardBars({ bars }) {
  const max = bars.reduce((acc, b) => Math.max(acc, b.value), 0) || 1
  return (
    <div className="card-bars">
      {bars.map((bar, j) => (
        <div key={j} className="card-bar-row">
          <div className="card-bar-label">{bar.label}</div>
          <div className="card-bar-track">
            <div
              className="card-bar-fill"
              style={{ width: `${(bar.value / max) * 100}%`, background: bar.color || undefined }}
            />
          </div>
          <div className="card-bar-value">{bar.valueLabel || bar.value}</div>
        </div>
      ))}
    </div>
  )
}

// Sparkle icon used to denote AI-generated content. Inline SVG kept local
// since it's only used in this surface and matches the Fluent "sparkle"
// glyph Teams uses for Copilot/AI bylines.
function AiSparkle({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M9.06 1.31a.5.5 0 0 0-.95 0l-.86 2.58a2 2 0 0 1-1.36 1.36l-2.58.86a.5.5 0 0 0 0 .95l2.58.86a2 2 0 0 1 1.36 1.36l.86 2.58a.5.5 0 0 0 .95 0l.86-2.58a2 2 0 0 1 1.36-1.36l2.58-.86a.5.5 0 0 0 0-.95l-2.58-.86a2 2 0 0 1-1.36-1.36l-.86-2.58zM13.5 11.5a.5.5 0 0 0-.95 0l-.18.54a1 1 0 0 1-.63.63l-.54.18a.5.5 0 0 0 0 .95l.54.18a1 1 0 0 1 .63.63l.18.54a.5.5 0 0 0 .95 0l.18-.54a1 1 0 0 1 .63-.63l.54-.18a.5.5 0 0 0 0-.95l-.54-.18a1 1 0 0 1-.63-.63l-.18-.54z" />
    </svg>
  )
}

// Thumbs up / down for the feedback row. Uses outline by default and flips
// to filled + accent color when active.
function ThumbIcon({ direction, filled, size = 14 }) {
  const stroke = filled ? 'none' : 'currentColor'
  const fill = filled ? 'currentColor' : 'none'
  const path = direction === 'up'
    ? 'M5 9.5v7H3.5A.5.5 0 0 1 3 16V10a.5.5 0 0 1 .5-.5H5zm1.5-1V16a1.5 1.5 0 0 0 1.5 1.5h5.31a2 2 0 0 0 1.97-1.66l.94-5.5A1.5 1.5 0 0 0 14.74 8.5H11V4a2 2 0 0 0-3.87-.7L6.5 5.66V8.5z'
    : 'M5 10.5v-7H3.5A.5.5 0 0 0 3 4v6a.5.5 0 0 0 .5.5H5zm1.5 1V4A1.5 1.5 0 0 1 8 2.5h5.31a2 2 0 0 1 1.97 1.66l.94 5.5A1.5 1.5 0 0 1 14.74 11.5H11V16a2 2 0 0 1-3.87.7L6.5 14.34V11.5z'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function AiMetaRow({ feedback, onFeedback }) {
  return (
    <div className="ai-meta-row">
      <span className="ai-meta-label">
        <AiSparkle size={11} />
        AI-generated
        <span className="ai-meta-tooltip" role="tooltip">AI-generated content. Verify important info.</span>
      </span>
      <span className="ai-meta-divider" aria-hidden="true">·</span>
      <span className="ai-feedback">
        <span className="ai-feedback-label">How was this response?</span>
        <button
          type="button"
          className={`ai-feedback-btn ${feedback === 'up' ? 'ai-feedback-btn-active' : ''}`}
          aria-pressed={feedback === 'up'}
          aria-label="Thumbs up — this response was helpful"
          onClick={() => onFeedback(feedback === 'up' ? null : 'up')}
        >
          <ThumbIcon direction="up" filled={feedback === 'up'} />
        </button>
        <button
          type="button"
          className={`ai-feedback-btn ${feedback === 'down' ? 'ai-feedback-btn-active' : ''}`}
          aria-pressed={feedback === 'down'}
          aria-label="Thumbs down — this response was not helpful"
          onClick={() => onFeedback(feedback === 'down' ? null : 'down')}
        >
          <ThumbIcon direction="down" filled={feedback === 'down'} />
        </button>
      </span>
    </div>
  )
}

function ReferencesList({ citations }) {
  if (!citations || !citations.length) return null
  return (
    <div className="ai-references">
      <div className="ai-references-label">References</div>
      <ol className="ai-references-list">
        {citations.map((c, i) => (
          <li key={i} className="ai-reference-item">
            <span className="ai-reference-num">[{i + 1}]</span>
            <span className="ai-reference-body">
              <span className="ai-reference-title">{c.title}</span>
              {c.source && <span className="ai-reference-source">{c.source}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function SuggestedActions({ actions, onAction }) {
  if (!actions || !actions.length) return null
  return (
    <div className="ai-suggested-actions">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          className="ai-suggested-action"
          onClick={() => onAction?.(a, i)}
        >
          {typeof a === 'string' ? a : a.label}
        </button>
      ))}
    </div>
  )
}

// Combine seeded-in-data reactions with the current user's reactions into an
// ordered list of pills. `byMe: true` → purple outline in the UI.
function buildReactionList(baseReactions, myEmojis) {
  const map = new Map()
  for (const r of baseReactions || []) {
    map.set(r.emoji, { emoji: r.emoji, count: r.count, byMe: false })
  }
  for (const emoji of myEmojis) {
    const existing = map.get(emoji)
    if (existing) {
      map.set(emoji, { ...existing, count: existing.count + 1, byMe: true })
    } else {
      map.set(emoji, { emoji, count: 1, byMe: true })
    }
  }
  return [...map.values()]
}

function ThreadReplyBadge({ reply, onClick }) {
  const ids = reply.participantIds || (reply.agentId ? [reply.agentId] : [])
  const participants = ids
    .map((id) => (id === 'me' ? currentUser : contacts.find((c) => c.id === id)))
    .filter(Boolean)
  if (!participants.length) return null
  const label = reply.count === 1 ? '1 reply' : `${reply.count} replies`
  return (
    <button type="button" className="message-thread-replies" onClick={onClick}>
      <span className="message-thread-replies-avatars">
        {participants.map((p, i) => (
          <span
            key={i}
            className="message-thread-replies-avatar"
            style={{ background: p.avatar ? 'transparent' : p.color || '#6264A7' }}
          >
            {p.avatar ? (
              <img src={p.avatar} alt="" />
            ) : p.isAgent ? (
              agentLogos[p.logo](10)
            ) : (
              p.initials
            )}
          </span>
        ))}
      </span>
      <span className="message-thread-replies-label">{label}</span>
    </button>
  )
}

// Inline avatar for the small "Shared from <Agent>" attribution strip atop a
// promoted message — small color tile + (logo | initials) — kept local since
// it's narrower than the full Avatar component and isn't reused elsewhere yet.
function AgentChip({ agentId }) {
  const agent = contacts.find((c) => c.id === agentId)
  if (!agent) return null
  return (
    <span className="shared-from-chip" style={{ background: agent.color }}>
      {agent.logo && agentLogos[agent.logo]
        ? agentLogos[agent.logo](10)
        : <span className="shared-from-chip-initials">{agent.initials}</span>}
    </span>
  )
}

export default function MessageRow({ message, activeContact, onOpenThread, onPromote, onSuggestedAction }) {
  const isMe = message.senderId === 'me'
  const isMultiParty = activeContact.isGroup || activeContact.isChannel
  const sender = isMe
    ? currentUser
    : isMultiParty
      ? contacts.find(c => c.id === message.senderId)
      : activeContact

  const [myReactions, setMyReactions] = useState(() => new Set())
  const toggleReaction = (emoji) => {
    setMyReactions(prev => {
      const next = new Set(prev)
      if (next.has(emoji)) next.delete(emoji)
      else next.add(emoji)
      return next
    })
  }
  const reactions = buildReactionList(message.reactions, myReactions)

  // Local feedback state — thumbs up / down on AI messages. Per-message,
  // not persisted across reloads; that's enough for the prototype.
  const [feedback, setFeedback] = useState(null)
  const showAiChrome = message.aiGenerated && !message.streaming

  return (
    <div
      className={`message-row ${isMe ? 'message-mine' : ''}`}
      data-message-id={message.id}
    >
      {!isMe && (
        <div className="message-avatar-col">
          <Avatar contact={sender} size={32} />
        </div>
      )}
      <div className="message-content-wrap">
        <div className="message-meta">
          {!isMe && <span className="message-sender-name">{sender.name}</span>}
          <span className="message-timestamp">{message.time}</span>
        </div>
        <div className={`message-bubble ${message.isPrivate ? 'message-bubble-private' : ''}`}>
          <MessageActions onReact={toggleReaction} />
          {message.isPrivate && (
            <PrivateDisclaimer
              text={
                message.privateWithAgentId
                  ? `Only you and ${
                      contacts.find((c) => c.id === message.privateWithAgentId)?.name || 'this agent'
                    } can see this conversation`
                  : undefined
              }
            />
          )}
          {message.sharedFromAgentId && (
            <div className="shared-from-strip">
              <AgentChip agentId={message.sharedFromAgentId} />
              <span className="shared-from-label">
                Shared from{' '}
                <span className="shared-from-name">
                  {contacts.find((c) => c.id === message.sharedFromAgentId)?.name}
                </span>
              </span>
            </div>
          )}
          {message.forwardedFrom && (
            <div className="forwarded-message">
              <div className="forwarded-sender">{message.forwardedFrom.sender}</div>
              <div className="forwarded-text">{message.forwardedFrom.text}</div>
            </div>
          )}
          {message.subject && <div className="message-subject">{message.subject}</div>}
          {message.markdown || message.streaming ? (
            <>
              {message.markdown && (
                <Markdown source={message.markdown} citations={message.citations} />
              )}
              {message.streaming && <span className="md-cursor" aria-hidden="true" />}
            </>
          ) : Array.isArray(message.text)
            ? message.text.map((part, i) =>
                typeof part === 'string' ? part : <span key={i} className="mention">{part.name}</span>
              )
            : message.text}
          {showAiChrome && message.citations && (
            <ReferencesList citations={message.citations} />
          )}
          {showAiChrome && message.suggestedActions && (
            <SuggestedActions
              actions={message.suggestedActions}
              onAction={(a, i) => onSuggestedAction?.(message, a, i)}
            />
          )}
          {showAiChrome && (
            <AiMetaRow feedback={feedback} onFeedback={setFeedback} />
          )}
          {message.link && <LinkCard link={message.link} />}
          {message.cards && (
            <div className="message-cards">
              {message.cards.map((card, i) => card.type === 'file' ? (
                <FileCard key={i} card={card} />
              ) : (
                <div key={i} className="adaptive-card" style={{ borderLeftColor: card.accentColor }}>
                  {/* Header: optional icon + title/subtitle row + optional badge. */}
                  <div className="card-header">
                    {card.iconType && <CardIcon type={card.iconType} />}
                    <div className="card-header-text">
                      <div className="card-title-row">
                        <span className="card-title">{card.title}</span>
                        {card.badge && <CardBadge {...card.badge} />}
                      </div>
                      {card.subtitle && <div className="card-subtitle">{card.subtitle}</div>}
                    </div>
                  </div>

                  {/* Plan steps with status pips. */}
                  {card.steps && <CardSteps steps={card.steps} />}

                  {/* KPI tiles — value + label + optional delta. */}
                  {card.metrics && <CardMetrics metrics={card.metrics} />}

                  {/* Horizontal bar chart — auto-scaled to the largest value. */}
                  {card.bars && <CardBars bars={card.bars} />}

                  {/* Grouped sections with optional headings + facts/bullets/text. */}
                  {card.sections && (
                    <div className="card-sections">
                      {card.sections.map((section, j) => (
                        <div key={j} className="card-section">
                          {section.heading && <div className="card-section-heading">{section.heading}</div>}
                          {section.text && <div className="card-section-text">{section.text}</div>}
                          {section.facts && <CardFacts facts={section.facts} />}
                          {section.bullets && (
                            <ul className="card-bullets">
                              {section.bullets.map((b, k) => <li key={k}>{b}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flat facts at card root (legacy + still useful). */}
                  {card.facts && <CardFacts facts={card.facts} />}

                  {/* Subtle metadata footer (e.g. "Generated by Cowork · 4:31 PM"). */}
                  {card.footer && <div className="card-footer">{card.footer}</div>}

                  {/* Action row. */}
                  {card.actions && (
                    <div className="card-actions">
                      {card.actions.map((action, j) => (
                        <button key={j} className="card-action-btn">{action}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {message.chainOfThought && (
            <ChainOfThought steps={message.chainOfThought} />
          )}
          {message.canPromote && !message.promoted && (
            <div className="promote-action-row">
              <button
                type="button"
                className="promote-btn"
                onClick={() => onPromote?.(message)}
                aria-label="Post this reply to the group chat"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 17l14-7L3 3v5l10 2L3 12z" />
                </svg>
                Post to chat
              </button>
              <span className="promote-hint">Share this reply with the rest of the group</span>
            </div>
          )}
          {message.promoted && (
            <div className="promote-action-row promote-action-row-done">
              <span className="promote-done">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 10l4 4 8-9" />
                </svg>
                Posted to chat
              </span>
            </div>
          )}
        </div>
        {reactions.length > 0 && (
          <div className="message-reactions-bar">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={`reaction-pill ${r.byMe ? 'reaction-pill-mine' : ''}`}
                onClick={() => toggleReaction(r.emoji)}
                aria-label={`${r.byMe ? 'Remove' : 'Add'} reaction ${r.emoji}`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {r.count > 1 && <span className="reaction-pill-count">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
        {message.threadReply && (
          <ThreadReplyBadge
            reply={message.threadReply}
            onClick={() => onOpenThread?.(message)}
          />
        )}
      </div>
      {isMe && isMultiParty && (
        <div className="message-avatar-col">
          <Avatar contact={currentUser} size={32} />
        </div>
      )}
    </div>
  )
}
