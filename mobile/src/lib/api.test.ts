import { describe, expect, mock, test } from "bun:test";

mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

const { imageName, imageType } = await import("./api");

describe("mobile API upload helpers", () => {
  test("imageName strips URI query strings and fragments", () => {
    expect(imageName("file:///photos/label.png?token=abc#preview")).toBe("label.png");
  });

  test("imageName falls back when URI has no file extension", () => {
    expect(imageName("ph://camera-asset-id")).toBe("ingredient-label.jpg");
  });

  test("imageType detects PNG and WebP with URI suffix noise", () => {
    expect(imageType("file:///photos/label.PNG?token=abc")).toBe("image/png");
    expect(imageType("file:///photos/label.webp#preview")).toBe("image/webp");
  });

  test("imageType falls back to JPEG for extensionless or unknown URIs", () => {
    expect(imageType("ph://camera-asset-id")).toBe("image/jpeg");
    expect(imageType("file:///photos/label.heic")).toBe("image/jpeg");
  });
});
