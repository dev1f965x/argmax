import { useEffect, useState } from "react";
import "./design/base.css";
import "./App.css";
import { OptionList } from "./components/OptionList";
import { Result } from "./components/Result";
import { TopicBar } from "./components/TopicBar";
import { TopicHeader } from "./components/TopicHeader";
import { Undo } from "./components/Undo";
import { APP_NAME, PICK_LABELS, TOPIC_LABELS } from "./domain/labels";
import { pick, type Random } from "./domain/pick";
import type { Option } from "./domain/topics";
import type { TopicStore } from "./storage/topics";
import { useTopics } from "./topics/useTopics";

export interface AppProps {
  store: TopicStore;
  /** The platform's own source unless a test hands over its own (ADR 4). */
  random?: Random;
}

/**
 * The whole app: the topics along the top, the options of the one on screen, and the
 * button that ends the argument.
 */
export default function App({ store, random }: AppProps) {
  const topics = useTopics(store);
  const [picked, setPicked] = useState<Option>();
  const open = topics.open;

  // A pick belongs to the topic it came from, and to the options as they were.
  useEffect(() => {
    setPicked(undefined);
  }, [open?.id]);

  return (
    <div className="app">
      <header className="app__bar">
        <h1 className="app__name">{APP_NAME}</h1>
        <span className="app__version">v{__APP_VERSION__}</span>
      </header>

      <TopicBar topics={topics.topics} open={open} onShow={topics.show} onAdd={topics.add} />

      <main className="app__main">
        {open ? (
          <>
            <TopicHeader
              topic={open}
              onRename={(name) => topics.rename(open.id, name)}
              onRemove={() => topics.remove(open.id)}
            />

            <OptionList
              topic={open}
              onAdd={(name) => topics.addOption(open.id, name)}
              onRemove={(optionId) => {
                topics.removeOption(open.id, optionId);
                setPicked(undefined);
              }}
            />

            {picked ? (
              <Result option={picked} onAgain={() => setPicked(pick(open.options, random))} />
            ) : (
              <button
                type="button"
                className="app__pick"
                disabled={open.options.length === 0}
                onClick={() => setPicked(pick(open.options, random))}
              >
                {PICK_LABELS.pick}
              </button>
            )}
          </>
        ) : (
          <div className="app__empty">
            <p className="app__empty-title">{TOPIC_LABELS.empty}</p>
            <p className="app__empty-detail">{TOPIC_LABELS.emptyDetail}</p>
          </div>
        )}
      </main>

      {topics.removed && (
        <Undo
          message={TOPIC_LABELS.removed(topics.removed.name)}
          onUndo={topics.undoRemove}
          onDismiss={topics.forgetRemoved}
        />
      )}
    </div>
  );
}
