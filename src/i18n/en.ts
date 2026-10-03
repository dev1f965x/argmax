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
  footer: {
    privacy: "Privacy",
    licenses: "Open source licenses",
    source: "Source code",
  },
  privacy: {
    title: "Privacy",
    noPersonalData:
      "Argmax does not collect personal data. There are no accounts and no cookies.",
    localOnly:
      "Your lists and your language choice are saved only in this browser's local storage. They are not sent anywhere, and clearing your browser data removes them.",
    noTracking: "Argmax does not use analytics or tracking.",
    hosting:
      "The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.",
    questions: "Questions or requests: open an issue on GitHub.",
  },
};

type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

/** Every locale must provide exactly the keys of the English resources. */
export type Resources = Messages<typeof en>;
