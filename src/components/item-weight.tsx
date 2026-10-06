import { useTranslation } from "react-i18next";
import type { Chance } from "@/lib/pick";

/** The ×N badge on an item whose weight is not 1; the caller decides when to show it. */
export function WeightBadge({ weight }: { weight: number }) {
  const { t } = useTranslation();
  return (
    <span className="mr-1 shrink-0 rounded-sm bg-brand-soft px-1.5 py-0.5 text-sm font-semibold text-brand-strong tabular-nums">
      {/* Read as "Weight ×2", so the sign is not read alone. */}
      <span className="sr-only">{t("list.weight")} </span>
      {t("list.weightValue", { weight })}
    </span>
  );
}

/** An item's chance, on a muted second line under its text. */
export function ChanceLine({ chance }: { chance: Chance }) {
  return (
    <span className="block text-sm text-muted-foreground tabular-nums">
      <ChanceText chance={chance} />
    </span>
  );
}

// "<" and ">" are read inconsistently by screen readers, so those chances
// are also spelled out for them, the way the badge adds its label.
function ChanceText({ chance }: { chance: Chance }) {
  const { t } = useTranslation();
  switch (chance.kind) {
    case "below-one":
      return (
        <>
          <span aria-hidden="true">{t("list.chanceUnderOne")}</span>
          <span className="sr-only">{t("list.chanceUnderOneSpoken")}</span>
        </>
      );
    case "above-ninety-nine":
      return (
        <>
          <span aria-hidden="true">{t("list.chanceOverNinetyNine")}</span>
          <span className="sr-only">
            {t("list.chanceOverNinetyNineSpoken")}
          </span>
        </>
      );
    case "percent":
      return t("list.chance", { percent: chance.value });
  }
}
