// The same Northwind kickoff offsite scenario as the React UI prototype:
// three venues near Seattle, three citations, three suggested actions.
// Citation markers `[1]` / `[2]` / `[3]` are embedded in the markdown body —
// the bot calls `addCitation(i + 1, …)` for each one so Teams renders the
// hover card linked to that marker.

export type Citation = {
  /** Display name on the hover card (`name` field per SDK). */
  name: string;
  /** Content preview shown under the title in the hover card. */
  abstract: string;
};

export const VENUE_REPLY = {
  /**
   * Markdown body of the agent's targeted reply. `[1]`/`[2]`/`[3]` are
   * citation markers — the bot calls `addCitation(n, …)` for each to wire
   * up the hover card. Other inline markdown (bold, italic, bullets, links)
   * renders natively in the Teams message body.
   */
  markdown:
    '## Three offsite venues near Seattle\n\n' +
    'Pulled options that fit 7 people, 2 nights in mid-May, with real ' +
    'meeting space (not a hotel boardroom).\n\n' +
    '### Salish Lodge & Spa — *Snoqualmie Falls* [1]\n' +
    '- ~30 min drive from Seattle, easiest logistics\n' +
    '- **$2,940/night** group block · 7 rooms held\n' +
    '- Dedicated team room with whiteboards, fireplace lounge for evenings\n' +
    '- [Check availability May 12–13](https://example.com/salish)\n\n' +
    '### Suncadia Resort — *Cle Elum* [2]\n' +
    '- 1h 20m drive, more "leave town" feel\n' +
    '- **$2,440/night** group block · 2-bedroom suites\n' +
    '- Full conference center + hiking trails, fire pits, optional river float\n' +
    '- [Check availability May 14–15](https://example.com/suncadia)\n\n' +
    '### Roche Harbor Resort — *San Juan Island* [3]\n' +
    '- 3h via ferry, longer travel day but a real milestone trip\n' +
    '- **$3,180/night** waterfront cottages\n' +
    '- Sea kayaking, sunset dinner cruise, quietest of the three\n' +
    '- [Check availability May 19–20](https://example.com/roche-harbor)\n\n' +
    'My pick: **Suncadia.** Best balance of drive time, cost, and dedicated ' +
    'meeting space — and the off-site feel is stronger than Salish. ' +
    'Want me to draft a 2-day itinerary?',

  citations: [
    {
      name: 'Salish Lodge & Spa — group rates & meeting rooms',
      abstract:
        'Group block pricing, meeting-room inventory, and seasonal availability for May 2026.',
    },
    {
      name: 'Suncadia Resort — corporate retreats',
      abstract:
        'Conference-center floorplan, 2-bedroom suite layout, and weekday group rates for spring 2026.',
    },
    {
      name: 'Roche Harbor Resort — meetings & events',
      abstract:
        'Waterfront cottage availability, ferry-day logistics, and dinner-cruise add-on pricing.',
    },
  ] satisfies Citation[],

  /**
   * Quick follow-up chips rendered below the body. Each chip's `value`
   * gets sent back to the bot when clicked (type: 'imBack') — for this
   * prototype they're informational; wire them to real follow-up flows
   * as the demo grows.
   */
  suggestedActions: [
    'Draft a 2-day Suncadia itinerary',
    'Compare flights vs. driving',
    'Send a hold request to Suncadia',
  ],
};
