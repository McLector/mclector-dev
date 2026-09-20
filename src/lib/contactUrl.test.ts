import { describe, expect, it } from "vitest";
import { gmailComposeUrl } from "./contactUrl";

describe("gmailComposeUrl", () => {
  it("opens Gmail's web compose window addressed to the given email", () => {
    expect(gmailComposeUrl("moradamyre@gmail.com")).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=moradamyre%40gmail.com",
    );
  });

  it("percent-encodes characters that would otherwise corrupt the query (@ and +)", () => {
    expect(gmailComposeUrl("a+b@x.io")).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=a%2Bb%40x.io",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(gmailComposeUrl("  me@x.io \n")).toBe(gmailComposeUrl("me@x.io"));
  });

  it("returns an empty string for a blank address, so a caller can omit the link", () => {
    expect(gmailComposeUrl("")).toBe("");
    expect(gmailComposeUrl("   ")).toBe("");
  });

  it("is never a mailto: link (that is the dead click this replaces)", () => {
    expect(gmailComposeUrl("me@x.io")).not.toMatch(/^mailto:/i);
  });

  it("cannot be talked into adding query parameters", () => {
    const url = new URL(gmailComposeUrl("x&cc=evil@x.io"));
    expect([...url.searchParams.keys()]).toEqual(["view", "fs", "to"]);
    expect(url.searchParams.get("to")).toBe("x&cc=evil@x.io");
  });
});
