// The Teams SDK passes a context object to each handler with `send`,
// `stream`, and `activity` (plus more). The exact shape is exported from
// `@microsoft/teams.apps` — we re-export a narrowed alias here so the
// handler signatures stay readable.

import type { MessageActivity } from '@microsoft/teams.api';

export type SendFn = (
  message: string | MessageActivity,
) => Promise<{ id?: string } | void>;

export type StreamFn = {
  emit: (chunk: string | MessageActivity) => void;
};

export type ActivityContext = {
  activity: any;
  send: SendFn;
  stream?: StreamFn;
  /**
   * Loose-typed handle to the SDK's ApiClient. The handlers only need a
   * couple of properties (`reactions.add(…)` etc.); typing it as `any`
   * keeps the surface flexible while the SDK preview iterates.
   */
  api?: any;
};
