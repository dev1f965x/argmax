export const en = {
  app: {
    home: "Argmax home",
  },
  language: {
    label: "Language",
  },
  lists: {
    title: "Lists",
    nameLabel: "New list name",
    create: "Create",
    created: "Created “{{name}}”.",
    deleted: "Deleted “{{name}}”.",
    storedLocally:
      "Lists are saved only in this browser. Clearing browser data or switching devices removes them.",
    emptyTitle: "No lists yet",
    emptyBody: "Name your first list above, for example “Lunch”.",
    itemCount_zero: "No items yet",
    itemCount_one: "{{count, number}} item",
    itemCount_other: "{{count, number}} items",
    limitReached:
      "You have {{limit, number}} lists, the maximum. Delete a list to create a new one.",
    errors: {
      empty: "Enter a list name.",
      tooLong: "Use {{limit, number}} characters or fewer.",
    },
  },
  list: {
    allLists: "All lists",
    itemCount_zero: "0 items",
    itemCount_one: "{{count, number}} item",
    itemCount_other: "{{count, number}} items",
    addLabel: "Add an item",
    add: "Add",
    added: "Added “{{text}}”.",
    saved: "Saved “{{text}}”.",
    removed: "Removed “{{text}}”.",
    actions: "List actions",
    rename: "Rename",
    renamed: "Renamed the list to “{{name}}”.",
    delete: "Delete list",
    deleteTitle: "Delete “{{name}}”?",
    deleteBody_zero: "The list will be deleted. This can’t be undone.",
    deleteBody_one:
      "{{count, number}} item will be deleted with it. This can’t be undone.",
    deleteBody_other:
      "{{count, number}} items will be deleted with it. This can’t be undone.",
    editLabel: "Edit item",
    edit: "Edit “{{text}}”",
    remove: "Remove “{{text}}”",
    save: "Save",
    cancel: "Cancel",
    emptyTitle: "This list is empty",
    emptyBody: "Add at least one item to pick from.",
    limitReached:
      "This list has {{limit, number}} items, the maximum. Remove an item to add another.",
    errors: {
      empty: "Enter an item.",
      tooLong: "Use {{limit, number}} characters or fewer.",
    },
  },
  common: {
    saveFailed: "Couldn’t save the change. Reload the page and try again.",
  },
  storage: {
    unavailableTitle: "Lists can’t be saved",
    unavailableBody:
      "This browser is blocking storage, so changes will be lost when you close the page.",
    fullTitle: "Lists can’t be saved",
    fullBody:
      "Storage in this browser is full, so changes will be lost when you close the page. Delete lists or items you no longer need.",
    invalidTitle: "Saved lists couldn’t be read",
    invalidBody:
      "The data in this browser is damaged or from an unknown version. It has been left untouched, and editing is turned off.",
    copy: "Copy data",
    copied: "Copied the saved data.",
    copyFailed: "Couldn’t copy. Your browser blocked the clipboard.",
    discard: "Delete data",
    discardTitle: "Delete saved data?",
    discardBody:
      "The unreadable data will be deleted from this browser, and you will start with no lists. Copy it first if you might need it. This can’t be undone.",
    discardConfirm: "Delete data",
    discardFailed: "Couldn’t delete the data. Reload the page and try again.",
    cancel: "Cancel",
    discarded: "Deleted the saved data. You can create lists again.",
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
