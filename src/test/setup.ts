import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@/i18n";

// Testing Library only auto-cleans when test globals are enabled.
afterEach(() => {
  cleanup();
});

// jsdom has no layout, so scrolling a control into view does nothing.
Element.prototype.scrollIntoView ??= () => {};

// jsdom implements neither; the app uses them for the pick bar and its motion.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopResizeObserver;
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) satisfies MediaQueryList;
