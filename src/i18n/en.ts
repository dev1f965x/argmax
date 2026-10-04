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
  pick: {
    region: "Pick result",
    pick: "Pick",
    again: "Pick again",
    label: "Picked",
    hint: "Pick an item to see the result here.",
    needItem: "Add an item to pick.",
    announced: "Picked “{{text}}”.",
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
    body: "This page or list doesn’t exist.",
    backToLists: "Back to lists",
  },
  footer: {
    privacy: "Privacy",
    licenses: "Open source licenses",
    source: "Source code",
  },
  privacy: {
    title: "Privacy",
    noAccounts:
      "Argmax itself has no accounts and no cookies, and it never asks for or stores personal data.",
    localOnly:
      "Your lists and your language choice are saved only in this browser's local storage. They are not sent anywhere, and clearing your browser data removes them. While a tab is open, the browser also keeps your scroll positions for Back and Forward; they are removed when you close the tab.",
    analytics:
      "To learn how Argmax is used, the site sends usage data without names or account details to Umami Cloud, run by Umami Software, Inc. in the United States. Each time you open a screen, create a list, or make a pick, it sends over HTTPS which screen was opened, that a list was created or a pick was made and whether it was a first visit (judged from the creation times of the lists stored in this browser), the browser language, the screen size, and the address of the site that linked here, without its path. List names and items are never sent. As with any website request, your IP address and browser user agent reach Umami. According to Umami's open-source data model, Umami does not store the IP address; it records the approximate location derived from it (country, region, and city) and the browser, operating system, and device type derived from the user agent. Umami keeps this data for 6 months. If your browser sends Global Privacy Control or Do Not Track, nothing is sent, and Argmax works the same.",
    umamiPolicy: "Umami's privacy policy",
    umamiTerms: "Umami's terms",
    updated: "Last updated: October 4, 2026",
    hosting:
      "The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.",
    questions: "Questions or requests: open an issue on GitHub.",
    privacyContact: "Privacy requests that should not be public: {{email}}",
  },
};

type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

/** Every locale must provide exactly the keys of the English resources. */
export type Resources = Messages<typeof en>;
