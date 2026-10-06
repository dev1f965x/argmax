import { cleanText, limits, storedTextSchema, weightRange } from "./storage";
import { z } from "./zod";

/**
 * Share links (FR22): `<origin>/shared#<version>.<data>`, where data is the
 * list as JSON, compressed with deflate-raw and encoded as base64url. The list
 * travels in the fragment, which browsers send neither to the server nor in
 * the Referer header, so nothing about it reaches Argmax.
 *
 * Version 1 JSON: `{"n": name, "i": [[text, weight], ...]}`, items in stored
 * order. No ids or dates: the recipient's copy gets its own. Later versions
 * must keep reading version 1 links, which stay in chats and histories.
 */
const sharePath = "/shared";
const currentVersion = 1;

/** A link longer than this may be cut by messengers (FR18; Discord's message limit). */
export const longLinkLength = 2_000;

/**
 * Caps from the threat model (ARG-49). A deflate bomb within 64 KB can expand
 * to many megabytes, so decompression stops at 256 KB of JSON. The caps are
 * below what the item and text limits allow (1,000 items of 100 Hangul
 * syllables are about 300 KB of JSON), so for very long lists the caps bind
 * first (PRD security), and the sender is told before any link is offered.
 */
export const maxFragmentLength = 64 * 1024;
export const maxJsonBytes = 256 * 1024;

const versionPattern = /^[1-9][0-9]{0,2}$/;
const dataPattern = /^[A-Za-z0-9_-]+$/;

export interface SharedList {
  name: string;
  items: { text: string; weight: number }[];
}

/**
 * Why a link was rejected. Fixed strings without link content, so they can be
 * logged.
 */
type InvalidReason =
  | "too-long"
  | "format"
  | "base64"
  | "too-large"
  | "compression"
  | "encoding"
  | "json"
  | "schema";

export type DecodeResult =
  | { status: "ok"; list: SharedList }
  /** `cause` is a thrown error or a Zod error; log it only through describeError. */
  | { status: "invalid"; reason: InvalidReason; cause?: unknown }
  /** A well-formed version this app does not know: a newer Argmax made it. */
  | { status: "newer" };

/**
 * Link text must be what Argmax itself writes: text that cleaning would only
 * trim and normalize. Anything the cleaning would remove or change further,
 * except whitespace at the ends, which trimming removes anyway
 * (controls, bidirectional formatting, lone surrogates, line separators,
 * marks stacked past the unit cap) means the link was altered, so it is
 * rejected rather than repaired. Trimming and NFC normalization still apply,
 * and the result must pass the stored-text rules, so the saved copy always
 * loads.
 */
const linkText = z
  .string()
  .refine(
    (value) => cleanText(value) === value.normalize("NFC").trim(),
    "needs more than trimming and normalizing",
  )
  .transform(cleanText)
  .pipe(storedTextSchema);

/**
 * Strip mode drops unknown keys, including "__proto__" and "constructor"
 * (JSON.parse makes them own properties, and the output is a new object), and
 * the tuple's rest drops extra elements, so a later version can append fields
 * that this one ignores.
 */
const sharedListSchema = z.object({
  n: linkText,
  i: z
    .array(
      z.tuple(
        [linkText, z.int().min(weightRange.min).max(weightRange.max)],
        z.unknown(),
      ),
    )
    .max(limits.itemsPerList),
});

/**
 * Returns the link's fragment, without "#", and whether a recipient's app can
 * open it: a list whose JSON or fragment is over the caps would be rejected
 * there, so it must not be offered.
 */
export async function encodeSharedList(
  list: SharedList,
): Promise<{ fragment: string; fits: boolean }> {
  const json = new TextEncoder().encode(
    JSON.stringify({
      n: list.name,
      i: list.items.map((item) => [item.text, item.weight]),
    }),
  );
  const compressed = new Uint8Array(
    await new Response(
      // The list is the app's own data, so it goes in large pieces.
      slices(json, 64 * 1024).pipeThrough(new CompressionStream("deflate-raw")),
    ).arrayBuffer(),
  );
  const fragment = `${currentVersion}.${encodeBase64Url(compressed)}`;
  return {
    fragment,
    fits: json.length <= maxJsonBytes && fragment.length <= maxFragmentLength,
  };
}

