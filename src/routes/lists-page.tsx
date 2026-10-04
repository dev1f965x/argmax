import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { useAnnouncer } from "@/components/announcer";
import { useLists } from "@/components/lists-provider";
import { Note } from "@/components/note";
import { PageHeading } from "@/components/page-heading";
import { TextEntryForm } from "@/components/text-entry-form";
import { createList } from "@/lib/lists";
import { limits } from "@/lib/storage";

function deletedListName(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  if (!("deletedListName" in state)) return null;
  return typeof state.deletedListName === "string"
    ? state.deletedListName
    : null;
}

export function ListsPage() {
  const { t } = useTranslation();
  const { state, editable, change } = useLists();
  const atLimit = state.lists.length >= limits.lists;
  const limitMessage = t("lists.limitReached", { limit: limits.lists });
  // Outside the form, so creating the 100th list is still announced after the
  // limit message replaces the form; that message then takes focus.
  const { announce, region } = useAnnouncer();
  const limitNote = useRef<HTMLParagraphElement>(null);
  const [focusLimit, setFocusLimit] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Read once: the history entry is then cleared, so a reload or Back does not
  // show the confirmation again.
  const [deleted] = useState(() => deletedListName(location.state));
  const deletedNotice = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!deleted) return;
    // The deleted list's screen is gone, so focus moves to the confirmation.
    deletedNotice.current?.focus();
    navigate(location.pathname, { replace: true, state: null });
  }, [deleted, navigate, location.pathname]);

  useEffect(() => {
    if (!focusLimit) return;
    limitNote.current?.focus();
    setFocusLimit(false);
  }, [focusLimit]);
  // Newest first, so a list just created appears right under the form.
  const lists = state.lists.toReversed();

  function create(name: string) {
    const result = change((current, context) =>
      createList(current, name, context),
    );
    if (result.ok) {
      const created = t("lists.created", { name: name.trim() });
      if (state.lists.length + 1 >= limits.lists) {
        announce(`${created} ${limitMessage}`);
        setFocusLimit(true);
      } else {
        announce(created);
      }
      return { ok: true } as const;
    }
    const message = {
      empty: t("lists.errors.empty"),
      "too-long": t("lists.errors.tooLong", { limit: limits.textLength }),
      "list-limit": limitMessage,
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
    }[result.error];
    return { ok: false, message } as const;
  }

  return (
    <div className="max-w-160">
      {deleted && (
        <p
          ref={deletedNotice}
          tabIndex={-1}
          role="status"
          className="mb-5 rounded-xl bg-surface px-3.5 py-3 outline-none wrap-anywhere"
        >
          {t("lists.deleted", { name: deleted })}
        </p>
      )}
      <PageHeading
        title={t("lists.title")}
        className="mb-4 text-title font-bold"
      />
      {atLimit ? (
        <Note strong ref={limitNote}>
          {limitMessage}
        </Note>
      ) : (
        <TextEntryForm
          label={t("lists.nameLabel")}
          submitLabel={t("lists.create")}
          disabled={!editable}
          onSubmit={create}
        />
      )}
      {region}
      <Note>{t("lists.storedLocally")}</Note>

      {/* While invalid data is kept, the empty state's advice to create a list would not work. */}
      {!editable ? null : lists.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface px-4 py-9 text-center text-muted-foreground">
          <p className="mb-1 text-lg font-semibold text-foreground">
            {t("lists.emptyTitle")}
          </p>
          <p className="text-balance">{t("lists.emptyBody")}</p>
        </div>
      ) : (
        <ul className="mt-6 border-t">
          {lists.map((list) => (
            <li key={list.id} className="border-b">
              <Link
                to={`/lists/${list.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-md px-1 py-2 outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0">
                  <span className="block font-semibold wrap-anywhere">
                    {list.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t("lists.itemCount", { count: list.items.length })}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-subtle-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
