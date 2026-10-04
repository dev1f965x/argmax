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
      "Lists are saved only in this browser. Clearing browser data deletes them, and other devices don’t show them.",
    emptyTitle: "No lists yet",
    emptyBody: "Create your first list, for example “Lunch”.",
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
    itemCount_one: "{{count, number}} item",
    itemCount_other: "{{count, number}} items",
    addLabel: "New item",
    add: "Add",
    added: "Added “{{text}}”.",
    saved: "Saved “{{text}}”.",
    removed: "Removed “{{text}}”.",
    undo: "Undo",
    restored: "Restored “{{text}}”.",
    actions: "List actions",
    rename: "Rename",
    renamed: "Renamed the list to “{{name}}”.",
    delete: "Delete list",
    deleteTitle: "Delete “{{name}}”?",
    deleteBody_zero: "You can’t undo this.",
    deleteBody_one:
      "This also deletes {{count, number}} item. You can’t undo this.",
    deleteBody_other:
      "This also deletes {{count, number}} items. You can’t undo this.",
    editLabel: "Item text",
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
    hint: "Select Pick to pick one item at random.",
    needItem: "Add an item to pick from.",
    announced: "Picked “{{text}}”.",
  },
  common: {
    saveFailed: "Couldn’t save the change. Reload the page and try again.",
  },
  storage: {
    unavailableTitle: "Lists can’t be saved",
    unavailableBody:
      "This browser is blocking storage, so changes will be lost when you close the page. To keep changes, allow this site to store data or use another browser.",
    fullTitle: "Lists can’t be saved",
    fullBody:
      "Storage in this browser is full, so changes will be lost when you close the page. Delete lists or items you no longer need.",
    invalidTitle: "Saved lists couldn’t be read",
    invalidBody:
      "The saved data is damaged or from an unknown version. Argmax left it unchanged and turned off editing.",
    copy: "Copy data",
    copied: "Copied the saved data.",
    copyFailed: "Couldn’t copy. Allow clipboard access and try again.",
    discard: "Delete data",
    discardTitle: "Delete saved data?",
    discardBody:
      "This deletes the unreadable data from this browser, and you start with no lists. To keep a copy, select Copy data first. You can’t undo this.",
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
    privacy: "Privacy policy",
    licenses: "Licenses",
    source: "Source code",
  },
  privacy: {
    title: "Privacy policy",
    noAccounts:
      "Argmax itself has no accounts and no cookies, and it never asks for or stores personal data.",
    localOnly:
      "Your lists and your language choice are saved only in this browser’s local storage. They aren’t sent anywhere, and clearing your browser data deletes them. While a tab is open, the browser also keeps your scroll positions for Back and Forward; closing the tab deletes them.",
    analyticsIntro:
      "To learn how it’s used, Argmax sends usage data to Umami Cloud, run by Umami Software, Inc. in the United States. Each time you open a screen, create a list, or make a pick, it sends the following over HTTPS:",
    analyticsScreen: "Which screen was opened",
    analyticsEvent:
      "That a list was created or a pick was made, and whether it was a first visit, judged from when the lists in this browser were created",
    analyticsDevice: "Your browser language and screen size",
    analyticsReferrer: "The site that linked here, without the page address",
    analyticsNever: "List names and items are never sent.",
    analyticsUmami:
      "Like any website request, it reaches Umami with your IP address and browser user agent. According to Umami’s open-source data model, Umami doesn’t store the IP address. It records an approximate location from it (country, region, and city) and the browser, operating system, and device type from the user agent. Umami keeps this data for 6 months.",
    analyticsOptOut:
      "If your browser sends Global Privacy Control or Do Not Track, Argmax sends nothing and works the same.",
    umamiPolicy: "Umami’s privacy policy",
    umamiTerms: "Umami’s terms",
    hosting:
      "The hosting provider, Cloudflare, processes technical request data such as IP addresses to deliver and protect the site.",
    questions: "Questions or requests: open an issue on GitHub.",
    privacyContact: "Privacy requests that shouldn’t be public: {{email}}",
    updated: "Last updated: October 4, 2026",
  },
};

type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

/** Every locale must provide exactly the keys of the English resources. */
export type Resources = Messages<typeof en>;
