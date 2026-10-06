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
    storedLocally: "Lists are saved only in this browser.",
    storedLocallyDetail:
      "Clearing browser data deletes them, and other devices don’t show them.",
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
    savedWithWeight: "Saved “{{text}}” with weight ×{{weight, number}}.",
    removed: "Removed “{{text}}”.",
    undo: "Undo",
    restored: "Restored “{{text}}”.",
    actions: "List actions",
    rename: "Rename",
    share: "Share",
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
    weight: "Weight",
    weightValue: "×{{weight, number}}",
    decreaseWeight: "Decrease weight",
    increaseWeight: "Increase weight",
    showChances: "Show chances",
    chance: "Chance {{percent, number}}%",
    chanceUnderOne: "Chance <1%",
    chanceUnderOneSpoken: "Chance under 1%",
    chanceOverNinetyNine: "Chance >99%",
    chanceOverNinetyNineSpoken: "Chance over 99%",
    limitReached:
      "This list has {{limit, number}} items, the maximum. Remove an item to add another.",
    errors: {
      empty: "Enter an item.",
      tooLong: "Use {{limit, number}} characters or fewer.",
    },
  },
  share: {
    title: "Share “{{name}}”",
    body: "Anyone with the link can see the list name and items. Later changes aren’t included.",
    longLink: "This link is long, so some messengers may cut it off.",
    tooLarge:
      "This list is too long to share as a link. Remove some items and try again.",
    share: "Share link",
    copy: "Copy link",
    copied: "Copied the link.",
    copyFailed: "Couldn’t copy. Select the link and copy it.",
    link: "Link",
  },
  shared: {
    title: "Shared list",
    sender: "Made by the sender. Saved only when you add it.",
    add: "Add this list",
    added: "Added “{{name}}”.",
    limitReached:
      "You have {{limit, number}} lists, the maximum. Delete one to add this list.",
    inAppTitle: "Lists added in this app don’t show in your phone’s browser",
    inAppBody: "Copy the link and open it in your browser.",
    invalidTitle: "This link can’t be opened",
    invalidBody:
      "It may have been cut off when it was sent. Ask the sender to share it again.",
    toLists: "Go to lists",
    newerTitle: "This link needs a newer version",
    newerBody: "Reload the page to open it with the latest Argmax.",
    reload: "Reload",
  },
  pick: {
    region: "Pick result",
    pick: "Pick",
    again: "Pick again",
    label: "Picked",
    empty: "Your pick appears here",
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
    newerTitle: "Lists can’t be edited in this tab",
    newerBody:
      "They were saved by a newer version of Argmax and are unchanged. Reload the page to use that version.",
    reload: "Reload",
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
    feedback: "Feedback",
  },
  privacy: {
    title: "Privacy policy",
    noAccounts:
      "Argmax itself has no accounts and no cookies, and it never asks for or stores personal data.",
    localOnly:
      "Your lists, your language choice, and whether chances are shown are saved only in this browser’s local storage. They aren’t sent anywhere, and clearing your browser data deletes them. While a tab is open, the browser also keeps your scroll positions for Back and Forward; closing the tab deletes them.",
    analyticsIntro:
      "To learn how it’s used, Argmax sends usage data to Umami Cloud, run by Umami Software, Inc. in the United States. Each time you open a screen, create, share, or add a list, or make a pick, it sends the following over HTTPS:",
    analyticsScreen: "Which screen was opened",
    analyticsEvent:
      "That a list was created or a pick was made, and whether it was a first visit, judged from when the lists in this browser were created",
    analyticsShare:
      "That a list was shared, and whether through the device’s share sheet or by copying the link, or that a shared list was added",
    analyticsDevice: "Your browser language and screen size",
    analyticsReferrer: "The site that linked here, without the page address",
    analyticsNever: "List names and items are never sent.",
    shareLinks:
      "When you share a list, the link is created on your device and contains the list itself: its name, items, and weights. The link stays wherever it is kept, such as chats and browser history, including history synced to other devices, and anyone with the link can see the list. Browsers don’t send the part of a link after “#” to websites, so the list never reaches Argmax or Umami. Argmax can’t remove a list from a link that someone else has.",
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
    updated: "Last updated: October 6, 2026",
  },
};

type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

/** Every locale must provide exactly the keys of the English resources. */
export type Resources = Messages<typeof en>;
