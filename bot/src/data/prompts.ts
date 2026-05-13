import type { Citation } from './venues.js';

// Four prompt cards that drive the 1:1 streaming demo. Each card maps a
// user-clickable title to a `markdown` body that gets streamed in via
// `stream.emit()` — plus the citations and suggested-action chips that
// attach when the stream finishes.
//
// The shapes mirror the React prototype's `promptSuggestions[34]`
// exactly so the UX is recognizable from one surface to the other.

export type StreamingPrompt = {
  /** Short title shown on the prompt chip in the welcome message. */
  title: string;
  /** What the user "sends" when they click — also the trigger phrase. */
  text: string;
  /** Markdown body streamed back, with [1]/[2]/[3] citation markers. */
  markdown: string;
  /** Citation cards — index matches the marker number in the markdown. */
  citations: Citation[];
  /** Follow-up chips attached after streaming completes. */
  suggestedActions: string[];
};

export const STREAMING_PROMPTS: StreamingPrompt[] = [
  {
    title: 'Weather at Snoqualmie Pass',
    text: "What's the weather typically like at Snoqualmie Pass in mid-May?",
    markdown:
      'Mid-May at Snoqualmie Pass is usually clearing — most low-elevation snow is gone, but the pass itself can still see overnight slush through the second week [1].\n\n' +
      '**What to expect for May 14–15:**\n' +
      '- Daytime highs **58–66°F** at the pass, low 70s at Suncadia [2]\n' +
      '- Average **3 days of light rain** that week — pack a shell, not a parka\n' +
      '- Roads are clear; chains not required after May 1 [3]\n\n' +
      "Suncadia's outdoor fire pits and river float are usually open by then. " +
      "If anyone's flying in, SEA-to-Suncadia is reliably 1h 20m that time of year — no weather margin needed.",
    citations: [
      {
        name: 'NOAA spring outlook — Cascades west slope',
        abstract:
          'Seasonal temperature and precipitation forecast for the Snoqualmie Pass region, May–June 2026.',
      },
      {
        name: 'Visit Suncadia — typical May conditions',
        abstract:
          'Historical daytime highs, rainfall averages, and trail-open dates for the Cle Elum area.',
      },
      {
        name: 'WSDOT — I-90 Snoqualmie Pass advisories',
        abstract:
          'Year-round pass conditions, chain requirements, and seasonal road work updates.',
      },
    ],
    suggestedActions: [
      'Show me trail status for May',
      'What if it rains the whole time?',
      'Best venue for unpredictable weather',
    ],
  },
  {
    title: 'Dietary options at Suncadia',
    text: 'Can Suncadia accommodate vegan, gluten-free, and nut allergies for a group of 7?',
    markdown:
      'Yes — Suncadia handles all three routinely. Their group-dining menu is built around restriction flags submitted **14 days before arrival** [1].\n\n' +
      '**What they confirmed for a group of 7:**\n' +
      '- Vegan: dedicated entrée per meal, separate prep surface [2]\n' +
      '- Gluten-free: full menu parallel (including breakfast pastries)\n' +
      "- Tree-nut allergy: kitchen is **nut-aware**, not nut-free — they'll flag any cross-contamination risk per dish [1]\n\n" +
      "Recommend submitting the team's restrictions when you place the room block. They'll send a confirmation menu with restriction-flagged dishes ~7 days out.",
    citations: [
      {
        name: 'Suncadia group dining — dietary accommodations',
        abstract:
          'Lead times, kitchen protocols, and a sample group menu with allergen flags.',
      },
      {
        name: 'Suncadia spring 2026 group menu',
        abstract:
          'Three-meal-a-day menu rotation for groups, with vegan, GF, and dairy-free variants per course.',
      },
    ],
    suggestedActions: [
      'Reserve a tasting menu',
      "Compare Salish Lodge's dietary options",
      'Confirm allergen training certifications',
    ],
  },
  {
    title: 'Driving from Seattle to Suncadia',
    text: "What's the best driving route from Seattle to Suncadia for a Wednesday morning departure?",
    markdown:
      'For a Wednesday morning the cleanest route is **I-90 East via Mercer Island and Issaquah** — about **1h 20m** door-to-door if you leave Seattle by 8:30 AM [1].\n\n' +
      '**Timing notes:**\n' +
      '- Leave **before 7:30 AM** or **after 9:30 AM** to skip the Eastside commute squeeze\n' +
      '- One worthwhile pit stop: [Cle Elum Bakery](https://example.com/cle-elum-bakery) at exit 84 — 5 minutes off-route, popular with offsite groups [2]\n' +
      '- Parking at Suncadia is free, valet is $25/day — most groups skip valet\n\n' +
      'Rough fuel cost (two SUVs): **$60–70 round-trip.** No tolls on this route.',
    citations: [
      {
        name: 'WSDOT — I-90 typical travel times',
        abstract:
          'Average drive times Seattle → Cle Elum by departure hour, updated quarterly.',
      },
      {
        name: 'Cle Elum Bakery — visitor reviews',
        abstract:
          'Local bakery 5 minutes off I-90 at exit 84, popular with corporate groups en route to Suncadia.',
      },
    ],
    suggestedActions: [
      'Send a driving brief to the team',
      'Compare flights for out-of-town attendees',
      'Reserve two SUVs for Wed–Fri',
    ],
  },
  {
    title: 'Activities for 2-day offsite',
    text: 'Suggest a balanced 2-day activity plan for a 7-person product offsite at Suncadia.',
    markdown:
      'A balanced 2-day mix — **two working blocks** plus one shared experience per evening so the team bonds without it feeling forced.\n\n' +
      '### Day 1 — Wednesday\n' +
      '- **9:00–12:00** — v2 retro + v2.1 roadmap in the Cascade conference room [1]\n' +
      '- **12:30** — Lunch on the deck (weather permitting)\n' +
      '- **2:00–5:00** — Working block: north-star metrics, then deep-dive on agent handoff scope\n' +
      '- **6:30** — Group dinner at **Portals** (on-property) — vegan + GF accommodated [2]\n\n' +
      '### Day 2 — Thursday\n' +
      '- **9:00–11:30** — Prioritization session for the next quarter\n' +
      '- **11:30–1:00** — Optional: **river float** with the Cascade Outfitters group — 90 min, low-effort, includes lunch [3]\n' +
      '- **2:00–4:00** — Wrap: commitments, owners, kickoff for v2.1 sprint 1\n' +
      '- **4:00** — Pack up, depart for Seattle (back by 6:00 PM)\n\n' +
      "Want me to draft the agenda doc or send a hold to Suncadia's events team?",
    citations: [
      {
        name: 'Suncadia Cascade conference room — capacity & layout',
        abstract: 'Seats 12, whiteboard wall, daylight on three sides, AV included.',
      },
      {
        name: 'Portals at Suncadia — group dinner menu',
        abstract:
          'Three-course group menu with full vegan and gluten-free coverage. Bookable up to a party of 14.',
      },
      {
        name: 'Cascade Outfitters — group river float',
        abstract:
          '90-minute guided float on the Yakima River with included box lunch; departs from Suncadia.',
      },
    ],
    suggestedActions: [
      'Draft the agenda doc',
      'Send a hold to Suncadia events',
      'Build a shared travel doc',
    ],
  },
];

/**
 * Match an incoming user message text to one of the prompt cards. Used in
 * both 1:1 streaming (the welcome message's suggested-action chips replay
 * `text` back to the bot) and free-form sends where the user types one of
 * the canned questions.
 */
export function matchPrompt(text: string): StreamingPrompt | undefined {
  const normalized = text.trim().toLowerCase();
  return STREAMING_PROMPTS.find(
    (p) =>
      p.text.toLowerCase() === normalized ||
      p.title.toLowerCase() === normalized,
  );
}

export const WELCOME_MARKDOWN =
  "👋 Hi, I'm **Relecloud** — your travel and offsite concierge. " +
  "I can pull venues, draft itineraries, check weather, and help with " +
  "logistics. Pick one of the prompts below to see a streamed response, " +
  "or just type your question.";
