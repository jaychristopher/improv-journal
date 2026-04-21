import { describe, expect, it } from "vitest";

import { getAudioManifestKey, getRelativeAudioPath, toAbsoluteSiteUrl } from "../audio";

describe("audio helpers", () => {
  it("builds relative audio paths", () => {
    expect(getRelativeAudioPath("threads", "quieting-the-planning-mind")).toBe(
      "/audio/threads/quieting-the-planning-mind.mp3",
    );
  });

  it("extracts manifest keys from relative audio URLs", () => {
    expect(getAudioManifestKey("/audio/threads/example.mp3")).toBe("/audio/threads/example.mp3");
  });

  it("extracts manifest keys from absolute CDN audio URLs", () => {
    expect(getAudioManifestKey("https://cdn.example.com/cache/audio/threads/example.mp3")).toBe(
      "/audio/threads/example.mp3",
    );
  });

  it("normalizes relative paths to absolute site URLs", () => {
    expect(toAbsoluteSiteUrl("/listen/test", "https://www.physicsofconnection.com/")).toBe(
      "https://www.physicsofconnection.com/listen/test",
    );
  });

  it("leaves absolute URLs unchanged", () => {
    expect(
      toAbsoluteSiteUrl(
        "https://cdn.example.com/audio/threads/example.mp3",
        "https://www.physicsofconnection.com",
      ),
    ).toBe("https://cdn.example.com/audio/threads/example.mp3");
  });
});
