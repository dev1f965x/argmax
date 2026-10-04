import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { type StorageIssue, useLists } from "@/components/lists-provider";
import { StatusNotice } from "@/components/status-notice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";

type IssueKind = NonNullable<StorageIssue>["kind"];

/**
 * Persistent notice for storage problems, rendered once in the layout so it stays
 * in place while the user moves between screens.
 */
export function StorageBanner() {
  const { t } = useTranslation();
  const { issue, issueFoundAtLoad } = useLists();
  const { pathname } = useLocation();
  const [discarded, setDiscarded] = useState(false);
  // The confirmation is cleared on the first navigation, so returning to the
  // screen does not bring it back or move focus to it.
  const [shownOn, setShownOn] = useState(pathname);
  if (pathname !== shownOn) {
    setShownOn(pathname);
    setDiscarded(false);
  }
  // A later problem replaces the confirmation for good; otherwise it would
  // return, and take focus, once that problem clears.
  if (issue && discarded) setDiscarded(false);

  if (!issue) {
    // The dialog and its trigger are gone after a discard, so focus moves to the confirmation.
    return discarded ? (
      <StatusNotice className="max-w-160">
        {t("storage.discarded")}
      </StatusNotice>
    ) : null;
  }

  const invalid = issue.kind === "invalid";
  const titles: Record<IssueKind, string> = {
    unavailable: t("storage.unavailableTitle"),
    full: t("storage.fullTitle"),
    invalid: t("storage.invalidTitle"),
  };
  const bodies: Record<IssueKind, string> = {
    unavailable: t("storage.unavailableBody"),
    full: t("storage.fullBody"),
    invalid: t("storage.invalidBody"),
  };
  const title = titles[issue.kind];
  const body = bodies[issue.kind];

  return (
    <div
      className={cn(
        "mb-5 flex max-w-160 gap-2.5 rounded-xl px-3.5 py-3",
        invalid ? "bg-destructive-soft" : "bg-warning-soft",
      )}
    >
      <TriangleAlert
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          invalid ? "text-destructive" : "text-warning",
        )}
      />
      <div className="min-w-0">
        {/* A problem found on start is the first thing in the page; one that
            appears while the user works interrupts to be heard. */}
        <div role={issueFoundAtLoad ? undefined : "alert"}>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
        </div>
        {issue.kind === "invalid" && (
          <InvalidDataActions
            raw={issue.raw}
            onDiscarded={() => setDiscarded(true)}
          />
        )}
      </div>
    </div>
  );
}

function InvalidDataActions({
  raw,
  onDiscarded,
}: {
  raw: string;
  onDiscarded: () => void;
}) {
  const { t } = useTranslation();
  const { discardInvalidData } = useLists();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw);
      setMessage(t("storage.copied"));
    } catch (error) {
      console.error("Copying the stored lists failed:", describeError(error));
      setMessage(t("storage.copyFailed"));
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void copy()}>
          {t("storage.copy")}
        </Button>
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            {t("storage.discard")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("storage.discardTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("storage.discardBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("storage.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  if (discardInvalidData()) onDiscarded();
                  else setMessage(t("storage.discardFailed"));
                }}
              >
                {t("storage.discardConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* Announces the outcome of Copy or Delete without moving focus. */}
      <p aria-live="polite" className="mt-2 text-sm empty:hidden">
        {message}
      </p>
    </>
  );
}
