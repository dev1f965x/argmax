/**
 * Puts the cursor in a field that has just replaced whatever was clicked.
 *
 * As a ref rather than `autoFocus`, so it happens when the field appears and never on a
 * page load, where it would steal the focus from someone reading.
 */
export function takeFocus(field: HTMLInputElement | null) {
  field?.focus();
  field?.select();
}
