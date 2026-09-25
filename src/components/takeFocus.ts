/**
 * Puts the cursor in a field that has just replaced whatever was clicked.
 *
 * Written as a ref rather than `autoFocus`, so it fires when the field appears rather
 * than on page load, where it would take focus unprompted.
 */
export function takeFocus(field: HTMLInputElement | null) {
  field?.focus();
  field?.select();
}
