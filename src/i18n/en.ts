export const en = {
  app: {
    home: "Argmax home",
  },
  language: {
    label: "Language",
  },
  lists: {
    title: "Lists",
  },
  list: {
    title: "List {{id}}",
  },
  notFound: {
    title: "Page not found",
    backToLists: "Back to lists",
  },
};

type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

/** Every locale must provide exactly the keys of the English resources. */
export type Resources = Messages<typeof en>;
