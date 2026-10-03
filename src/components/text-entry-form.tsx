import { CircleAlert } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** What a submit handler reports back: success, or the message to show. */
export type SubmitOutcome = { ok: true } | { ok: false; message: string };

interface TextEntryFormProps {
  /** Accessible name of the field, also shown as its placeholder. */
  label: string;
  submitLabel: string;
  onSubmit: (value: string) => SubmitOutcome;
  initialValue?: string;
  disabled?: boolean;
  /** Focuses and selects the field when it appears, as in an edit row. */
  autoFocus?: boolean;
  /** Shows a Cancel button and lets Escape cancel. */
  cancel?: { label: string; onCancel: () => void };
  /** Lets the parent move focus to the field, for example after removing a row. */
  fieldRef?: RefObject<HTMLInputElement | null>;
}

/**
 * One text field with a submit button, used to add and edit names and items.
 * The field keeps focus after a submit so the next entry or a correction can be
 * typed at once, and each failed attempt is announced again.
 */
export function TextEntryForm({
  label,
  submitLabel,
  onSubmit,
  initialValue = "",
  disabled = false,
  autoFocus = false,
  cancel,
  fieldRef,
}: TextEntryFormProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  // Each failed attempt remounts the message, so a repeated error is announced again.
  const [attempt, setAttempt] = useState(0);
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = fieldRef ?? ownRef;
  const inputId = useId();
  const errorId = useId();

  // Done in an effect rather than with the autofocus attribute, which also
  // fires on page load; this form appears only after the user asks to edit.
  useEffect(() => {
    const field = inputRef.current;
    if (!autoFocus || !field) return;
    field.focus();
    field.select();
  }, [autoFocus, inputRef]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = onSubmit(value);
    if (outcome.ok) {
      if (!cancel) setValue("");
      setError(null);
    } else {
      setAttempt((count) => count + 1);
      setError(outcome.message);
    }
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && cancel) {
      event.preventDefault();
      cancel.onCancel();
    }
  }

  const errorMessage = error && (
    <p
      key={attempt}
      id={errorId}
      role="alert"
      className="flex gap-1.5 text-sm font-medium text-destructive"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4.5 shrink-0" />
      {error}
    </p>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn("flex flex-wrap gap-x-2 gap-y-1.5", cancel && "gap-y-2")}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Input
        ref={inputRef}
        id={inputId}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={label}
        autoComplete="off"
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className={cancel ? "basis-full" : "flex-1 basis-0"}
      />
      {cancel ? (
        <>
          {errorMessage && <div className="basis-full">{errorMessage}</div>}
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={cancel.onCancel}>
            {cancel.label}
          </Button>
        </>
      ) : (
        <>
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
          {errorMessage && <div className="basis-full">{errorMessage}</div>}
        </>
      )}
    </form>
  );
}