export async function shareUrl(
  origin: string,
  list: SharedList,
): Promise<{ url: string; fits: boolean }> {
  const { fragment, fits } = await encodeSharedList(list);
  return { url: `${origin}${sharePath}#${fragment}`, fits };
}

/**
 * Reads a fragment (without "#") from an untrusted link. Every step rejects
 * before the next one runs, in this order: length, format, base64url,
 * decompression within the cap, fatal UTF-8, JSON, then the schema.
 */
export async function decodeSharedList(
  fragment: string,
): Promise<DecodeResult> {
  if (fragment.length > maxFragmentLength)
    return { status: "invalid", reason: "too-long" };
  const separator = fragment.indexOf(".");
  if (separator === -1) return { status: "invalid", reason: "format" };
  const version = fragment.slice(0, separator);
  const data = fragment.slice(separator + 1);
  if (!versionPattern.test(version))
    return { status: "invalid", reason: "format" };
  if (Number(version) !== currentVersion) return { status: "newer" };
  if (!dataPattern.test(data)) return { status: "invalid", reason: "format" };

  const compressed = decodeBase64Url(data);
  if (compressed === null) return { status: "invalid", reason: "base64" };

  let bytes: Uint8Array<ArrayBuffer> | null;
  try {
    bytes = await readAll(
      slices(compressed).pipeThrough(new DecompressionStream("deflate-raw")),
      maxJsonBytes,
    );
  } catch (cause) {
    // Truncated input, trailing data, or a corrupt block.
    return { status: "invalid", reason: "compression", cause };
  }
  if (bytes === null) return { status: "invalid", reason: "too-large" };

  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    return { status: "invalid", reason: "encoding", cause };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    return { status: "invalid", reason: "json", cause };
  }
  const result = sharedListSchema.safeParse(parsed);
  if (!result.success)
    return { status: "invalid", reason: "schema", cause: result.error };
  return {
    status: "ok",
    list: {
      name: result.data.n,
      items: result.data.i.map(([text, weight]) => ({ text, weight })),
    },
  };
}

/**
 * Feeds bytes in small pieces, only when the next stage asks for more. Given
 * all input at once, engines inflate it in one step: WebKit hands back a
 * single chunk of 50 MB or more from a bomb under the fragment cap, before
 * the cap below can see it. In 256-byte slices each output chunk stays near
 * the size of the engine's own buffer.
 */
function slices(bytes: Uint8Array<ArrayBuffer>, size = 256) {
  let offset = 0;
  return new ReadableStream<Uint8Array<ArrayBuffer>>(
    {
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close();
          return;
        }
        controller.enqueue(bytes.subarray(offset, offset + size));
        offset += size;
      },
    },
    { highWaterMark: 0 },
  );
}

/**
 * Reads a byte stream to the end. Returns null, after cancelling the stream,
 * as soon as the next chunk would take the total over `cap`, so neither the
 * output nor the work to produce it grows past the cap, and partial output is
 * never returned.
 */
async function readAll(
  stream: ReadableStream<Uint8Array>,
  cap: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > cap) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
    total += value.length;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // In slices: spreading a long array into one call can exceed the argument limit.
  for (let start = 0; start < bytes.length; start += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/**
 * Decodes unpadded base64url. atob alone is forgiving (it ignores whitespace
 * and leftover bits), so the result must encode back to exactly the input:
 * one link has one valid spelling.
 */
function decodeBase64Url(data: string): Uint8Array<ArrayBuffer> | null {
  let binary: string;
  try {
    binary = atob(data.replaceAll("-", "+").replaceAll("_", "/"));
  } catch {
    // InvalidCharacterError: a length that no base64 text can have.
    return null;
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return encodeBase64Url(bytes) === data ? bytes : null;
}
