import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { type ChangeError, useLists } from "@/components/lists-provider";
import { Note } from "@/components/note";
import { PageHeading } from "@/components/page-heading";
import { StatusNotice } from "@/components/status-notice";
import { StorageNote } from "@/components/storage-note";
import {
  type SubmitOutcome,
  TextEntryForm,
} from "@/components/text-entry-form";
import { useScreenView } from "@/components/use-screen-view";
import { fromEarlierVisit, tracker } from "@/lib/analytics";
import { createList, type ListError } from "@/lib/lists";
import { navigationString } from "@/lib/navigation-state";
import { limits } from "@/lib/storage";
import type { CreatedListState } from "@/routes/list-page";

export function ListsPage() {
  const { t } = useTranslation();
  useScreenView("lists");
  const { state, editable, change } = useLists();
  const atLimit = state.lists.length >= limits.lists;
  const limitMessage = t("lists.limitReached", { limit: limits.lists });
  const location = useLocation();
  const navigate = useNavigate();
  // Read once: the history entry is then cleared, so a reload or Back does not
  // show the confirmation again.
  const [deleted] = useState(() =>
    navigationString(location.state, "deletedListName"),
  );

  useEffect(() => {
    if (!deleted) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [deleted, navigate, location.pathname]);

  // Newest first, so a list just created appears right under the form.
  const lists = state.lists.toReversed();

  function create(name: string): SubmitOutcome {
    const result = change((current, context) =>
      createList(current, name, context),
    );
    if (result.ok) {
      tracker.listCreated(
        !state.lists.some((list) => fromEarlierVisit(list.createdAt)),
      );
      // A new list is empty, so the next step is adding items: open it with
      // the item field focused. The new list is the last one stored.
      const created = result.state.lists.at(-1);
      if (created) {
        // The name as saved, which validateText may have cleaned.
        const navigationState: CreatedListState = {
          createdListName: created.name,
        };
        navigate(`/lists/${created.id}`, { state: navigationState });
      }
      return { ok: true };
    }
    const message: Record<ListError | ChangeError, string> = {
      empty: t("lists.errors.empty"),
      "too-long": t("lists.errors.tooLong", { limit: limits.textLength }),
      "list-limit": limitMessage,
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
      "invalid-state": t("common.saveFailed"),
    };
    return { ok: false, message: message[result.error] };
  }

  return (
    <div className="max-w-160">
      {deleted && (
        // The deleted list's screen is gone, so focus moves to the confirmation.
        <StatusNotice>{t("lists.deleted", { name: deleted })}</StatusNotice>
      )}
      <PageHeading
        title={t("lists.title")}
        className="mb-4 text-title font-bold"
      />
      {atLimit ? (
        <Note>{limitMessage}</Note>
      ) : (
        <TextEntryForm
          label={t("lists.nameLabel")}
          submitLabel={t("lists.create")}
          disabled={!editable}
          onSubmit={create}
        />
      )}
      <StorageNote />

      {/* While invalid data is kept, the empty state's advice to create a list would not work. */}
      {!editable ? null : lists.length === 0 ? (
        <EmptyState title={t("lists.emptyTitle")} body={t("lists.emptyBody")} />
      ) : (
        <ul className="mt-6 border-t">
          {lists.map((list) => (
            <li key={list.id} className="border-b">
              <Link
                to={`/lists/${list.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-md px-1 py-2 outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0">
                  <span className="-my-0.5 block overflow-clip py-0.5 font-semibold wrap-anywhere">
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
