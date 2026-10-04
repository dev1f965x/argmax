import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { describeError } from "@/lib/errors";
import { browserContext, type Context, type Result } from "@/lib/lists";
import {
  emptyState,
  type LoadResult,
  type Repository,
  type SaveResult,
  type StoredState,
  storageKey,
} from "@/lib/storage";

/** A storage problem the user must know about; null when storage works. */
export type StorageIssue =
  | { kind: "unavailable" }
  | { kind: "full" }
  | { kind: "invalid"; raw: string }
  | null;

interface ListsContextValue {
  state: StoredState;
  issue: StorageIssue;
  /** True while the issue is the one found on start, which needs no interrupting announcement. */
  issueFoundAtLoad: boolean;
  /** False while invalid stored data is kept, so nothing can overwrite it. */
  editable: boolean;
  /** Applies an operation from `@/lib/lists` and saves the result. */
  change: <E>(
    operation: (state: StoredState, context: Context) => Result<E>,
  ) => Result<E | "read-only">;
  /** Deletes invalid stored data after the user confirmed it; returns whether it worked. */
  discardInvalidData: () => boolean;
}

const ListsContext = createContext<ListsContextValue | null>(null);

function initialize(repository: Repository): {
  state: StoredState;
  issue: StorageIssue;
} {
  const loaded = repository.load();
  switch (loaded.status) {
    case "ok":
      return { state: loaded.state, issue: null };
    case "invalid":
      console.error(
        "Stored lists failed validation and were left untouched:",
        describeError(loaded.cause),
      );
      return { state: emptyState, issue: { kind: "invalid", raw: loaded.raw } };
    case "unavailable":
      console.error(
        "Stored lists could not be read:",
        describeError(loaded.cause),
      );
      return { state: emptyState, issue: { kind: "unavailable" } };
  }
}

function issueAfterSave(
  saved: SaveResult,
  current: StorageIssue,
): StorageIssue {
  if (saved.ok) return null;
  switch (saved.reason) {
    case "full":
      return { kind: "full" };
    case "unavailable":
    case "not-loaded":
      return { kind: "unavailable" };
    case "read-only":
      return current;
  }
}

/**
 * Holds the lists for the whole app. Every change is kept in memory and saved,
 * so the app keeps working for the session even when saving fails, and a
 * banner says so.
 *
 * Other tabs share the stored lists. A change starts from the latest stored
 * state, and a save in another tab is shown here at once (the `storage` event),
 * so no tab overwrites lists created in another.
 */
export function ListsProvider({
  repository,
  context = browserContext,
  children,
}: {
  repository: Repository;
  context?: Context;
  children: ReactNode;
}) {
  const [initial] = useState(() => initialize(repository));
  const [state, setState] = useState(initial.state);
  const [issue, setIssue] = useState(initial.issue);
  // Operations read the latest state synchronously, even before React re-renders.
  const stateRef = useRef(initial.state);
  // True after a failed save: memory then holds changes the stored state lacks,
  // and replacing memory with the stored state would drop them. The next
  // successful save writes them, replacing changes other tabs made meanwhile;
  // the banner has told the user that saving is failing.
  const unsaved = useRef(false);
  const editable = issue?.kind !== "invalid";

  // A problem present on start needs no interrupting announcement, and neither
  // does a failed save repeating it (compared by kind). Once it clears, a later
  // problem of the same kind is news again.
  const [quietKind, setQuietKind] = useState(initial.issue?.kind ?? null);
  if (issue === null && quietKind !== null) setQuietKind(null);
  const issueFoundAtLoad = issue !== null && issue.kind === quietKind;

  /**
   * Shows a freshly loaded stored state. Returns the state to build a change
   * on, or null when the stored data is invalid and must not be overwritten.
   */
  const adopt = useCallback((loaded: LoadResult): StoredState | null => {
    switch (loaded.status) {
      case "ok":
        if (unsaved.current) return stateRef.current;
        stateRef.current = loaded.state;
        setState(loaded.state);
        setIssue((current) =>
          current?.kind === "invalid" || current?.kind === "unavailable"
            ? null
            : current,
        );
        return loaded.state;
      case "invalid":
        console.error(
          "Stored lists failed validation and were left untouched:",
          describeError(loaded.cause),
        );
        stateRef.current = emptyState;
        unsaved.current = false;
        setState(emptyState);
        setIssue({ kind: "invalid", raw: loaded.raw });
        return null;
      case "unavailable":
        // Saving reports the problem; until then the lists in memory stay.
        return stateRef.current;
    }
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      // A null key means another tab cleared all of this site's storage.
      if (event.key !== storageKey && event.key !== null) return;
      adopt(repository.load());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [adopt, repository]);

  const change = useCallback(
    <E,>(
      operation: (state: StoredState, context: Context) => Result<E>,
    ): Result<E | "read-only"> => {
      if (!editable) return { ok: false, error: "read-only" };
      // Reading first also lets a tab whose read failed recover once storage
      // works again. Two tabs changing within the same few milliseconds can
      // still both read the old state; a person cannot act in two tabs that fast.
      const base = adopt(repository.load());
      if (base === null) return { ok: false, error: "read-only" };
      const result = operation(base, context);
      if (!result.ok) return result;

      stateRef.current = result.state;
      setState(result.state);
      const saved = repository.save(result.state);
      unsaved.current = !saved.ok;
      if (!saved.ok && "cause" in saved)
        console.error("Saving lists failed:", describeError(saved.cause));
      setIssue((current) => issueAfterSave(saved, current));
      return result;
    },
    [editable, repository, context, adopt],
  );

  const discardInvalidData = useCallback(() => {
    const reset = repository.reset();
    if (!reset.ok) {
      console.error(
        "Deleting stored lists failed:",
        describeError(reset.cause),
      );
      return false;
    }
    stateRef.current = emptyState;
    unsaved.current = false;
    setState(emptyState);
    setIssue(null);
    return true;
  }, [repository]);

  const value = useMemo(
    () => ({
      state,
      issue,
      issueFoundAtLoad,
      editable,
      change,
      discardInvalidData,
    }),
    [state, issue, issueFoundAtLoad, editable, change, discardInvalidData],
  );
  return <ListsContext value={value}>{children}</ListsContext>;
}

export function useLists(): ListsContextValue {
  const value = use(ListsContext);
  if (!value) throw new Error("useLists must be used inside ListsProvider");
  return value;
}
