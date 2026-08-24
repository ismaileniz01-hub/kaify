import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated image picker wiring", () => {
  it("opens the shared camera/gallery modal from LiveChatPanel", () => {
    const source = readFileSync(
      join(process.cwd(), "components/chat/LiveChatPanel.tsx"),
      "utf8",
    );
    expect(source).toContain("<ImagePickerModal");
    expect(source).toContain("onCameraClick={() => setImagePickerOpen(true)}");
    expect(source).toContain("onImageSelect={handlePhoto}");
  });

  it("uses capture only for the camera choice", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ImagePickerModal.tsx"),
      "utf8",
    );
    expect(source).toContain('capture = "environment"');
    expect(source).toContain('removeAttribute("capture")');
  });
});
