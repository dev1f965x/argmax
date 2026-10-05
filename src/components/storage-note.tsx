import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Where lists are kept, in one short line under the name field; the details
 * open on hover with a pointer, and on tap or Enter, since phones have no hover.
 */
export function StorageNote() {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        className="mt-1 flex min-h-11 items-center gap-1.5 rounded-md text-left text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground"
      >
        <Info aria-hidden="true" className="size-4 shrink-0" />
        {t("lists.storedLocally")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-72">
        {t("lists.storedLocallyDetail")}
      </PopoverContent>
    </Popover>
  );
}
