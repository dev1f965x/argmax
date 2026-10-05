import { Info } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Where lists are kept, in one short line under the name field; the details
 * open on hover with a pointer, and on tap or Enter, since phones have no hover.
 */
export function StorageNote() {
  const { t } = useTranslation();
  const triggerId = useId();
  return (
    <Popover>
      <PopoverTrigger
        id={triggerId}
        openOnHover
        delay={150}
        // The negative bottom margin keeps the 44 px target without widening
        // the gap to the content below.
        className="mt-1 -mb-2 flex min-h-11 items-center gap-1.5 rounded-md text-left text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground"
      >
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {t("lists.storedLocally")}
      </PopoverTrigger>
      {/* The popup is a dialog; the note names it, so a screen reader reads
          the note and then the details instead of an unnamed dialog. */}
      <PopoverContent
        align="start"
        aria-labelledby={triggerId}
        className="w-auto max-w-72"
      >
        <PopoverDescription className="text-popover-foreground">
          {t("lists.storedLocallyDetail")}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
