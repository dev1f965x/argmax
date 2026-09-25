import { useCallback, useEffect, useMemo, useState } from "react";
import type { Topic } from "../domain/topics";
import * as topicsIn from "../domain/topics";
import type { TopicStore } from "../storage/topics";

/** A topic that was just removed, kept only long enough to put it back. */
interface Removed {
  topic: Topic;
  at: number;
}

/**
 * Every topic, the one on screen, and the last removal.
 *
 * The store is written on every change rather than behind a save button, since the list
 * is edited in passing and an unsaved edit would be lost.
 */
export function useTopics(store: TopicStore) {
  const [topics, setTopics] = useState<Topic[]>(() => store.read());
  const [openId, setOpenId] = useState<string | undefined>(() => store.read()[0]?.id);
  const [removed, setRemoved] = useState<Removed>();

  useEffect(() => {
    store.write(topics);
  }, [store, topics]);

  const open = useMemo(
    () => topics.find((topic) => topic.id === openId) ?? topics[0],
    [topics, openId],
  );

  const add = useCallback((name: string) => {
    setTopics((current) => {
      const next = topicsIn.addTopic(current, name);
      setOpenId(next[next.length - 1].id);
      return next;
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setTopics((current) => topicsIn.renameTopic(current, id, name));
  }, []);

  const remove = useCallback((id: string) => {
    setTopics((current) => {
      const at = current.findIndex((topic) => topic.id === id);
      if (at < 0) return current;

      setRemoved({ topic: current[at], at });
      const next = topicsIn.removeTopic(current, id);
      setOpenId(next[Math.min(at, next.length - 1)]?.id);
      return next;
    });
  }, []);

  const undoRemove = useCallback(() => {
    setRemoved((last) => {
      if (!last) return undefined;
      setTopics((current) => topicsIn.restoreTopic(current, last.topic, last.at));
      setOpenId(last.topic.id);
      return undefined;
    });
  }, []);

  const forgetRemoved = useCallback(() => setRemoved(undefined), []);

  const addOption = useCallback((topicId: string, name: string) => {
    setTopics((current) => topicsIn.addOption(current, topicId, name));
  }, []);

  const removeOption = useCallback((topicId: string, optionId: string) => {
    setTopics((current) => topicsIn.removeOption(current, topicId, optionId));
  }, []);

  return {
    topics,
    open,
    removed: removed?.topic,
    show: setOpenId,
    add,
    rename,
    remove,
    undoRemove,
    forgetRemoved,
    addOption,
    removeOption,
  };
}
