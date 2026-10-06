import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAnnouncer } from "@/components/announcer";
import { BackToLists } from "@/components/back-to-lists";
import { type ChangeError, useLists } from "@/components/lists-provider";
import { Note } from "@/components/note";
import { PageHeading } from "@/components/page-heading";
import { PickPanel } from "@/components/pick-panel";
import { Snackbar } from "@/components/snackbar";
import {
  type SubmitOutcome,
  TextEntryForm,
} from "@/components/text-entry-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useScreenView } from "@/components/use-screen-view";
import { useShowChances } from "@/components/use-show-chances";
import { WeightField } from "@/components/weight-field";
import { fromEarlierVisit } from "@/lib/analytics";
import {
  addItem,
  deleteList,
  editItem,
  type ItemError,
  type ListError,
  type Result,
  removeItem,
  renameList,
  restoreItem,
  setItemWeight,
  validateText,
  type WeightError,
} from "@/lib/lists";
import { navigationString } from "@/lib/navigation-state";
import { type Chance, chances } from "@/lib/pick";
import { type Item, limits } from "@/lib/storage";
import { NotFoundPage } from "@/routes/not-found-page";

/**
 * Where focus goes after a change that removes the focused control: a row's
 * Edit button, the List actions button, or the add field (the limit message
 * when the field is gone).
 */
type FocusTarget = { itemId: string } | "actions" | "entry" | null;

/**
 * The text as a successful change saved it, which validateText may have
 * cleaned (a pasted tab becomes a space), so announcements match the list.
 */
function savedText(input: string): string {
  const text = validateText(input);
  return text.ok ? text.value : input;
}

/** Navigation state that tells the Lists screen which list was just deleted. */
interface DeletedListState {
  deletedListName: string;
}

/** Navigation state from the Lists screen when it opens a list it just created. */
export interface CreatedListState {
  createdListName: string;
}

/**
 * Moves focus without moving the page for touch and mouse users, who do not
 * follow focus; keyboard users (focus-visible) get the control scrolled into
 * view above the fixed bars, which scroll-padding accounts for.
 */
function moveFocus(element: HTMLElement) {
  element.focus({ preventScroll: true });
  if (element.matches(":focus-visible"))
    element.scrollIntoView({ block: "nearest" });
}

/**
 * An item's edit row: its text, its weight, Cancel, and Save. The weight is a
 * draft until Save, which applies both; Cancel discards both.
 */
