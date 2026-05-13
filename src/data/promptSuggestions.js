// Keyed by agent contact id. Rendered as a 2x3 grid on the new-session empty
// state inside the chat canvas. `text` is what gets sent when the card is
// clicked; `response` is the canned agent reply that follows after a brief
// typing indicator.
//
// For Relecloud (id 34) the prompt cards skip the canned `response` field
// and instead carry a `streaming` block — the ChatView 1:1 streaming flow
// consumes markdown/citations/suggestedActions to deliver an AI-labeled
// response one character at a time.
export const promptSuggestions = {
  2: [
    {
      title: 'Explain a codebase',
      description: 'Get a high-level tour of an unfamiliar project.',
      text: 'Give me a high-level tour of this codebase — entry points, main modules, and how data flows.',
      response:
        'Happy to. To give you a useful tour, share the repo (or paste the top-level tree and the main entry file) and tell me what you\'re trying to do with it — onboard, add a feature, or debug. I\'ll walk through the entry points, how modules depend on each other, and the main data-flow paths.',
    },
    {
      title: 'Debug an issue',
      description: 'Walk through symptoms and find the root cause.',
      text: 'Help me debug an issue. I\'ll describe the symptoms — walk me through likely root causes.',
      response:
        'Go ahead — describe what you\'re seeing, what you expected, and any recent changes. If you have a stack trace, error message, or reproduction steps, paste those too. I\'ll suggest likely root causes in priority order and what to check to rule each out.',
    },
    {
      title: 'Design a system',
      description: 'Think through architecture trade-offs.',
      text: 'I need to design a new system. Help me think through the architecture and trade-offs.',
      response:
        'Let\'s start with the problem, not the tech. What is the system for, what are the hard constraints (scale, latency, consistency, cost, team size), and what has to integrate with it? Once I know that, I\'ll sketch a couple of options with the trade-offs called out so you can pick deliberately.',
    },
    {
      title: 'Refactor code',
      description: 'Suggest cleaner patterns for existing logic.',
      text: 'Review this code and suggest a cleaner refactor — I\'ll paste it in next.',
      response:
        'Paste the code whenever you\'re ready. Useful extra context: what this module is responsible for, which parts you feel are messy, and any constraints (public API to preserve, perf targets, test coverage). I\'ll flag the highest-leverage changes first instead of rewriting the whole thing.',
    },
    {
      title: 'Write test cases',
      description: 'Generate unit and integration tests.',
      text: 'Help me write unit and integration tests for a module I\'ll share.',
      response:
        'Sure — share the module and your test framework (Jest, Vitest, pytest, etc.). I\'ll cover the happy path, the edge cases that are easy to miss, and the failure modes. If integration tests need real infra (DB, HTTP), tell me what\'s available so I don\'t mock things you want to hit for real.',
    },
    {
      title: 'Draft release notes',
      description: 'Turn changes into readable release notes.',
      text: 'Draft release notes from a list of changes I\'ll provide.',
      response:
        'Paste the change list (commit messages, merged PRs, or a plain list) and tell me the audience — end users, customers, or engineers. I\'ll group by theme (features, fixes, breaking changes), rewrite for clarity, and keep the tone consistent with your previous releases if you share one.',
    },
  ],
  4: [
    {
      title: 'Show my open tickets',
      description: 'List tickets assigned to you across sprints.',
      text: 'Show me all open tickets assigned to me.',
      response:
        'You have 4 open tickets:\n\n• JIRA-4562 — Plugin sandbox file system isolation (High, In Progress, Sprint 14)\n• JIRA-4578 — TLS handshake timeout not respecting configured value (P1, In Progress, Sprint 14)\n• JIRA-4521 — Implement notification preference API endpoints (Medium, To Do, Sprint 14)\n• JIRA-4498 — Fix rate limiting on webhook delivery (Medium, In Progress, Sprint 13 carryover)\n\nWant me to open any of these, or re-prioritize?',
    },
    {
      title: 'Find blockers',
      description: 'Surface blockers for the current milestone.',
      text: 'What blockers are open for the current milestone?',
      response:
        'Found 2 open blockers for the April 25 milestone:\n\n• JIRA-4555 — Auth token refresh during agent handoff (High, assigned to Kevin Park, In Progress)\n• JIRA-4562 — Plugin sandbox file system isolation (High, assigned to you, In Progress)\n\nJIRA-4555 has 4 dependent tickets waiting on it. Want details on either?',
    },
    {
      title: 'Sprint status',
      description: 'Summarize velocity and completion.',
      text: 'Give me a status summary for the active sprint.',
      response:
        'Sprint 14 status (Day 6 of 10):\n\n• Completed: 18 of 36 story points (50%)\n• In Progress: 12 points across 5 tickets\n• Not Started: 6 points across 2 tickets\n• At risk: JIRA-4562 and JIRA-4578 (both blockers, both slipping)\n\nOn pace for ~32 points this sprint vs. 38 planned. Want a per-person breakdown?',
    },
    {
      title: 'Triage new bugs',
      description: 'Review recently filed issues.',
      text: 'Show me recently filed bugs that still need triage.',
      response:
        '3 bugs filed in the last 48 hours are still untriaged:\n\n• JIRA-4591 — "Agent handoff loses message context on slow connections" (no priority, no assignee)\n• JIRA-4590 — "Settings page scroll position jumps on tab switch" (no priority, no assignee)\n• JIRA-4588 — "Plugin sandbox allows write access to /tmp" (no priority, no assignee) — this one looks security-sensitive\n\nWant me to suggest priorities and owners?',
    },
    {
      title: 'Dependency check',
      description: 'Find tickets blocked by other work.',
      text: 'Which of my tickets are blocked by work in other teams?',
      response:
        '2 of your tickets are blocked by external teams:\n\n• JIRA-4521 (Notification preference API) — blocked by JIRA-4480 "Rate limiting dashboard" (Platform team, Kevin Park)\n• JIRA-4498 (Webhook rate limiting fix) — blocked by JIRA-4505 "Update infra limits config" (SRE team, unassigned)\n\nJIRA-4505 has been open 9 days with no assignee. Want me to escalate?',
    },
    {
      title: 'Release readiness',
      description: 'Check the checklist for the next release.',
      text: 'Run the release readiness checklist for the next version.',
      response:
        'v2.4 release readiness:\n\n✅ Feature tickets: 7 of 7 Done\n⚠️ Bug fixes: 4 of 5 Done (JIRA-4578 still In Progress)\n⚠️ QA sign-off: Pending — blocked on JIRA-4578\n✅ Staging deployment: Verified April 20\n✅ Load test: Passed (p99 = 178ms, target <200ms)\n⚠️ Docs: 1 of 2 articles updated\n\nTwo items in progress — both are feasible for the April 25 target if JIRA-4578 lands by tomorrow. Want me to check in with the owners?',
    },
  ],
  31: [
    {
      title: 'What changed recently',
      description: 'Recent edits across a Figma file or library.',
      text: 'What changed in the Northwind launch file in the last 24 hours?',
      response:
        'Northwind / Agents Platform v2 — Launch — 5 edits in the last 24h:\n\n• Sarah Chen — tightened body copy on Variant C empty state\n• Sarah Chen — swapped 4px → 8px corner radius on prompt cards\n• Sarah Chen — added 4 error-state variants (auth, rate-limit, expired, offline)\n• Auto-layout fix on the partner onboarding frame\n• 1 component instance detached on Step 4 (now reattached)',
    },
    {
      title: 'Find a component',
      description: 'Look up the latest published version + usage.',
      text: 'Find the latest version of the prompt-suggestion card component.',
      response:
        'Component: Card / Prompt Suggestion — v2.4 (published 4/21 by Sarah Chen).\n\nv2.4 changelog:\n• 8px corner radius (was 4px)\n• Hover lift reduced 4px → 2px\n• Title size 15 → 14\n\nUsed in 3 files, 18 instances.',
    },
    {
      title: 'Audit detached instances',
      description: 'Find component instances that broke from the library.',
      text: 'Audit detached component instances across the Northwind launch file.',
      response:
        '3 detached component instances:\n\n• Button / Primary — partner onboarding step 2\n• Toast / Info — session expired flow\n• Avatar / 32 — agents rail header\n\nWant me to flag them for Sarah?',
    },
    {
      title: 'Export an asset',
      description: 'Export a frame for a doc, blog post, or deck.',
      text: 'Export the variant C empty state at 2x for the launch blog.',
      response:
        'Exported variant-c-empty-state@2x.png (1840×1240). Dropped in the shared launch folder under /assets/blog/.',
    },
    {
      title: 'Token migration check',
      description: 'Find frames still using deprecated tokens.',
      text: 'Which frames are still using deprecated tokens?',
      response:
        '2 frames still reference deprecated tokens:\n\n• Settings / Notification preferences — uses color/legacy/surface-2\n• Onboarding / Step 4 — uses spacing/legacy/md\n\nBoth have one-token equivalents available. Apply automatically?',
    },
    {
      title: 'Compare library versions',
      description: 'Diff two versions of a component library.',
      text: 'Compare the v2.3 → v2.4 component library and list breaking renames.',
      response:
        'v2.3 → v2.4 component library diff:\n\nBreaking renames (3):\n• Button / Primary → Button / Filled (style API parity)\n• Card / Suggestion → Card / Prompt Suggestion (clarifies usage)\n• Toast / Error → Toast / Critical (severity scale rename)\n\nNon-breaking: 12 published edits, 0 removed components.',
    },
  ],
  34: [
    {
      title: 'Weather at Snoqualmie Pass',
      description: 'Will mid-May be clear enough for the offsite?',
      text: 'What\'s the weather typically like at Snoqualmie Pass in mid-May?',
      streaming: {
        markdown:
          'Mid-May at Snoqualmie Pass is usually clearing — most low-elevation snow is gone, but the pass itself can still see overnight slush through the second week [1].\n' +
          '\n' +
          '**What to expect for May 14–15:**\n' +
          '- Daytime highs **58–66°F** at the pass, low 70s at Suncadia [2]\n' +
          '- Average **3 days of light rain** that week — pack a shell, not a parka\n' +
          '- Roads are clear; chains not required after May 1 [3]\n' +
          '\n' +
          'Suncadia\'s outdoor fire pits and river float are usually open by then. If anyone\'s flying in, SEA-to-Suncadia is reliably 1h 20m that time of year — no weather margin needed.',
        citations: [
          {
            title: 'NOAA spring outlook — Cascades west slope',
            abstract: 'Seasonal temperature and precipitation forecast for the Snoqualmie Pass region, May–June 2026.',
            source: 'climate.noaa.gov · Spring outlook',
          },
          {
            title: 'Visit Suncadia — typical May conditions',
            abstract: 'Historical daytime highs, rainfall averages, and trail-open dates for the Cle Elum area.',
            source: 'destinationhotels.com/suncadia · Plan your visit',
          },
          {
            title: 'WSDOT — I-90 Snoqualmie Pass advisories',
            abstract: 'Year-round pass conditions, chain requirements, and seasonal road work updates.',
            source: 'wsdot.wa.gov · Mountain passes',
          },
        ],
        suggestedActions: [
          'Show me trail status for May',
          'What if it rains the whole time?',
          'Best venue for unpredictable weather',
        ],
      },
    },
    {
      title: 'Dietary options at Suncadia',
      description: 'Can the venue handle the team\'s restrictions?',
      text: 'Can Suncadia accommodate vegan, gluten-free, and nut allergies for a group of 7?',
      streaming: {
        markdown:
          'Yes — Suncadia handles all three routinely. Their group-dining menu is built around restriction flags submitted **14 days before arrival** [1].\n' +
          '\n' +
          '**What they confirmed for a group of 7:**\n' +
          '- Vegan: dedicated entrée per meal, separate prep surface [2]\n' +
          '- Gluten-free: full menu parallel (including breakfast pastries)\n' +
          '- Tree-nut allergy: kitchen is **nut-aware**, not nut-free — they\'ll flag any cross-contamination risk per dish [1]\n' +
          '\n' +
          'Recommend submitting the team\'s restrictions when you place the room block. They\'ll send a confirmation menu with restriction-flagged dishes ~7 days out.',
        citations: [
          {
            title: 'Suncadia group dining — dietary accommodations',
            abstract: 'Lead times, kitchen protocols, and a sample group menu with allergen flags.',
            source: 'destinationhotels.com/suncadia · Groups & meetings',
          },
          {
            title: 'Suncadia spring 2026 group menu',
            abstract: 'Three-meal-a-day menu rotation for groups, with vegan, GF, and dairy-free variants per course.',
            source: 'Suncadia event sales packet (PDF)',
          },
        ],
        suggestedActions: [
          'Reserve a tasting menu',
          'Compare Salish Lodge\'s dietary options',
          'Confirm allergen training certifications',
        ],
      },
    },
    {
      title: 'Driving from Seattle to Suncadia',
      description: 'Best route, stops, and timing.',
      text: 'What\'s the best driving route from Seattle to Suncadia for a Wednesday morning departure?',
      streaming: {
        markdown:
          'For a Wednesday morning the cleanest route is **I-90 East via Mercer Island and Issaquah** — about **1h 20m** door-to-door if you leave Seattle by 8:30 AM [1].\n' +
          '\n' +
          '**Timing notes:**\n' +
          '- Leave **before 7:30 AM** or **after 9:30 AM** to skip the Eastside commute squeeze\n' +
          '- One worthwhile pit stop: [Cle Elum Bakery](#) at exit 84 — 5 minutes off-route, popular with offsite groups [2]\n' +
          '- Parking at Suncadia is free, valet is $25/day — most groups skip valet\n' +
          '\n' +
          'Rough fuel cost (two SUVs): **$60–70 round-trip.** No tolls on this route.',
        citations: [
          {
            title: 'WSDOT — I-90 typical travel times',
            abstract: 'Average drive times Seattle → Cle Elum by departure hour, updated quarterly.',
            source: 'wsdot.wa.gov · Travel times',
          },
          {
            title: 'Cle Elum Bakery — visitor reviews',
            abstract: 'Local bakery 5 minutes off I-90 at exit 84, popular with corporate groups en route to Suncadia.',
            source: 'tripadvisor.com · Cle Elum',
          },
        ],
        suggestedActions: [
          'Send a driving brief to the team',
          'Compare flights for out-of-town attendees',
          'Reserve two SUVs for Wed–Fri',
        ],
      },
    },
    {
      title: 'Activities for 2-day offsite',
      description: 'Mix of working sessions and team bonding.',
      text: 'Suggest a balanced 2-day activity plan for a 7-person product offsite at Suncadia.',
      streaming: {
        markdown:
          'A balanced 2-day mix — **two working blocks** plus one shared experience per evening so the team bonds without it feeling forced.\n' +
          '\n' +
          '### Day 1 — Wednesday\n' +
          '- **9:00–12:00** — v2 retro + v2.1 roadmap in the Cascade conference room [1]\n' +
          '- **12:30** — Lunch on the deck (weather permitting)\n' +
          '- **2:00–5:00** — Working block: north-star metrics, then deep-dive on agent handoff scope\n' +
          '- **6:30** — Group dinner at **Portals** (on-property) — vegan + GF accommodated [2]\n' +
          '\n' +
          '### Day 2 — Thursday\n' +
          '- **9:00–11:30** — Prioritization session for the next quarter\n' +
          '- **11:30–1:00** — Optional: **river float** with the Cascade Outfitters group — 90 min, low-effort, includes lunch [3]\n' +
          '- **2:00–4:00** — Wrap: commitments, owners, kickoff for v2.1 sprint 1\n' +
          '- **4:00** — Pack up, depart for Seattle (back by 6:00 PM)\n' +
          '\n' +
          'Want me to draft the agenda doc or send a hold to Suncadia\'s events team?',
        citations: [
          {
            title: 'Suncadia Cascade conference room — capacity & layout',
            abstract: 'Seats 12, whiteboard wall, daylight on three sides, AV included.',
            source: 'destinationhotels.com/suncadia · Meeting spaces',
          },
          {
            title: 'Portals at Suncadia — group dinner menu',
            abstract: 'Three-course group menu with full vegan and gluten-free coverage. Bookable up to a party of 14.',
            source: 'destinationhotels.com/suncadia · Dining',
          },
          {
            title: 'Cascade Outfitters — group river float',
            abstract: '90-minute guided float on the Yakima River with included box lunch; departs from Suncadia.',
            source: 'cascadeoutfitters.com · Group trips',
          },
        ],
        suggestedActions: [
          'Draft the agenda doc',
          'Send a hold to Suncadia events',
          'Build a shared travel doc',
        ],
      },
    },
  ],
  32: [
    {
      title: 'Prep for a meeting',
      description: 'Brief, follow-up draft, and key context.',
      text: 'Prep me for my next partner readout — one-page brief, draft follow-up email, and key open questions.',
      response:
        'Plan ready: aggregate context (last 30 days of channels/email/tracker), draft a one-page brief in Word, draft a follow-up email in Outlook (saves to drafts), and surface open questions inline. Estimated runtime ~4 minutes. Approve to run, or tell me what to change.',
    },
    {
      title: 'Audit my calendar',
      description: 'Resolve conflicts, protect focus time.',
      text: 'Audit my calendar for tomorrow. Decline anything I\'m not the decision-maker on; protect 2–4 PM as deep work.',
      response:
        'Plan ready: 11 meetings reviewed, 1 conflict found, 2 low-priority candidates flagged, 2:00–4:00 PM focus block proposed. I\'ll send polite "follow up async" notes on the declines. Approve to apply, or edit the plan.',
    },
    {
      title: 'Compile research',
      description: 'Web + internal sources, with citations.',
      text: 'Compile a one-pager on agent handoff benchmarks across the industry. Internal + public sources, with citations.',
      response:
        'Plan ready: pull internal staging data and CA working-group thread, plus 5 external sources (Vendor X benchmark, Vendor Y whitepaper, 2 Forrester notes, 1 Gartner mention). Output a one-page Word summary with inline citations and a 5-row comparison table. ~2 minutes. Approve to run.',
    },
    {
      title: 'Build a launch plan',
      description: 'Competitive view, value prop, milestones.',
      text: 'Build a launch plan for the cross-tenant v3 capability — competitive analysis, value prop, milestone outline with owners.',
      response:
        'Plan ready: 4 deliverables — competitive analysis (Excel), value-prop one-pager (Word), pitch deck skeleton (PowerPoint), milestone outline with proposed owners (Word). I\'ll cite all internal sources. Estimated runtime ~6 minutes. Approve to run, or scope down.',
    },
    {
      title: 'Summarize a workstream',
      description: 'Catch up across channels, email, and docs.',
      text: 'Give me a daily digest of what\'s moving on the Northwind launch — channels, partner email threads, and pending decisions.',
      response:
        'Plan ready: scan Northwind launch channel + 3 partner email threads + readiness tracker for the last 24h. Output a 5-bullet digest grouped by theme (decisions pending · risks · wins · blockers · FYI). Run as a daily 7 AM job? Or one-time?',
    },
    {
      title: 'Draft a follow-up email',
      description: 'From a meeting or thread, with action items.',
      text: 'Draft a follow-up email from this week\'s Northwind launch sync — recap, action items, owners.',
      response:
        'Plan ready: pull meeting notes + chat thread, draft an email with 3 sections (recap, action items with owners + dates, open questions). Saves to Outlook drafts so you can review before sending. ~1 minute. Approve to run.',
    },
  ],
}
