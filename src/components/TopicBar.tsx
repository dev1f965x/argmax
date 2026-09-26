import { useState } from "react";
import { OPTION_LABELS, TOPIC_LABELS } from "../domain/labels";
import { isNewName, type Topic } from "../domain/topics";
import { takeFocus } from "./takeFocus";
import "./TopicBar.css";

interface Props {
  topics: readonly Topic[];
  open?: Topic;
  onShow: (id: string) => void;
  onAdd: (name: string) => void;
}

/** The topics, side by side, with the one on screen marked and a way to add another. */
export function TopicBar({ topics, open, onShow, onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isNewName(topics, name)) return;

    onAdd(name);
    setName("");
    setAdding(false);
  };

  return (
    <nav className="topics" aria-label={TOPIC_LABELS.heading}>
      <ul className="topics__list">
        {topics.map((topic) => (
          <li key={topic.id}>
            <button
              type="button"
              className="topics__topic"
              aria-current={topic.id === open?.id}
              onClick={() => onShow(topic.id)}
            >
              {topic.name}
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <form className="topics__form" onSubmit={submit}>
          <input
            ref={takeFocus}
            className="topics__field"
            value={name}
            placeholder={TOPIC_LABELS.addPlaceholder}
            aria-label={TOPIC_LABELS.addLabel}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => !name && setAdding(false)}
          />
          <button type="submit" className="topics__save" disabled={!isNewName(topics, name)}>
            {OPTION_LABELS.add}
          </button>
        </form>
      ) : (
        <button type="button" className="topics__add" onClick={() => setAdding(true)}>
          <span aria-hidden="true">+</span>
          {TOPIC_LABELS.add}
        </button>
      )}
    </nav>
  );
}
