import type { CSSProperties } from "react";
import { UPDATE_LABELS } from "../domain/labels";
import type { UpdateState } from "../update/useUpdate";
import "./UpdateButton.css";

interface Props {
  update: UpdateState;
  onInstall: () => void;
}

/**
 * A pill beside the app's name while a newer release is waiting, on the installed Windows
 * build only; the page and the Android app are replaced elsewhere (ADR 8).
 *
 * While the release downloads the pill fills with its progress, and after a failure it
 * offers to retry.
 */
export function UpdateButton({ update, onInstall }: Props) {
  if (update.status === "current") return null;

  const installing = update.status === "installing";
  const message =
    update.status === "failed"
      ? UPDATE_LABELS.failed
      : installing
        ? UPDATE_LABELS.downloading(update.version)
        : UPDATE_LABELS.available(update.version);
  const action = installing ? (
    <>
      <span className="update__verb">{UPDATE_LABELS.installing}</span>
      {UPDATE_LABELS.progress(update.progress)}
    </>
  ) : update.status === "failed" ? (
    UPDATE_LABELS.retry
  ) : (
    UPDATE_LABELS.install
  );
  const progress = installing ? { "--progress": update.progress ?? 0 } : undefined;

  return (
    <div className="update" role="status">
      <span className="visually-hidden">{message}</span>
      <button
        type="button"
        className="update__button"
        data-status={update.status}
        disabled={installing}
        title={message}
        style={progress as CSSProperties}
        onClick={onInstall}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.5v8m-3.5-3.5L8 10.5 11.5 7M3 13.5h10" />
        </svg>
        <span>{action}</span>
      </button>
    </div>
  );
}
