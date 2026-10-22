import { test, expect } from "@playwright/test";
test.use({
  baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
  reducedMotion: "reduce",
});
test("Thai copy uses semibold without changing English UI copy", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/concert",
      "/help/contact",
      "/table-preview",
      "/auth",
    ]) {
      await page.goto(route);
      await page.locator("header").waitFor();
      const nonSemibold = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        const found: unknown[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parent = node.parentElement;
          if (
            !parent ||
            !/\p{Script=Thai}/u.test(node.textContent || "") ||
            !parent.checkVisibility()
          )
            continue;
          const style = getComputedStyle(parent);
          if (style.fontWeight !== "600")
            found.push({
              text: node.textContent?.slice(0, 60),
              weight: style.fontWeight,
              tag: parent.tagName,
              cls: parent.className,
            });
        }
        return found;
      });
      expect(nonSemibold, route).toEqual([]);
    }
  }
  await page.goto("/concert");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".event-purchase-summary")).toHaveCSS(
    "font-weight",
    "500",
  );
});
