import { Copy, Share2, TriangleAlert } from "lucide-react";
import { type RefObject, useState } from "react";
import { useTranslation } from "react-i18next";
import { LinkField } from "@/components/link-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tracker } from "@/lib/analytics";
import { describeError } from "@/lib/errors";
import { longLinkLength } from "@/lib/share-link";

/** A link ready to share; `session` tells one opening of the dialog from the next. */
export interface PendingShare {
  name: string;
  url: string;
  /** False when the recipient's app would reject the link as too large. */
  fits: boolean;
  session: number;
}

/**
 * Whether the device's share sheet can take this link. Firefox on desktop and
 * most in-app browsers have no share sheet (FR17), so they copy instead.
 */
function canUseShareSheet(data: ShareData): boolean {
  return (
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(data))
  );
}

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

/**
 * Shares a list's link (FR16 to FR18). The notice that anyone with the link
 * can see the list is shown every time. The share sheet gets only the link
 * and the list name; without one, or when it fails, the link is copied; and
 * when copying fails too, the link is shown selected for copying by hand.
 */
export function ShareDialog({
  share,
  open,
  onClose,
  onCopied,
  finalFocus,
}: {
  /** Kept after closing, so the dialog keeps its content while it fades out. */
  share: PendingShare | null;
  open: boolean;
  onClose: () => void;
  onCopied: () => void;
  finalFocus: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent finalFocus={finalFocus}>
        {share && (
          <ShareDialogBody
            key={share.session}
            share={share}
            onClose={onClose}
            onCopied={onCopied}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialogBody({
  share,
  onClose,
  onCopied,
}: {
  share: PendingShare;
  onClose: () => void;
  onCopied: () => void;
}) {
  const { t } = useTranslation();
  const [copyFailed, setCopyFailed] = useState(false);
  const data: ShareData = { url: share.url, title: share.name };
  const sheet = !copyFailed && canUseShareSheet(data);

  async function copy() {
    try {
      await navigator.clipboard.writeText(share.url);
    } catch (error) {
      // navigator.clipboard is undefined outside secure contexts and in some
      // in-app browsers, and writing needs permission; all end up here.
      console.warn("Copying the link failed:", describeError(error));
      setCopyFailed(true);
      return;
    }
    tracker.listShared("copy");
    onCopied();
  }

  async function shareOrCopy() {
    if (sheet) {
      try {
        await navigator.share(data);
      } catch (error) {
        // The user closed the share sheet: nothing to report, and copying
        // instead would do what they just declined.
        if (isAbort(error)) return;
        console.warn("The share sheet failed:", describeError(error));
        await copy();
        return;
      }
      tracker.listShared("share");
      onClose();
      return;
    }
    await copy();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="overflow-clip wrap-anywhere">
          {t("share.title", { name: share.name })}
        </DialogTitle>
        {/* A list too long for a link gets the reason instead: no link is
            offered, so who could see one does not matter, and as the
            description it is read with the title. */}
        <DialogDescription>
          {share.fits ? t("share.body") : t("share.tooLarge")}
        </DialogDescription>
      </DialogHeader>
      {share.fits && share.url.length > longLinkLength && (
        <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-pretty">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0 text-warning"
          />
          {t("share.longLink")}
        </p>
      )}
      {copyFailed && (
        <div className="grid gap-2">
          <p role="alert" className="text-sm text-destructive">
            {t("share.copyFailed")}
          </p>
          <LinkField url={share.url} label={t("share.link")} />
        </div>
      )}
      <DialogFooter>
        <DialogClose
          render={<Button variant="ghost" className="text-muted-foreground" />}
        >
          {t("list.cancel")}
        </DialogClose>
        {/* A link the recipient cannot open is never offered. */}
        {share.fits && (
          <Button onClick={() => void shareOrCopy()}>
            {sheet ? (
              <Share2 aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {sheet ? t("share.share") : t("share.copy")}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
