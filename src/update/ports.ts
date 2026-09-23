/** A newer release that can be installed over the running one. */
export interface AvailableUpdate {
  version: string;
  /**
   * Downloads, verifies the signature, installs, and restarts. Progress is a fraction of
   * the download, or null while the size is unknown.
   */
  install(onProgress: (progress: number | null) => void): Promise<void>;
}

/** Where the app learns whether it is out of date. */
export interface UpdateSource {
  /** The newer release, or null when this build is the latest. Rejects when it cannot tell. */
  check(): Promise<AvailableUpdate | null>;
}