function ItemEditor({
  item,
  itemCount,
  onSave,
  onCancel,
}: {
  item: Item;
  itemCount: number;
  onSave: (text: string, weight: number) => SubmitOutcome;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState<number | null>(item.weight);
  return (
    <TextEntryForm
      label={t("list.editLabel")}
      submitLabel={t("list.save")}
      initialValue={item.text}
      autoFocus
      stacked
      accessory={
        <WeightField
          value={weight}
          // A stored weight above the item count (left by removals) stays
          // reachable, so it can be kept or lowered, never raised (FR12).
          max={Math.max(itemCount, item.weight)}
          onValueChange={setWeight}
        />
      }
      // A cleared weight field keeps the stored weight.
      onSubmit={(text) => onSave(text, weight ?? item.weight)}
      cancel={{ label: t("list.cancel"), onCancel }}
    />
  );
}

export function ListPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { state, editable, change } = useLists();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Set while a deleted list's screen waits for navigation, so it does not
  // render "Page not found" in between.
  const [deleting, setDeleting] = useState(false);
  const actionsButton = useRef<HTMLButtonElement>(null);
  // One row is edited at a time; opening another row's editor discards an unsaved draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const location = useLocation();
  // Read once: the history entry is then cleared, so a reload or Back does not
  // announce the new list or move focus again.
  const [created] = useState(() =>
    navigationString(location.state, "createdListName"),
  );
  // A list just created is empty, so focus starts in the add field.
  // The last removed item, offered for Undo until the user does something
  // else in this list: a change, a pick, the menu, or editing a row.
  const [undo, setUndo] = useState<{
    listId: string;
    item: Item;
    index: number;
  } | null>(null);
  const undoId = useId();
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(
    created ? "entry" : null,
  );
  const { announce, region } = useAnnouncer();
  const [showChances, setShowChances] = useShowChances();
  const chancesSwitchId = useId();
  const itemCountId = useId();
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const editButtonRefs = useRef(
    new Map<string, (element: HTMLButtonElement | null) => void>(),
  );
  const addField = useRef<HTMLInputElement>(null);
  const limitNote = useRef<HTMLParagraphElement>(null);

  const list = state.lists.find((candidate) => candidate.id === id);
  // An unknown list renders NotFoundPage, which reports itself.
  useScreenView(list ? "list" : null);

  useEffect(() => {
    if (!created) return;
    announce(t("lists.created", { name: created }));
    navigate(location.pathname, { replace: true, state: null });
  }, [created, announce, t, navigate, location.pathname]);

  useEffect(() => {
    if (!focusTarget) return;
    const element =
      focusTarget === "actions"
        ? actionsButton.current
        : ((focusTarget === "entry"
            ? undefined
            : editButtons.current.get(focusTarget.itemId)) ??
          addField.current ??
          limitNote.current);
    if (element) moveFocus(element);
    setFocusTarget(null);
  }, [focusTarget]);

  if (!list) return deleting ? null : <NotFoundPage />;
  const listId = list.id;
  // Newest first, matching the Lists screen, so an added item appears right under the form.
  const items = list.items.toReversed();
  const itemChances = showChances
    ? chances(items.map((item) => item.weight))
    : null;
  const itemCount = list.items.length;
  const atLimit = itemCount >= limits.itemsPerList;
  const limitMessage = t("list.limitReached", { limit: limits.itemsPerList });

  function rename(name: string): SubmitOutcome {
    const result = change((current, context) =>
      renameList(current, listId, name, context),
    );
    if (result.ok) {
      setUndo(null);
      setRenaming(false);
      announce(t("list.renamed", { name: savedText(name) }));
      setFocusTarget("actions");
      return { ok: true };
    }
    const message: Record<ListError | ChangeError, string> = {
      empty: t("lists.errors.empty"),
      "too-long": t("lists.errors.tooLong", { limit: limits.textLength }),
      "list-limit": t("common.saveFailed"),
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
      "invalid-state": t("common.saveFailed"),
    };
    return { ok: false, message: message[result.error] };
  }

  function confirmDelete(name: string) {
    const result = change((current) => deleteList(current, listId));
    setConfirmingDelete(false);
    if (!result.ok) {
      announce(t("common.saveFailed"));
      return;
    }
    setDeleting(true);
    const navigationState: DeletedListState = { deletedListName: name };
    // Replaces the deleted list's history entry, so Back does not lead to it.
    navigate("/", { replace: true, state: navigationState });
  }

  function outcome(
    result:
      | { ok: true }
      | { ok: false; error: ItemError | WeightError | ChangeError },
  ): SubmitOutcome {
    if (result.ok) return { ok: true };
    const message: Record<ItemError | WeightError | ChangeError, string> = {
      empty: t("list.errors.empty"),
      "too-long": t("list.errors.tooLong", { limit: limits.textLength }),
      "item-limit": limitMessage,
      // The field keeps the weight in range, so this means the list changed
      // meanwhile, for example in another tab.
      "invalid-weight": t("common.saveFailed"),
      "not-found": t("common.saveFailed"),
      "read-only": t("common.saveFailed"),
      "invalid-state": t("common.saveFailed"),
    };
    return { ok: false, message: message[result.error] };
  }

  function add(text: string): SubmitOutcome {
    const result = change((current, context) =>
      addItem(current, listId, text, context),
    );
    if (result.ok) {
      setUndo(null);
      const added = t("list.added", { text: savedText(text) });
      if (itemCount + 1 >= limits.itemsPerList) {
        // The limit message replaces the field, so it takes focus and is announced.
        announce(`${added} ${limitMessage}`);
        setFocusTarget("entry");
      } else {
        announce(added);
      }
    }
    return outcome(result);
  }

  function save(item: Item, text: string, weight: number): SubmitOutcome {
    // One change, so text and weight are saved together or not at all.
    const result = change(
      (current, context): Result<ItemError | WeightError> => {
        const edited = editItem(current, listId, item.id, text, context);
        return edited.ok
          ? setItemWeight(edited.state, listId, item.id, weight, context)
          : edited;
      },
    );
    if (result.ok) {
      setUndo(null);
      setEditingId(null);
      announce(
        weight === item.weight
          ? t("list.saved", { text: savedText(text) })
          : t("list.savedWithWeight", { text: savedText(text), weight }),
      );
      setFocusTarget({ itemId: item.id });
    }
    return outcome(result);
  }

  function cancelEdit(item: Item) {
    setEditingId(null);
    setFocusTarget({ itemId: item.id });
  }

  function remove(item: Item, index: number) {
    // Rows are shown newest first; Undo needs the position in stored order.
    const storedIndex = itemCount - 1 - index;
    const result = change((current, context) =>
      removeItem(current, listId, item.id, context),
    );
    if (!result.ok) {
      announce(t("common.saveFailed"));
      return;
    }
    setUndo({ listId, item, index: storedIndex });
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

  function restore(item: Item, index: number) {
    const result = change((current, context) =>
      restoreItem(current, listId, item, index, context),
    );
    const done = outcome(result);
    if (!done.ok) {
      announce(done.message);
      return;
    }
    setUndo(null);
    announce(t("list.restored", { text: item.text }));
    setFocusTarget({ itemId: item.id });
  }

  // "<" and ">" are read inconsistently by screen readers, so those chances
  // are also spelled out for them, the way the badge adds its label.
  function chanceText(chance: Chance): ReactNode {
    switch (chance.kind) {
      case "below-one":
        return (
          <>
            <span aria-hidden="true">{t("list.chanceUnderOne")}</span>
            <span className="sr-only">{t("list.chanceUnderOneSpoken")}</span>
          </>
        );
      case "above-ninety-nine":
        return (
          <>
            <span aria-hidden="true">{t("list.chanceOverNinetyNine")}</span>
            <span className="sr-only">
              {t("list.chanceOverNinetyNineSpoken")}
            </span>
          </>
        );
      case "percent":
        return t("list.chance", { percent: chance.value });
    }
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
    <>
      <BackToLists />
      {/* The pick panel starts level with the title, below the back link. */}
      {/* In the DOM the pick panel follows the title, so keyboard users reach
          Pick before the items; the grid places it in the right column on
          desktop, and on phones it is a fixed bar at the bottom. */}
      <div className="md:grid md:grid-list md:items-start md:gap-x-12">
        <div className="min-w-0">
          {renaming ? (
            <>
              {/* Keeps the page heading for screen readers while the title is a field. */}
              <PageHeading title={list.name} className="sr-only" />
              <div className="pt-1">
                <TextEntryForm
                  label={t("list.rename")}
                  visibleLabel
                  submitLabel={t("list.save")}
                  initialValue={list.name}
                  autoFocus
                  onSubmit={rename}
                  cancel={{
                    label: t("list.cancel"),
                    onCancel: () => {
                      setRenaming(false);
                      setFocusTarget("actions");
                    },
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <PageHeading
                title={list.name}
                // The count follows the pick panel in the DOM, so the heading
                // points to it to keep it read right after the name.
                describedBy={itemCountId}
                className="overflow-clip pt-1 text-title font-bold wrap-anywhere"
              />
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) setUndo(null);
                }}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      ref={actionsButton}
                      variant="ghost"
                      size="icon"
                      disabled={!editable}
                      aria-label={t("list.actions")}
                      className="shrink-0 text-muted-foreground"
                    />
                  }
                >
                  <Ellipsis aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRenaming(true)}>
                    <Pencil aria-hidden="true" />
                    {t("list.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("list.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <AlertDialog
            open={confirmingDelete}
            onOpenChange={setConfirmingDelete}
          >
            {/* Opened from the menu, so focus returns to the List actions button. */}
            <AlertDialogContent finalFocus={actionsButton}>
              <AlertDialogHeader>
                <AlertDialogTitle className="wrap-anywhere">
                  {t("list.deleteTitle", { name: list.name })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("list.deleteBody", { count: list.items.length })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("list.cancel")}</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() => confirmDelete(list.name)}
                >
                  {t("list.delete")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {/* Keyed by list, so a result or a running cycle never carries over to another list. */}
        <PickPanel
          key={listId}
          items={items}
          announce={announce}
          onPick={() => setUndo(null)}
          earlierVisit={fromEarlierVisit(list.createdAt)}
        />
        {/* On phones the bottom padding keeps room for the Undo snackbar above
            the pick bar at all times, so it overlays nothing that cannot be
            scrolled to, and showing or hiding it never moves the page. On
            desktop the layout keeps that room below the footer instead. */}
        <div className="min-w-0 pb-24 md:pb-0">
          {/* After the pick panel in the DOM, so Tab still reaches Pick right
              after the list's actions; shown under the title. */}
          {!renaming && (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-sm text-muted-foreground">
              <p id={itemCountId}>
                {t("list.itemCount", { count: itemCount })}
              </p>
              {/* The whole label is the 44 px target, not only the small track. */}
              <label
                htmlFor={chancesSwitchId}
                // Negative margins (balanced on the row) keep the row as
                // compact as in the wireframes while the label stays a 44 px
                // target.
                className="-my-1.5 flex min-h-11 cursor-pointer items-center gap-2"
              >
                {t("list.showChances")}
                <Switch
                  id={chancesSwitchId}
                  checked={showChances}
                  onCheckedChange={(checked) => setShowChances(checked)}
                />
              </label>
            </div>
          )}
          <div className="mt-5">
            {atLimit ? (
              <Note ref={limitNote}>{limitMessage}</Note>
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
          {/* Shown at the bottom of the screen, but placed after the add form
              in the DOM, so Tab reaches Undo before the list. */}
          {undo?.listId === listId && (
            <Snackbar>
              {/* At most two lines, so the room kept for it always suffices;
                  a long item name is cut visually, and Undo's description
                  still gives screen readers the whole text. */}
              <p
                id={undoId}
                className="line-clamp-2 min-w-0 text-sm wrap-anywhere"
              >
                {t("list.removed", { text: undo.item.text })}
              </p>
              <Button
                variant="ghost"
                disabled={!editable}
                onClick={() => restore(undo.item, undo.index)}
                // Says what Undo restores when the button is reached on its own.
                aria-describedby={undoId}
                className="shrink-0"
              >
                {t("list.undo")}
              </Button>
            </Snackbar>
          )}

          {/* An empty list needs no empty state: the count says "0 items",
              focus is in the add field, and Pick says why it is unavailable. */}
          {items.length > 0 && (
            <ul className="mt-4 border-t">
              {items.map((item, index) => {
                const chance = itemChances?.[index];
                return (
                  <li key={item.id} className="border-b">
                    {editingId === item.id ? (
                      <div className="py-2">
                        <ItemEditor
                          item={item}
                          itemCount={itemCount}
                          onSave={(text, weight) => save(item, text, weight)}
                          onCancel={() => cancelEdit(item)}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-14 items-center gap-1 py-1 pl-1">
                        <div className="min-w-0 flex-1 py-2">
                          <span className="block overflow-clip wrap-anywhere">
                            {item.text}
                          </span>
                          {chance && (
                            <span className="block text-sm text-muted-foreground tabular-nums">
                              {chanceText(chance)}
                            </span>
                          )}
                        </div>
                        {item.weight !== 1 && (
                          <span className="mr-1 shrink-0 rounded-sm bg-brand-soft px-1.5 py-0.5 text-sm font-semibold text-brand-strong tabular-nums">
                            {/* Read as "Weight ×2", so the sign is not read alone. */}
                            <span className="sr-only">{t("list.weight")} </span>
                            {t("list.weightValue", { weight: item.weight })}
                          </span>
                        )}
                        <Button
                          ref={editButtonRef(item.id)}
                          variant="ghost"
                          size="icon"
                          disabled={!editable}
                          aria-label={t("list.edit", { text: item.text })}
                          onClick={() => {
                            setUndo(null);
                            setEditingId(item.id);
                          }}
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
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
