import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { localTopics } from "./storage/topics";
import { alreadyCurrent, updatesItself } from "./update/platform";
import { tauriUpdateSource } from "./update/tauri";
import { useUpdate } from "./update/useUpdate";

function Page() {
  const { update, install } = useUpdate(updatesItself ? tauriUpdateSource : alreadyCurrent);

  return <App store={localTopics} update={update} onInstallUpdate={() => void install()} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
