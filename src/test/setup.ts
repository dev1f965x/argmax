import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@/i18n";

// Testing Library only auto-cleans when test globals are enabled.
afterEach(() => {
  cleanup();
});
