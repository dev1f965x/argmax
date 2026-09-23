import { useState } from "react";
import { TOPIC_LABELS } from "../domain/labels";
import type { Topic } from "../domain/topics";
import { takeFocus } from "./takeFocus";
import "./TopicHeader.css";

interface Props {
  topic: Topic;
  onRename: (name: string) => void;
  onRemove: () => void;
}

/** The topic on screen: its name, edited in place, and the one way to get rid of it. */
export function TopicHeader({ topic, onRename, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);

  const commit = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== topic.name) onRename(name);
    else setName(topic.name);
  };

  const remove = () => {
    const count = topic.options.length;
    if (count > 0 && !window.confirm(TOPIC_LABELS.removeAsk(topic.name, count))) return;
    onRemove();
  };

  return (
    <header className="topic">
      {editing ? (
        <input
          ref={takeFocus}
          className="topic__field"
          value={name}
          aria-label={TOPIC_LABELS.rename}
          onChange={(event) => setName(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setName(topic.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="topic__name"
          title={TOPIC_LABELS.rename}
          onClick={() => {
            setName(topic.name);
            setEditing(true);
          }}
        >
          <h2>{topic.name}</h2>
        </button>
      )}

      <button type="button" className="topic__remove" onClick={remove}>
        {TOPIC_LABELS.remove}
      </button>
    </header>
  );
}
