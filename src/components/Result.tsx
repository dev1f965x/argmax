import { PICK_LABELS } from "../domain/labels";
import type { Option } from "../domain/topics";
import "./Result.css";

interface Props {
  option: Option;
  onAgain: () => void;
}

/** What was chosen, said plainly enough to act on. */
export function Result({ option, onAgain }: Props) {
  return (
    <section className="result" aria-live="polite">
      <p className="result__label">{PICK_LABELS.result}</p>
      <p className="result__name" key={option.id}>
        {option.name}
      </p>
      <button type="button" className="result__again" onClick={onAgain}>
        {PICK_LABELS.again}
      </button>
    </section>
  );
}
