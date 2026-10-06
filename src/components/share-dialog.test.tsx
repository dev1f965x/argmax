import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ShareDialog } from "./share-dialog";

describe("ShareDialog", () => {
  it("offers no link for a list too long to open elsewhere, and says why with the title", async () => {
    render(
      <ShareDialog
        share={{
          name: "Lunch",
          url: "http://localhost/shared#1.AAAA",
          fits: false,
          session: 1,
        }}
        open
        onClose={vi.fn()}
        onCopied={vi.fn()}
        finalFocus={createRef<HTMLElement>()}
      />,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Share “Lunch”",
    });

    expect(dialog).toHaveAccessibleDescription(
      "This list is too long to share as a link. Remove some items and try again.",
    );
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument();
  });
});
