import { describe, expect, it } from "vitest";
import {
  CHAT_PHOTO_MAX_SOURCE_BYTES,
  canAttachChatPhoto,
  fitPhotoDimensions,
  isHeicPhoto,
} from "@/lib/chat/prepare-chat-photo";

function photo(name: string, type: string, size = 12_000): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("fitPhotoDimensions", () => {
  it("shrinks the long edge to 1280 while keeping aspect", () => {
    expect(fitPhotoDimensions(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it("leaves smaller photos unchanged", () => {
    expect(fitPhotoDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("canAttachChatPhoto", () => {
  it("accepts iPhone HEIC and empty-type WebView files", () => {
    expect(isHeicPhoto(photo("IMG_1001.HEIC", "image/heic"))).toBe(true);
    expect(canAttachChatPhoto(photo("IMG_1001.HEIC", "image/heic"))).toBe(true);
    expect(canAttachChatPhoto(photo("meal.jpg", ""))).toBe(true);
    expect(canAttachChatPhoto(photo("plate.png", "image/png"))).toBe(true);
  });

  it("rejects empty or oversized sources before decode", () => {
    expect(canAttachChatPhoto(photo("empty.jpg", "image/jpeg", 0))).toBe(false);
    expect(
      canAttachChatPhoto(
        photo("huge.jpg", "image/jpeg", CHAT_PHOTO_MAX_SOURCE_BYTES + 1),
      ),
    ).toBe(false);
  });
});
