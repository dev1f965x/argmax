import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useLists } from "@/components/lists-provider";
import { Note } from "@/components/note";
import { TextEntryForm } from "@/components/text-entry-form";
import { createList } from "@/lib/lists";
import { limits } from "@/lib/storage";

export function ListsPage() {
  const { t } = useTranslation();
  const { state, editable, change } = useLists();
  const atLimit = state.lists.length >= limits.lists;
  // Lives outside the form, so creating the 100th list is still announced
  // after the limit message replaces the form.
  const [created, setCreated] = useState<string | null>(null);
  // Newest first, so a list just created appears right under the form.
  const lists = state.lists.toReversed();

  function create(name: string) {
    const result = change((current, context) =>
      createList(current, name, context),
    );
    if (result.ok) {
      setCreated(name.trim());
      return { ok: true } as const;
    }
    const message = {
      empty: t("lists.errors.empty"),
      "too-long": t("lists.errors.tooLong", { limit: limits.textLength }),
      "list-limit": t("lists.limitReached", { limit: limits.lists }),
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
    }[result.error];
    return { ok: false, message } as const;
  }

  return (
    <div className="max-w-160">
      <h1 className="mb-4 text-title font-bold">{t("lists.title")}</h1>
      {atLimit ? (
        <Note strong>{t("lists.limitReached", { limit: limits.lists })}</Note>
      ) : (
        <TextEntryForm
          label={t("lists.nameLabel")}
          submitLabel={t("lists.create")}
          disabled={!editable}
          onSubmit={create}
        />
      )}
      <p role="status" className="sr-only">
        {created && t("lists.created", { name: created })}
      </p>
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
