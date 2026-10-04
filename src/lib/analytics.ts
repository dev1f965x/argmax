import { describeError } from "./errors";

/**
 * Umami Cloud identifies the site by this id. It is public: the browser sends
 * it with every event.
 */
export const umamiWebsiteId = "00000000-0000-0000-0000-000000000000";
export const umamiEndpoint = "https://cloud.umami.is/api/send";
/** Only the production site reports; development, tests, and previews never do. */
export const productionHostname = "argmax.dev1f965x.workers.dev";

/** Screens as reported: fixed names and paths, never list names or ids. */
const screens = {
  lists: { url: "/", title: "Lists" },
  list: { url: "/lists/:id", title: "List" },
  privacy: { url: "/privacy", title: "Privacy" },
  "not-found": { url: "/not-found", title: "Not found" },
} as const;

export type Screen = keyof typeof screens;

export interface TrackerEnvironment {
  hostname: string;
  language: string;
  screen: { width: number; height: number };
  referrer: string;
  /** Global Privacy Control or Do Not Track is on. */
  optedOut: boolean;
  send: (body: string) => Promise<unknown>;
}

export interface Tracker {
  screenView: (screen: Screen) => void;
  listCreated: () => void;
  /** `earlierVisit`: the list was created before this visit (H2). */
  pick: (earlierVisit: boolean) => void;
}

export function createTracker(environment: TrackerEnvironment): Tracker {
  const enabled =
    environment.hostname === productionHostname && !environment.optedOut;
  // Only the referring site, not the full address, which may carry a query.
  const referrer = originOf(environment.referrer);

  function report(
    screen: Screen,
    event?: { name: string; data?: Record<string, boolean> },
  ) {
    if (!enabled) return;
    const body = JSON.stringify({
      type: "event",
      payload: {
        website: umamiWebsiteId,
        hostname: environment.hostname,
        language: environment.language,
        screen: `${environment.screen.width}x${environment.screen.height}`,
        referrer,
        ...screens[screen],
        ...event,
      },
    });
    // Reporting never affects the app: a failure is logged and nothing else.
    environment.send(body).catch((error: unknown) => {
      console.warn("A usage event was not sent:", describeError(error));
    });
  }

  return {
    screenView: (screen) => report(screen),
    listCreated: () => report("lists", { name: "list_created" }),
    pick: (earlierVisit) =>
      report("list", { name: "pick", data: { earlier_visit: earlierVisit } }),
  };
}

function originOf(address: string): string {
  if (!address) return "";
  try {
    return new URL(address).origin;
  } catch {
    // Not a URL (browsers send an empty string or a full address); report none.
    return "";
  }
}

/** When this visit started: lists created earlier count as an earlier visit. */
export const visitStartedAt = new Date();

function browserEnvironment(): TrackerEnvironment {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return {
    hostname: window.location.hostname,
    language: navigator.language,
    screen: { width: window.screen.width, height: window.screen.height },
    referrer: document.referrer,
    optedOut: nav.globalPrivacyControl === true || navigator.doNotTrack === "1",
    send: (body) =>
      fetch(umamiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        // Lets a pick or a navigation finish sending while the page changes.
        keepalive: true,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      }).then((response) => {
        if (!response.ok) throw new Error(`Umami responded ${response.status}`);
      }),
  };
}

export const tracker = createTracker(browserEnvironment());
