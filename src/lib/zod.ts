import { z } from "zod";

// The content security policy forbids eval, so Zod must not compile parsers with
// `new Function`; even its probe for eval support is reported as a violation.
// Schemas capture this setting when they are created, so every module imports
// Zod from here (Biome enforces it).
z.config({ jitless: true });

export { z };
