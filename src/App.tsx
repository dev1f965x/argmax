import { useState } from "react";
import "./design/base.css";
import "./App.css";
import { OptionList } from "./components/OptionList";
import { Result } from "./components/Result";
import { TopicBar } from "./components/TopicBar";
import { TopicHeader } from "./components/TopicHeader";
import { Undo } from "./components/Undo";
import { UpdateButton } from "./components/UpdateButton";
import { APP_NAME, PICK_LABELS, TOPIC_LABELS } from "./domain/labels";
import { pick, type Random } from "./domain/pick";
import type { Option } from "./domain/topics";
import type { TopicStore } from "./storage/topics";
import { useTopics } from "./topics/useTopics";
import type { UpdateState } from "./update/useUpdate";

export interface AppProps {
  store: TopicStore;
  /** The platform's own source unless a test hands over its own (ADR 4). */
  random?: Random;
  update?: UpdateState;
  onInstallUpdate?: () => void;
}

/**
 * The whole app: the topics along the top, the options of the one on screen, and the
 * button that ends the argument.
 */
export default function App({
  store,
  random,
  update = { status: "current" },
  onInstallUpdate = () => {},
}: AppProps) {
  const topics = useTopics(store);
  const [picked, setPicked] = useState<{ topicId: string; option: Option }>();
  const open = topics.open;
  // A pick belongs to the topic it came from: switching away leaves it behind.
  const shown = picked?.topicId === open?.id ? picked?.option : undefined;

  const draw = () => {
    const option = open && pick(open.options, random);
    setPicked(option && open ? { topicId: open.id, option } : undefined);
  };

  return (
    <div className="app">
      <header className="app__bar">
        <h1 className="app__name">{APP_NAME}</h1>
        <span className="app__version">v{__APP_VERSION__}</span>
        <UpdateButton update={update} onInstall={onInstallUpdate} />
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

            {shown ? (
              <Result option={shown} onAgain={draw} />
            ) : (
              <button
                type="button"
                className="app__pick"
                disabled={open.options.length === 0}
                onClick={draw}
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
