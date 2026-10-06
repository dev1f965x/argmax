import {
  Check,
  Copy,
  Info,
  Link as LinkIcon,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router";
import { BackToLists } from "@/components/back-to-lists";
import { ChanceLine, WeightBadge } from "@/components/item-weight";
import { LinkField } from "@/components/link-field";
import { useLists } from "@/components/lists-provider";
import { PageHeading } from "@/components/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { useBottomBarHeight } from "@/components/use-bottom-bar-height";
import { useScreenView } from "@/components/use-screen-view";
import { tracker } from "@/lib/analytics";
import { describeError } from "@/lib/errors";
import { isInAppBrowser } from "@/lib/in-app-browser";
import { addSharedList } from "@/lib/lists";
import { chances } from "@/lib/pick";
import {
  type DecodeResult,
  decodeSharedList,
  type SharedList,
} from "@/lib/share-link";
import { limits } from "@/lib/storage";
import type { AddedListState } from "@/routes/list-page";

function logInvalid(result: Extract<DecodeResult, { status: "invalid" }>) {
  // The reason is a fixed word; the cause is reduced to its name or Zod's
  // issue codes, so neither the link nor the list reaches the console.
  console.warn(
    "A shared link could not be read:",
    result.reason,
    result.cause === undefined ? "" : describeError(result.cause),
  );
}

/**
 * Opens a share link (FR19 to FR21, FR23). The list comes from the URL
 * fragment, which is untrusted: it is decoded and validated first, shown as
 * plain text, and saved only when the user adds it.
 */
export function SharedPage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  useScreenView("shared");
  const placeholder = useRef<HTMLDivElement>(null);
  // Set when the layout moved focus to the placeholder heading after a
  // navigation, so focus follows to the heading that replaces it.
  const placeholderFocused = useRef(false);
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  // Keyed by fragment, so pasting another link into the address bar never
  // shows the previous list in between.
  const [decoded, setDecoded] = useState<{
    fragment: string;
    result: DecodeResult;
  } | null>(null);

  useEffect(() => {
    let current = true;
    decodeSharedList(fragment)
      .catch((cause: unknown) => {
        // Every step catches its own errors; this is only a safety net.
        return { status: "invalid", reason: "format", cause } as const;
      })
      .then((result) => {
        if (!current) return;
        if (result.status === "invalid") logInvalid(result);
        placeholderFocused.current =
          placeholder.current?.contains(document.activeElement) ?? false;
        setDecoded({ fragment, result });
      });
    return () => {
      current = false;
    };
  }, [fragment]);

  useEffect(() => {
    if (!decoded || !placeholderFocused.current) return;
    placeholderFocused.current = false;
    document
      .querySelector<HTMLElement>("main h1")
      ?.focus({ preventScroll: true });
  }, [decoded]);

  // Decoding takes milliseconds. Meanwhile a hidden heading holds the place
  // that the layout moves focus to after a navigation.
  if (decoded?.fragment !== fragment)
    return (
      <div ref={placeholder}>
        <PageHeading title={t("shared.title")} className="sr-only" />
      </div>
    );
  const { result } = decoded;
  switch (result.status) {
    case "ok":
      return (
        <SharedListView
          list={result.list}
          link={`${window.location.origin}/shared#${fragment}`}
        />
      );
    case "invalid":
      return <LinkProblem kind="invalid" />;
    case "newer":
      return <LinkProblem kind="newer" />;
  }
}

