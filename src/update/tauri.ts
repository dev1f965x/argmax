import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type { UpdateSource } from "./ports";

/**
 * Reads the release manifest named in tauri.conf.json and installs through Tauri's
 * updater, which refuses anything not signed by the key whose public half ships in
 * the app.
 */
export const tauriUpdateSource: UpdateSource = {
  async check() {
    const update = await check();
    if (!update) return null;

    return {
      version: update.version,
      async install(onProgress) {
        let total: number | undefined;
        let received = 0;

        await update.downloadAndInstall((event) => {
          if (event.event === "Started") total = event.data.contentLength;
          if (event.event === "Progress") {
            received += event.data.chunkLength;
            onProgress(total ? received / total : null);
          }
        });
        await relaunch();
      },
    };
  },
};
