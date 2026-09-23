import { useEffect } from "react";
import { TOPIC_LABELS } from "../domain/labels";
import "./Undo.css";

interface Props {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/** How long a removed topic can be brought back before the offer goes away. */
const OFFERED_FOR_MS = 6000;

/** The one thing that cannot be retyped in a second: a topic and everything in it. */
export function Undo({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, OFFERED_FOR_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="undo" role="status">
      <p className="undo__message">{message}</p>
      <button type="button" className="undo__action" onClick={onUndo}>
        {TOPIC_LABELS.undo}
      </button>
    </div>
  );
}
