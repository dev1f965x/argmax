import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useLists } from "@/components/lists-provider";
import { Note } from "@/components/note";
import {
  type SubmitOutcome,
  TextEntryForm,
} from "@/components/text-entry-form";
import { Button } from "@/components/ui/button";
import { addItem, editItem, type ItemError, removeItem } from "@/lib/lists";
import { type Item, limits } from "@/lib/storage";
import { NotFoundPage } from "@/routes/not-found-page";

/** Where focus goes after a change that removes or replaces the focused control. */
type FocusTarget =
  | { control: "edit" | "remove"; itemId: string }
  | { control: "add" }
  | null;

export function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { state, editable, change } = useLists();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const addField = useRef<HTMLInputElement>(null);

  const list = state.lists.find((candidate) => candidate.id === id);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.control === "add") addField.current?.focus();
    else
      buttons.current
        .get(`${focusTarget.control}:${focusTarget.itemId}`)
        ?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  if (!list) return <NotFoundPage />;
  const listId = list.id;
  // Newest first, matching the Lists screen, so an added item appears right under the form.
  const items = list.items.toReversed();
  const atLimit = list.items.length >= limits.itemsPerList;

  function outcome(
    result: { ok: true } | { ok: false; error: ItemError | "read-only" },
  ): SubmitOutcome {
    if (result.ok) return { ok: true };
    const message = {
      empty: t("list.errors.empty"),
      "too-long": t("list.errors.tooLong", { limit: limits.textLength }),
      "item-limit": t("list.limitReached", { limit: limits.itemsPerList }),
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
    }[result.error];
    return { ok: false, message };
  }

  function add(text: string): SubmitOutcome {
    const result = change((current, context) =>
      addItem(current, listId, text, context),
    );
    if (result.ok) setAnnouncement(t("list.added", { text: text.trim() }));
    return outcome(result);
  }

  function save(item: Item, text: string): SubmitOutcome {
    const result = change((current, context) =>
      editItem(current, listId, item.id, text, context),
    );
    if (result.ok) {
      setEditingId(null);
      setAnnouncement(t("list.saved", { text: text.trim() }));
      setFocusTarget({ control: "edit", itemId: item.id });
    }
    return outcome(result);
  }

  function cancelEdit(item: Item) {
    setEditingId(null);
    setFocusTarget({ control: "edit", itemId: item.id });
  }

  function remove(item: Item, index: number) {
    const result = change((current, context) =>
      removeItem(current, listId, item.id, context),
    );
    if (!result.ok) {
      setAnnouncement(t("common.saveFailed"));
      return;
    }
    setAnnouncement(t("list.removed", { text: item.text }));
    // The next row takes the removed row's place; the previous one if it was last.
    const neighbor = items[index + 1] ?? items[index - 1];
    setFocusTarget(
      neighbor
        ? { control: "remove", itemId: neighbor.id }
        : { control: "add" },
    );
  }

  function register(key: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) buttons.current.set(key, element);
      else buttons.current.delete(key);
    };
  }

  return (
    <div className="max-w-160">
      <Link
        to="/"
        className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {t("list.allLists")}
      </Link>
      <h1 className="text-title font-bold wrap-anywhere">{list.name}</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t("lists.itemCount", { count: list.items.length })}
      </p>

      <div className="mt-5">
        {atLimit ? (
          <Note strong>
            {t("list.limitReached", { limit: limits.itemsPerList })}
          </Note>
        ) : (
          <TextEntryForm
            label={t("list.addLabel")}
            submitLabel={t("list.add")}
            disabled={!editable}
            onSubmit={add}
            fieldRef={addField}
          />
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface px-4 py-9 text-center text-muted-foreground">
          <p className="mb-1 text-lg font-semibold text-foreground">
            {t("list.emptyTitle")}
          </p>
          <p className="text-balance">{t("list.emptyBody")}</p>
        </div>
      ) : (
        <ul className="mt-4 border-t">
          {items.map((item, index) => (
            <li key={item.id} className="border-b">
              {editingId === item.id ? (
                <div className="py-2">
                  <TextEntryForm
                    label={t("list.editLabel")}
                    submitLabel={t("list.save")}
                    initialValue={item.text}
                    autoFocus
                    onSubmit={(text) => save(item, text)}
                    cancel={{
                      label: t("list.cancel"),
                      onCancel: () => cancelEdit(item),
                    }}
                  />
                </div>
              ) : (
                <div className="flex min-h-14 items-center gap-1 py-1 pl-1">
                  <span className="min-w-0 flex-1 py-2 wrap-anywhere">
                    {item.text}
                  </span>
                  <Button
                    ref={register(`edit:${item.id}`)}
                    variant="ghost"
                    size="icon"
                    disabled={!editable}
                    aria-label={t("list.edit", { text: item.text })}
                    onClick={() => setEditingId(item.id)}
                    className="text-muted-foreground"
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    ref={register(`remove:${item.id}`)}
                    variant="ghost"
                    size="icon"
                    disabled={!editable}
                    aria-label={t("list.remove", { text: item.text })}
                    onClick={() => remove(item, index)}
                    className="text-muted-foreground"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
