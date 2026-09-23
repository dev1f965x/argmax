import { useState } from "react";
import { OPTION_LABELS } from "../domain/labels";
import { isNewOption, type Topic } from "../domain/topics";
import "./OptionList.css";

interface Props {
  topic: Topic;
  onAdd: (name: string) => void;
  onRemove: (optionId: string) => void;
}

/** The options of the topic on screen, newest at the bottom, with a line to add another. */
export function OptionList({ topic, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isNewOption(topic, name)) return;

    onAdd(name);
    setName("");
  };

  return (
    <section className="options" aria-labelledby="options-heading">
      <header className="options__header">
        <h2 className="options__heading" id="options-heading">
          {OPTION_LABELS.heading}
        </h2>
        <p className="options__count">{OPTION_LABELS.count(topic.options.length)}</p>
      </header>

      {topic.options.length === 0 ? (
        <p className="options__empty">{OPTION_LABELS.empty}</p>
      ) : (
        <ul className="options__list">
          {topic.options.map((option) => (
            <li key={option.id} className="options__option">
              <span className="options__name">{option.name}</span>
              <button
                type="button"
                className="options__remove"
                aria-label={OPTION_LABELS.remove(option.name)}
                onClick={() => onRemove(option.id)}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="m3 3 6 6M9 3l-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="options__form" onSubmit={submit}>
        <input
          className="options__field"
          value={name}
          placeholder={OPTION_LABELS.addPlaceholder}
          aria-label={OPTION_LABELS.addPlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" className="options__add" disabled={!isNewOption(topic, name)}>
          {OPTION_LABELS.add}
        </button>
      </form>
    </section>
  );
}
