import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "@/test/memory-storage";
import { addSharedList } from "./lists";
import {
  type DecodeResult,
  decodeSharedList,
  encodeSharedList,
  maxFragmentLength,
  maxJsonBytes,
  type SharedList,
  shareUrl,
} from "./share-link";
import { createRepository, emptyState, limits, storageKey } from "./storage";

const encoder = new TextEncoder();

async function deflate(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  // A Response body, since jsdom's Blob has no stream().
  const stream = new Response(bytes).body?.pipeThrough(
    new CompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** A fragment built by hand, so tests control every byte. */
async function fragmentOf(
  content: string | Uint8Array<ArrayBuffer>,
  version = "1",
): Promise<string> {
  const bytes = typeof content === "string" ? encoder.encode(content) : content;
  return `${version}.${base64Url(await deflate(bytes))}`;
}

const fragmentOfList = (value: unknown) => fragmentOf(JSON.stringify(value));

function expectInvalid(result: DecodeResult, reason: string) {
  expect(result).toMatchObject({ status: "invalid", reason });
}

const lunch: SharedList = {
  name: "점심 메뉴",
  items: [
    { text: "김치찌개", weight: 2 },
    { text: "Ramen 🍜", weight: 1 },
    { text: "👩🏽‍💻 sushi", weight: 1_000 },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe("encodeSharedList and decodeSharedList", () => {
  it("round-trips a list with Hangul, emoji, and weights", async () => {
    const fragment = (await encodeSharedList(lunch)).fragment;

    expect(fragment).toMatch(/^1\.[A-Za-z0-9_-]+$/);
    expect(await decodeSharedList(fragment)).toEqual({
      status: "ok",
      list: lunch,
    });
  });

  it("carries only the name, texts, and weights in a fixed JSON shape", async () => {
    const fragment = (await encodeSharedList(lunch)).fragment;
    const data = fragment.slice(2).replaceAll("-", "+").replaceAll("_", "/");
    const compressed = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const json = await new Response(
      new Response(compressed).body?.pipeThrough(
        new DecompressionStream("deflate-raw"),
      ),
    ).text();

    expect(JSON.parse(json)).toEqual({
      n: "점심 메뉴",
      i: [
        ["김치찌개", 2],
        ["Ramen 🍜", 1],
        ["👩🏽‍💻 sushi", 1_000],
      ],
    });
  });

  it("round-trips a list with no items", async () => {
    const empty = { name: "Lunch", items: [] };
    expect(
      await decodeSharedList((await encodeSharedList(empty)).fragment),
    ).toEqual({
      status: "ok",
      list: empty,
    });
  });

  it("builds the link on the /shared path with the fragment", async () => {
    const { url, fits } = await shareUrl("https://argmax.example", lunch);
    expect(fits).toBe(true);
    expect(url).toMatch(
      /^https:\/\/argmax\.example\/shared#1\.[A-Za-z0-9_-]+$/,
    );
  });
});

describe("lists over the caps", () => {
  it("are marked as not fitting, and the recipient's app would reject them", async () => {
    // Within the product limits (1,000 items of 100 characters) but about
    // 300 KB of JSON, over the 256 KB cap.
    const long = {
      name: "Lunch",
      items: Array.from({ length: limits.itemsPerList }, () => ({
        text: "가".repeat(limits.textLength),
        weight: 1,
      })),
    };
    const { fragment, fits } = await encodeSharedList(long);
    expect(fits).toBe(false);
    expectInvalid(await decodeSharedList(fragment), "too-large");
  });

  it("fit up to the JSON cap, and such a link opens", async () => {
    // 800 items of about 300 bytes of JSON each stay under 256 KB.
    const near = {
      name: "Lunch",
      items: Array.from({ length: 800 }, (_, index) => ({
        text: `${index} ${"가".repeat(95)}`,
        weight: 1,
      })),
    };
    const { fragment, fits } = await encodeSharedList(near);
    expect(fits).toBe(true);
    expect((await decodeSharedList(fragment)).status).toBe("ok");
  });
});

describe("decodeSharedList caps", () => {
  it("rejects a deflate bomb at the 256 KB cap and cancels the stream", async () => {
    const cancel = vi.spyOn(ReadableStreamDefaultReader.prototype, "cancel");
    // 10 MB of zeros compresses to about 10 KB, well inside the fragment cap.
    const fragment = await fragmentOf(new Uint8Array(10 * 1024 * 1024));
    expect(fragment.length).toBeLessThan(maxFragmentLength);

    expectInvalid(await decodeSharedList(fragment), "too-large");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("feeds the decompressor in small slices, so a bomb stops early", async () => {
    const Original = DecompressionStream;
    const writes: number[] = [];
    // Records the size of each piece of input that reaches the decompressor.
    vi.stubGlobal(
      "DecompressionStream",
      class {
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array<ArrayBuffer>>;
        constructor(format: CompressionFormat) {
          const inner = new Original(format);
          const writer = inner.writable.getWriter();
          this.readable = inner.readable;
          this.writable = new WritableStream<Uint8Array<ArrayBuffer>>({
            write(chunk) {
              writes.push(chunk.length);
              return writer.write(chunk);
            },
            close: () => writer.close(),
            abort: (reason) => writer.abort(reason),
          });
        }
      },
    );
    const compressed = await deflate(
      new Uint8Array(new ArrayBuffer(10 * 1024 * 1024)),
    );
    try {
      expectInvalid(
        await decodeSharedList(`1.${base64Url(compressed)}`),
        "too-large",
      );
    } finally {
      vi.unstubAllGlobals();
    }
    // Given all of it at once, an engine may inflate everything before the
    // cap is checked (WebKit returns one chunk of tens of megabytes). How
    // much input each engine pulls before the cap is checked in the
    // end-to-end tests; Node's stream reads ahead regardless.
    expect(writes.length).toBeGreaterThan(1);
    expect(Math.max(...writes)).toBeLessThanOrEqual(256);
  });

  it("accepts JSON of exactly 256 KB and rejects one byte more", async () => {
    const json = (bytes: number) => {
      const base = '{"n":"Lunch","i":[]}';
      // Whitespace is valid JSON, so the size can be set to the byte.
      return base + " ".repeat(bytes - base.length);
    };

    expect(
      (await decodeSharedList(await fragmentOf(json(maxJsonBytes)))).status,
    ).toBe("ok");
    expectInvalid(
      await decodeSharedList(await fragmentOf(json(maxJsonBytes + 1))),
      "too-large",
    );
  });

  it("rejects a fragment over 64 KB before decoding it", async () => {
    const atob = vi.spyOn(globalThis, "atob");
    const decompress = vi.spyOn(globalThis, "DecompressionStream");

    expectInvalid(
      await decodeSharedList(`1.${"A".repeat(maxFragmentLength - 1)}`),
      "too-long",
    );
    expect(atob).not.toHaveBeenCalled();
    expect(decompress).not.toHaveBeenCalled();

    // At exactly 64 KB the length is accepted and decoding goes on.
    const atLimit = await decodeSharedList(
      `1.${"A".repeat(maxFragmentLength - 2)}`,
    );
    expect(atLimit).toMatchObject({ status: "invalid" });
    expect(atLimit).not.toMatchObject({ reason: "too-long" });
    expect(atob).toHaveBeenCalled();
  });
});

describe("decodeSharedList format", () => {
  it.each(["0", "01", "2abc", "", "1e0", "1000", " 1", "-1", "１"])(
    "rejects version %j as invalid",
    async (version) => {
      const fragment = await fragmentOfList({ n: "Lunch", i: [] });
      expectInvalid(
        await decodeSharedList(`${version}${fragment.slice(1)}`),
        "format",
      );
    },
  );

  it.each(["2", "10", "999"])(
    "reports version %s as needing a newer Argmax",
    async (version) => {
      const fragment = await fragmentOfList({ n: "Lunch", i: [] });
      expect(await decodeSharedList(`${version}${fragment.slice(1)}`)).toEqual({
        status: "newer",
      });
    },
  );

  it.each([
    ["no separator", "1"],
    ["no data", "1."],
    ["nothing", ""],
  ])("rejects a fragment with %s", async (_, fragment) => {
    expectInvalid(await decodeSharedList(fragment), "format");
  });

  it.each([
    ["padding", (data: string) => `${data}==`],
    ["a space", (data: string) => `${data.slice(0, 4)} ${data.slice(4)}`],
    ["a line break", (data: string) => `${data.slice(0, 4)}\n${data.slice(4)}`],
    ["standard base64 +", (data: string) => `${data}+`],
    ["standard base64 /", (data: string) => `${data.slice(0, 4)}/`],
    ["percent-encoding", (data: string) => `${data}%3D`],
    ["a second dot", (data: string) => `${data}.x`],
  ])("rejects data with %s", async (_, alter) => {
    const fragment = await fragmentOfList({ n: "Lunch", i: [] });
    const data = fragment.slice(2);
    expectInvalid(await decodeSharedList(`1.${alter(data)}`), "format");
  });

  it("rejects base64url that does not decode, or not in its one spelling", async () => {
    // A length of 4n + 1 is never valid base64.
    expectInvalid(await decodeSharedList("1.AAAAA"), "base64");
    // "AB" decodes like "AA" because atob drops the leftover bits.
    expectInvalid(await decodeSharedList("1.AB"), "base64");
  });

  it("rejects a truncated link", async () => {
    const fragment = (await encodeSharedList(lunch)).fragment;
    for (const cut of [1, 4, 10]) {
      const result = await decodeSharedList(fragment.slice(0, -cut));
      expect(result.status).toBe("invalid");
    }
  });

  it("rejects trailing data after the compressed list", async () => {
    const compressed = await deflate(
      encoder.encode(JSON.stringify({ n: "Lunch", i: [] })),
    );
    const withJunk = new Uint8Array([...compressed, 1, 2, 3]);
    expectInvalid(
      await decodeSharedList(`1.${base64Url(withJunk)}`),
      "compression",
    );
  });

  it("rejects data that is not deflate-raw", async () => {
    expectInvalid(
      await decodeSharedList(`1.${base64Url(encoder.encode("plain"))}`),
      "compression",
    );
  });
});

describe("decodeSharedList content", () => {
  it("rejects invalid UTF-8 before parsing JSON", async () => {
    const parse = vi.spyOn(JSON, "parse");
    const bytes = new Uint8Array([
      ...encoder.encode('{"n":"'),
      0xc3,
      0x28,
      ...encoder.encode('","i":[]}'),
    ]);
    expectInvalid(await decodeSharedList(await fragmentOf(bytes)), "encoding");
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects text that is not JSON", async () => {
    expectInvalid(
      await decodeSharedList(await fragmentOf('{"n":"Lunch",')),
      "json",
    );
  });

  it.each([
    ["an array", []],
    ["null", null],
    ["a string", "Lunch"],
    ["no items", { n: "Lunch" }],
    ["no name", { i: [] }],
    ["items as an object", { n: "Lunch", i: { 0: ["A", 1] } }],
    ["an item as an object", { n: "Lunch", i: [{ text: "A", weight: 1 }] }],
    ["an item without a weight", { n: "Lunch", i: [["A"]] }],
  ])("rejects %s", async (_, value) => {
    expectInvalid(
      await decodeSharedList(await fragmentOfList(value)),
      "schema",
    );
  });

  it.each([
    ["a lone high surrogate", '"A\\ud800B"'],
    ["a lone low surrogate", '"A\\udc00B"'],
    ["a right-to-left override", '"A\\u202eB"'],
    ["a first-strong isolate", '"A\\u2068B"'],
    ["a control character", '"A\\u0007B"'],
    ["a line break", '"A\\nB"'],
    ["a line separator", '"A\\u2028B"'],
    ["only a zero-width space", '"\\u200b"'],
    ["only spaces", '"   "'],
    ["an empty string", '""'],
    ["101 characters", JSON.stringify("가".repeat(101))],
    [
      "over 1,600 UTF-16 units in 100 characters",
      // 100 family emoji with skin tones: one character each, 19 units.
      JSON.stringify("👩🏽‍👩🏽‍👧🏽‍👦🏽".repeat(100)),
    ],
  ])("rejects a name with %s", async (_, name) => {
    const json = `{"n":${name},"i":[]}`;
    expectInvalid(await decodeSharedList(await fragmentOf(json)), "schema");
    const item = `{"n":"Lunch","i":[[${name},1]]}`;
    expectInvalid(await decodeSharedList(await fragmentOf(item)), "schema");
  });

  it("keeps text within the limits, including 100 long emoji sequences", async () => {
    const kiss = "👩🏻‍❤️‍💋‍👨🏼";
    const list = {
      name: "가".repeat(100),
      items: [{ text: kiss.repeat(100), weight: 1 }],
    };
    expect(
      await decodeSharedList((await encodeSharedList(list)).fragment),
    ).toEqual({
      status: "ok",
      list,
    });
  });

  it("rejects marks stacked past the unit cap, which typed text would lose", async () => {
    // Typing this keeps eight marks; Argmax never puts the rest in a link.
    const zalgo = `Z${"\u0301".repeat(2_000)}`;
    expectInvalid(
      await decodeSharedList(
        await fragmentOfList({ n: "Lunch", i: [[zalgo, 1]] }),
      ),
      "schema",
    );
  });

  it("drops __proto__, constructor, and unknown keys without polluting prototypes", async () => {
    const json =
      '{"n":"Lunch","i":[["A",1]],"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}},"x":1}';
    const result = await decodeSharedList(await fragmentOf(json));

    expect(result).toEqual({
      status: "ok",
      list: { name: "Lunch", items: [{ text: "A", weight: 1 }] },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(Object.keys(result.list)).toEqual(["name", "items"]);
    expect(Object.getPrototypeOf(result.list)).toBe(Object.prototype);
    expect(Reflect.get({}, "polluted")).toBeUndefined();
    expect(Reflect.get(Object.prototype, "polluted")).toBeUndefined();
  });

  it("drops extra tuple elements", async () => {
    const result = await decodeSharedList(
      await fragmentOfList({ n: "Lunch", i: [["A", 2, "red", { x: 1 }]] }),
    );
    expect(result).toEqual({
      status: "ok",
      list: { name: "Lunch", items: [{ text: "A", weight: 2 }] },
    });
  });

  it.each([0, -1, 1.5, 1_001, "1", null, true, Number.MAX_SAFE_INTEGER + 2])(
    "rejects weight %j",
    async (weight) => {
      expectInvalid(
        await decodeSharedList(
          await fragmentOfList({ n: "Lunch", i: [["A", weight]] }),
        ),
        "schema",
      );
    },
  );

  it("accepts weights 1 and 1,000, the stored range", async () => {
    // A weight above the item count is valid: removing items leaves it.
    const result = await decodeSharedList(
      await fragmentOfList({
        n: "Lunch",
        i: [
          ["A", 1],
          ["B", 1_000],
        ],
      }),
    );
    expect(result.status).toBe("ok");
  });

  it("accepts 1,000 items and rejects 1,001", async () => {
    const items = (count: number) =>
      Array.from({ length: count }, (_, index) => [`Item ${index}`, 1]);
    expect(
      (
        await decodeSharedList(
          await fragmentOfList({ n: "Lunch", i: items(limits.itemsPerList) }),
        )
      ).status,
    ).toBe("ok");
    expectInvalid(
      await decodeSharedList(
        await fragmentOfList({
          n: "Lunch",
          i: items(limits.itemsPerList + 1),
        }),
      ),
      "schema",
    );
  });

  it("normalizes padded and decomposed text into a state that reloads as valid", async () => {
    // "가" written as jamo, and an "é" as e plus a combining accent.
    const result = await decodeSharedList(
      await fragmentOfList({
        n: "  \u1100\u1161 lunch ",
        i: [[" cafe\u0301 ", 1]],
      }),
    );
    expect(result).toEqual({
      status: "ok",
      list: { name: "가 lunch", items: [{ text: "café", weight: 1 }] },
    });
    if (result.status !== "ok") throw new Error("expected ok");

    const storage = memoryStorage();
    const repository = createRepository(() => storage.storage);
    expect(repository.load().status).toBe("ok");
    const added = addSharedList(emptyState, result.list, {
      newId: () => crypto.randomUUID(),
      now: () => new Date(),
    });
    if (!added.ok) throw new Error("expected ok");
    expect(repository.save(added.state)).toEqual({ ok: true });

    const reloaded = createRepository(() => storage.storage).load();
    expect(reloaded.status).toBe("ok");
    expect(storage.data.get(storageKey)).toContain("café");
  });
});
