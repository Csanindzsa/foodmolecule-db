import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

const { api, imageName, imageType } = await import("./api");

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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

describe("mobile API client", () => {
  test("search encodes the query and requests deduped food results", async () => {
    const fetchMock = mock(async () => jsonResponse({ foods: [], molecules: [], count: 0 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.search("apple & pear");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:8000/api/v1/foods/search/?q=apple%20%26%20pear&dedupe=ingredient_signature",
    );
  });

  test("compare encodes each selected food ID", async () => {
    const fetchMock = mock(async () => jsonResponse({ foods: [], shared_molecules: [], total_unique_molecules: 0 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.compare(["id 1", "id/2"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:8000/api/v1/foods/compare/?ids=id%201,id%2F2",
    );
  });

  test("throws server detail text for non-ok JSON responses", async () => {
    globalThis.fetch = mock(async () => jsonResponse({ detail: "Research temporarily unavailable" }, 503)) as unknown as typeof fetch;

    await expect(api.recentStudies()).rejects.toThrow("Research temporarily unavailable");
  });

  test("throws status fallback for non-ok non-JSON responses", async () => {
    globalThis.fetch = mock(async () => new Response("service unavailable", { status: 503 })) as unknown as typeof fetch;

    await expect(api.recentStudies()).rejects.toThrow("API error: 503");
  });
});
