import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useAnnouncer } from "@/components/announcer";
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

/**
 * Where focus goes after a change that removes the focused control: a row's
 * Edit button, or the add field (the limit message when the field is gone).
 */
type FocusTarget = { itemId: string } | "entry" | null;

export function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { state, editable, change } = useLists();
  // One row is edited at a time; opening another row's editor discards an unsaved draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const { announce, region } = useAnnouncer();
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const editButtonRefs = useRef(
    new Map<string, (element: HTMLButtonElement | null) => void>(),
  );
  const addField = useRef<HTMLInputElement>(null);
  const limitNote = useRef<HTMLParagraphElement>(null);

  const list = state.lists.find((candidate) => candidate.id === id);

  useEffect(() => {
    if (!focusTarget) return;
    const button =
      focusTarget === "entry"
        ? undefined
        : editButtons.current.get(focusTarget.itemId);
    (button ?? addField.current ?? limitNote.current)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  if (!list) return <NotFoundPage />;
  const listId = list.id;
  // Newest first, matching the Lists screen, so an added item appears right under the form.
  const items = list.items.toReversed();
  const atLimit = list.items.length >= limits.itemsPerList;
  const limitMessage = t("list.limitReached", { limit: limits.itemsPerList });

  function outcome(
    result: { ok: true } | { ok: false; error: ItemError | "read-only" },
  ): SubmitOutcome {
    if (result.ok) return { ok: true };
    const message = {
      empty: t("list.errors.empty"),
      "too-long": t("list.errors.tooLong", { limit: limits.textLength }),
      "item-limit": limitMessage,
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
    }[result.error];
    return { ok: false, message };
  }

  function add(text: string): SubmitOutcome {
    const result = change((current, context) =>
      addItem(current, listId, text, context),
    );
    if (result.ok) {
      const added = t("list.added", { text: text.trim() });
      if (list && list.items.length + 1 >= limits.itemsPerList) {
        // The limit message replaces the field, so it takes focus and is announced.
        announce(`${added} ${limitMessage}`);
        setFocusTarget("entry");
      } else {
        announce(added);
      }
    }
    return outcome(result);
  }

  function save(item: Item, text: string): SubmitOutcome {
    const result = change((current, context) =>
      editItem(current, listId, item.id, text, context),
    );
    if (result.ok) {
      setEditingId(null);
      announce(t("list.saved", { text: text.trim() }));
      setFocusTarget({ itemId: item.id });
    }
    return outcome(result);
  }

  function cancelEdit(item: Item) {
    setEditingId(null);
    setFocusTarget({ itemId: item.id });
  }

  function remove(item: Item, index: number) {
    const result = change((current, context) =>
      removeItem(current, listId, item.id, context),
    );
    if (!result.ok) {
      announce(t("common.saveFailed"));
      return;
    }
    announce(t("list.removed", { text: item.text }));
    // Focus moves to the Edit button of the row that takes the removed row's
    // place (the previous one if it was last), skipping a row being edited.
    // Edit rather than Remove, so holding Enter cannot remove row after row.
    const neighbor = [
      ...items.slice(index + 1),
      ...items.slice(0, index).reverse(),
    ].find((candidate) => candidate.id !== editingId);
    setFocusTarget(neighbor ? { itemId: neighbor.id } : "entry");
  }

  // Stable per item, so rows do not detach and reattach their refs on every render.
  function editButtonRef(itemId: string) {
    let callback = editButtonRefs.current.get(itemId);
    if (!callback) {
      callback = (element) => {
        if (element) editButtons.current.set(itemId, element);
        else {
          editButtons.current.delete(itemId);
          editButtonRefs.current.delete(itemId);
        }
      };
      editButtonRefs.current.set(itemId, callback);
    }
    return callback;
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
        {t("list.itemCount", { count: list.items.length })}
      </p>

      <div className="mt-5">
        {atLimit ? (
          <Note strong ref={limitNote}>
            {limitMessage}
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
      {region}

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
                    ref={editButtonRef(item.id)}
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
