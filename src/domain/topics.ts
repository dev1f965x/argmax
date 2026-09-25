/** One option inside a topic. Its id is stable across renames. */
export interface Option {
  id: string;
  name: string;
}

/** One recurring question, and the options that answer it. */
export interface Topic {
  id: string;
  name: string;
  options: Option[];
}

const newId = () => crypto.randomUUID();

export function makeTopic(name: string): Topic {
  return { id: newId(), name: name.trim(), options: [] };
}

export function addTopic(topics: readonly Topic[], name: string): Topic[] {
  return [...topics, makeTopic(name)];
}

export function renameTopic(topics: readonly Topic[], id: string, name: string): Topic[] {
  return topics.map((topic) => (topic.id === id ? { ...topic, name: name.trim() } : topic));
}

export function removeTopic(topics: readonly Topic[], id: string): Topic[] {
  return topics.filter((topic) => topic.id !== id);
}

/** Puts a removed topic back at the position it held. */
export function restoreTopic(topics: readonly Topic[], topic: Topic, at: number): Topic[] {
  const kept = topics.filter((each) => each.id !== topic.id);
  return [...kept.slice(0, at), topic, ...kept.slice(at)];
}

export function addOption(topics: readonly Topic[], topicId: string, name: string): Topic[] {
  return withOptions(topics, topicId, (options) => [
    ...options,
    { id: newId(), name: name.trim() },
  ]);
}

export function removeOption(topics: readonly Topic[], topicId: string, optionId: string): Topic[] {
  return withOptions(topics, topicId, (options) =>
    options.filter((option) => option.id !== optionId),
  );
}

function withOptions(
  topics: readonly Topic[],
  topicId: string,
  change: (options: Option[]) => Option[],
): Topic[] {
  return topics.map((topic) =>
    topic.id === topicId ? { ...topic, options: change(topic.options) } : topic,
  );
}

/** A usable name: not blank, and not already taken. */
export function isNewName(topics: readonly Topic[], name: string): boolean {
  const trimmed = name.trim();
  return trimmed !== "" && !topics.some((topic) => topic.name === trimmed);
}

export function isNewOption(topic: Topic | undefined, name: string): boolean {
  const trimmed = name.trim();
  return trimmed !== "" && !topic?.options.some((option) => option.name === trimmed);
}
