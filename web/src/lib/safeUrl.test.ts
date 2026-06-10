import { describe, expect, test } from "bun:test";

import { externalHttpUrl } from "./safeUrl";

describe("externalHttpUrl", () => {
  test("allows HTTP and HTTPS URLs", () => {
    expect(externalHttpUrl("https://pubmed.ncbi.nlm.nih.gov/12345/")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345/");
    expect(externalHttpUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  test("rejects non-HTTP protocols", () => {
    expect(externalHttpUrl("javascript:alert(1)")).toBeNull();
    expect(externalHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(externalHttpUrl("file:///etc/passwd")).toBeNull();
  });

  test("rejects missing and malformed URLs", () => {
    expect(externalHttpUrl(null)).toBeNull();
    expect(externalHttpUrl(undefined)).toBeNull();
    expect(externalHttpUrl("not a url")).toBeNull();
  });
});