function SharedListView({ list, link }: { list: SharedList; link: string }) {
  const { t } = useTranslation();
  const { state, editable, change } = useLists();
  const navigate = useNavigate();
  const bar = useRef<HTMLDivElement>(null);
  useBottomBarHeight(bar);
  const reasonId = useId();
  const adding = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [copy, setCopy] = useState<"copied" | "failed" | null>(null);
  const setBottomBar = useOutletContext<(shown: boolean) => void>();
  // Like the List screen, phones leave out the site footer while the bar is shown.
  useEffect(() => {
    setBottomBar(true);
    return () => setBottomBar(false);
  }, [setBottomBar]);
  // Only shows a notice; adding works the same in an in-app browser.
  const [inApp] = useState(() => isInAppBrowser(navigator.userAgent));

  const atLimit = state.lists.length >= limits.lists;
  const unavailable = atLimit || !editable;
  // Shown newest first, as the sender sees it and as it will appear once
  // added. Rows never change order, so the stored position identifies them.
  const items = list.items
    .map((item, position) => ({ ...item, position }))
    .toReversed();
  const itemChances = list.items.some((item) => item.weight !== 1)
    ? chances(items.map((item) => item.weight))
    : null;

  function add() {
    // Set before saving, so a second click before navigation (a double
    // click) cannot save the list twice.
    if (unavailable || adding.current) return;
    adding.current = true;
    const result = change((current, context) =>
      addSharedList(current, list, context),
    );
    if (!result.ok) {
      // At the limit (another tab added a list meanwhile) the reason under
      // the button already says so.
      setError(result.error === "list-limit" ? null : t("common.saveFailed"));
      adding.current = false;
      return;
    }
    tracker.listAddedFromLink();
    const added = result.state.lists.at(-1);
    if (!added) return;
    const navigationState: AddedListState = { addedListName: added.name };
    // Replaces the link's history entry, so the fragment leaves the address
    // bar and Back does not offer the link again (FR19).
    navigate(`/lists/${added.id}`, { replace: true, state: navigationState });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
    } catch (cause) {
      console.warn("Copying the link failed:", describeError(cause));
      setCopy("failed");
      return;
    }
    setCopy("copied");
  }

  return (
    <>
      <BackToLists />
      <div className="md:grid md:grid-shared md:items-start md:gap-x-12">
        {/* First on phones; above the Add panel in the right column on desktop. */}
        {inApp && (
          <InAppNotice link={link} copy={copy} onCopy={() => void copyLink()} />
        )}
        <div className="min-w-0 pb-6 md:col-start-1 md:row-span-3 md:row-start-1 md:pb-0">
          {/* The heading is fixed, like the document title it sets: the
              list name comes from the link, so it is shown but never used
              to name the page (PRD security, rendering). */}
          <PageHeading
            title={t("shared.title")}
            className="inline-flex items-center gap-1.5 rounded-sm bg-brand-soft px-2 py-0.5 text-sm font-semibold text-brand-strong"
          >
            <LinkIcon aria-hidden="true" className="size-3.5" />
            {t("shared.title")}
          </PageHeading>
          <h2 className="mt-1.5 overflow-clip text-title font-bold wrap-anywhere">
            {list.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("list.itemCount", { count: list.items.length })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">
            {t("shared.sender")}
          </p>
          {items.length > 0 && (
            <ul className="mt-4 border-t">
              {items.map((item, index) => {
                const chance = itemChances?.[index];
                return (
                  <li key={item.position} className="border-b">
                    <div className="flex min-h-14 items-center gap-1 py-1 pl-1">
                      <div className="min-w-0 flex-1 py-2">
                        <span className="block overflow-clip wrap-anywhere">
                          {item.text}
                        </span>
                        {chance && <ChanceLine chance={chance} />}
                      </div>
                      {item.weight !== 1 && (
                        <WeightBadge weight={item.weight} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* A fixed bar on phones, in the pick bar's place; the right column on desktop. */}
        <div
          ref={bar}
          data-bottom-bar
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 pt-3 pb-4 short:max-md:py-2 md:sticky md:top-6 md:col-start-2 md:row-start-2 md:w-80 md:border-0 md:bg-transparent md:p-0"
        >
          <p className="mb-3 hidden rounded-xl bg-surface p-5 text-sm text-muted-foreground md:block">
            {t("shared.sender")}
          </p>
          {/* aria-disabled rather than disabled, so the button keeps focus
              and its reason is read with it, as with Pick. */}
          <Button
            onClick={add}
            aria-disabled={unavailable}
            aria-describedby={atLimit ? reasonId : undefined}
            className="h-13.5 w-full rounded-xl bg-clip-border text-lg short:max-md:h-11 aria-disabled:cursor-not-allowed aria-disabled:bg-surface-2 aria-disabled:text-subtle-foreground aria-disabled:hover:bg-surface-2"
          >
            {t("shared.add")}
          </Button>
          {atLimit && (
            <p
              id={reasonId}
              className="mt-2 text-center text-sm text-balance text-muted-foreground"
            >
              {t("shared.limitReached", { limit: limits.lists })}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-2 text-center text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * In a messenger's in-app browser, lists are saved in that app's storage, so
 * a list added there is missing from the phone's browser (FR23).
 */
function InAppNotice({
  link,
  copy,
  onCopy,
}: {
  link: string;
  copy: "copied" | "failed" | null;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 md:col-start-2 md:row-start-1 md:mb-3">
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0 text-warning"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("shared.inAppTitle")}</p>
        <p className="mt-0.5 text-sm">{t("shared.inAppBody")}</p>
        <Button
          variant="ghost"
          onClick={onCopy}
          className="-mb-1.5 -ml-3 gap-1.5 px-3 text-sm text-brand-strong"
        >
          <Copy aria-hidden="true" className="size-4" />
          {t("share.copy")}
        </Button>
        {/* In place rather than in a snackbar, which would cover the list
            above the Add bar on phones. */}
        <p
          aria-live="polite"
          className="mt-1.5 flex items-center gap-1.5 text-sm empty:hidden"
        >
          {copy === "copied" && (
            <>
              <Check
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
              {t("share.copied")}
            </>
          )}
        </p>
        {copy === "failed" && (
          <div className="mt-2 grid gap-2">
            <p role="alert" className="text-sm text-destructive">
              {t("share.copyFailed")}
            </p>
            <LinkField url={link} label={t("share.link")} />
          </div>
        )}
      </div>
    </div>
  );
}

/** A link that cannot be shown (FR20): broken or cut off, or from a newer Argmax. */
function LinkProblem({ kind }: { kind: "invalid" | "newer" }) {
  const { t } = useTranslation();
  const Icon = kind === "invalid" ? LinkIcon : Info;
  let action: ReactNode;
  if (kind === "invalid") {
    action = (
      // A link styled as a button; the Button component would add role="button".
      <Link to="/" className={buttonVariants()}>
        {t("shared.toLists")}
      </Link>
    );
  } else {
    // A reload fetches the newest index.html, which is never cached.
    action = (
      <Button onClick={() => window.location.reload()}>
        {t("shared.reload")}
      </Button>
    );
  }
  return (
    <>
      <BackToLists />
      <div className="max-w-130 pt-2">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <PageHeading
          title={t(
            kind === "invalid" ? "shared.invalidTitle" : "shared.newerTitle",
          )}
          className="text-title font-bold"
        />
        <p className="mt-2 text-muted-foreground">
          {t(kind === "invalid" ? "shared.invalidBody" : "shared.newerBody")}
        </p>
        <div className="mt-6">{action}</div>
      </div>
    </>
  );
}
