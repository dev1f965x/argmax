import { ChevronRight, CircleAlert, Info } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useLists } from "@/components/lists-provider";
import { StorageBanner } from "@/components/storage-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createList } from "@/lib/lists";
import { limits } from "@/lib/storage";

export function ListsPage() {
  const { t } = useTranslation();
  const { state, editable } = useLists();
  const atLimit = state.lists.length >= limits.lists;
  // Newest first, so a list just created appears right under the form.
  const lists = state.lists.toReversed();

  return (
    <div className="max-w-160">
      <StorageBanner />
      <h1 className="mb-4 text-title font-bold">{t("lists.title")}</h1>
      {atLimit ? (
        <Note strong>{t("lists.limitReached", { limit: limits.lists })}</Note>
      ) : (
        <CreateListForm />
      )}
      <Note>{t("lists.storedLocally")}</Note>

      {/* While invalid data is kept, the empty state's advice to create a list would not work. */}
      {!editable ? null : lists.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface px-4 py-9 text-center text-muted-foreground">
          <p className="mb-1 text-lg font-semibold text-foreground">
            {t("lists.emptyTitle")}
          </p>
          <p>{t("lists.emptyBody")}</p>
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

function CreateListForm() {
  const { t } = useTranslation();
  const { change, editable } = useLists();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = change((state, context) => createList(state, name, context));
    if (result.ok) {
      setName("");
      setError(null);
    } else {
      setError(
        {
          empty: t("lists.errors.empty"),
          "too-long": t("lists.errors.tooLong", { limit: limits.textLength }),
          "list-limit": t("lists.limitReached", { limit: limits.lists }),
          "not-found": null,
          "read-only": null,
        }[result.error],
      );
    }
    // Keeps focus in the field so the next name or a correction can be typed at once.
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="sr-only">
        {t("lists.nameLabel")}
      </label>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id={inputId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("lists.nameLabel")}
          autoComplete="off"
          disabled={!editable}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit" disabled={!editable}>
          {t("lists.create")}
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 flex gap-1.5 text-sm font-medium text-destructive"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0"
          />
          {error}
        </p>
      )}
    </form>
  );
}

function Note({
  children,
  strong = false,
}: {
  children: string;
  strong?: boolean;
}) {
  return (
    <p
      className={
        strong
          ? "mt-2 flex gap-1.5 font-semibold"
          : "mt-2 flex gap-1.5 text-sm text-muted-foreground"
      }
    >
      <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />
      {children}
    </p>
  );
}
