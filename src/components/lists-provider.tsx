import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { describeError } from "@/lib/errors";
import { browserContext, type Context, type Result } from "@/lib/lists";
import {
  emptyState,
  type Repository,
  type SaveResult,
  type StoredState,
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
 * Holds the lists for the whole app. The state is loaded once; every change is
 * kept in memory and saved, so the app keeps working for the session even when
 * saving fails, and a banner says so.
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
  const editable = issue?.kind !== "invalid";
  const issueFoundAtLoad = issue !== null && issue === initial.issue;

  const change = useCallback(
    <E,>(
      operation: (state: StoredState, context: Context) => Result<E>,
    ): Result<E | "read-only"> => {
      if (!editable) return { ok: false, error: "read-only" };
      const result = operation(stateRef.current, context);
      if (!result.ok) return result;

      stateRef.current = result.state;
      setState(result.state);
      const saved = repository.save(result.state);
      if (!saved.ok && "cause" in saved)
        console.error("Saving lists failed:", describeError(saved.cause));
      setIssue((current) => issueAfterSave(saved, current));
      return result;
    },
    [editable, repository, context],
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
