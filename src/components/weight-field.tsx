import { NumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { weightRange } from "@/lib/storage";

const stepButton =
  "flex size-11 items-center justify-center text-foreground transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 disabled:pointer-events-none disabled:text-subtle-foreground";

/**
 * The weight stepper in an item's edit row (FR13): − and + buttons around the
 * value, which can also be typed or changed with the arrow keys. Values run
 * from 1 to `max`; the buttons are disabled at the limits. `value` is null
 * while the field is cleared, and the caller then keeps the stored weight.
 */
export function WeightField({
  value,
  max,
  onValueChange,
}: {
  value: number | null;
  max: number;
  onValueChange: (value: number | null) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  // With one item there is nothing to choose, but the field stays in place
  // so every edit row has the same shape.
  const fixed = max <= weightRange.min;

  return (
    <div className="flex items-center gap-2.5">
      {/* The visible label names the field itself (WCAG 2.5.3); the − and +
          buttons carry their own names. */}
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {t("list.weight")}
      </label>
      <NumberField.Root
        id={inputId}
        value={value}
        min={weightRange.min}
        max={max}
        // Whole numbers only: typed decimals are rounded when committed.
        format={{ maximumFractionDigits: 0 }}
        disabled={fixed}
        onValueChange={onValueChange}
      >
        {/* The frame is drawn over the buttons, so each button keeps a full
            44 px target inside a 44 px control. */}
        <NumberField.Group className="relative flex h-11 overflow-clip rounded-lg bg-popover after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:border after:border-input focus-within:ring-3 focus-within:ring-ring/50 focus-within:after:border-ring data-disabled:bg-surface data-disabled:after:border-border">
          <NumberField.Decrement
            aria-label={t("list.decreaseWeight")}
            className={stepButton}
          >
            <Minus aria-hidden="true" className="size-4.5" />
          </NumberField.Decrement>
          <span className="flex min-w-11 items-center justify-center border-x px-1 font-bold tabular-nums in-data-disabled:text-subtle-foreground">
            <span aria-hidden="true">×</span>
            <NumberField.Input
              // Base UI leaves the input a plain text box; as a spinbutton it
              // tells screen readers the value, its range, and the arrow keys.
              role="spinbutton"
              aria-valuenow={value ?? undefined}
              aria-valuemin={weightRange.min}
              aria-valuemax={max}
              aria-valuetext={
                value === null
                  ? undefined
                  : t("list.weightValue", { weight: value })
              }
              // Replaces Base UI's English-only "Number field", which a
              // screen reader would read instead of the localized role.
              aria-roledescription={undefined}
              // Sized to its digits, so "×" stays next to them: by content
              // where supported, by the size attribute elsewhere.
              size={Math.max(String(value ?? "").length, 1)}
              className="min-w-2 bg-transparent field-sizing-content outline-none"
            />
          </span>
          <NumberField.Increment
            aria-label={t("list.increaseWeight")}
            className={stepButton}
          >
            <Plus aria-hidden="true" className="size-4.5" />
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    </div>
  );
}
