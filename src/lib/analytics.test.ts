import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserOptedOut,
  createTracker,
  productionHostname,
  type TrackerEnvironment,
  umamiWebsiteId,
} from "./analytics";

function environment(overrides: Partial<TrackerEnvironment> = {}) {
  const sent: unknown[] = [];
  const env: TrackerEnvironment = {
    hostname: productionHostname,
    language: "ko-KR",
    screen: { width: 390, height: 844 },
    referrer: "",
    optedOut: false,
    send: async (body) => {
      sent.push(JSON.parse(body));
    },
    ...overrides,
  };
  return { env, sent };
}

describe("createTracker", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports a screen view with a fixed path and title, never list ids or names", () => {
    const { env, sent } = environment();
    createTracker(env).screenView("list");

    expect(sent).toEqual([
      {
        type: "event",
        payload: {
          website: umamiWebsiteId,
          hostname: productionHostname,
          language: "ko-KR",
          screen: "390x844",
          referrer: "",
          url: "/lists/:id",
          title: "List",
        },
      },
    ]);
  });

  it("reports list_created and pick with earlier_visit only", () => {
    const { env, sent } = environment();
    const tracker = createTracker(env);

    tracker.listCreated(true);
    tracker.pick(true);

    expect(sent).toMatchObject([
      {
        payload: {
          name: "list_created",
          url: "/",
          data: { first_visit: true },
        },
      },
      {
        payload: {
          name: "pick",
          url: "/lists/:id",
          data: { earlier_visit: true },
        },
      },
    ]);
    expect(Object.keys((sent[1] as { payload: object }).payload)).not.toContain(
      "id",
    );
  });

  it("sends only the referring site, not its full address", () => {
    const { env, sent } = environment({
      referrer: "https://chat.example/room/123?invite=secret",
    });
    createTracker(env).screenView("lists");

    expect(sent).toMatchObject([
      { payload: { referrer: "https://chat.example" } },
    ]);
  });

  it.each([
    ["off the production site", { hostname: "127.0.0.1" }],
    ["on a preview", { hostname: "feat-x-argmax.dev1f965x.workers.dev" }],
    ["when the browser opts out", { optedOut: true }],
  ])("sends nothing %s", (_, overrides) => {
    const { env, sent } = environment(overrides);
    const tracker = createTracker(env);
    tracker.screenView("lists");
    tracker.listCreated(false);
    tracker.pick(false);

    expect(sent).toEqual([]);
  });

  it("logs a failed send without throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { env } = environment({
      send: () => Promise.reject(new TypeError("Failed to fetch")),
    });

    expect(() => createTracker(env).screenView("lists")).not.toThrow();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "A usage event was not sent:",
        "TypeError",
      ),
    );
  });

  it.each([
    [{ doNotTrack: null }, false],
    [{ doNotTrack: "0" }, false],
    [{ doNotTrack: "unspecified" }, false],
    [{ doNotTrack: "1" }, true],
    [{ doNotTrack: null, globalPrivacyControl: false }, false],
    [{ doNotTrack: null, globalPrivacyControl: true }, true],
  ])("treats %j as opted out: %s", (nav, expected) => {
    expect(browserOptedOut(nav)).toBe(expected);
  });

  it("uses the registered Umami website id, not a placeholder", () => {
    expect(umamiWebsiteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
