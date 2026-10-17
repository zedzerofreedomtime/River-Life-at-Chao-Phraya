import { test, expect } from "@playwright/test";
import {
  pagePaths,
  pageFromPath,
  helpFromPath,
  type Page,
} from "../apps/web/src/data/navigation";
import { helpTopics, helpTitle } from "../apps/web/src/data/help";

for (const page of Object.keys(pagePaths) as Page[]) {
  test(`route round-trip: ${page}`, () => {
    expect(pageFromPath(pagePaths[page])).toBe(page);
  });
}

for (const topic of helpTopics) {
  test(`help route and bilingual title: ${topic}`, () => {
    expect(pageFromPath(`/help/${topic}`)).toBe("help");
    expect(helpFromPath(`/help/${topic}`)).toBe(topic);
    expect(helpTitle(topic, "th")).not.toBe(helpTitle(topic, "en"));
  });
}

test("unknown routes retain the home and FAQ fallbacks", () => {
  expect(pageFromPath("/not-a-page")).toBe("home");
  expect(pageFromPath("/help/not-a-topic")).toBe("help");
  expect(helpFromPath("/help/not-a-topic")).toBe("faq");
  expect(helpFromPath("/")).toBe("faq");
});
