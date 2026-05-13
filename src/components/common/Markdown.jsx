import './Markdown.css'

// Small purpose-built markdown renderer for agent-authored messages.
// Supports the subset needed for prototype showcases: headings (#, ##, ###),
// bold (**...**), italic (*...* / _..._), inline code (`...`), bullet lists
// (- / *), blockquotes (> ...), links ([text](url)), and citation markers
// ([N] where N is digits, not followed by `(` — distinguishes from links).
//
// Deliberately not pulling in `react-markdown` — this is ~120 lines, no extra
// runtime dependency, and trivial to extend when a real markdown surface gets
// promoted out of the prototype.

// Alternation order matters: the link form `[text](url)` must come before
// the bare `[N]` citation form, so a `[1](url)` token is consumed as a link.
const INLINE = /(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(`[^`\n]+`)|(\[[^\]]+\]\([^)]+\))|(\[\d{1,3}\])/g

function CitationMarker({ n, citation }) {
  if (!citation) {
    // Streaming state — the markdown text contains the marker but the
    // citations array hasn't been attached yet. Render as dim plain text.
    return <sup className="md-citation-marker md-citation-marker-pending">[{n}]</sup>
  }
  return (
    <span className="md-citation-wrap">
      <sup className="md-citation-marker" tabIndex={0} aria-label={`Citation ${n}: ${citation.title}`}>
        [{n}]
      </sup>
      <span className="md-citation-popover" role="tooltip">
        <span className="md-citation-popover-label">Citation {n}</span>
        <span className="md-citation-popover-title">{citation.title}</span>
        {citation.abstract && (
          <span className="md-citation-popover-abstract">{citation.abstract}</span>
        )}
        {citation.source && (
          <span className="md-citation-popover-source">{citation.source}</span>
        )}
      </span>
    </span>
  )
}

function renderInline(text, citations, keyPrefix = '') {
  const out = []
  let last = 0
  let m
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const k = `${keyPrefix}-${m.index}`
    if (tok.startsWith('**')) {
      out.push(<strong key={k}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*') || tok.startsWith('_')) {
      out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    } else if (tok.startsWith('`')) {
      out.push(<code key={k} className="md-code">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('[') && tok.includes('](')) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)
      if (lm) {
        out.push(
          <a key={k} className="md-link" href={lm[2]} target="_blank" rel="noopener noreferrer">
            {lm[1]}
          </a>
        )
      } else {
        out.push(tok)
      }
    } else if (tok.startsWith('[')) {
      // Bare [N] — citation marker. Look up the citation (1-indexed).
      const n = parseInt(tok.slice(1, -1), 10)
      const citation = citations?.[n - 1]
      out.push(<CitationMarker key={k} n={n} citation={citation} />)
    }
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function parseBlocks(md) {
  const lines = md.split('\n')
  const blocks = []
  let para = []
  let list = null
  let quote = null

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'p', lines: para }); para = [] }
  }
  const flushList = () => {
    if (list) { blocks.push(list); list = null }
  }
  const flushQuote = () => {
    if (quote) { blocks.push(quote); quote = null }
  }
  const flushAll = () => { flushPara(); flushList(); flushQuote() }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) { flushAll(); continue }

    const h = /^(#{1,3})\s+(.+)$/.exec(line)
    if (h) {
      flushAll()
      blocks.push({ type: `h${h[1].length}`, text: h[2] })
      continue
    }
    const li = /^[-*]\s+(.+)$/.exec(line)
    if (li) {
      flushPara(); flushQuote()
      if (!list) list = { type: 'ul', items: [] }
      list.items.push(li[1])
      continue
    }
    const bq = /^>\s?(.*)$/.exec(line)
    if (bq) {
      flushPara(); flushList()
      if (!quote) quote = { type: 'bq', lines: [] }
      quote.lines.push(bq[1])
      continue
    }
    flushList(); flushQuote()
    para.push(line)
  }
  flushAll()
  return blocks
}

export default function Markdown({ source, citations }) {
  if (!source) return null
  const blocks = parseBlocks(source)
  return (
    <div className="md-content">
      {blocks.map((b, i) => {
        if (b.type === 'h1') return <h2 key={i} className="md-h md-h1">{renderInline(b.text, citations, `h${i}`)}</h2>
        if (b.type === 'h2') return <h3 key={i} className="md-h md-h2">{renderInline(b.text, citations, `h${i}`)}</h3>
        if (b.type === 'h3') return <h4 key={i} className="md-h md-h3">{renderInline(b.text, citations, `h${i}`)}</h4>
        if (b.type === 'p') {
          return (
            <p key={i} className="md-p">
              {b.lines.flatMap((l, j) => {
                const inline = renderInline(l, citations, `p${i}-${j}`)
                return j === 0 ? inline : [<br key={`br-${i}-${j}`} />, ...inline]
              })}
            </p>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="md-ul">
              {b.items.map((it, j) => (
                <li key={j} className="md-li">{renderInline(it, citations, `li${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === 'bq') {
          return (
            <blockquote key={i} className="md-blockquote">
              {b.lines.map((l, j) => (
                <span key={j}>{j > 0 && <br />}{renderInline(l, citations, `bq${i}-${j}`)}</span>
              ))}
            </blockquote>
          )
        }
        return null
      })}
    </div>
  )
}
